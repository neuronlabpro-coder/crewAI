import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

const SCRIPT_MAP: Record<string, string> = {
  'server-scan':    'neuronguard_server_scan.py',
  'log-analysis':   'neuronguard_log_analyzer.py',
  'secret-scan':    'neuronguard_secret_scan.py',
  'container-audit':'neuronguard_docker_audit.py',
  'red-team':       'neuronguard_redteam.py',
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const filename = SCRIPT_MAP[slug]
  if (!filename) {
    return NextResponse.json({ error: 'No installer for this agent' }, { status: 404 })
  }

  const apiUrl = process.env.AGENTS_API_URL ?? 'https://api-agents.shyntai.com'
  const filePath = path.join(process.cwd(), 'public', 'installers', filename)

  let content: string
  try {
    content = await readFile(filePath, 'utf-8')
  } catch {
    return NextResponse.json({ error: 'Script file not found' }, { status: 500 })
  }

  // Inject the correct API URL so the user doesn't have to configure it
  content = content.replace(
    /NEURONGUARD_URL\s*=\s*os\.getenv\([^)]+\)/,
    `NEURONGUARD_URL = os.getenv("NEURONGUARD_URL", "${apiUrl}")`
  )

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/x-python',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
