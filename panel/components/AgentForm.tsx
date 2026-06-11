'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Agent, AgentFormData } from '@/lib/types'
import { FEATHERLESS_MODELS, OPENROUTER_MODELS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  const [error, setError] = useState('')
  const isCreate = !initialData

  const [form, setForm] = useState<AgentFormData>({
    name: initialData?.name ?? '',
    slug: initialData?.slug ?? '',
    role: initialData?.role ?? '',
    goal: initialData?.goal ?? '',
    backstory: initialData?.backstory ?? '',
    llm_model: initialData?.llm_model ?? 'moonshotai/Kimi-K2.6',
    llm_model_prod: initialData?.llm_model_prod ?? 'anthropic/claude-fable-5',
    max_tokens: initialData?.max_tokens ?? 2048,
    temperature: initialData?.temperature ?? 0.1,
    mcp_domains: initialData?.mcp_domains ?? [],
    qdrant_collection: initialData?.qdrant_collection ?? '',
    agent_type: initialData?.agent_type ?? 'expert',
    active: initialData?.active !== false,
  })

  const [domainInput, setDomainInput] = useState('')

  useEffect(() => {
    if (isCreate) {
      setForm((f) => ({
        ...f,
        slug: slugify(f.name),
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

  const field = 'bg-[#0f0f1a] border-[#1a1a2e] text-[#e2e8f0] placeholder:text-[#4a5568] focus:border-[#00ff88] focus:ring-0'
  const section = 'space-y-4 p-5 rounded-lg border border-[#1a1a2e] bg-[#0a0a0f]'
  const sectionTitle = 'text-xs font-semibold uppercase tracking-widest text-[#00ff88] mb-4'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Identidad */}
      <div className={section}>
        <p className={sectionTitle}>Identidad</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[#6b7884] text-xs">Nombre</Label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)}
              placeholder="Análisis de Vulnerabilidades" className={field} required />
          </div>
          <div className="space-y-2">
            <Label className="text-[#6b7884] text-xs">Slug</Label>
            <Input value={form.slug} onChange={(e) => set('slug', e.target.value)}
              placeholder="vuln-analysis" className={`${field} font-mono`} required />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[#6b7884] text-xs">Tipo</Label>
            <select value={form.agent_type} onChange={(e) => set('agent_type', e.target.value as 'expert' | 'teacher')}
              className={`${field} w-full h-9 px-3 rounded-md text-sm`}>
              <option value="expert">Expert</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Switch checked={form.active} onCheckedChange={(v) => set('active', v)} />
            <Label className="text-[#e2e8f0] text-sm">{form.active ? 'Activo' : 'Inactivo'}</Label>
          </div>
        </div>
      </div>

      {/* CrewAI Config */}
      <div className={section}>
        <p className={sectionTitle}>CrewAI Config</p>
        <div className="space-y-2">
          <Label className="text-[#6b7884] text-xs">Rol</Label>
          <Input value={form.role} onChange={(e) => set('role', e.target.value)}
            placeholder="Experto en análisis de vulnerabilidades con 15 años de experiencia" className={field} />
        </div>
        <div className="space-y-2">
          <Label className="text-[#6b7884] text-xs">Objetivo (Goal)</Label>
          <Textarea value={form.goal} onChange={(e) => set('goal', e.target.value)}
            placeholder="Objetivo principal del agente..." rows={2}
            className={`${field} resize-none`} />
        </div>
        <div className="space-y-2">
          <Label className="text-[#6b7884] text-xs">Backstory / System Prompt</Label>
          <Textarea value={form.backstory} onChange={(e) => set('backstory', e.target.value)}
            placeholder="System prompt completo del agente..." rows={10}
            className={`${field} resize-y font-mono text-xs leading-relaxed`} />
        </div>
      </div>

      {/* LLM Config */}
      <div className={section}>
        <p className={sectionTitle}>LLM Config</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[#6b7884] text-xs">Modelo Dev (Featherless)</Label>
            <select value={form.llm_model} onChange={(e) => set('llm_model', e.target.value)}
              className={`${field} w-full h-9 px-3 rounded-md text-sm`}>
              {FEATHERLESS_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-[#6b7884] text-xs">Modelo Prod (OpenRouter)</Label>
            <select value={form.llm_model_prod} onChange={(e) => set('llm_model_prod', e.target.value)}
              className={`${field} w-full h-9 px-3 rounded-md text-sm`}>
              {OPENROUTER_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-[#6b7884] text-xs">Max Tokens: <span className="text-[#00ff88]">{form.max_tokens}</span></Label>
            <input type="range" min={512} max={4096} step={128} value={form.max_tokens}
              onChange={(e) => set('max_tokens', Number(e.target.value))}
              className="w-full accent-[#00ff88]" />
            <div className="flex justify-between text-xs text-[#4a5568]">
              <span>512</span><span>4096</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[#6b7884] text-xs">Temperatura: <span className="text-[#00ff88]">{form.temperature.toFixed(2)}</span></Label>
            <input type="range" min={0} max={1} step={0.05} value={form.temperature}
              onChange={(e) => set('temperature', Number(e.target.value))}
              className="w-full accent-[#00ff88]" />
            <div className="flex justify-between text-xs text-[#4a5568]">
              <span>0.0</span><span>1.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* RAG & Skills */}
      <div className={section}>
        <p className={sectionTitle}>RAG & Skills</p>
        <div className="space-y-2">
          <Label className="text-[#6b7884] text-xs">Colección Qdrant</Label>
          <Input value={form.qdrant_collection} onChange={(e) => set('qdrant_collection', e.target.value)}
            placeholder={`ag_${form.slug || 'mi-agente'}`} className={`${field} font-mono`} />
        </div>
        <div className="space-y-2">
          <Label className="text-[#6b7884] text-xs">Dominios MCP <span className="text-[#4a5568]">(Enter o coma para añadir)</span></Label>
          <div className="flex flex-wrap gap-2 p-3 rounded-md border border-[#1a1a2e] bg-[#0f0f1a] min-h-[42px]">
            {form.mcp_domains.map((d) => (
              <span key={d} className="flex items-center gap-1 bg-[#0a0a0f] border border-[#1a1a2e] text-[#00ff88] text-xs px-2 py-1 rounded">
                {d}
                <button type="button" onClick={() => removeDomain(d)} className="text-[#4a5568] hover:text-red-400 ml-1">×</button>
              </span>
            ))}
            <input value={domainInput} onChange={(e) => setDomainInput(e.target.value)}
              onKeyDown={addDomain} placeholder={form.mcp_domains.length === 0 ? 'vulnerability, cve, cvss…' : ''}
              className="bg-transparent text-[#e2e8f0] text-xs outline-none flex-1 min-w-[120px] placeholder:text-[#4a5568]" />
          </div>
        </div>
      </div>

      {/* Read-only info */}
      {initialData?.webhook_url && (
        <div className={section}>
          <p className={sectionTitle}>Info del Agente</p>
          <div className="space-y-2">
            <Label className="text-[#6b7884] text-xs">Webhook URL</Label>
            <div className="flex gap-2">
              <Input value={initialData.webhook_url} readOnly className={`${field} font-mono text-xs`} />
              <Button type="button" size="sm" variant="ghost"
                className="text-[#6b7884] hover:text-[#00ff88] border border-[#1a1a2e]"
                onClick={() => navigator.clipboard.writeText(initialData.webhook_url!)}>
                Copiar
              </Button>
            </div>
          </div>
          {initialData.created_at && (
            <p className="text-xs text-[#4a5568]">
              Creado: {new Date(initialData.created_at).toLocaleString()} ·
              Actualizado: {new Date(initialData.updated_at!).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-md bg-red-950/50 border border-red-800 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}
          className="bg-[#00ff88] text-[#0a0a0f] hover:bg-[#00e67a] font-semibold">
          {saving ? 'Guardando…' : submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}
          className="text-[#6b7884] hover:text-[#e2e8f0]">
          Cancelar
        </Button>
      </div>
    </form>
  )
}
