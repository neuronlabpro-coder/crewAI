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
      {/* Breadcrumb */}
      <div className="px-6 py-3 border-b border-[#1a1a2e] flex items-center gap-2 text-xs text-[#6b7884] shrink-0">
        <Link href="/agents" className="hover:text-[#e2e8f0] transition-colors">Agentes</Link>
        <span>›</span>
        <Link href={`/agents/${slug}`} className="hover:text-[#e2e8f0] transition-colors">{agent.name}</Link>
        <span>›</span>
        <span className="text-[#00ff88]">Playground</span>
      </div>

      <div className="flex-1 overflow-hidden">
        <Playground agent={agent} />
      </div>
    </div>
  )
}
