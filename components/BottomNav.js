'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const EXCLUDED = ['/login', '/signup', '/onboarding', '/connect', '/assessment', '/shared/add']

const TABS = [
  { href: '/dashboard', emoji: '🏠', label: 'Home' },
  { href: '/ai-coach',  emoji: '💬', label: 'Coach' },
  { href: '/shared',    emoji: '💑', label: 'Our Space' },
  { href: '/profile',   emoji: '👤', label: 'Profile' },
]

export default function BottomNav() {
  const pathname = usePathname()

  if (EXCLUDED.some(p => pathname.startsWith(p))) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100">
      <div className="flex items-center justify-around px-2 py-2 pb-2 max-w-lg mx-auto">
        {TABS.map(tab => {
          const active =
            pathname === tab.href ||
            (tab.href !== '/dashboard' && pathname.startsWith(tab.href))
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all min-w-[60px] ${
                active ? 'text-[#E8614D]' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="text-2xl leading-none">{tab.emoji}</span>
              <span className={`text-[10px] font-semibold tracking-wide ${active ? 'text-[#E8614D]' : 'text-gray-400'}`}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
