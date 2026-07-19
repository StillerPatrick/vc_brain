export type ApplicationStatus = "processing" | "completed" | "partial" | "failed";
export type JobStatus = "pending" | "processing" | "completed" | "failed";
export type FounderClassification =
  | "accomplisher"
  | "leader"
  | "dev"
  | "engineer"
  | "fighter"
  | "operator";

export interface PersonalityAnalysis {
  id: string;
  user_id: string;
  agreeableness: number;
  conscientiousness: number;
  extraversion: number;
  emotional_stability: number;
  openness: number;
  classification: FounderClassification;
  confidence: number;
  summary: string;
  rationale: string;
  model: string;
  source_summary: Record<string, number>;
  created_at: string;
}

export interface FounderExperienceEntry {
  position: string | null;
  company: string | null;
  employment_type: string | null;
  location: string | null;
  start: string | null;
  end: string | null;
  duration: string | null;
  description: string | null;
}

export interface FounderEducationEntry {
  school: string | null;
  degree: string | null;
  field: string | null;
  period: string | null;
  grade: string | null;
}

export interface ApplicationFounder {
  user_id: string;
  name: string;
  role: string | null;
  about: string | null;
  github_handle: string | null;
  linkedin_url: string | null;
  twitter_handle: string | null;
  job_id: string | null;
  job_status: JobStatus | null;
  job_error: string | null;
  analysis: PersonalityAnalysis | null;
  startup_commitment: "full_time" | "part_time" | "side_project" | null;
  commitment_rationale: string | null;
  headline: string | null;
  location_text: string | null;
  country_code: string | null;
  current_position: string | null;
  current_company: string | null;
  years_experience: number | null;
  highest_degree: string | null;
  field_of_study: string | null;
  experience: FounderExperienceEntry[] | null;
  education: FounderEducationEntry[] | null;
  skills: string[] | null;
  connections_count: number | null;
  follower_count: number | null;
  cv_scraped_at: string | null;
}

export interface TeamCategorization {
  ensemble: string;
  archetypes: FounderClassification[];
  configuration_odds: number | null;
  matched_roles: FounderClassification[];
  nearest_roles: FounderClassification[];
  missing_roles: FounderClassification[];
  team_big5: Record<string, number>;
  trait_gaps: string[];
  analyzed_count: number;
  /** Hybrid team score: paper-based components + bounded LLM adjustment. */
  team_score?: number | null;
  team_score_base?: number | null;
  team_score_components?: Record<string, number> | null;
  team_score_rationale?: string | null;
}

export type MetadataStatus = "processing" | "completed" | "failed";

export interface SourcedInsight {
  text: string;
  source_urls: string[];
}

export interface MarketEstimate {
  value_usd: number | null;
  rationale: string;
  source_urls: string[];
}

export interface StartupResearchSource {
  id: string;
  url: string;
  title: string;
  domain: string;
  favicon_url: string | null;
  excerpt: string | null;
  supports: string[];
  accessed_at: string;
}

export interface ResearchedCompetitor {
  name: string;
  website_url: string;
  differentiation: string;
  threat: "high" | "medium" | "low";
  source_urls: string[];
}

export interface InvestmentHypothesis {
  text: string;
  source_urls: string[];
}

export interface TractionKPI {
  text: string;
  trust: "verified" | "reported" | "contradicted";
  confidence: number;
  source_urls: string[];
}

export interface StartupMetadata {
  id: string;
  application_id: string;
  status: MetadataStatus;
  company_name: string | null;
  summary_sentences: string[] | null;
  tam: number | null;
  sam: number | null;
  som: number | null;
  estimated_tam: number | null;
  estimated_sam: number | null;
  estimated_som: number | null;
  market_sizing: Record<"tam" | "sam" | "som", MarketEstimate> | null;
  swot_strengths: SourcedInsight[] | null;
  swot_weaknesses: SourcedInsight[] | null;
  swot_opportunities: SourcedInsight[] | null;
  swot_threats: SourcedInsight[] | null;
  competitors: ResearchedCompetitor[] | null;
  investment_hypotheses: InvestmentHypothesis[] | null;
  traction_kpis: TractionKPI[] | null;
  research_status: MetadataStatus;
  research_model: string | null;
  research_error: string | null;
  research_completed_at: string | null;
  research_started_at: string | null;
  research_sources: StartupResearchSource[];
  deck_filename: string;
  deck_content_type: string;
  deck_available: boolean;
  first_slide_available: boolean;
  model: string | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface StartupApplication {
  id: string;
  company: string;
  one_liner: string | null;
  sector: string | null;
  location: string | null;
  deck_filename: string | null;
  status: ApplicationStatus;
  team_categorization: TeamCategorization | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
  metadata: StartupMetadata | null;
  founders: ApplicationFounder[];
}

export interface ApplicationSubmission {
  company: string;
  one_liner?: string;
  sector?: string;
  location?: string;
  deck_filename?: string;
  founders: Array<{
    name: string;
    role?: string;
    about?: string;
    github?: string;
    linkedin?: string;
    x?: string;
  }>;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "/backend/api/v1";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: isFormData
      ? init?.headers
      : { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = body?.detail;
    const message = Array.isArray(detail)
      ? detail.map((item) => item.msg ?? String(item)).join("; ")
      : detail;
    throw new Error(message ?? `Backend request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function submitApplication(input: ApplicationSubmission) {
  return apiFetch<{ application_id: string; status: ApplicationStatus }>("/applications", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function uploadPitchDeck(applicationId: string, deck: File) {
  const formData = new FormData();
  formData.append("deck", deck);
  return apiFetch<{ metadata_id: string; status: MetadataStatus }>(
    `/metadata/${applicationId}`,
    { method: "POST", body: formData },
  );
}

export function restartStartupResearch(applicationId: string) {
  return apiFetch<{ metadata_id: string; status: MetadataStatus }>(
    `/metadata/${applicationId}/research`,
    { method: "POST" },
  );
}

export function metadataAssetUrl(
  applicationId: string,
  asset: "deck" | "first-slide",
) {
  return `${API_BASE_URL}/metadata/${applicationId}/${asset}`;
}

export function getApplication(applicationId: string) {
  return apiFetch<StartupApplication>(`/applications/${applicationId}`);
}

export function listApplications() {
  return apiFetch<StartupApplication[]>("/applications");
}

export function deleteApplication(applicationId: string) {
  return apiFetch<{ deleted: boolean }>(`/applications/${applicationId}`, {
    method: "DELETE",
  });
}

export function rerunApplication(applicationId: string) {
  return apiFetch<{ application_id: string }>(`/applications/${applicationId}/rerun`, {
    method: "POST",
  });
}
