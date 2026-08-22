export type AiProvider = 'google' | 'openai' | 'anthropic' | 'groq' | 'openrouter'

export interface AiModelOption {
  id: string
  name: string
  provider: AiProvider
  description: string
  isFreeTier?: boolean
}

export const SUPPORTED_MODELS: Record<AiProvider, AiModelOption[]> = {
  google: [
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash (Fast & Stable Free Tier)',
      provider: 'google',
      description: 'High speed, 1M token context, officially supported on free tier.',
      isFreeTier: true,
    },
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro (Deep Reasoning)',
      provider: 'google',
      description: 'Complex reasoning, deep synthesis and math breakdown.',
      isFreeTier: true,
    },
    {
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash',
      provider: 'google',
      description: 'Next-generation Gemini with multimodal understanding.',
      isFreeTier: true,
    },
  ],
  openai: [
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o mini (Fast & Affordable)',
      provider: 'openai',
      description: 'Compact multimodal model for quick Q&A.',
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o (Flagship)',
      provider: 'openai',
      description: 'Omni-model with top-tier research reasoning.',
    },
    {
      id: 'o1-mini',
      name: 'o1-mini (Deep Reasoning)',
      provider: 'openai',
      description: 'Reasoning model specialized in math and logic.',
    },
  ],
  anthropic: [
    {
      id: 'claude-3-5-sonnet-latest',
      name: 'Claude 3.5 Sonnet (Latest)',
      provider: 'anthropic',
      description: 'State-of-the-art academic synthesis and nuanced critique.',
    },
    {
      id: 'claude-3-5-haiku-latest',
      name: 'Claude 3.5 Haiku',
      provider: 'anthropic',
      description: 'Rapid response time and concise summaries.',
    },
  ],
  groq: [
    {
      id: 'llama-3.3-70b-versatile',
      name: 'Llama 3.3 70B (Groq LPU)',
      provider: 'groq',
      description: 'Instantaneous token generation with open weights.',
      isFreeTier: true,
    },
    {
      id: 'deepseek-r1-distill-llama-70b',
      name: 'DeepSeek R1 (Llama 70B Distill)',
      provider: 'groq',
      description: 'CoT reasoning and rigorous step-by-step logic.',
      isFreeTier: true,
    },
  ],
  openrouter: [
    {
      id: 'deepseek/deepseek-r1',
      name: 'DeepSeek R1 (OpenRouter)',
      provider: 'openrouter',
      description: 'Full 671B reasoning model via OpenRouter.',
    },
    {
      id: 'anthropic/claude-3.5-sonnet',
      name: 'Claude 3.5 Sonnet (OpenRouter)',
      provider: 'openrouter',
      description: 'Claude via unified OpenRouter gateway.',
    },
  ],
}

export interface AiChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface CallAiOptions {
  provider: AiProvider
  model?: string
  apiKey?: string
  systemPrompt: string
  messages: AiChatMessage[]
  temperature?: number
  maxTokens?: number
}

/**
 * Call the selected AI provider to generate a response.
 */
