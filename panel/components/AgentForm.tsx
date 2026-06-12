'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Agent, AgentFormData } from '@/lib/types'
import { FEATHERLESS_MODELS, OPENROUTER_MODELS } from '@/lib/types'
import { Switch } from '@/components/ui/switch'

interface Props {
  initialData?: Agent
  onSubmit: (data: AgentFormData) => Promise<void>
  submitLabel?: string
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function AgentForm({ initialData, onSubmit, submitLabel = 'Guardar' }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const isCreate = !initialData

  const [form, setForm] = useState<AgentFormData>({
    name:              initialData?.name             ?? '',
    slug:              initialData?.slug             ?? '',
    role:              initialData?.role             ?? '',
    goal:              initialData?.goal             ?? '',
    backstory:         initialData?.backstory        ?? '',
    llm_model:         initialData?.llm_model        ?? 'moonshotai/Kimi-K2.6',
    llm_model_prod:    initialData?.llm_model_prod   ?? 'anthropic/claude-fable-5',
    max_tokens:        initialData?.max_tokens       ?? 2048,
    temperature:       initialData?.temperature      ?? 0.1,
    mcp_domains:       initialData?.mcp_domains      ?? [],
    qdrant_collection: initialData?.qdrant_collection ?? '',
    agent_type:        initialData?.agent_type       ?? 'expert',
    active:            initialData?.active !== false,
  })

  const [domainInput, setDomainInput] = useState('')

  useEffect(() => {
    if (isCreate) {
      setForm((f) => ({
        ...f,
        slug:              slugify(f.name),
        qdrant_collection: `ag_${slugify(f.name)}`,
      }))
    }
  }, [form.name, isCreate])

  function set<K extends keyof AgentFormData>(k: K, v: AgentFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function addDomain(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const val = domainInput.trim().replace(/,$/, '')
      if (val && !form.mcp_domains.includes(val)) {
        set('mcp_domains', [...form.mcp_domains, val])
      }
      setDomainInput('')
    }
  }

  function removeDomain(d: string) {
    set('mcp_domains', form.mcp_domains.filter((x) => x !== d))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSubmit(form)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSaving(false)
    }
  }

