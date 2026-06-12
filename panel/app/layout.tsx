import type { Metadata } from 'next'
import Link from 'next/link'
import { Space_Grotesk, Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ThemeToggle } from '@/components/ThemeToggle'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
})

export const metadata: Metadata = {
  title: 'NeuronGuard Agent Admin',
  description: 'Panel de administración de agentes NeuronGuard',
}

const navLinks = [
  { href: '/',           label: 'Dashboard'    },
  { href: '/agents',     label: 'Agentes'      },
  { href: '/agents/new', label: 'Nuevo Agente' },
]

function Sidebar() {
  return (
    <aside className="w-56 shrink-0 border-r border-line bg-panel flex flex-col min-h-screen">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-line">
        <p className="font-display text-[0.72rem] font-medium tracking-[0.14em] uppercase text-ink">
          NeuronGuard
        </p>
        <p className="font-display text-[0.65rem] tracking-[0.14em] uppercase text-dim mt-0.5">
          Agent Admin
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navLinks.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center px-3 py-2 rounded-md text-sm text-dim hover:text-ink hover:bg-raised transition-colors"
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* Theme toggle + footer */}
      <div className="px-3 pb-2">
        <ThemeToggle />
      </div>
      <div className="px-5 py-4 border-t border-line">
        <p className="font-display text-[0.65rem] tracking-[0.14em] uppercase text-dim">
          42 Agentes
        </p>
        <p className="text-[0.65rem] text-dim mt-0.5">api-agents.shyntai.com</p>
      </div>
    </aside>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${spaceGrotesk.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="bg-canvas text-ink min-h-screen flex">
        <ThemeProvider>
          <Sidebar />
          <main className="flex-1 overflow-auto">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  )
}
