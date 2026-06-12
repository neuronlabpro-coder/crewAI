import { NextRequest, NextResponse } from 'next/server'
import { getAgents, createAgent } from '@/lib/insforge'

async function ensureQdrantCollection(slug: string): Promise<void> {
  const qdrantUrl  = process.env.QDRANT_URL
  const qdrantKey  = process.env.QDRANT_API_KEY
  if (!qdrantUrl || !qdrantKey) return

  const collection = `ag_${slug.replace(/-/g, '_')}`

  try {
    // Check if collection already exists
    const check = await fetch(`${qdrantUrl}/collections/${collection}`, {
      headers: { 'api-key': qdrantKey },
    })

    if (check.status === 200) return  // already exists

    // Create with 1024-dim Cosine (Qwen/Qwen3-Embedding-0.6B)
    const create = await fetch(`${qdrantUrl}/collections/${collection}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'api-key': qdrantKey },
      body: JSON.stringify({
        vectors: { size: 1024, distance: 'Cosine' },
      }),
    })

    if (!create.ok) {
      const err = await create.json()
      console.error(`Qdrant: failed to create ${collection}`, err)
    } else {
      console.log(`Qdrant: created collection ${collection}`)
    }
  } catch (err) {
    // Non-blocking — log but don't fail agent creation
    console.error('Qdrant: connection error', err)
  }
}

export async function GET() {
  try {
    const agents = await getAgents()
    return NextResponse.json(agents)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body  = await req.json()
    const agent = await createAgent(body)

    // Auto-create Qdrant collection (non-blocking, follows ag_{slug} convention)
    void ensureQdrantCollection(agent.slug ?? body.slug)

    return NextResponse.json(agent, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
