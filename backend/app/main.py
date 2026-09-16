import asyncio
import hashlib
import secrets
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import urlparse
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .config import ROOT, settings
from .extraction import MAX_BYTES, extract
from .models import Case, CaseInput, Evidence, EvidenceInput, Run, RunInput, SearchInput, now
from .provider import GeminiProvider, ProviderError
from .sample import SAMPLE_SCENARIO, sample_case
from .store import Store
from .workflow import NODES, execute_run

store = Store(settings.data_dir)
tasks: set[asyncio.Task] = set()
run_lock = asyncio.Lock()
search_lock = asyncio.Lock()


@asynccontextmanager
async def lifespan(app):
    store.interrupt_stale_runs()
    yield
    for task in tasks:
        task.cancel()
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)


app = FastAPI(
    title="LexForum",
    description="Pakistan legal research and two-round adversarial analysis.",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["localhost", "127.0.0.1", "[::1]", "testserver"])


@app.middleware("http")
async def local_security(request: Request, call_next):
    if request.url.path.startswith("/api"):
        origin = request.headers.get("origin")
        if origin and urlparse(origin).netloc != request.headers.get("host"):
            return JSONResponse(
                {"detail": "Cross-origin API access is disabled. Use the app on the same origin."},
                status_code=403,
            )
        if settings.app_access_token and request.url.path != "/api/health":
            provided = request.headers.get("authorization", "").removeprefix("Bearer ")
            if not secrets.compare_digest(provided, settings.app_access_token):
                return JSONResponse(
                    {"detail": "A valid application access token is required."}, status_code=401
                )
        size = request.headers.get("content-length")
        if size and int(size) > MAX_BYTES + 1024 * 100:
            return JSONResponse({"detail": "Request exceeds 10 MB."}, status_code=413)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    if request.url.path.startswith("/api"):
        response.headers["Cache-Control"] = "no-store"
    return response


def get_case(case_id):
    case = store.get_case(case_id)
    if not case:
        raise HTTPException(404, "Case not found.")
    return case


def get_run(run_id):
    run = store.get_run(run_id)
    if not run:
        raise HTTPException(404, "Analysis not found.")
    return run


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "provider_configured": bool(settings.gemini_api_key),
        "model": settings.gemini_model,
        "jurisdiction": "Pakistan",
        "workflow": [{"id": key, "label": label} for key, label in NODES],
    }


@app.get("/api/cases")
def cases():
    return store.list_cases()


@app.post("/api/cases", status_code=201)
def create_case(data: CaseInput):
    case = Case(**data.model_dump(), id=str(uuid4()), created_at=now(), updated_at=now())
    store.save_case(case)
    return case


@app.post("/api/sample", status_code=201)
def create_sample():
    for case in store.list_cases():
        if case.is_sample:
            return case
    case = sample_case()
    store.save_case(case)
    return case


@app.get("/api/cases/{case_id}")
def case_detail(case_id: str):
    return get_case(case_id)


def add_evidence(case_id: str, item: Evidence):
    case = get_case(case_id)
    if any(r.status in ("running", "queued") for r in store.list_runs(case_id)):
        raise HTTPException(409, "Wait for the current analysis to finish before changing evidence.")
    if len(case.evidence) >= 20 or sum(len(e.text) for e in case.evidence) + len(item.text) > 180000:
        raise HTTPException(422, "A case supports 20 documents and 180,000 total extracted characters.")
    if any(e.sha256 == item.sha256 for e in case.evidence):
        raise HTTPException(409, "This evidence is already attached.")
    case.evidence.append(item)
    case.is_sample = False
    case.updated_at = now()
    store.save_case(case)
    return case


@app.post("/api/cases/{case_id}/evidence", status_code=201)
def text_evidence(case_id: str, data: EvidenceInput):
    item = Evidence(
        **data.model_dump(),
        id="E-" + uuid4().hex[:8],
        created_at=now(),
        sha256=hashlib.sha256(data.text.encode()).hexdigest(),
    )
    return add_evidence(case_id, item)


