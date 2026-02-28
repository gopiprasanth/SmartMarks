import { LLMCategorizationConfig, LLMProvider } from './CategorizationSettings';

// Import JSON provider-specific defaults. Webpack and ts-jest can handle JSON imports.
import openaiDefaults from './config/openai.json';
import anthropicDefaults from './config/anthropic.json';
import geminiDefaults from './config/gemini.json';
import openaiCompatibleDefaults from './config/openai-compatible.json';

const providerDefaults: Record<LLMProvider, Partial<LLMCategorizationConfig>> = {
  openai: openaiDefaults as Partial<LLMCategorizationConfig>,
  anthropic: anthropicDefaults as Partial<LLMCategorizationConfig>,
  gemini: geminiDefaults as Partial<LLMCategorizationConfig>,
  'openai-compatible': openaiCompatibleDefaults as Partial<LLMCategorizationConfig>
};

/**
 * Return the configuration defaults for the given provider.  The returned
 * object may be incomplete; callers typically merge these defaults with
 * persisted settings or user overrides.
 */
export function getProviderDefaults(provider: LLMProvider): Partial<LLMCategorizationConfig> {
  return providerDefaults[provider] || {};
}
