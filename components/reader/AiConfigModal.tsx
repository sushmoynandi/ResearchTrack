'use client'

import React, { useState, useEffect } from 'react'
import {
  Sparkles,
  Key,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  RefreshCw,
  Zap,
  Bot,
  Settings,
  X,
  Target,
  Layers,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { AiProvider, SUPPORTED_MODELS } from '@/lib/ai'

export interface StoredAiConfig {
  provider: AiProvider
  model: string
  apiKey: string
  consensusApiKey?: string
}

export const AI_CONFIG_STORAGE_KEY = 'papertrack_ai_config'

export function getStoredAiConfig(): StoredAiConfig {
  if (typeof window === 'undefined') {
    return { provider: 'google', model: 'gemini-1.5-flash', apiKey: '', consensusApiKey: '' }
  }
  try {
    const raw = localStorage.getItem(AI_CONFIG_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const isKeyConsensus = parsed.apiKey?.startsWith('ak_')
      return {
        provider: parsed.provider || (isKeyConsensus ? 'consensus' : 'google'),
        model: parsed.model || SUPPORTED_MODELS[parsed.provider as AiProvider]?.[0]?.id || 'gemini-1.5-flash',
        apiKey: parsed.apiKey || '',
        consensusApiKey: parsed.consensusApiKey || (isKeyConsensus ? parsed.apiKey : ''),
      }
    }
  } catch {
    // ignore
  }
  return { provider: 'google', model: 'gemini-1.5-flash', apiKey: '', consensusApiKey: '' }
}

export function saveStoredAiConfig(config: StoredAiConfig) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(config))
    window.dispatchEvent(new Event('ai-config-changed'))
  } catch {
    // ignore
  }
}