export async function callAiModel(options: CallAiOptions): Promise<string> {
  const {
    provider,
    model = SUPPORTED_MODELS[provider]?.[0]?.id || 'gemini-1.5-flash',
    apiKey,
    systemPrompt,
    messages,
    temperature = 0.3,
    maxTokens = 2048,
  } = options

  // Resolve API Key from parameters or server environment variables
  const resolvedKey =
    apiKey?.trim() ||
    (provider === 'google' ? process.env.GEMINI_API_KEY : undefined) ||
    (provider === 'openai' ? process.env.OPENAI_API_KEY : undefined) ||
    (provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : undefined) ||
    (provider === 'groq' ? process.env.GROQ_API_KEY : undefined) ||
    (provider === 'openrouter' ? process.env.OPENROUTER_API_KEY : undefined)

  if (!resolvedKey) {
    throw new Error(
      `No API key configured for ${provider.toUpperCase()}. Please configure your API key in AI Settings or server environment.`
    )
  }

  // 1. Google Gemini (With multi-candidate fallback)
  if (provider === 'google') {
    const requestedModel = model.replace(/^google\//i, '').replace(/^models\//i, '')
    const candidateModels = Array.from(
      new Set([requestedModel, 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash-8b'])
    )

    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))

    let lastError: string | null = null

    for (const targetModel of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          targetModel
        )}:generateContent?key=${encodeURIComponent(resolvedKey)}`

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
            contents,
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
            },
          }),
        })

        if (res.ok) {
          const data = await res.json()
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
          if (text) return text
        } else {
          const errJson = await res.json().catch(() => ({}))
          lastError = errJson?.error?.message || `Google Gemini status ${res.status}`
        }
      } catch (err: any) {
        lastError = err?.message || 'Network error calling Gemini'
      }
    }

    throw new Error(lastError || 'Failed to generate response from Google Gemini.')
  }

  // 2. OpenAI
  if (provider === 'openai') {
    const cleanModel = model.replace(/^openai\//i, '')
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resolvedKey}`,
      },
      body: JSON.stringify({
        model: cleanModel,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature,
        max_tokens: maxTokens,
      }),
    })

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(
        errJson?.error?.message || `OpenAI API error (status ${res.status})`
      )
    }

    const data = await res.json()
    const text = data?.choices?.[0]?.message?.content
    if (!text) {
      throw new Error('OpenAI returned an empty response.')
    }
    return text
  }

  // 3. Anthropic Claude
  if (provider === 'anthropic') {
    const cleanModel = model.replace(/^anthropic\//i, '')
    const anthropicMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }))

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': resolvedKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: cleanModel,
        system: systemPrompt,
        messages: anthropicMessages,
        max_tokens: maxTokens,
        temperature,
      }),
    })

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(
        errJson?.error?.message || `Anthropic Claude API error (status ${res.status})`
      )
    }

    const data = await res.json()
    const text = data?.content?.[0]?.text
    if (!text) {
      throw new Error('Anthropic Claude returned an empty response.')
    }
    return text
  }

  // 4. Groq (OpenAI Compatible)
  if (provider === 'groq') {
    const cleanModel = model.replace(/^groq\//i, '')
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resolvedKey}`,
      },
      body: JSON.stringify({
        model: cleanModel,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature,
        max_tokens: maxTokens,
      }),
    })

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(
        errJson?.error?.message || `Groq API error (status ${res.status})`
      )
    }

    const data = await res.json()
    const text = data?.choices?.[0]?.message?.content
    if (!text) {
      throw new Error('Groq returned an empty response.')
    }
    return text
  }

  // 5. OpenRouter
  if (provider === 'openrouter') {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resolvedKey}`,
        'HTTP-Referer': 'https://papertrack.app',
        'X-Title': 'PaperTrack Academic Portal',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature,
        max_tokens: maxTokens,
      }),
    })

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(
        errJson?.error?.message || `OpenRouter API error (status ${res.status})`
      )
    }

    const data = await res.json()
    const text = data?.choices?.[0]?.message?.content
    if (!text) {
      throw new Error('OpenRouter returned an empty response.')
    }
    return text
  }

  throw new Error(`Unsupported AI Provider: ${provider}`)
}

/**
 * Ping test to verify an API key is active and functional.
 */
export async function testAiConnection(
  provider: AiProvider,
  apiKey: string,
  model?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await callAiModel({
      provider,
      apiKey,
      model,
      systemPrompt: 'Respond with exactly "PONG".',
      messages: [{ role: 'user', content: 'PING' }],
      maxTokens: 10,
    })

    if (res.toUpperCase().includes('PONG')) {
      return { success: true, message: `Connection verified! (${provider.toUpperCase()})` }
    }
    return { success: true, message: `Connected to ${provider.toUpperCase()}` }
  } catch (err: any) {
    return { success: false, message: err.message || 'Connection failed' }
  }
}
