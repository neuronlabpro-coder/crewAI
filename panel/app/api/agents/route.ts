import { NextRequest, NextResponse } from 'next/server'
import { getAgents, createAgent } from '@/lib/insforge'

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
    const body = await req.json()
    const agent = await createAgent(body)
    return NextResponse.json(agent, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