interface AiConfigModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AiConfigModal({ isOpen, onClose }: AiConfigModalProps) {
  const { addToast } = useToast()
  const [provider, setProvider] = useState<AiProvider>('google')
  const [model, setModel] = useState<string>('gemini-1.5-flash')
  const [apiKey, setApiKey] = useState<string>('')
  const [consensusApiKey, setConsensusApiKey] = useState<string>('')
  const [showKey, setShowKey] = useState<boolean>(false)
  const [showConsensusKey, setShowConsensusKey] = useState<boolean>(false)
  const [testing, setTesting] = useState<boolean>(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    if (isOpen) {
      const current = getStoredAiConfig()
      setProvider(current.provider)
      setModel(current.model)
      setApiKey(current.apiKey)
      setConsensusApiKey(current.consensusApiKey || '')
      setTestResult(null)
    }
  }, [isOpen])

  const handleProviderChange = (newProvider: AiProvider) => {
    setProvider(newProvider)
    const defaultModel = SUPPORTED_MODELS[newProvider]?.[0]?.id || ''
    setModel(defaultModel)
    setTestResult(null)
  }

  const handleTestConnection = async () => {
    const keyToTest = apiKey.trim() || (provider === 'consensus' ? consensusApiKey.trim() : '')
    if (!keyToTest) {
      addToast('error', 'Please enter an API key to test connection.')
      return
    }

    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey: keyToTest,
          model,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setTestResult({ success: true, message: data.message || 'Connection verified successfully!' })
        addToast('success', `${provider.toUpperCase()} API connection verified!`)
      } else {
        setTestResult({ success: false, message: data.message || 'Verification failed.' })
        addToast('error', data.message || 'Failed to connect to AI provider')
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Network error during ping test.' })
      addToast('error', 'Connection test failed')
    } finally {
      setTesting(false)
    }
  }

  const handleSave = () => {
    // If the user entered an ak_ key into the main field, also sync consensusApiKey
    const trimmedKey = apiKey.trim()
    const trimmedConsensusKey = consensusApiKey.trim() || (trimmedKey.startsWith('ak_') ? trimmedKey : '')

    saveStoredAiConfig({
      provider,
      model,
      apiKey: trimmedKey,
      consensusApiKey: trimmedConsensusKey,
    })
    addToast('success', 'AI settings saved!')
    onClose()
  }

  const handleClear = () => {
    setApiKey('')
    setConsensusApiKey('')
    saveStoredAiConfig({
      provider,
      model,
      apiKey: '',
      consensusApiKey: '',
    })
    setTestResult(null)
    addToast('info', 'API keys cleared.')
  }

  const providerLinks: Record<AiProvider, { name: string; url: string; note: string }> = {
    consensus: {
      name: 'Consensus.app',
      url: 'https://consensus.app',
      note: '🎯 Scientific Consensus & Evidence-Backed claim analysis from peer-reviewed papers.',
    },
    google: {
      name: 'Google AI Studio',
      url: 'https://aistudio.google.com/app/apikey',
      note: '✨ 100% Free Tier with 15 RPM & 1M token context window. No credit card required.',
    },
    openai: {
      name: 'OpenAI Developer Platform',
      url: 'https://platform.openai.com/api-keys',
      note: 'Powers GPT-4o & GPT-4o-mini with premier multimodal understanding.',
    },
    anthropic: {
      name: 'Anthropic Console',
      url: 'https://console.anthropic.com/settings/keys',
      note: 'Powers Claude 3.5 Sonnet for deep academic synthesis and peer-reviewing.',
    },
    groq: {
      name: 'Groq Cloud Console',
      url: 'https://console.groq.com/keys',
      note: '⚡ Ultra-fast LPU inference with DeepSeek R1 & Llama 3.3 70B.',
    },
    openrouter: {
      name: 'OpenRouter Keys',
      url: 'https://openrouter.ai/keys',
      note: 'Unified gateway for DeepSeek R1, Claude, and 100+ open-source models.',
    },
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Research Assistant Settings" size="lg">
      <div className="space-y-6 text-sm">
        {/* Intro banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-accent/15 via-accent/5 to-transparent border border-accent/30 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent/20 text-accent flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles size={20} />
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-text-primary">Configure Your AI Reading Engine</h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              Connect your preferred LLM provider or Consensus AI to ask in-depth questions, compute consensus meters, and synthesize research papers.
              <span className="font-medium text-emerald-400 block mt-1">
                🔒 Your API key is stored securely in your browser and never saved on our database.
              </span>
            </p>
          </div>
        </div>

        {/* Provider Tabs */}
        <div className="space-y-2">
          <label className="text-xs font-bold font-mono uppercase tracking-wider text-text-secondary">
            Select Provider
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {(
              [
                { id: 'consensus', name: 'Consensus AI', badge: 'Scientific', color: 'text-indigo-400 border-indigo-500/40' },
                { id: 'google', name: 'Google Gemini', badge: 'Free Tier', color: 'text-cyan-400 border-cyan-500/40' },
                { id: 'openai', name: 'OpenAI (GPT)', badge: 'GPT-4o', color: 'text-emerald-400 border-emerald-500/40' },
                { id: 'anthropic', name: 'Anthropic', badge: 'Claude 3.5', color: 'text-purple-400 border-purple-500/40' },
                { id: 'groq', name: 'Groq Cloud', badge: 'Ultra Fast', color: 'text-amber-400 border-amber-500/40' },
                { id: 'openrouter', name: 'OpenRouter', badge: 'DeepSeek', color: 'text-blue-400 border-blue-500/40' },
              ] as const
            ).map((p) => {
              const active = provider === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleProviderChange(p.id)}
                  className={`p-2.5 rounded-xl border flex flex-col items-center text-center gap-1 transition-all cursor-pointer ${
                    active
                      ? `bg-bg-elevated ${p.color} shadow-lg ring-2 ring-accent/30 font-semibold`
                      : 'bg-bg-tertiary border-border-default text-text-secondary hover:text-text-primary hover:border-border-hover'
                  }`}
                >
                  <Bot size={18} className={active ? 'text-accent' : 'text-text-tertiary'} />
                  <span className="text-xs font-medium leading-tight">{p.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-bg-primary/60 text-text-tertiary font-mono">
                    {p.badge}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Model selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold font-mono uppercase tracking-wider text-text-secondary">
            Select Model
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-default text-text-primary text-xs outline-none focus:border-accent font-mono"
          >
            {SUPPORTED_MODELS[provider]?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — {m.description}
              </option>
            ))}
          </select>
        </div>

        {/* Primary API Key Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold font-mono uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <Key size={14} className="text-accent" />
              {provider.toUpperCase()} API Key
            </label>
            <a
              href={providerLinks[provider].url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-accent hover:underline flex items-center gap-1 font-mono"
            >
              Get {providerLinks[provider].name} Key <ExternalLink size={12} />
            </a>
          </div>

          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value)
                setTestResult(null)
              }}
              placeholder={`Paste your ${provider.toUpperCase()} API key here (e.g. ${provider === 'consensus' ? 'ak_...' : provider === 'google' ? 'AIzaSy...' : 'sk-...'})`}
              className="w-full px-3 py-2.5 pr-20 rounded-xl bg-bg-tertiary border border-border-default text-text-primary text-xs outline-none focus:border-accent font-mono placeholder:text-text-tertiary"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="p-1.5 text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
                title={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <p className="text-xs text-text-tertiary flex items-center gap-1">
            <Zap size={13} className="text-amber-400 shrink-0" />
            {providerLinks[provider].note}
          </p>
        </div>

        {/* Dual-Engine Option: Optional Consensus Literature Key when using Gemini / OpenAI */}
        {provider !== 'consensus' && (
          <div className="p-3.5 rounded-xl bg-bg-tertiary/60 border border-border-default space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                <Target size={13} className="text-indigo-400" />
                Consensus.app Key (Optional Dual-Engine Power)
              </label>
              <span className="text-[10px] text-text-tertiary font-mono">ak_...</span>
            </div>
            <p className="text-[11px] text-text-secondary">
              Pair your LLM with Consensus search to automatically pull live peer-reviewed study citations and consensus meters into answers.
            </p>
            <div className="relative">
              <input
                type={showConsensusKey ? 'text' : 'password'}
                value={consensusApiKey}
                onChange={(e) => setConsensusApiKey(e.target.value)}
                placeholder="ak_... (Consensus API Key)"
                className="w-full px-3 py-2 pr-12 rounded-lg bg-bg-primary border border-border-default text-text-primary text-xs outline-none focus:border-indigo-400 font-mono placeholder:text-text-tertiary"
              />
              <button
                type="button"
                onClick={() => setShowConsensusKey(!showConsensusKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
              >
                {showConsensusKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        )}

        {/* Test Result Alert */}
        {testResult && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">{testResult.success ? 'Success' : 'Connection Error'}</p>
              <p className="opacity-90">{testResult.message}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-border-default">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleTestConnection}
              disabled={testing || (!apiKey.trim() && !consensusApiKey.trim())}
              className="flex items-center gap-1.5 text-xs"
            >
              <RefreshCw size={14} className={testing ? 'animate-spin' : ''} />
              {testing ? 'Verifying...' : 'Test Connection'}
            </Button>
            {(apiKey || consensusApiKey) && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-rose-400 hover:underline px-2 cursor-pointer"
              >
                Clear Keys
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={handleSave} className="flex items-center gap-1.5">
              <Sparkles size={14} />
              Save AI Settings
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
