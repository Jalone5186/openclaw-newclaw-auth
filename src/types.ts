export interface NewClawModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
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
