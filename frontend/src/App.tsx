import { useState, useEffect, useRef } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Scale,
  LayoutDashboard,
  Search,
  FolderOpen,
  Plus,
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  FileText,
  ShieldCheck,
  Gavel,
  Users,
  BookOpen,
  Settings,
  MapPin,
  Clock,
  Check,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  Upload,
  Download,
  Play,
  Layers,
  ExternalLink,
  Briefcase,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowLeft,
  Send,
  Info,
  LockKeyhole,
  ClipboardList,
  Quote,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { api, downloadReport } from "./api";
import type {
  Case,
  Run,
  Health,
  Research,
  Source,
  Evidence,
  Submission,
  Authority,
} from "./types";

const provinces = [
  "Federal / Islamabad",
  "Punjab",
  "Sindh",
  "Khyber Pakhtunkhwa",
  "Balochistan",
  "Gilgit-Baltistan",
  "Azad Jammu and Kashmir",
];
const categories = [
  "Contract",
  "Property",
  "Employment",
  "Family",
  "Criminal",
  "Constitutional",
  "Consumer",
  "Other",
];
const kinds = [
  "Contract",
  "Correspondence",
  "Financial record",
  "Witness statement",
  "Court document",
  "Other",
];
const date = (x: string) =>
  new Date(x).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const active = (r: Run | null) =>
  !!r && ["queued", "running"].includes(r.status);
const agentInfo: [string, string, LucideIcon, string][] = [
  [
    "Evidence analyst",
    "Tests relevance, consistency and gaps.",
    ShieldCheck,
    "teal",
  ],
  [
    "Plaintiff advocate",
    "Builds the strongest supported claim.",
    Briefcase,
    "blue",
  ],
  [
    "Defense advocate",
    "Challenges the claim and its assumptions.",
    Users,
    "violet",
  ],
  ["Judge evaluator", "Weighs both sides across two rounds.", Gavel, "gold"],
];

