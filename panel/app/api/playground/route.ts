import { NextRequest, NextResponse } from 'next/server'

const AGENTS_API_URL = process.env.AGENTS_API_URL!
const AGENTS_API_KEY = process.env.AGENTS_API_KEY!

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { slug, ...payload } = body as { slug: string; session_id: string; client_id: string; message: string }

    if (!slug) return NextResponse.json({ error: 'slug is required' }, { status: 400 })

    const res = await fetch(`${AGENTS_API_URL}/agent/${slug}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': AGENTS_API_KEY,
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: data }, { status: res.status })
    }

    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
