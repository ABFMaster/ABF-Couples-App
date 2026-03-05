'use client'
import Link from 'next/link'

export default function UsPage() {
  return (
    <div className="min-h-screen bg-[#F7F4EF] flex flex-col items-center justify-center px-6 pb-32">
      <div className="text-5xl mb-4">💛</div>
      <h1 className="text-[22px] font-semibold text-neutral-900 mb-2"
          style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}>
        Us
      </h1>
      <p className="text-[14px] text-neutral-400 text-center max-w-xs">
        This is where your shared life lives — movies, restaurants, trips, and everything in between. Coming soon.
      </p>
    </div>
  )
}