function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function List({ items }: { items: string[] }) {
  return items.length ? (
    <ul className="clean-list">
      {items.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ul>
  ) : (
    <p className="muted">None identified in this assessment.</p>
  );
}
function Empty({
  icon: Icon = FileText,
  title,
  children,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={25} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          className="icon-btn"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function Notice({
  children,
  danger = false,
}: {
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className={`notice ${danger ? "danger" : ""}`}
      role={danger ? "alert" : undefined}
    >
      <AlertTriangle size={17} />
      <div>{children}</div>
    </div>
  );
}
function Sources({ sources }: { sources: Source[] }) {
  return (
    <div className="sources">
      {sources.map((s) => (
        <article className="source" key={s.id} id={`source-${s.id}`}>
          <div className="source-index">{s.id}</div>
          <div>
            <div className="row wrap">
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.title} <ExternalLink size={13} />
              </a>
              <Badge tone={s.status === "Search-grounded" ? "teal" : "gold"}>
                {s.status}
              </Badge>
            </div>
            <p className="source-url">
              {new URL(s.url).hostname} · Retrieved {date(s.retrieved_at)}
            </p>
            {s.excerpt && <p className="source-excerpt">{s.excerpt}</p>}
          </div>
        </article>
      ))}
    </div>
  );
}
function Citations({ ids, sources }: { ids: string[]; sources: Source[] }) {
  return (
    <span className="citations">
      {ids.map((id) => {
        const s = sources.find((s) => s.id === id);
        return s ? (
          <a
            key={id}
            href={s.url}
            target="_blank"
            rel="noreferrer"
            title={s.title}
          >
            {id}
            <ExternalLink size={11} />
          </a>
        ) : null;
      })}
    </span>
  );
}
function ResearchResult({ research }: { research: Research }) {
  return (
    <>
      <section className="card">
        <div className="section-head">
          <h3>
            <BookOpen size={18} /> Research memo
          </h3>
          <Badge>{research.sources.length} sources</Badge>
        </div>
        <div className="markdown">
          <ReactMarkdown>{research.summary}</ReactMarkdown>
        </div>
      </section>
      {research.warnings.map((w, i) => (
        <Notice key={i}>{w}</Notice>
      ))}
      <section className="card">
        <div className="section-head">
          <h3>Source register</h3>
          <span className="eyebrow">TRACEABLE REFERENCES</span>
        </div>
        {research.sources.length ? (
          <Sources sources={research.sources} />
        ) : (
          <p className="muted">
            No grounded sources returned. This research cannot substantiate
            legal authorities.
          </p>
        )}
      </section>
      {research.queries.length > 0 && (
        <details className="card">
          <summary>Search queries used</summary>
          <List items={research.queries} />
        </details>
      )}
      {research.search_suggestions_html && (
        <iframe
          title="Google Search suggestions"
          className="search-suggestions"
          sandbox="allow-popups allow-popups-to-escape-sandbox"
          srcDoc={research.search_suggestions_html}
        />
      )}
    </>
  );
}

export default function App() {
  const [cases, setCases] = useState<Case[]>([]),
    [health, setHealth] = useState<Health | null>(null),
    [selected, setSelected] = useState<Case | null>(null),
    [run, setRun] = useState<Run | null>(null),
    [history, setHistory] = useState<Run[]>([]);
  const [page, setPage] = useState("workspace"),
    [tab, setTab] = useState("overview"),
    [modal, setModal] = useState<"case" | "evidence" | "run" | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [sidebar, setSidebar] = useState(false),
    [filter, setFilter] = useState("");
  const [query, setQuery] = useState(""),
    [searchProvince, setSearchProvince] = useState("Federal / Islamabad"),
    [searchConsent, setSearchConsent] = useState(false),
    [searching, setSearching] = useState(false),
    [searchResult, setSearchResult] = useState<Research | null>(null);
  const [roundIndex, setRoundIndex] = useState(0),
    [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const [runMode, setRunMode] = useState<"live" | "demo">("live"),
    [consent, setConsent] = useState(false),
    [fileMode, setFileMode] = useState(true);
  const [accessToken, setAccessToken] = useState("");
  async function refresh() {
    const [c, h] = await Promise.all([
      api<Case[]>("/cases"),
      api<Health>("/health"),
    ]);
    setCases(c);
    setHealth(h);
  }
  useEffect(() => {
    refresh()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    let cancelled = false;
    if (!selected) {
      setRun(null);
      setHistory([]);
      return;
    }
    setRun(null);
    setHistory([]);
    api<Run[]>(`/cases/${selected.id}/runs`)
      .then((r) => {
        if (!cancelled) {
          setHistory(r);
          setRun(r[0] || null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [selected?.id]);
  useEffect(() => {
    if (!active(run)) return;
    let cancelled = false;
    const timer = setInterval(() => {
      api<Run>(`/runs/${run!.id}`)
        .then((next) => {
          if (cancelled) return;
          setRun(next);
          if (!active(next)) {
            api<Run[]>(`/cases/${next.case_id}/runs`)
              .then(setHistory)
              .catch(() => {});
            refresh().catch(() => {});
          }
        })
        .catch((e) => {
          if (!cancelled) setError(e.message);
        });
    }, 1800);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [run?.id, run?.status]);
  function selectCase(c: Case) {
    setSelected(c);
    setPage("workspace");
    setTab("overview");
    setRoundIndex(0);
    setSidebar(false);
    setError("");
  }
  function navigate(p: string) {
    setPage(p);
    setSidebar(false);
    setError("");
  }
  async function sample() {
    setBusy(true);
    setError("");
    try {
      const c = await api<Case>("/sample", { method: "POST" });
      await refresh();
      selectCase(c);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function createCase(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError("");
    try {
      const c = await api<Case>("/cases", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setModal(null);
      await refresh();
      selectCase(c);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function addEvidence(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const c = await api<Case>(
        `/cases/${selected.id}/${fileMode ? "upload" : "evidence"}`,
        {
          method: "POST",
          body: fileMode ? data : JSON.stringify(Object.fromEntries(data)),
        },
      );
      setSelected(c);
      setModal(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function startRun(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<Run>(`/cases/${selected.id}/runs`, {
        method: "POST",
        body: JSON.stringify({ mode: runMode, consent }),
      });
      setRun(result);
      setModal(null);
      setTab("debate");
      setRoundIndex(0);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function search(e: FormEvent) {
    e.preventDefault();
    setSearching(true);
    setError("");
    setSearchResult(null);
    try {
      setSearchResult(
        await api<Research>("/search", {
          method: "POST",
          body: JSON.stringify({
            query,
            province: searchProvince,
            consent: searchConsent,
          }),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSearching(false);
    }
  }
  function runDialog() {
    setRunMode(
      health?.provider_configured
        ? "live"
        : selected?.is_sample
          ? "demo"
          : "live",
    );
    setConsent(false);
    setModal("run");
  }
  const sources = run?.research?.sources || [],
    findings = run?.evidence_analysis?.findings || [],
    completed = run?.events.filter((e) => e.status === "completed").length || 0;
  const filteredCases = cases.filter((c) =>
    `${c.title} ${c.category} ${c.province}`
      .toLowerCase()
      .includes(filter.toLowerCase()),
  );
  const changed =
    !!run &&
    selected &&
    selected.evidence.length !== run.snapshot.evidence.length;
  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebar ? "open" : ""}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setSelected(null);
            navigate("workspace");
          }}
        >
          <span className="brand-icon">
            <Scale size={24} />
          </span>
          <span>
            LexForum<small>LEGAL INTELLIGENCE</small>
          </span>
        </a>
        <div className="workspace-label">
          <span className="workspace-avatar">LF</span>
          <div>
            Research workspace<small>Pakistan jurisdiction</small>
          </div>
          <LockKeyhole size={13} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {(
            [
              ["workspace", "Case workspace", LayoutDashboard],
              ["search", "Legal research", Search],
              ["agents", "Agent team", Users],
            ] as [string, string, LucideIcon][]
          ).map(([key, label, Icon]) => (
            <button
              className={`nav-item ${page === key ? "active" : ""}`}
              key={key}
              onClick={() => navigate(key)}
            >
              <Icon size={18} />
              {label}
              {key === "workspace" && (
                <span className="nav-count">{cases.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="nav-label recent-label">
          RECENT CASES
          <button
            title="Create new case"
            aria-label="Create new case"
            onClick={() => {
              setError("");
              setModal("case");
            }}
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="recent-cases">
          {cases.slice(0, 5).map((c) => (
            <button
              key={c.id}
              className={
                selected?.id === c.id && page === "workspace" ? "selected" : ""
              }
              onClick={() => selectCase(c)}
            >
              <FolderOpen size={15} />
              <span>{c.title}</span>
            </button>
          ))}
          {!cases.length && <p>Your cases will appear here.</p>}
        </div>
        <div className="sidebar-bottom">
          <div className="private-note">
            <ShieldCheck size={19} />
            <div>
              Private by default
              <small>
                Case records stay on this device.
                <br />
                Live analysis uses Google Gemini.
              </small>
            </div>
          </div>
          <button
            className={`nav-item ${page === "settings" ? "active" : ""}`}
            onClick={() => navigate("settings")}
          >
            <Settings size={18} />
            Settings & connection
          </button>
          <div className="profile">
            <span>H</span>
            <div>
              Bootcamp project<small>Personal workspace</small>
            </div>
            <Badge tone="dark">v1.0</Badge>
          </div>
        </div>
      </aside>
      {sidebar && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setSidebar(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="row">
            <button
              className="icon-btn mobile-menu"
              onClick={() => setSidebar(!sidebar)}
              aria-label="Toggle navigation"
            >
              {sidebar ? (
                <PanelLeftClose size={20} />
              ) : (
                <PanelLeftOpen size={20} />
              )}
            </button>
            <span className="crumb">Workspace</span>
            <ChevronRight size={14} />
            <span>
              {page === "workspace"
                ? selected
                  ? "Case analysis"
                  : "All cases"
                : page === "search"
                  ? "Legal research"
                  : page === "agents"
                    ? "Agent team"
                    : "Settings"}
            </span>
          </div>
          <div className="row">
            <span className="jurisdiction">
              <MapPin size={14} />
              Pakistan
            </span>
            <span className="top-divider" />
            <Badge tone={health?.provider_configured ? "teal" : "gold"}>
              {health?.provider_configured
                ? "AI key configured"
                : "Setup required"}
            </Badge>
          </div>
        </header>
        <main>
          {error && !modal && (
            <div className="error-banner" role="alert">
              <AlertTriangle size={18} />
              <span>{error}</span>
              <button onClick={() => setError("")} aria-label="Dismiss error">
                <X size={17} />
              </button>
            </div>
          )}
          {loading ? (
            <Empty icon={Loader2} title="Opening your workspace…">
              Loading locally saved case records.
            </Empty>
          ) : (
            <>
              {page === "workspace" && !selected && (
                <>
                  <div className="page-heading">
                    <div>
                      <div className="eyebrow">YOUR LEGAL WORKSPACE</div>
                      <h1>Every angle. A clearer case.</h1>
                      <p>
                        Bring the facts together. Test the arguments. Understand
                        the risks.
                      </p>
                    </div>
                    <button
                      className="btn primary"
                      onClick={() => setModal("case")}
                    >
                      <Plus size={17} />
                      New case
                    </button>
                  </div>
                  <section className="welcome-grid">
                    <div className="welcome-card">
                      <span className="eyebrow">
                        FROM SCENARIO TO ASSESSMENT
                      </span>
                      <h2>
                        Better questions.
                        <br />
                        Stronger preparation.
                      </h2>
                      <p>
                        Independent agents examine your evidence and challenge
                        both sides across two adversarial rounds.
                      </p>
                      <div className="welcome-flow">
                        <span>
                          <FileText size={17} />
                          Submit
                        </span>
                        <ChevronRight size={14} />
                        <span>
                          <Users size={17} />
                          Challenge
                        </span>
                        <ChevronRight size={14} />
                        <span>
                          <ClipboardList size={17} />
                          Assess
                        </span>
                      </div>
                      <button
                        className="text-link light"
                        onClick={() => setModal("case")}
                      >
                        Start a case analysis <ArrowRight size={17} />
                      </button>
                    </div>
                    <div className="sample-card">
                      <div className="row between">
                        <span className="sample-icon">
                          <Scale size={23} />
                        </span>
                        <Badge tone="gold">FICTIONAL SAMPLE</Badge>
                      </div>
                      <h3>
                        A delivery dispute.
                        <br />
                        Two sides to the story.
                      </h3>
                      <p>
                        Explore a Lahore service-contract dispute with three
                        sample documents and a complete demonstration workflow.
                      </p>
                      <button
                        className="btn secondary full"
                        onClick={sample}
                        disabled={busy}
                      >
                        Open sample case <ArrowUpRight size={17} />
                      </button>
                    </div>
                  </section>
                  <div className="section-head case-list-heading">
                    <h2>
                      Your cases <span className="count">{cases.length}</span>
                    </h2>
                    <div className="input-icon">
                      <Search size={16} />
                      <input
                        aria-label="Filter cases"
                        placeholder="Find a case…"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="card case-list">
                    {filteredCases.length ? (
                      <>
                        <div className="case-table-head">
                          <span>CASE / MATTER</span>
                          <span>JURISDICTION</span>
                          <span>DOCUMENTS</span>
                          <span>UPDATED</span>
                          <span />
                        </div>
                        {filteredCases.map((c) => (
                          <button
                            className="case-row"
                            key={c.id}
                            onClick={() => selectCase(c)}
                          >
                            <div className="row">
                              <span className="case-icon">
                                <FolderOpen size={20} />
                              </span>
                              <div>
                                <strong>{c.title}</strong>
                                <small>
                                  {c.category}
                                  {c.is_sample ? " · Fictional sample" : ""}
                                </small>
                              </div>
                            </div>
                            <span>{c.province}</span>
                            <span>{c.evidence.length} files</span>
                            <span>{date(c.updated_at)}</span>
                            <ChevronRight size={17} />
                          </button>
                        ))}
                      </>
                    ) : (
                      <Empty
                        icon={FolderOpen}
                        title={
                          filter
                            ? "No matching cases"
                            : "Your first case starts here"
                        }
                      >
                        {filter
                          ? "Try another title, category or province."
                          : "Create a case or open the fictional sample to explore the workflow."}
                      </Empty>
                    )}
                  </div>
                  <div className="bottom-note">
                    <Info size={15} />
                    Research assistance for educational use. Verify legal
                    conclusions with a Pakistan-qualified advocate.
                  </div>
                </>
              )}
              {page === "workspace" && selected && (
                <>
                  <button
                    className="back-link"
                    onClick={() => setSelected(null)}
                  >
                    <ArrowLeft size={15} />
                    All cases
                  </button>
                  <div className="page-heading case-heading">
                    <div>
                      <div className="row wrap">
                        <Badge tone="teal">{selected.category}</Badge>
                        <span className="eyebrow">
                          CASE {selected.id.slice(0, 8).toUpperCase()}
                        </span>
                        {selected.is_sample && (
                          <Badge tone="gold">Fictional sample</Badge>
                        )}
                      </div>
                      <h1>{selected.title}</h1>
                      <div className="case-meta">
                        <span>
                          <MapPin size={14} />
                          {selected.province}, Pakistan
                        </span>
                        <span>
                          <Clock size={14} />
                          Created {date(selected.created_at)}
                        </span>
                        <span>
                          <FileText size={14} />
                          {selected.evidence.length} documents
                        </span>
                      </div>
                    </div>
                    <button
                      className="btn primary"
                      disabled={active(run)}
                      onClick={runDialog}
                    >
                      {active(run) ? (
                        <Loader2 className="spin" size={17} />
                      ) : (
                        <Play size={16} />
                      )}{" "}
                      {active(run) ? "Analysis running" : "Run analysis"}
                    </button>
                  </div>
                  {run?.mode === "demo" && (
                    <div className="demo-strip">
                      <Info size={16} />
                      <span>
                        Demonstration run · Fixed synthetic analysis. No live AI
                        research was performed.
                      </span>
                    </div>
                  )}
                  {changed && (
                    <Notice>
                      Evidence has changed since this run. Start a new analysis
                      to include the latest documents.
                    </Notice>
                  )}
                  <div className="tabs" role="tablist">
                    {(
                      [
                        ["overview", "Case overview", FileText],
                        ["evidence", "Evidence", ShieldCheck],
                        ["research", "Legal research", BookOpen],
                        ["debate", "Adversarial rounds", Scale],
                        ["report", "Risk report", ClipboardList],
                      ] as [string, string, LucideIcon][]
                    ).map(([key, label, Icon]) => (
                      <button
                        key={key}
                        role="tab"
                        aria-selected={tab === key}
                        className={tab === key ? "active" : ""}
                        onClick={() => setTab(key)}
                      >
                        <Icon size={16} />
                        {label}
                        {key === "evidence" && (
                          <span>{selected.evidence.length}</span>
                        )}
                      </button>
                    ))}
                  </div>
                  {run && (
                    <div className="run-toolbar">
                      <div className="row">
                        <span className={`status-dot ${run.status}`} />
                        <span>
                          {run.status === "completed"
                            ? "Analysis complete"
                            : run.status === "running"
                              ? "Agents at work"
                              : run.status.charAt(0).toUpperCase() +
                                run.status.slice(1)}
                        </span>
                        <span className="muted">
                          ·{" "}
                          {run.mode === "live"
                            ? run.model
                            : "Offline demonstration"}
                        </span>
                      </div>
                      {history.length > 1 && (
                        <select
                          aria-label="Analysis history"
                          value={run.id}
                          onChange={(e) => {
                            setRun(
                              history.find((r) => r.id === e.target.value) ||
                                null,
                            );
                            setRoundIndex(0);
                          }}
                        >
                          {history.map((r, i) => (
                            <option value={r.id} key={r.id}>
                              Run {history.length - i} · {r.mode} ·{" "}
                              {date(r.created_at)} · {r.status}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                  {run?.error && <Notice danger>{run.error}</Notice>}
                  {active(run) && (
                    <section className="progress-card">
                      <div className="row between">
                        <strong>
                          {run?.events.at(-1)?.label || "Preparing analysis"}
                        </strong>
                        <span>{completed} / 8 stages</span>
                      </div>
                      <div className="progress-track">
                        <div style={{ width: `${(completed / 8) * 100}%` }} />
                      </div>
                      <p>
                        The agents are processing this case. Each completed
                        stage is saved automatically.
                      </p>
                    </section>
                  )}
                  {tab === "overview" && (
                    <div className="content-grid">
                      <div className="stack">
                        <section className="card">
                          <div className="section-head">
                            <h3>
                              <FileText size={18} />
                              Case summary
                            </h3>
                            <Badge tone={run?.structured ? "teal" : "neutral"}>
                              {run?.structured
                                ? "AI structured"
                                : "Submitted narrative"}
                            </Badge>
                          </div>
                          <p className="body-copy">
                            {run?.structured?.summary || selected.scenario}
                          </p>
                          {run?.structured && (
                            <details>
                              <summary>View original scenario</summary>
                              <p className="body-copy">{selected.scenario}</p>
                            </details>
                          )}
                        </section>
                        <section className="card">
                          <div className="section-head">
                            <h3>Questions at issue</h3>
                            <span className="section-number">01</span>
                          </div>
                          {run?.structured ? (
                            <div className="numbered-list">
                              {run.structured.legal_issues.map((s, i) => (
                                <div key={i}>
                                  <span>{String(i + 1).padStart(2, "0")}</span>
                                  <p>{s}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="muted">
                              Run the analysis to extract legal issues, claims
                              and a chronology from your scenario.
                            </p>
                          )}
                        </section>
                        {run?.structured && (
                          <section className="card">
                            <h3>Claim map</h3>
                            {run.structured.claims.map((c) => (
                              <div className="claim" key={c.id}>
                                <div className="row between">
                                  <Badge>
                                    {c.id} · {c.party}
                                  </Badge>
                                  <span className="muted">
                                    {c.disputed
                                      ? "Disputed"
                                      : "Undisputed as submitted"}
                                  </span>
                                </div>
                                <p>{c.description}</p>
                                <div className="row wrap">
                                  {c.evidence_ids.map((id) => (
                                    <button
                                      className="evidence-chip"
                                      key={id}
                                      onClick={() => {
                                        setTab("evidence");
                                        setSelectedEvidence(
                                          run.snapshot.evidence.find(
                                            (e) => e.id === id,
                                          ) || null,
                                        );
                                      }}
                                    >
                                      <FileText size={12} />
                                      {id}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </section>
                        )}
                      </div>
                      <aside className="stack">
                        <section className="card parties">
                          <h3>The parties</h3>
                          <div>
                            <span className="party-icon blue">
                              <Briefcase size={18} />
                            </span>
                            <div>
                              <small>PLAINTIFF / CLAIMANT</small>
                              <strong>
                                {selected.plaintiff || "Not specified"}
                              </strong>
                            </div>
                          </div>
                          <div>
                            <span className="party-icon violet">
                              <Users size={18} />
                            </span>
                            <div>
                              <small>DEFENDANT / RESPONDENT</small>
                              <strong>
                                {selected.defendant || "Not specified"}
                              </strong>
                            </div>
                          </div>
                          <hr />
                          <small>RELIEF SOUGHT</small>
                          <p>{selected.remedy || "No remedy specified."}</p>
                        </section>
                        <section className="card">
                          <h3>
                            {run?.structured
                              ? "Chronology"
                              : "Your analysis team"}
                          </h3>
                          {run?.structured ? (
                            <div className="timeline">
                              {run.structured.chronology.map((x, i) => (
                                <div key={i}>
                                  <span />
                                  <p>{x}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mini-agents">
                              {agentInfo.map(([name, , Icon, color]) => (
                                <div key={name}>
                                  <span className={`party-icon ${color}`}>
                                    <Icon size={16} />
                                  </span>
                                  {name}
                                </div>
                              ))}
                            </div>
                          )}
                        </section>
                        {run?.structured && (
                          <section className="card tint">
                            <h3>Facts to clarify</h3>
                            <List items={run.structured.missing_facts} />
                          </section>
                        )}
                      </aside>
                    </div>
                  )}
                  {tab === "evidence" && (
                    <>
                      <div className="section-head">
                        <div>
                          <h2>Evidence register</h2>
                          <p className="muted">
                            Read the source material and inspect what it
                            supports.
                          </p>
                        </div>
                        <button
                          className="btn secondary"
                          disabled={active(run)}
                          onClick={() => {
                            setFileMode(true);
                            setModal("evidence");
                          }}
                        >
                          <Plus size={16} />
                          Add evidence
                        </button>
                      </div>
                      {selected.is_sample && (
                        <Notice>
                          These are synthetic teaching documents. Adding
                          evidence converts this into a live-analysis case.
                        </Notice>
                      )}
                      {!selected.evidence.length ? (
                        <div className="card">
                          <Empty
                            icon={Upload}
                            title="Build your evidence record"
                            action={
                              <button
                                className="btn secondary"
                                onClick={() => setModal("evidence")}
                              >
                                <Plus size={16} />
                                Add evidence
                              </button>
                            }
                          >
                            Upload text-based PDF, DOCX, TXT, MD or CSV files,
                            or paste a witness statement.
                          </Empty>
                        </div>
                      ) : (
                        <div className="evidence-grid">
                          {selected.evidence.map((e) => {
                            const f = findings.find(
                              (f) => f.evidence_id === e.id,
                            );
                            return (
                              <article
                                className="card evidence-card"
                                key={e.id}
                              >
                                <div className="row between">
                                  <span className="file-icon">
                                    <FileText size={23} />
                                  </span>
                                  <Badge tone={f ? "teal" : "neutral"}>
                                    {f
                                      ? `${f.relevance} relevance`
                                      : "Awaiting analysis"}
                                  </Badge>
                                </div>
                                <h3>{e.title}</h3>
                                <p className="muted">
                                  {e.kind} · {e.submitted_by}
                                </p>
                                <p>
                                  {f?.assessment ||
                                    e.text.slice(0, 170) +
                                      (e.text.length > 170 ? "…" : "")}
                                </p>
                                <div className="evidence-footer">
                                  <span>
                                    {e.id} · {e.text.length.toLocaleString()}{" "}
                                    characters
                                  </span>
                                  <button
                                    className="text-link"
                                    onClick={() => setSelectedEvidence(e)}
                                  >
                                    Inspect <ArrowUpRight size={15} />
                                  </button>
                                </div>
                                {f && (
                                  <div className="finding-mini">
                                    <span>
                                      <CheckCircle2 size={14} />
                                      {f.supports.length} supporting links
                                    </span>
                                    <span>
                                      <AlertTriangle size={14} />
                                      {f.limitations.length} limitations
                                    </span>
                                  </div>
                                )}
                              </article>
                            );
                          })}
                        </div>
                      )}
                      {run?.evidence_analysis && (
                        <div className="two-col">
                          <section className="card">
                            <h3>Contradictions to investigate</h3>
                            <List
                              items={run.evidence_analysis.contradictions}
                            />
                          </section>
                          <section className="card">
                            <div className="section-head">
                              <h3>Evidence gaps</h3>
                              <Badge tone="gold">
                                {run.evidence_analysis.completeness}
                              </Badge>
                            </div>
                            <List items={run.evidence_analysis.gaps} />
                          </section>
                        </div>
                      )}
                    </>
                  )}
                  {tab === "research" &&
                    (run?.research ? (
                      <ResearchResult research={run.research} />
                    ) : (
                      <div className="card">
                        <Empty
                          icon={BookOpen}
                          title="Research, with a source trail"
                          action={
                            <button
                              className="btn secondary"
                              onClick={runDialog}
                              disabled={active(run)}
                            >
                              Run case analysis <ArrowRight size={16} />
                            </button>
                          }
                        >
                          The research agent searches for Pakistani provisions
                          and judgments relevant to your case. Retrieved sources
                          will appear here.
                        </Empty>
                      </div>
                    ))}
                  {tab === "debate" && (
                    <>
                      <div className="section-head">
                        <div>
                          <h2>A case tested from both sides</h2>
                          <p className="muted">
                            Independent arguments. Focused rebuttals. Two
                            judicial reviews.
                          </p>
                        </div>
                        <div className="segmented">
                          {[0, 1].map((i) => (
                            <button
                              key={i}
                              className={roundIndex === i ? "active" : ""}
                              onClick={() => setRoundIndex(i)}
                            >
                              Round {i + 1}
                              {run?.rounds[i] && <Check size={13} />}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="agent-strip">
                        {agentInfo.map(([name, , Icon, color], i) => (
                          <div key={name}>
                            <span className={`party-icon ${color}`}>
                              <Icon size={18} />
                            </span>
                            <div>
                              <strong>{name}</strong>
                              <small>
                                {i === 0
                                  ? "Evidence review"
                                  : i === 3
                                    ? "Neutral evaluation"
                                    : "Independent perspective"}
                              </small>
                            </div>
                          </div>
                        ))}
                      </div>
                      {run?.rounds[roundIndex] ? (
                        <>
                          <div className="two-col arguments">
                            <SubmissionCard
                              title="Plaintiff"
                              subtitle="The case for the claim"
                              icon={Briefcase}
                              submission={run.rounds[roundIndex].plaintiff}
                              color="blue"
                              sources={sources}
                            />
                            <SubmissionCard
                              title="Defense"
                              subtitle="The challenge to the claim"
                              icon={Users}
                              submission={run.rounds[roundIndex].defense}
                              color="violet"
                              sources={sources}
                            />
                          </div>
                          <section className="card judge-card">
                            <div className="section-head">
                              <h3>
                                <Gavel size={20} />
                                Judge’s evaluation
                              </h3>
                              <Badge tone="gold">ROUND {roundIndex + 1}</Badge>
                            </div>
                            <p className="body-copy">
                              {run.rounds[roundIndex].judge.assessment}
                            </p>
                            <Citations
                              ids={run.rounds[roundIndex].judge.source_ids}
                              sources={sources}
                            />
                            <div className="two-col">
                              <div>
                                <h4>Unresolved disputes</h4>
                                <List
                                  items={
                                    run.rounds[roundIndex].judge.key_disputes
                                  }
                                />
                              </div>
                              <div>
                                <h4>
                                  {roundIndex === 0
                                    ? "Questions for round two"
                                    : "Remaining questions"}
                                </h4>
                                <List
                                  items={
                                    run.rounds[roundIndex].judge
                                      .questions_for_next_round
                                  }
                                />
                              </div>
                            </div>
                            <div className="row wrap">
                              <Badge>
                                Plaintiff ·{" "}
                                {
                                  run.rounds[roundIndex].judge
                                    .plaintiff_strength
                                }
                              </Badge>
                              <Badge>
                                Defense ·{" "}
                                {run.rounds[roundIndex].judge.defense_strength}
                              </Badge>
                            </div>
                          </section>
                        </>
                      ) : (
                        <div className="card">
                          <Empty
                            icon={Scale}
                            title={
                              active(run)
                                ? `Preparing round ${roundIndex + 1}`
                                : "The arguments are yet to be heard"
                            }
                          >
                            {active(run)
                              ? "Completed submissions and the judge’s review will appear here as the workflow progresses."
                              : "Run an analysis to see opposing arguments and their evidence, vulnerabilities and counterarguments."}
                          </Empty>
                        </div>
                      )}
                      <details className="card audit">
                        <summary>
                          Workflow audit trail{" "}
                          {run && `· ${run.events.length} events`}
                        </summary>
                        <div className="audit-list">
                          {health?.workflow.map((n) => {
                            const events =
                                run?.events.filter((e) => e.node === n.id) ||
                                [],
                              last = events.at(-1);
                            return (
                              <div key={n.id}>
                                <span
                                  className={`audit-state ${last?.status || ""}`}
                                >
                                  {last?.status === "completed" ? (
                                    <Check size={14} />
                                  ) : last?.status === "running" ? (
                                    <Loader2 size={14} className="spin" />
                                  ) : (
                                    <span />
                                  )}
                                </span>
                                <strong>{n.label}</strong>
                                <span>{last?.status || "Pending"}</span>
                                {last && (
                                  <time>
                                    {new Date(last.at).toLocaleTimeString()}
                                  </time>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    </>
                  )}
                  {tab === "report" &&
                    (run?.report ? (
                      <>
                        <div className="section-head">
                          <div>
                            <div className="eyebrow">FINAL ASSESSMENT</div>
                            <h2>Risk & readiness report</h2>
                          </div>
                          <div className="row wrap">
                            <button
                              className="btn secondary"
                              onClick={() =>
                                downloadReport(run.id, "markdown").catch((e) =>
                                  setError(e.message),
                                )
                              }
                            >
                              <Download size={16} />
                              Report
                            </button>
                            <button
                              className="btn secondary"
                              onClick={() =>
                                downloadReport(run.id, "json").catch((e) =>
                                  setError(e.message),
                                )
                              }
                            >
                              JSON
                            </button>
                            <button
                              className="btn secondary"
                              onClick={() => window.print()}
                            >
                              Print / PDF
                            </button>
                          </div>
                        </div>
                        <div className="report-metrics">
                          <Metric
                            label="Overall risk"
                            value={run.report.overall_risk}
                            note="Across the available record"
                            tone="gold"
                          />
                          <Metric
                            label="Assessment confidence"
                            value={run.report.confidence}
                            note="Qualitative · not a win probability"
                            tone="teal"
                          />
                          <Metric
                            label="Plaintiff argument"
                            value={run.report.plaintiff_strength}
                            note="Legal and evidentiary support"
                            tone="blue"
                          />
                          <Metric
                            label="Defense argument"
                            value={run.report.defense_strength}
                            note="Legal and evidentiary support"
                            tone="violet"
                          />
                        </div>
                        <section className="card">
                          <h3>Executive assessment</h3>
                          <p className="body-copy">
                            {run.report.executive_summary}
                          </p>
                          <div className="confidence-note">
                            <Info size={17} />
                            <p>{run.report.confidence_reason}</p>
                          </div>
                        </section>
                        <div className="two-col">
                          <AuthorityCard
                            title="Applicable law"
                            authorities={run.report.applicable_law}
                            sources={sources}
                          />
                          <AuthorityCard
                            title="Precedent cases"
                            authorities={run.report.precedents}
                            sources={sources}
                          />
                        </div>
                        <section className="card">
                          <h3>Critical risks</h3>
                          {run.report.risks.map((risk, i) => (
                            <article className="risk-row" key={i}>
                              <span className="risk-number">
                                {String(i + 1).padStart(2, "0")}
                              </span>
                              <div>
                                <div className="row wrap">
                                  <h4>{risk.title}</h4>
                                  <Badge
                                    tone={
                                      risk.severity === "High" ? "red" : "gold"
                                    }
                                  >
                                    {risk.severity}
                                  </Badge>
                                </div>
                                <p>{risk.explanation}</p>
                                <p className="mitigation">
                                  <strong>Next move</strong> {risk.mitigation}
                                </p>
                              </div>
                            </article>
                          ))}
                        </section>
                        <div className="two-col">
                          <section className="card">
                            <h3>Evidence still needed</h3>
                            <List items={run.report.evidence_gaps} />
                          </section>
                          <section className="card next-steps">
                            <h3>Recommended next steps</h3>
                            <div className="numbered-list">
                              {run.report.next_steps.map((s, i) => (
                                <div key={i}>
                                  <span>{i + 1}</span>
                                  <p>{s}</p>
                                </div>
                              ))}
                            </div>
                          </section>
                        </div>
                        <details className="card" open>
                          <summary>Limitations & verification</summary>
                          <List items={run.report.limitations} />
                        </details>
                        <section className="card">
                          <h3>Cited source register</h3>
                          <Sources sources={sources} />
                        </section>
                        <div className="bottom-note">
                          <Info size={16} />
                          {run.report.disclaimer}
                        </div>
                      </>
                    ) : (
                      <div className="card">
                        <Empty
                          icon={ClipboardList}
                          title="A considered assessment, not a verdict"
                        >
                          Once both adversarial rounds are complete, your report
                          will bring together argument strengths, cited law,
                          evidence gaps, risks and next steps.
                        </Empty>
                      </div>
                    ))}
                </>
              )}
              {page === "search" && (
                <>
                  <div className="page-heading">
                    <div>
                      <div className="eyebrow">PAKISTAN LEGAL RESEARCH</div>
                      <h1>Find the law behind the question.</h1>
                      <p>
                        Search for relevant provisions and prior judgments, with
                        traceable sources.
                      </p>
                    </div>
                    <span className="heading-icon">
                      <BookOpen size={30} />
                    </span>
                  </div>
                  <form className="card research-form" onSubmit={search}>
                    <label htmlFor="query">Your legal question</label>
                    <textarea
                      id="query"
                      rows={3}
                      minLength={5}
                      maxLength={2000}
                      placeholder="e.g. Under Pakistani law, when can payment be withheld for defective performance of a service contract?"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      required
                    />
                    <div className="row between wrap">
                      <label className="inline-select">
                        <MapPin size={16} />
                        <select
                          aria-label="Research jurisdiction"
                          value={searchProvince}
                          onChange={(e) => setSearchProvince(e.target.value)}
                        >
                          {provinces.map((p) => (
                            <option key={p}>{p}</option>
                          ))}
                        </select>
                      </label>
                      <button
                        className="btn primary"
                        disabled={
                          searching ||
                          !searchConsent ||
                          !health?.provider_configured
                        }
                      >
                        {searching ? (
                          <Loader2 size={16} className="spin" />
                        ) : (
                          <Search size={16} />
                        )}{" "}
                        {searching ? "Researching…" : "Search authorities"}
                      </button>
                    </div>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={searchConsent}
                        onChange={(e) => setSearchConsent(e.target.checked)}
                      />
                      <span>
                        Send this question to Google Gemini and Google Search.
                        Keep names and confidential details out of the question.
                      </span>
                    </label>
                  </form>
                  {!health?.provider_configured && (
                    <Notice>
                      Configure your Gemini API key to use live research.
                    </Notice>
                  )}
                  {searchResult ? (
                    <ResearchResult research={searchResult} />
                  ) : (
                    <>
                      <div className="section-head">
                        <h3>Start with a focused question</h3>
                      </div>
                      <div className="prompt-grid">
                        {[
                          "What evidence is relevant to breach of a service contract in Punjab?",
                          "What laws govern recovery of possession in a landlord–tenant dispute in Sindh?",
                          "How do Pakistani courts assess electronic records as evidence?",
                        ].map((q, i) => (
                          <button
                            className="prompt-card"
                            key={q}
                            onClick={() => setQuery(q)}
                          >
                            <span className="eyebrow">
                              {["CONTRACT", "PROPERTY", "EVIDENCE"][i]}
                            </span>
                            <p>{q}</p>
                            <ArrowUpRight size={18} />
                          </button>
                        ))}
                      </div>
                      <section className="research-principles">
                        <ShieldCheck size={23} />
                        <div>
                          <h3>Sources first. Conclusions second.</h3>
                          <p>
                            The assistant prioritizes official legislation and
                            court repositories. A search citation establishes
                            provenance, not currentness or binding authority.
                            Missing precedents remain explicit research gaps.
                          </p>
                        </div>
                      </section>
                    </>
                  )}
                </>
              )}
              {page === "agents" && (
                <>
                  <div className="page-heading">
                    <div>
                      <div className="eyebrow">MULTI-AGENT WORKFLOW</div>
                      <h1>Four perspectives. Two rounds.</h1>
                      <p>
                        Each agent has a defined role. Every challenge becomes
                        part of the record.
                      </p>
                    </div>
                    <span className="heading-icon">
                      <Layers size={30} />
                    </span>
                  </div>
                  <div className="agent-grid">
                    {agentInfo.map(([name, desc, Icon, color], i) => (
                      <section className="card agent-card" key={name}>
                        <div className="row between">
                          <span className={`party-icon large ${color}`}>
                            <Icon size={25} />
                          </span>
                          <span className="eyebrow">AGENT 0{i + 1}</span>
                        </div>
                        <h2>{name}</h2>
                        <p>{desc}</p>
                        <hr />
                        <List
                          items={
                            [
                              [
                                "Maps documents to specific claims",
                                "Flags contradictions and missing context",
                                "Separates relevance from authenticity",
                              ],
                              [
                                "Argues from the plaintiff’s evidence",
                                "Acknowledges weaknesses and limitations",
                                "Answers first-round challenges",
                              ],
                              [
                                "Tests factual and legal assumptions",
                                "Builds counterarguments from the record",
                                "Rebuts without inventing missing facts",
                              ],
                              [
                                "Compares support for both positions",
                                "Identifies questions for the second round",
                                "Assesses unresolved risks without issuing a ruling",
                              ],
                            ][i]
                          }
                        />
                      </section>
                    ))}
                  </div>
                  <section className="card workflow-diagram">
                    <h3>How a case moves through the system</h3>
                    <div className="workflow-steps">
                      {[
                        "Structure case",
                        "Research law",
                        "Assess evidence",
                        "Round 1",
                        "Round 2",
                        "Risk report",
                      ].map((s, i) => (
                        <div key={s}>
                          <span>{String(i + 1).padStart(2, "0")}</span>
                          <strong>{s}</strong>
                          {i < 5 && <ArrowRight size={16} />}
                        </div>
                      ))}
                    </div>
                    <p className="muted">
                      In each round, plaintiff and defense receive the same
                      prior record and draft independently. The judge evaluates
                      both submissions. Round two includes the first round’s
                      arguments and judicial questions.
                    </p>
                  </section>
                </>
              )}
              {page === "settings" && (
                <>
                  <div className="page-heading">
                    <div>
                      <div className="eyebrow">WORKSPACE SETTINGS</div>
                      <h1>Connection & privacy</h1>
                      <p>Your local workspace and its AI connection.</p>
                    </div>
                  </div>
                  <div className="content-grid">
                    <div className="stack">
                      <section className="card">
                        <div className="section-head">
                          <h3>Google Gemini</h3>
                          <Badge
                            tone={health?.provider_configured ? "teal" : "gold"}
                          >
                            {health?.provider_configured
                              ? "Key configured"
                              : "Not configured"}
                          </Badge>
                        </div>
                        <p>
                          Model:{" "}
                          <strong>{health?.model || "Unavailable"}</strong>
                        </p>
                        <p className="muted">
                          The API key is read by the backend from the local .env
                          file. It is never sent to the browser. “Configured”
                          confirms a key is present; a successful live run
                          confirms access and quota.
                        </p>
                        <button
                          className="btn secondary"
                          onClick={() =>
                            refresh().catch((e) => setError(e.message))
                          }
                        >
                          Refresh connection status
                        </button>
                      </section>
                      <section className="card">
                        <h3>Optional workspace access token</h3>
                        <p className="muted">
                          If the server is configured with APP_ACCESS_TOKEN,
                          enter it for this browser session.
                        </p>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            sessionStorage.setItem(
                              "lexforum-token",
                              accessToken,
                            );
                            setAccessToken("");
                            refresh()
                              .then(() => setError(""))
                              .catch((e) => setError(e.message));
                          }}
                        >
                          <label htmlFor="token">Access token</label>
                          <input
                            id="token"
                            type="password"
                            autoComplete="off"
                            value={accessToken}
                            onChange={(e) => setAccessToken(e.target.value)}
                            required
                          />
                          <button className="btn secondary" type="submit">
                            Use token
                          </button>
                        </form>
                      </section>
                    </div>
                    <section className="card">
                      <h3>Where your data goes</h3>
                      <List
                        items={[
                          "Case records, extracted evidence and analysis history are saved in a local SQLite database.",
                          "Live analysis sends the case and extracted evidence to Google Gemini only after confirmation.",
                          "Legal research uses Google Search grounding. Review your scenario and remove unnecessary personal identifiers.",
                          "Offline demonstration uses a fixed fictional case and makes no AI requests.",
                          "This is a single-user bootcamp application. Public deployment requires user authentication, per-user access controls and a production data policy.",
                        ]}
                      />
                    </section>
                  </div>
                </>
              )}
            </>
          )}
        </main>
        <footer className="app-footer">
          <span>
            LexForum <span className="footer-dot">/</span> Built for a more
            considered argument.
          </span>
          <span>Pakistan · Educational research</span>
        </footer>
      </div>
      {modal === "case" && (
        <Modal title="Open a new case" onClose={() => !busy && setModal(null)}>
          <form onSubmit={createCase} className="form-body">
            {error && <Notice danger>{error}</Notice>}
            <p className="muted">
              Start with the facts. You can attach supporting evidence after
              creating the case.
            </p>
            <label>
              Case title
              <input
                name="title"
                placeholder="e.g. Unpaid service contract · Lahore"
                minLength={3}
                maxLength={180}
                required
                autoFocus
              />
            </label>
            <div className="two-col">
              <label>
                Case category
                <select name="category">
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Province / territory
                <select name="province" defaultValue="Punjab">
                  {provinces.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="two-col">
              <label>
                Plaintiff / claimant
                <input
                  name="plaintiff"
                  maxLength={180}
                  placeholder="Name or anonymized label"
                />
              </label>
              <label>
                Defendant / respondent
                <input
                  name="defendant"
                  maxLength={180}
                  placeholder="Name or anonymized label"
                />
              </label>
            </div>
            <label>
              Case scenario
              <textarea
                name="scenario"
                rows={6}
                minLength={40}
                maxLength={30000}
                required
                placeholder="Describe what happened, the key dates, each party’s position, and what is disputed. Distinguish known facts from allegations."
              />
            </label>
            <label>
              Relief sought
              <textarea
                name="remedy"
                rows={2}
                maxLength={2000}
                placeholder="What outcome is being sought?"
              />
            </label>
            <div className="form-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setModal(null)}
                disabled={busy}
              >
                Cancel
              </button>
              <button className="btn primary" disabled={busy}>
                {busy ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <Plus size={16} />
                )}
                Create case
              </button>
            </div>
          </form>
        </Modal>
      )}
      {modal === "evidence" && (
        <Modal
          title="Add supporting evidence"
          onClose={() => !busy && setModal(null)}
        >
          <form className="form-body" onSubmit={addEvidence}>
            {error && <Notice danger>{error}</Notice>}
            <div className="segmented">
              <button
                type="button"
                className={fileMode ? "active" : ""}
                onClick={() => setFileMode(true)}
              >
                Upload document
              </button>
              <button
                type="button"
                className={!fileMode ? "active" : ""}
                onClick={() => setFileMode(false)}
              >
                Paste text
              </button>
            </div>
            {fileMode ? (
              <label className="upload-zone">
                <Upload size={28} />
                <strong>Choose a document</strong>
                <span>PDF, DOCX, TXT, MD or CSV · up to 10 MB</span>
                <input
                  type="file"
                  name="file"
                  accept=".pdf,.docx,.txt,.md,.csv"
                  required
                />
                <small>
                  Scanned PDFs need OCR first. Text extraction does not verify
                  authenticity.
                </small>
              </label>
            ) : (
              <>
                <label>
                  Evidence title
                  <input
                    name="title"
                    required
                    minLength={2}
                    maxLength={180}
                    placeholder="e.g. Email confirming delivery"
                  />
                </label>
                <label>
                  Document text
                  <textarea
                    name="text"
                    rows={7}
                    required
                    minLength={10}
                    maxLength={60000}
                    placeholder="Paste the original text. Clearly mark any transcription or redaction."
                  />
                </label>
              </>
            )}
            <div className="two-col">
              <label>
                Document type
                <select name="kind">
                  {kinds.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </label>
              <label>
                Submitted by
                <select name="submitted_by">
                  {["Neutral", "Plaintiff", "Defense"].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setModal(null)}
                disabled={busy}
              >
                Cancel
              </button>
              <button className="btn primary" disabled={busy}>
                {busy ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <Upload size={16} />
                )}
                Attach evidence
              </button>
            </div>
          </form>
        </Modal>
      )}
      {modal === "run" && (
        <Modal
          title="Start case analysis"
          onClose={() => !busy && setModal(null)}
        >
          <form className="form-body" onSubmit={startRun}>
            {error && <Notice danger>{error}</Notice>}
            <div className="run-summary">
              <Scale size={28} />
              <div>
                <strong>{selected?.title}</strong>
                <p>
                  {selected?.evidence.length} evidence documents · 2 adversarial
                  rounds
                </p>
              </div>
            </div>
            {selected?.is_sample && (
              <label>
                Analysis mode
                <select
                  value={runMode}
                  onChange={(e) =>
                    setRunMode(e.target.value as "live" | "demo")
                  }
                >
                  <option value="live">
                    Live AI analysis · Gemini + Google Search
                  </option>
                  <option value="demo">
                    Offline demonstration · fixed synthetic results
                  </option>
                </select>
              </label>
            )}
            {runMode === "live" ? (
              <>
                <p>
                  The agents will structure your case, research Pakistani law,
                  evaluate the evidence, debate both sides twice and prepare a
                  cited risk report.
                </p>
                {!health?.provider_configured && (
                  <Notice>
                    Connect a Gemini API key before starting live analysis.
                  </Notice>
                )}
                <label className="checkbox-label consent">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    required
                  />
                  <span>
                    I agree to send this case scenario and extracted evidence to
                    Google Gemini for analysis, with issue-based research
                    through Google Search. I have authority to share this
                    material.
                  </span>
                </label>
                <p className="muted small">
                  Provider quotas and configured billing may apply. One complete
                  run uses 10 model requests (before retries), including legal
                  research.
                </p>
              </>
            ) : (
              <Notice>
                This mode demonstrates the workflow using fixed sample outputs.
                It makes no AI calls and does not perform legal research.
              </Notice>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="btn secondary"
                disabled={busy}
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button
                className="btn primary"
                disabled={
                  busy ||
                  (runMode === "live" &&
                    (!consent || !health?.provider_configured))
                }
              >
                {busy ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <Play size={16} />
                )}
                Start {runMode === "demo" ? "demonstration" : "analysis"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {selectedEvidence && (
        <Modal
          title={selectedEvidence.title}
          onClose={() => setSelectedEvidence(null)}
        >
          <div className="form-body">
            <div className="row wrap">
              <Badge>{selectedEvidence.id}</Badge>
              <Badge>{selectedEvidence.kind}</Badge>
              <Badge>{selectedEvidence.submitted_by}</Badge>
            </div>
            {selectedEvidence.extraction_note && (
              <Notice>{selectedEvidence.extraction_note}</Notice>
            )}
            <h4>Extracted source text</h4>
            <pre className="document-text">{selectedEvidence.text}</pre>
            {(() => {
              const f = findings.find(
                (x) => x.evidence_id === selectedEvidence.id,
              );
              return (
                f && (
                  <>
                    <h4>Agent assessment · {f.relevance} relevance</h4>
                    <p>{f.assessment}</p>
                    <h4>Supports</h4>
                    <List items={f.supports} />
                    <h4>Challenges</h4>
                    <List items={f.challenges} />
                    <h4>Contradictions</h4>
                    <List items={f.contradictions} />
                    <h4>Limitations</h4>
                    <List items={f.limitations} />
                  </>
                )
              );
            })()}
            <details>
              <summary>Integrity fingerprint</summary>
              <code className="hash">SHA-256: {selectedEvidence.sha256}</code>
              <p className="muted small">
                Identifies the submitted bytes or pasted text. It does not prove
                authenticity.
              </p>
            </details>
          </div>
        </Modal>
      )}
    </div>
  );
}
function SubmissionCard({
  title,
  subtitle,
  icon: Icon,
  submission: s,
  color,
  sources,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  submission: Submission;
  color: string;
  sources: Source[];
}) {
  return (
    <section className={`card submission ${color}`}>
      <div className="submission-head">
        <span className={`party-icon ${color}`}>
          <Icon size={20} />
        </span>
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>
      <p className="thesis">{s.thesis}</p>
      {s.arguments.map((a, i) => (
        <article className="argument" key={i}>
          <div className="row between">
            <span className="eyebrow">ARGUMENT 0{i + 1}</span>
            <Badge
              tone={
                a.strength === "Strong"
                  ? "teal"
                  : a.strength === "Weak"
                    ? "gold"
                    : "neutral"
              }
            >
              {a.strength}
            </Badge>
          </div>
          <h4>{a.title}</h4>
          <p>{a.position}</p>
          <div className="row wrap">
            {a.evidence_ids.map((id) => (
              <span className="evidence-chip" key={id}>
                <FileText size={12} />
                {id}
              </span>
            ))}
            <Citations ids={a.source_ids} sources={sources} />
          </div>
          <div className="vulnerability">
            <AlertTriangle size={14} />
            <p>{a.vulnerability}</p>
          </div>
        </article>
      ))}
      {s.rebuttals.length > 0 && (
        <div className="rebuttals">
          <h4>
            <Quote size={16} />
            Counterarguments
          </h4>
          <List items={s.rebuttals} />
        </div>
      )}
      <details>
        <summary>Concessions & limitations</summary>
        <List items={s.concessions} />
      </details>
    </section>
  );
}
function Metric({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone: string;
}) {
  return (
    <div className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
function AuthorityCard({
  title,
  authorities,
  sources,
}: {
  title: string;
  authorities: Authority[];
  sources: Source[];
}) {
  return (
    <section className="card">
      <h3>{title}</h3>
      {authorities.length ? (
        authorities.map((a, i) => (
          <article className="authority" key={i}>
            <h4>{a.title}</h4>
            <p>{a.provision_or_holding}</p>
            <p>{a.application}</p>
            <Citations ids={a.source_ids} sources={sources} />
            <p className="muted small">Verify: {a.verification_needed}</p>
          </article>
        ))
      ) : (
        <p className="muted">
          No source-supported authority established in this run. Independent
          legal research is required.
        </p>
      )}
    </section>
  );
}