@app.post("/api/cases/{case_id}/upload", status_code=201)
async def upload(
    case_id: str, file: UploadFile = File(...), kind: str = Form("Other"), submitted_by: str = Form("Neutral")
):
    get_case(case_id)
    content = await file.read(MAX_BYTES + 1)
    await file.close()
    filename = Path(file.filename or "document").name
    try:
        text, note, digest = await asyncio.to_thread(extract, filename, content)
        data = EvidenceInput(title=filename[:180], text=text, kind=kind, submitted_by=submitted_by)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from None
    return add_evidence(
        case_id,
        Evidence(
            **data.model_dump(),
            id="E-" + uuid4().hex[:8],
            created_at=now(),
            filename=filename,
            sha256=digest,
            extraction_note=note,
        ),
    )


@app.post("/api/cases/{case_id}/runs", status_code=202)
async def start_run(case_id: str, data: RunInput):
    async with run_lock:
        case = get_case(case_id)
        if any(not task.done() for task in tasks):
            raise HTTPException(409, "Another analysis is running. Please wait for it to finish.")
        if data.mode == "demo" and (not case.is_sample or case.scenario != SAMPLE_SCENARIO):
            raise HTTPException(
                422, "Offline demonstration is available only for the unchanged fictional sample case."
            )
        if data.mode == "live" and not data.consent:
            raise HTTPException(
                422, "Confirm that the case and evidence may be sent to Google Gemini for processing."
            )
        if data.mode == "live" and not settings.gemini_api_key:
            raise HTTPException(503, "Connect a Gemini API key before starting live analysis.")
        run = Run(
            id=str(uuid4()),
            case_id=case_id,
            mode=data.mode,
            snapshot=case.model_copy(deep=True),
            model=settings.gemini_model if data.mode == "live" else "Fixed demonstration fixture",
        )
        store.save_run(run)
        case.latest_run_id = run.id
        case.updated_at = now()
        store.save_case(case)
        task = asyncio.create_task(execute_run(run, store))
        tasks.add(task)
        task.add_done_callback(tasks.discard)
        return run


@app.get("/api/cases/{case_id}/runs")
def case_runs(case_id: str):
    get_case(case_id)
    return store.list_runs(case_id)


@app.get("/api/runs/{run_id}")
def run_detail(run_id: str):
    return get_run(run_id)


@app.post("/api/search")
async def search(data: SearchInput):
    if not data.consent:
        raise HTTPException(
            422, "Confirm this research question may be sent to Google Gemini and Google Search."
        )
    if search_lock.locked():
        raise HTTPException(429, "A search is already running. Please wait.")
    async with search_lock:
        provider = None
        try:
            provider = GeminiProvider()
            return await provider.research(data.query, data.province)
        except ProviderError as exc:
            raise HTTPException(503, str(exc)) from None
        finally:
            if provider:
                await provider.close()


@app.get("/api/runs/{run_id}/export")
def export(run_id: str, format: str = "markdown"):
    run = get_run(run_id)
    if run.status != "completed" or not run.report:
        raise HTTPException(409, "The report is not complete yet.")
    if format == "json":
        return Response(
            run.model_dump_json(indent=2),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="lexforum-{run.id[:8]}.json"'},
        )
    if format != "markdown":
        raise HTTPException(422, "Use markdown or json.")
    from .reporting import markdown_report

    return Response(
        markdown_report(run),
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="lexforum-{run.id[:8]}.md"'},
    )


assets = ROOT / "frontend/dist"
if assets.exists():
    app.mount("/assets", StaticFiles(directory=assets / "assets"), name="assets")

    @app.get("/favicon.svg", include_in_schema=False)
    def favicon():
        return FileResponse(assets / "favicon.svg")

    @app.get("/", include_in_schema=False)
    def index():
        return FileResponse(assets / "index.html")
