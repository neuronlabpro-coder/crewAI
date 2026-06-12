export interface Agent {
  id?: number
  slug: string
  name: string
  role?: string
  goal?: string
  backstory?: string
  llm_model?: string
  llm_model_prod?: string
  max_tokens?: number
  temperature?: number
  top_p?: number
  top_k?: number
  frequency_penalty?: number
  presence_penalty?: number
  repetition_penalty?: number
  min_p?: number
  verbose?: boolean
  allow_delegation?: boolean
  max_iter?: number
  mcp_domains?: string[]
  qdrant_collection?: string
  agent_type?: 'expert' | 'teacher'
  active?: boolean
  webhook_url?: string
  created_at?: string
  updated_at?: string
}

export interface AgentFormData {
  name: string
  slug: string
  role: string
  goal: string
  backstory: string
  llm_model: string
  llm_model_prod: string
  max_tokens: number
  temperature: number
  top_p: number
  top_k: number
  frequency_penalty: number
  presence_penalty: number
  repetition_penalty: number
  min_p: number
  verbose: boolean
  allow_delegation: boolean
  max_iter: number
  mcp_domains: string[]
  qdrant_collection: string
  agent_type: 'expert' | 'teacher'
  active: boolean
}

export interface PlaygroundMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  model_used?: string
  tokens_used?: number
  skills_used?: string[]
  sources?: string[]
}

export interface PlaygroundRequest {
  slug: string
  session_id: string
  client_id: string
  message: string
}

export interface PlaygroundResponse {
  session_id: string
  agent: string
  response: string
  sources: string[]
  skills_used: string[]
  tokens_used: number
  model_used: string
  request_id: string
  timestamp: string
}

export const FEATHERLESS_MODELS = [
  'deepseek-ai/DeepSeek-V4-Pro',
  'google/gemma-4-26B-A4B-it',
  'moonshotai/Kimi-K2.6',
  'moonshotai/Kimi-K2-Thinking',
  'zai-org/GLM-5.1',
] as const

export const OPENROUTER_MODELS = [
  'anthropic/claude-sonnet-4-7',
  'openai/gpt-4.1',
  'openai/gpt-4.1-mini',
  'anthropic/claude-fable-5',
  'openai/gpt-5.5',
] as const
