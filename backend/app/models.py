from datetime import UTC, datetime
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


def now() -> str:
    return datetime.now(UTC).isoformat()


class Province(StrEnum):
    federal = "Federal / Islamabad"
    punjab = "Punjab"
    sindh = "Sindh"
    kp = "Khyber Pakhtunkhwa"
    balochistan = "Balochistan"
    gb = "Gilgit-Baltistan"
    ajk = "Azad Jammu and Kashmir"


class CaseInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    title: str = Field(min_length=3, max_length=180)
    scenario: str = Field(min_length=40, max_length=30000)
    province: Province = Province.federal
    category: Literal[
        "Contract", "Property", "Employment", "Family", "Criminal", "Constitutional", "Consumer", "Other"
    ] = "Contract"
    plaintiff: str = Field(default="", max_length=180)
    defendant: str = Field(default="", max_length=180)
    remedy: str = Field(default="", max_length=2000)


class EvidenceInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    title: str = Field(min_length=2, max_length=180)
    text: str = Field(min_length=10, max_length=60000)
    kind: Literal[
        "Contract", "Correspondence", "Financial record", "Witness statement", "Court document", "Other"
    ] = "Other"
    submitted_by: Literal["Plaintiff", "Defense", "Neutral"] = "Neutral"


class Evidence(EvidenceInput):
    id: str
    created_at: str
    filename: str | None = None
    sha256: str
    extraction_note: str = ""


class Case(CaseInput):
    id: str
    created_at: str
    updated_at: str
    evidence: list[Evidence] = []
    latest_run_id: str | None = None
    is_sample: bool = False


class Claim(BaseModel):
    id: str
    description: str
    party: str
    evidence_ids: list[str] = []
    disputed: bool = True


class StructuredCase(BaseModel):
    summary: str
    legal_issues: list[str]
    claims: list[Claim]
    chronology: list[str]
    missing_facts: list[str]
    research_query: str = Field(
        description="Anonymized Pakistan legal research question: issues and jurisdiction only, no names, identifiers or private facts."
    )


class Source(BaseModel):
    id: str
    title: str
    url: str
    excerpt: str = ""
    kind: Literal["Legislation", "Judgment", "Commentary", "Research result"] = "Research result"
    status: Literal["Search-grounded", "Unverified reference"] = "Search-grounded"
    retrieved_at: str = Field(default_factory=now)

    @field_validator("url")
    @classmethod
    def safe_url(cls, value: str) -> str:
        from urllib.parse import urlparse

        if urlparse(value).scheme != "https" or not urlparse(value).hostname:
            raise ValueError("Source URL must be an HTTPS URL")
        return value


class Research(BaseModel):
    summary: str
    sources: list[Source] = []
    queries: list[str] = []
    warnings: list[str] = []
    search_suggestions_html: str = ""


class EvidenceFinding(BaseModel):
    evidence_id: str
    relevance: Literal["High", "Medium", "Low"]
    supports: list[str]
    challenges: list[str]
    contradictions: list[str]
    limitations: list[str]
    assessment: str


class EvidenceAnalysis(BaseModel):
    findings: list[EvidenceFinding]
    gaps: list[str]
    contradictions: list[str]
    completeness: Literal["Limited", "Partial", "Substantial"]


class Argument(BaseModel):
    title: str
    position: str
    evidence_ids: list[str]
    source_ids: list[str]
    strength: Literal["Strong", "Moderate", "Weak"]
    vulnerability: str


class Submission(BaseModel):
    thesis: str
    arguments: list[Argument]
    rebuttals: list[str]
    concessions: list[str]


class JudicialReview(BaseModel):
    assessment: str
    plaintiff_strength: Literal["Strong", "Moderate", "Weak"]
    defense_strength: Literal["Strong", "Moderate", "Weak"]
    key_disputes: list[str]
    questions_for_next_round: list[str]
    source_ids: list[str]


class Round(BaseModel):
    number: int
    plaintiff: Submission
    defense: Submission
    judge: JudicialReview


class Risk(BaseModel):
    title: str
    severity: Literal["High", "Medium", "Low"]
    explanation: str
    mitigation: str


class LegalAuthority(BaseModel):
    title: str
    provision_or_holding: str
    application: str
    source_ids: list[str]
    verification_needed: str


class Report(BaseModel):
    executive_summary: str
    overall_risk: Literal["High", "Medium", "Low"]
    confidence: Literal["Low", "Medium", "High"]
    confidence_reason: str
    plaintiff_strength: Literal["Strong", "Moderate", "Weak"]
    defense_strength: Literal["Strong", "Moderate", "Weak"]
    applicable_law: list[LegalAuthority]
    precedents: list[LegalAuthority]
    risks: list[Risk]
    evidence_gaps: list[str]
    next_steps: list[str]
    limitations: list[str]
    disclaimer: str = "Research assistance for educational use, not legal advice. A Pakistan-qualified advocate must verify authorities, deadlines and strategy. Confidence is not a probability of success."


class RunInput(BaseModel):
    mode: Literal["live", "demo"] = "live"
    consent: bool = False


class SearchInput(BaseModel):
    query: str = Field(min_length=5, max_length=2000)
    province: Province = Province.federal
    consent: bool = False


class Event(BaseModel):
    node: str
    label: str
    status: Literal["running", "completed", "failed"]
    at: str = Field(default_factory=now)


class Run(BaseModel):
    id: str
    case_id: str
    mode: Literal["live", "demo"]
    status: Literal["queued", "running", "completed", "failed", "interrupted"] = "queued"
    created_at: str = Field(default_factory=now)
    completed_at: str | None = None
    model: str
    error: str | None = None
    events: list[Event] = []
    snapshot: Case
    structured: StructuredCase | None = None
    research: Research | None = None
    evidence_analysis: EvidenceAnalysis | None = None
    rounds: list[Round] = []
    report: Report | None = None
    citation_warnings: list[str] = []
