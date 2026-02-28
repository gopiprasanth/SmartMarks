import { BookmarkFolder } from '../BookmarkService';
import { LLMCategorizationConfig, LLMProvider } from './CategorizationSettings';

interface LLMFolderSuggestion {
  folderId: string;
  confidence: number;
  reason?: string;
}

interface LLMClient {
  complete(prompt: string, config: LLMCategorizationConfig): Promise<string>;
}

class OpenAICompatibleClient implements LLMClient {
  private readonly defaultUrl: string;

  constructor(defaultUrl: string) {
    this.defaultUrl = defaultUrl;
  }

  public async complete(prompt: string, config: LLMCategorizationConfig): Promise<string> {
    const endpoint = `${(config.baseUrl || this.defaultUrl).replace(/\/$/, '')}/chat/completions`;

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
      throw new Error(`OpenAI-compatible request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? '{"suggestions": []}';
  }
}

class AnthropicClient implements LLMClient {
  public async complete(prompt: string, config: LLMCategorizationConfig): Promise<string> {
    const endpoint = `${(config.baseUrl || 'https://api.anthropic.com/v1').replace(/\/$/, '')}/messages`;

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
      throw new Error(`Anthropic request failed with status ${response.status}`);
    }

    const data = await response.json();
    const textBlock = Array.isArray(data.content)
      ? data.content.find((item: { type?: string }) => item.type === 'text')
      : null;

    return textBlock?.text ?? '{"suggestions": []}';
  }
}

class GeminiClient implements LLMClient {
  public async complete(prompt: string, config: LLMCategorizationConfig): Promise<string> {
    const baseUrl = (config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/models').replace(
      /\/$/,
      ''
    );
    const endpoint = `${baseUrl}/${config.model}:generateContent?key=${encodeURIComponent(config.apiKey)}`;

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
      throw new Error(`Gemini request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{"suggestions": []}';
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
      return new OpenAICompatibleClient('http://localhost:11434/v1');
    }

    return new OpenAICompatibleClient('https://api.openai.com/v1');
  }
}

export class LLMCategorizer {
  public async suggestFolders(
    title: string,
    url: string,
    folders: BookmarkFolder[],
    config: LLMCategorizationConfig
  ): Promise<string[]> {
    const client = LLMClientFactory.create(config.provider);

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

    const content = await client.complete(prompt, config);
    const parsed = this.parse(content);

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
