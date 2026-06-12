import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAgent } from '@/lib/insforge'
import Playground from '@/components/Playground'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function PlaygroundPage({ params }: Props) {
  const { slug } = await params
  const agent = await getAgent(slug)
  if (!agent) notFound()

  return (
    <div className="flex flex-col h-screen">
      {/* Breadcrumb — muted text per design */}
      <div className="px-6 py-3 border-b border-line bg-panel flex items-center gap-2 text-xs text-dim shrink-0">
        <Link href="/agents" className="hover:text-ink transition-colors">Agentes</Link>
        <span className="text-dim">›</span>
        <Link href={`/agents/${slug}`} className="hover:text-ink transition-colors">{agent.name}</Link>
        <span className="text-dim">›</span>
        {/* tertiary in light, ink in dark — active/current page */}
        <span className="text-cta dark:text-ink font-display font-medium">Playground</span>
      </div>

      <div className="flex-1 overflow-hidden">
        <Playground agent={agent} />
      </div>
    </div>
  )
}
