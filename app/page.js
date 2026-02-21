// app/page.js
// ABF Welcome Page

import Link from 'next/link'

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-pink-100 flex flex-col items-center justify-center p-4">
      {/* Logo Section */}
      <div className="mb-8 text-center">
        <div className="inline-block bg-gradient-to-r from-coral-400 to-coral-500 text-white rounded-2xl px-8 py-4 shadow-lg mb-4">
          <h1 className="text-4xl font-bold tracking-wider">ABF</h1>
          <p className="text-xs tracking-wide opacity-90">ALWAYS BE FLIRTING</p>
        </div>
      </div>

      {/* Welcome Text */}
      <div className="text-center max-w-md mb-8">
        <h2 className="text-3xl font-bold text-coral-600 mb-4">
          Welcome to ABF! 💕
        </h2>
        <p className="text-gray-600 text-lg">
          The app that helps couples fall more in love through meaningful conversations
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Link href="/signup" className="bg-coral-500 hover:bg-coral-600 text-white font-semibold py-4 px-8 rounded-full shadow-lg transition-all transform hover:scale-105 text-center">
          Get Started
        </Link>

        <button className="bg-transparent border-2 border-coral-500 text-coral-500 hover:bg-cream-50 font-semibold py-4 px-8 rounded-full transition-all">
          Learn More
        </button>
      </div>

      {/* Footer */}
      <p className="text-gray-400 text-sm mt-12">
        Join 10,000+ couples strengthening their relationships
      </p>
    </div>
  );
}
