export interface Evidence {
  id: string;
  title: string;
  text: string;
  kind: string;
  submitted_by: string;
  created_at: string;
  sha256: string;
  filename: string | null;
  extraction_note: string;
}
export interface Case {
  id: string;
  title: string;
  scenario: string;
  province: string;
  category: string;
  plaintiff: string;
  defendant: string;
  remedy: string;
  created_at: string;
  updated_at: string;
  evidence: Evidence[];
  latest_run_id: string | null;
  is_sample: boolean;
}
export interface Source {
  id: string;
  title: string;
  url: string;
  excerpt: string;
  kind: string;
  status: string;
  retrieved_at: string;
}
export interface Research {
  summary: string;
  sources: Source[];
  queries: string[];
  warnings: string[];
  search_suggestions_html: string;
}
export interface Structured {
  summary: string;
  legal_issues: string[];
  claims: {
    id: string;
    description: string;
    party: string;
    evidence_ids: string[];
    disputed: boolean;
  }[];
  chronology: string[];
  missing_facts: string[];
  research_query: string;
}
export interface Finding {
  evidence_id: string;
  relevance: string;
  supports: string[];
  challenges: string[];
  contradictions: string[];
  limitations: string[];
  assessment: string;
}
export interface EvidenceAnalysis {
  findings: Finding[];
  gaps: string[];
  contradictions: string[];
  completeness: string;
}
export interface Argument {
  title: string;
  position: string;
  evidence_ids: string[];
  source_ids: string[];
  strength: string;
  vulnerability: string;
}
export interface Submission {
  thesis: string;
  arguments: Argument[];
  rebuttals: string[];
  concessions: string[];
}
export interface Round {
  number: number;
  plaintiff: Submission;
  defense: Submission;
  judge: {
    assessment: string;
    plaintiff_strength: string;
    defense_strength: string;
    key_disputes: string[];
    questions_for_next_round: string[];
    source_ids: string[];
  };
}
export interface Authority {
  title: string;
  provision_or_holding: string;
  application: string;
  source_ids: string[];
  verification_needed: string;
}
export interface Report {
  executive_summary: string;
  overall_risk: string;
  confidence: string;
  confidence_reason: string;
  plaintiff_strength: string;
  defense_strength: string;
  applicable_law: Authority[];
  precedents: Authority[];
  risks: {
    title: string;
    severity: string;
    explanation: string;
    mitigation: string;
  }[];
  evidence_gaps: string[];
  next_steps: string[];
  limitations: string[];
  disclaimer: string;
}
export interface Run {
  id: string;
  case_id: string;
  mode: "live" | "demo";
  status: string;
  created_at: string;
  completed_at: string | null;
  model: string;
  error: string | null;
  events: { node: string; label: string; status: string; at: string }[];
  snapshot: Case;
  structured: Structured | null;
  research: Research | null;
  evidence_analysis: EvidenceAnalysis | null;
  rounds: Round[];
  report: Report | null;
  citation_warnings: string[];
}
export interface Health {
  status: string;
  provider_configured: boolean;
  model: string;
  workflow: { id: string; label: string }[];
}
