import { BookmarkFolder } from '../BookmarkService';
import { LLMCategorizationConfig, LLMProvider } from './CategorizationSettings';
import { getProviderDefaults } from './ProviderConfig';
import { Logger, LogLevel } from '../../utils/Logger';

interface LLMFolderSuggestion {
  folderId: string;
  confidence: number;
  reason?: string;
}

interface LLMClient {
  complete(prompt: string, config: LLMCategorizationConfig): Promise<string>;
}

const logger = new Logger('LLMCategorizer', LogLevel.INFO);

class OpenAICompatibleClient implements LLMClient {
  public async complete(prompt: string, config: LLMCategorizationConfig): Promise<string> {
    const endpoint = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;
    const startedAt = Date.now();
    logger.info('LLM request', {
      provider: config.provider,
      endpoint,
      model: config.model,
      temperature: config.temperature,
      hasApiKey: Boolean(config.apiKey),
      promptLength: prompt.length
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {})
      },
      body: JSON.stringify({
        model: config.model,
        temperature: config.temperature,
        messages: [
          {
            role: 'system',
            content:
              'You are a bookmark categorization assistant. Always return valid JSON with a top-level "suggestions" array.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      logger.error('LLM request failed', {
        provider: config.provider,
        endpoint,
        status: response.status,
        durationMs: Date.now() - startedAt
      });
      throw new Error(`OpenAI-compatible request failed with status ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '{"suggestions": []}';
    logger.info('LLM response', {
      provider: config.provider,
      endpoint,
      status: response.status,
      durationMs: Date.now() - startedAt,
      responseLength: content.length
    });

    return content;
  }
}

class AnthropicClient implements LLMClient {
  public async complete(prompt: string, config: LLMCategorizationConfig): Promise<string> {
    const endpoint = `${config.baseUrl.replace(/\/$/, '')}/messages`;
    const startedAt = Date.now();
    logger.info('LLM request', {
      provider: config.provider,
      endpoint,
      model: config.model,
      temperature: config.temperature,
      hasApiKey: Boolean(config.apiKey),
      promptLength: prompt.length
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: config.model,
        temperature: config.temperature,
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      logger.error('LLM request failed', {
        provider: config.provider,
        endpoint,
        status: response.status,
        durationMs: Date.now() - startedAt
      });
      throw new Error(`Anthropic request failed with status ${response.status}`);
    }

    const data = await response.json();
    const textBlock = Array.isArray(data.content)
      ? data.content.find((item: { type?: string }) => item.type === 'text')
      : null;

    const content = textBlock?.text ?? '{"suggestions": []}';
    logger.info('LLM response', {
      provider: config.provider,
      endpoint,
      status: response.status,
      durationMs: Date.now() - startedAt,
      responseLength: content.length
    });

    return content;
  }
}

class GeminiClient implements LLMClient {
  public async complete(prompt: string, config: LLMCategorizationConfig): Promise<string> {
    const baseUrl = config.baseUrl.replace(/\/$/, '');
    const endpoint = `${baseUrl}/${config.model}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
    const startedAt = Date.now();
    logger.info('LLM request', {
      provider: config.provider,
      endpoint: `${baseUrl}/${config.model}:generateContent?key=***`,
      model: config.model,
      temperature: config.temperature,
      hasApiKey: Boolean(config.apiKey),
      promptLength: prompt.length
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        generationConfig: {
          temperature: config.temperature
        },
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      logger.error('LLM request failed', {
        provider: config.provider,
        endpoint: `${baseUrl}/${config.model}:generateContent?key=***`,
        status: response.status,
        durationMs: Date.now() - startedAt
      });
      throw new Error(`Gemini request failed with status ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{"suggestions": []}';
    logger.info('LLM response', {
      provider: config.provider,
      endpoint: `${baseUrl}/${config.model}:generateContent?key=***`,
      status: response.status,
      durationMs: Date.now() - startedAt,
      responseLength: content.length
    });

    return content;
  }
}

class LLMClientFactory {
  public static create(provider: LLMProvider): LLMClient {
    if (provider === 'anthropic') {
      return new AnthropicClient();
    }

    if (provider === 'gemini') {
      return new GeminiClient();
    }

    if (provider === 'openai-compatible') {
      return new OpenAICompatibleClient();
    }

    return new OpenAICompatibleClient();
  }
}

export class LLMCategorizer {
  public async suggestFolders(
    title: string,
    url: string,
    folders: BookmarkFolder[],
    config: LLMCategorizationConfig
  ): Promise<string[]> {
    // merge in any provider-specific defaults so callers may pass only
    // overrides (e.g. apiKey).  this mirrors the behavior in
    // BookmarkService.getCategorizationSettings but keeps the class usable on
    // its own for tests and other utilities.
    const providerDefaults = getProviderDefaults(config.provider);
    const mergedConfig: LLMCategorizationConfig = {
      ...(providerDefaults as LLMCategorizationConfig),
      ...config,
      provider: config.provider,
      model:
        config.model && config.model.trim().length > 0
          ? config.model
          : (providerDefaults.model as string),
      baseUrl:
        config.baseUrl && config.baseUrl.trim().length > 0
          ? config.baseUrl
          : (providerDefaults.baseUrl as string),
      apiKey:
        config.apiKey && config.apiKey.trim().length > 0
          ? config.apiKey
          : (providerDefaults.apiKey as string)
    };
    logger.info('Categorization started', {
      provider: mergedConfig.provider,
      model: mergedConfig.model,
      folderCount: folders.length,
      hasApiKey: Boolean(mergedConfig.apiKey)
    });

    const client = LLMClientFactory.create(mergedConfig.provider);

    const prompt = [
      'Task: pick the best folders for this bookmark.',
      `Bookmark title: ${title}`,
      `Bookmark URL: ${url}`,
      'Available folders:',
      JSON.stringify(
        folders.map(folder => ({
          id: folder.id,
          title: folder.title,
          path: folder.path,
          keywords: Array.from(folder.keywords).slice(0, 20)
        }))
      ),
      'Return strict JSON with shape: {"suggestions": [{"folderId":"id","confidence":0.0,"reason":"short reason"}]}.',
      'Include at most 5 suggestions ordered by confidence desc.'
    ].join('\n');

    const content = await client.complete(prompt, mergedConfig);
    const parsed = this.parse(content);
    logger.info('Categorization completed', {
      provider: mergedConfig.provider,
      suggestionsCount: parsed.length
    });

    return parsed
      .sort((a, b) => b.confidence - a.confidence)
      .map(item => item.folderId)
      .slice(0, 5);
  }

  private parse(content: string): LLMFolderSuggestion[] {
    const trimmed = content.trim();
    const jsonStart = trimmed.indexOf('{');
    const jsonEnd = trimmed.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      return [];
    }

    const jsonText = trimmed.slice(jsonStart, jsonEnd + 1);

    try {
      const data = JSON.parse(jsonText);
      const suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];

      return suggestions
        .map((item: { folderId?: string; confidence?: number; reason?: string }) => ({
          folderId: typeof item.folderId === 'string' ? item.folderId : '',
          confidence: typeof item.confidence === 'number' ? item.confidence : 0,
          reason: typeof item.reason === 'string' ? item.reason : undefined
        }))
        .filter((item: LLMFolderSuggestion) => Boolean(item.folderId));
    } catch (_error) {
      return [];
    }
  }
}
