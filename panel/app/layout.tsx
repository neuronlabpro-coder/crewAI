import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'NeuronGuard Agent Admin',
  description: 'Panel de administración de agentes NeuronGuard',
}

function Sidebar() {
  return (
    <aside className="w-56 shrink-0 border-r border-[#1a1a2e] bg-[#0a0a0f] flex flex-col min-h-screen">
      <div className="px-5 py-5 border-b border-[#1a1a2e]">
        <div className="flex items-center gap-2">
          <span className="text-[#00ff88] text-xl font-mono font-bold">▸</span>
          <div>
            <p className="text-xs font-bold text-[#e2e8f0] tracking-wider uppercase">NeuronGuard</p>
            <p className="text-[10px] text-[#4a5568] tracking-widest uppercase">Agent Admin</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {[
          { href: '/', label: 'Dashboard', icon: '◈' },
          { href: '/agents', label: 'Agentes', icon: '◉' },
          { href: '/agents/new', label: 'Nuevo Agente', icon: '+' },
        ].map(({ href, label, icon }) => (
          <Link key={href} href={href}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-[#6b7884] hover:text-[#00ff88] hover:bg-[#0f0f1a] transition-colors group">
            <span className="text-[#4a5568] group-hover:text-[#00ff88] font-mono text-xs w-4 text-center">{icon}</span>
            {label}
          </Link>
        ))}
      </nav>
      <div className="px-5 py-4 border-t border-[#1a1a2e]">
        <p className="text-[10px] text-[#4a5568] tracking-widest uppercase">42 Agentes</p>
        <p className="text-[10px] text-[#4a5568]">api-agents.shyntai.com</p>
      </div>
    </aside>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className="bg-[#0a0a0f] text-[#e2e8f0] min-h-screen flex">
        <Sidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </body>
    </html>
  )
}
