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
}

export type MetadataStatus = "processing" | "completed" | "failed";

export interface StartupMetadata {
  id: string;
  application_id: string;
  status: MetadataStatus;
  company_name: string | null;
  summary_sentences: string[] | null;
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
