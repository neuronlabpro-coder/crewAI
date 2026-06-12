'use client'

import { useState, useRef, useEffect } from 'react'
import type { Agent, PlaygroundMessage } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  agent: Agent
}

function genSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export default function Playground({ agent }: Props) {
  const [sessionId, setSessionId] = useState(genSessionId)
  const [messages, setMessages]   = useState<PlaygroundMessage[]>([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    const msg = input.trim()
    if (!msg || loading) return
    setInput('')

    const userMsg: PlaygroundMessage = {
      role: 'user',
      content: msg,
      timestamp: new Date().toISOString(),
    }
    setMessages((m) => [...m, userMsg])
    setLoading(true)

    try {
      const res = await fetch('/api/playground', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: agent.slug,
          session_id: sessionId,
          client_id: 'admin-panel',
          message: msg,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error en el agente')

      const assistantMsg: PlaygroundMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: data.timestamp ?? new Date().toISOString(),
        model_used: data.model_used,
        tokens_used: data.tokens_used,
        skills_used: data.skills_used,
        sources: data.sources,
      }
      setMessages((m) => [...m, assistantMsg])
    } catch (err) {
      const errMsg: PlaygroundMessage = {
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Error desconocido'}`,
        timestamp: new Date().toISOString(),
      }
      setMessages((m) => [...m, errMsg])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function clearSession() {
    setMessages([])
    setSessionId(genSessionId())
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] min-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-panel">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-ok animate-pulse" />
          <div>
            <p className="text-sm font-semibold text-ink">{agent.name}</p>
            <p className="text-xs text-dim font-mono">{agent.llm_model?.split('/')[1] ?? agent.llm_model}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigator.clipboard.writeText(agent.webhook_url ?? '')}
            className="text-xs text-dim hover:text-hi border border-line px-3 py-1.5 rounded-md transition-colors">
            Copiar Webhook
          </button>
          <button
            onClick={clearSession}
            className="text-xs text-dim hover:text-err border border-line px-3 py-1.5 rounded-md transition-colors">
            Nueva sesión
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm bg-canvas">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-dim">
            <p className="text-4xl mb-3">▸</p>
            <p className="text-sm">Escribe un mensaje para iniciar</p>
            <p className="text-xs mt-1 font-sans">
              Sesión: <span className="text-ok">{sessionId}</span>
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg p-4 ${
              msg.role === 'user'
                ? 'bg-raised border border-hi/20 dark:bg-[#0f1f18] dark:border-green-900/30'
                : 'bg-panel border border-line'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-sans font-semibold uppercase tracking-wider ${
                  msg.role === 'user'
                    ? 'text-hi dark:text-green-400'
                    : 'text-dim'
                }`}>
                  {msg.role === 'user' ? '▸ User' : `▸ ${agent.slug}`}
                </span>
                <span className="text-[10px] text-dim font-sans ml-auto">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <pre className={`whitespace-pre-wrap font-mono text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'text-ink dark:text-green-400'
                  : 'text-ink'
              }`}>
                {msg.content}
              </pre>
              {msg.role === 'assistant' && (msg.model_used || msg.skills_used?.length) && (
                <div className="mt-3 pt-3 border-t border-line flex flex-wrap gap-2 font-sans">
                  {msg.model_used && (
                    <span className="text-[10px] text-dim">
                      modelo: <span className="text-hi">{msg.model_used}</span>
                    </span>
                  )}
                  {msg.skills_used?.length ? (
                    <span className="text-[10px] text-dim">
                      skills: <span className="text-ok">{msg.skills_used.join(', ')}</span>
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-panel border border-line rounded-lg p-4 text-dim">
              <span className="animate-pulse">▸ procesando</span>
              <span className="animate-ping ml-1">_</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-line bg-panel">
        <div className="flex gap-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje… (Enter para enviar, Shift+Enter para nueva línea)"
            rows={2}
            disabled={loading}
            className="flex-1 bg-raised border-line text-ink placeholder:text-dim font-mono text-sm resize-none focus:border-hi focus:ring-0"
          />
          <Button
            onClick={send}
            disabled={loading || !input.trim()}
            className="bg-cta text-white hover:bg-cta-hi dark:bg-ok dark:text-[#0a0a0f] dark:hover:opacity-90 font-bold self-end px-5">
            {loading ? '…' : '▶'}
          </Button>
        </div>
      </div>
    </div>
  )
}
