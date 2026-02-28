export type CategorizationVersion = 'v1' | 'v2';

export type LLMProvider = 'openai' | 'anthropic' | 'gemini' | 'openai-compatible';

export interface LLMCategorizationConfig {
  enabled: boolean;
  provider: LLMProvider;
  model: string;
  apiKey: string;
  baseUrl: string;
  temperature: number;
}

export interface CategorizationSettings {
  categorizationVersion: CategorizationVersion;
  llm: LLMCategorizationConfig;
}

export const defaultCategorizationSettings: CategorizationSettings = {
  categorizationVersion: 'v1',
  llm: {
    enabled: false,
    provider: 'openai',
    model: 'gpt-4o-mini',
    apiKey: '',
    baseUrl: '',
    temperature: 0.2
  }
};

export const CATEGORIZATION_SETTINGS_STORAGE_KEY = 'categorizationSettings';
