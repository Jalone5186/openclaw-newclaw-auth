export interface NewClawModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  /** Optional extended fields from API (may not be present) */
  context_window?: number;
  max_tokens?: number;
}

export interface NewClawModelsResponse {
  object: "list";
  data: NewClawModel[];
}

export interface ProviderKeyConfig {
  providerId: string;
  label: string;
  envVar: string;
  hint: string;
}

export interface KeyResolution {
  key: string;
  source: "provider-specific" | "universal";
}

export interface ModelCache {
  models: NewClawModel[];
  fetchedAt: number;
}

export type FetchErrorKind = "invalid_key" | "network" | "server" | "timeout" | "unknown";

export interface FetchModelsResult {
  models: NewClawModel[] | null;
  error?: FetchErrorKind;
  message?: string;
}
