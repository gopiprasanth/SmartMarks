import { getProviderDefaults } from '../../src/common/services/categorization/ProviderConfig';
import { LLMProvider } from '../../src/common/services/categorization/CategorizationSettings';

describe('provider config loader', () => {
  it('returns sensible defaults for each supported provider', () => {
    const providers: LLMProvider[] = ['openai', 'anthropic', 'gemini', 'openai-compatible'];
    providers.forEach(p => {
      const cfg = getProviderDefaults(p);
      expect(cfg).toBeDefined();
      // each JSON file contains model/api/base URL defaults and temperature
      expect(typeof cfg.model).toBe('string');
      expect(typeof cfg.apiKey).toBe('string');
      expect(typeof cfg.baseUrl).toBe('string');
      expect(typeof cfg.temperature).toBe('number');
    });
  });

  it('returns empty object for unknown provider', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cfg = getProviderDefaults('does-not-exist' as any);
    expect(cfg).toEqual({});
  });
});
