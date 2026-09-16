import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path

from .models import Case, Run


class Store:
    def __init__(self, directory: Path):
        directory.mkdir(parents=True, exist_ok=True)
        self.path = directory / "lexforum.sqlite3"
        with self.connect() as db:
            db.executescript("""
                PRAGMA journal_mode=WAL;
                CREATE TABLE IF NOT EXISTS cases (id TEXT PRIMARY KEY, data TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, data TEXT NOT NULL);
                CREATE INDEX IF NOT EXISTS runs_by_case ON runs(case_id);
            """)
        self.path.chmod(0o600)

    @contextmanager
    def connect(self):
        with sqlite3.connect(self.path, timeout=15) as connection:
            yield connection

    def save_case(self, case: Case):
        with self.connect() as db:
            db.execute("INSERT OR REPLACE INTO cases VALUES (?, ?)", (case.id, case.model_dump_json()))

    def get_case(self, case_id: str) -> Case | None:
        with self.connect() as db:
            row = db.execute("SELECT data FROM cases WHERE id=?", (case_id,)).fetchone()
        return Case.model_validate_json(row[0]) if row else None

    def list_cases(self) -> list[Case]:
        with self.connect() as db:
            rows = db.execute("SELECT data FROM cases").fetchall()
        return sorted(
            (Case.model_validate_json(r[0]) for r in rows), key=lambda c: c.updated_at, reverse=True
        )

    def save_run(self, run: Run):
        with self.connect() as db:
            db.execute(
                "INSERT OR REPLACE INTO runs VALUES (?, ?, ?)", (run.id, run.case_id, run.model_dump_json())
            )

    def get_run(self, run_id: str) -> Run | None:
        with self.connect() as db:
            row = db.execute("SELECT data FROM runs WHERE id=?", (run_id,)).fetchone()
        return Run.model_validate_json(row[0]) if row else None

    def list_runs(self, case_id: str) -> list[Run]:
        with self.connect() as db:
            rows = db.execute("SELECT data FROM runs WHERE case_id=?", (case_id,)).fetchall()
        return sorted((Run.model_validate_json(r[0]) for r in rows), key=lambda r: r.created_at, reverse=True)

    def interrupt_stale_runs(self):
        with self.connect() as db:
            rows = db.execute("SELECT id, data FROM runs").fetchall()
            for run_id, data in rows:
                run = json.loads(data)
                if run["status"] in ("queued", "running"):
                    run["status"] = "interrupted"
                    run["error"] = (
                        "Server restarted before completion. Start a new analysis; partial results remain available."
                    )
                    db.execute("UPDATE runs SET data=? WHERE id=?", (json.dumps(run), run_id))