  const field   = 'w-full h-9 px-3 rounded-md border border-line bg-panel text-ink text-sm placeholder:text-dim outline-none focus:border-hi transition-colors'
  const section = 'space-y-4 p-6 rounded-lg border border-line bg-panel'
  const lbl     = 'block font-display text-[0.72rem] font-medium tracking-[0.14em] uppercase text-dim mb-1.5'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Identidad */}
      <div className={section}>
        <p className={`${lbl} !mb-4`}>Identidad</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Nombre</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)}
              placeholder="Análisis de Vulnerabilidades" className={field} required />
          </div>
          <div>
            <label className={lbl}>Slug</label>
            <input value={form.slug} onChange={(e) => set('slug', e.target.value)}
              placeholder="vuln-analysis" className={`${field} font-mono`} required />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Tipo</label>
            <select value={form.agent_type}
              onChange={(e) => set('agent_type', e.target.value as 'expert' | 'teacher')}
              className={field}>
              <option value="expert">Expert</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>
          <div className="flex items-center gap-3 pt-5">
            <Switch checked={form.active} onCheckedChange={(v) => set('active', v)} />
            <span className="text-sm text-ink">{form.active ? 'Activo' : 'Inactivo'}</span>
          </div>
        </div>
      </div>

      {/* CrewAI Config */}
      <div className={section}>
        <p className={`${lbl} !mb-4`}>CrewAI Config</p>
        <div>
          <label className={lbl}>Rol</label>
          <input value={form.role} onChange={(e) => set('role', e.target.value)}
            placeholder="Experto en análisis de vulnerabilidades" className={field} />
        </div>
        <div>
          <label className={lbl}>Objetivo</label>
          <textarea value={form.goal} onChange={(e) => set('goal', e.target.value)}
            placeholder="Objetivo principal del agente…" rows={2}
            className={`${field} h-auto py-2 resize-none`} />
        </div>
        <div>
          <label className={lbl}>System Prompt (Backstory)</label>
          <textarea value={form.backstory} onChange={(e) => set('backstory', e.target.value)}
            placeholder="System prompt completo del agente…" rows={10}
            className={`${field} h-auto py-2 resize-y font-mono text-xs leading-relaxed`} />
        </div>
      </div>

      {/* LLM Config */}
      <div className={section}>
        <p className={`${lbl} !mb-4`}>LLM Config</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Modelo Dev (Featherless)</label>
            <select value={form.llm_model} onChange={(e) => set('llm_model', e.target.value)}
              className={field}>
              {FEATHERLESS_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Modelo Prod (OpenRouter)</label>
            <select value={form.llm_model_prod} onChange={(e) => set('llm_model_prod', e.target.value)}
              className={field}>
              {OPENROUTER_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={lbl}>
              Max Tokens — <span className="text-hi normal-case tracking-normal">{form.max_tokens}</span>
            </label>
            <input type="range" min={512} max={4096} step={128} value={form.max_tokens}
              onChange={(e) => set('max_tokens', Number(e.target.value))}
              className="w-full accent-[var(--c-cta)] mt-1" />
            <div className="flex justify-between text-xs text-dim mt-1">
              <span>512</span><span>4096</span>
            </div>
          </div>
          <div>
            <label className={lbl}>
              Temperatura — <span className="text-hi normal-case tracking-normal">{form.temperature.toFixed(2)}</span>
            </label>
            <input type="range" min={0} max={1} step={0.05} value={form.temperature}
              onChange={(e) => set('temperature', Number(e.target.value))}
              className="w-full accent-[var(--c-cta)] mt-1" />
            <div className="flex justify-between text-xs text-dim mt-1">
              <span>0.0</span><span>1.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* RAG & Skills */}
      <div className={section}>
        <p className={`${lbl} !mb-4`}>RAG & Skills</p>
        <div>
          <label className={lbl}>Colección Qdrant</label>
          <input value={form.qdrant_collection}
            onChange={(e) => set('qdrant_collection', e.target.value)}
            placeholder={`ag_${form.slug || 'mi-agente'}`}
            className={`${field} font-mono`} />
        </div>
        <div>
          <label className={lbl}>
            Dominios MCP <span className="text-dim normal-case tracking-normal font-sans font-normal">— Enter o coma para añadir</span>
          </label>
          <div className="flex flex-wrap gap-2 p-3 rounded-md border border-line bg-panel min-h-[42px] focus-within:border-hi transition-colors">
            {form.mcp_domains.map((d) => (
              <span key={d} className="flex items-center gap-1 bg-raised border border-line text-ink text-xs px-2 py-0.5 rounded-sm font-mono">
                {d}
                <button type="button" onClick={() => removeDomain(d)}
                  className="text-dim hover:text-err ml-1 transition-colors">
                  ×
                </button>
              </span>
            ))}
            <input value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              onKeyDown={addDomain}
              placeholder={form.mcp_domains.length === 0 ? 'vulnerability, cve, cvss…' : ''}
              className="bg-transparent text-ink text-xs outline-none flex-1 min-w-[120px] placeholder:text-dim" />
          </div>
        </div>
      </div>

      {/* Info de solo lectura */}
      {initialData?.webhook_url && (
        <div className={section}>
          <p className={`${lbl} !mb-4`}>Info del Agente</p>
          <div>
            <label className={lbl}>Webhook URL</label>
            <div className="flex gap-2">
              <input value={initialData.webhook_url} readOnly
                className={`${field} font-mono text-xs text-dim`} />
              <button type="button"
                onClick={() => navigator.clipboard.writeText(initialData.webhook_url!)}
                className="px-3 h-9 text-xs rounded-md border border-line text-dim hover:text-ink hover:border-dim transition-colors whitespace-nowrap">
                Copiar
              </button>
            </div>
          </div>
          {initialData.created_at && (
            <p className="text-xs text-dim">
              Creado: {new Date(initialData.created_at).toLocaleString()} ·{' '}
              Actualizado: {new Date(initialData.updated_at!).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-md border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-[#ff4d4d] text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="px-5 py-2.5 bg-cta text-white text-sm font-display font-medium rounded-md hover:bg-cta-hi disabled:opacity-50 transition-colors">
          {saving ? 'Guardando…' : submitLabel}
        </button>
        <button type="button" onClick={() => router.back()}
          className="px-5 py-2.5 border border-line text-dim text-sm rounded-md hover:text-ink hover:border-dim transition-colors">
          Cancelar
        </button>
      </div>
    </form>
  )
}
