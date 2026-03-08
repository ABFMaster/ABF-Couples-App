'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Sparkles, Heart, Sun, User } from 'lucide-react'

const EXCLUDED = ['/login', '/signup', '/onboarding', '/connect', '/assessment', '/shared/add']

const TABS = [
  { href: '/dashboard', icon: Home,     label: 'Home' },
  { href: '/ai-coach',  icon: Sparkles, label: 'Nora' },
  { href: '/us',        icon: Heart,    label: 'Us' },
  { href: '/today',     icon: Sun,      label: 'Today' },
  { href: '/profile',   icon: User,     label: 'Profile' },
]

export default function BottomNav({ badgeTabs = {} }) {
  const pathname = usePathname()

  if (EXCLUDED.some(p => pathname.startsWith(p))) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100">
      <div className="flex items-center justify-around px-2 py-2 pb-2 max-w-lg mx-auto">
        {TABS.map(tab => {
          const active =
            pathname === tab.href ||
            (tab.href !== '/dashboard' && pathname.startsWith(tab.href))
          const tabKey = tab.href.replace('/', '') || 'dashboard'
          const hasBadge = !!badgeTabs[tabKey]
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all min-w-[60px] ${
                active ? 'text-[#E8614D]' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className="relative">
                <tab.icon size={22} strokeWidth={1.75} />
                {hasBadge && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-[#E8614D] rounded-full" />
                )}
              </div>
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
