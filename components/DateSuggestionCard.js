'use client'

// Category icons and colors
const categoryConfig = {
  dinner: { icon: '🍽️', color: 'from-orange-400 to-red-400', label: 'Dinner' },
  museum: { icon: '🎨', color: 'from-purple-400 to-indigo-400', label: 'Culture' },
  music: { icon: '🎵', color: 'from-pink-400 to-purple-400', label: 'Music' },
  outdoor: { icon: '🌲', color: 'from-green-400 to-teal-400', label: 'Outdoor' },
  activity: { icon: '🎯', color: 'from-blue-400 to-cyan-400', label: 'Activity' },
  show: { icon: '🎭', color: 'from-red-400 to-pink-400', label: 'Show' },
  cozy: { icon: '🏠', color: 'from-amber-400 to-orange-400', label: 'Cozy' },
  adventure: { icon: '🎢', color: 'from-cyan-400 to-blue-400', label: 'Adventure' },
  creative: { icon: '✨', color: 'from-violet-400 to-purple-400', label: 'Creative' },
}

const locationIcons = {
  restaurant: '🍴',
  venue: '🏛️',
  outdoor: '🌿',
  home: '🏠',
  virtual: '💻',
  various: '📍',
}

export default function DateSuggestionCard({ suggestion, onClick }) {
  const config = categoryConfig[suggestion.category] || categoryConfig.creative
  const locationIcon = locationIcons[suggestion.location_type] || '📍'

  // Format duration
  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  // Budget display
  const budgetDisplay = '$'.repeat(suggestion.budget_level)
  const budgetColors = {
    1: 'text-green-500',
    2: 'text-yellow-500',
    3: 'text-orange-500',
    4: 'text-red-500',
  }

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all hover:scale-[1.02] text-left overflow-hidden group"
    >
      {/* Header with gradient */}
      <div className={`bg-gradient-to-r ${config.color} p-4 relative`}>
        <div className="flex items-start justify-between">
          <span className="text-4xl">{config.icon}</span>
          <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">
            {config.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-gray-800 text-lg mb-2 group-hover:text-pink-600 transition-colors line-clamp-2">
          {suggestion.title}
        </h3>

        <p className="text-gray-500 text-sm mb-3 line-clamp-2">
          {suggestion.description}
        </p>

        {/* Meta info */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            {/* Budget */}
            <span className={`font-bold ${budgetColors[suggestion.budget_level]}`}>
              {budgetDisplay}
            </span>

            {/* Duration */}
            <span className="text-gray-400 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatDuration(suggestion.estimated_duration)}
            </span>

            {/* Location type */}
            <span className="text-gray-400">{locationIcon}</span>
          </div>

          {/* Arrow */}
          <svg
            className="w-5 h-5 text-gray-300 group-hover:text-pink-500 group-hover:translate-x-1 transition-all"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  )
}
