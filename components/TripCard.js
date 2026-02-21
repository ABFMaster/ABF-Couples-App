'use client'

const tripTypeConfig = {
  adventure: { icon: '🏔️', label: 'Adventure', color: 'bg-orange-100 text-orange-600' },
  relaxation: { icon: '🏖️', label: 'Relaxation', color: 'bg-blue-100 text-blue-600' },
  cultural: { icon: '🏛️', label: 'Cultural', color: 'bg-cream-100 text-indigo-500' },
  romantic: { icon: '💕', label: 'Romantic', color: 'bg-cream-100 text-coral-600' },
  mixed: { icon: '🌈', label: 'Mixed', color: 'bg-green-100 text-green-600' },
}

export default function TripCard({ trip, onClick, isActive = false, isPast = false }) {
  const typeConfig = tripTypeConfig[trip.trip_type] || tripTypeConfig.mixed
  const startDate = new Date(trip.start_date)
  const endDate = new Date(trip.end_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const daysUntil = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24))
  const tripDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl shadow-lg overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:scale-[1.02] ${
        isActive
          ? 'bg-gradient-to-br from-coral-500 to-indigo-500 text-white'
          : isPast
          ? 'bg-white/80'
          : 'bg-white'
      }`}
    >
      {/* Cover Photo or Gradient */}
      {trip.cover_photo_url ? (
        <div className="h-32 relative">
          <img
            src={trip.cover_photo_url}
            alt={trip.destination}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-3 left-3">
            <span className={`text-xs px-2 py-1 rounded-full ${typeConfig.color}`}>
              {typeConfig.icon} {typeConfig.label}
            </span>
          </div>
        </div>
      ) : (
        <div className={`h-24 bg-gradient-to-br ${
          isActive
            ? 'from-white/20 to-white/10'
            : isPast
            ? 'from-gray-100 to-gray-200'
            : 'from-cream-100 to-indigo-100'
        } flex items-center justify-center relative`}>
          <span className="text-5xl">{typeConfig.icon}</span>
          {!isActive && (
            <div className="absolute bottom-2 left-3">
              <span className={`text-xs px-2 py-1 rounded-full ${typeConfig.color}`}>
                {typeConfig.label}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <h3 className={`font-bold text-lg mb-1 ${
          isActive ? 'text-white' : isPast ? 'text-gray-600' : 'text-gray-800'
        }`}>
          {trip.destination}
        </h3>

        <p className={`text-sm mb-3 ${
          isActive ? 'text-white/80' : isPast ? 'text-gray-400' : 'text-gray-500'
        }`}>
          {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          <span className="mx-2">•</span>
          {tripDays} days
        </p>

        <div className="flex items-center justify-between">
          <div className={`text-sm ${
            isActive ? 'text-white/80' : isPast ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {'$'.repeat(trip.budget_level || 2)}
          </div>

          {isActive && (
            <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full animate-pulse">
              Now!
            </span>
          )}

          {!isActive && !isPast && daysUntil > 0 && daysUntil <= 30 && (
            <span className="bg-cream-100 text-coral-600 text-xs px-3 py-1 rounded-full">
              {daysUntil}d away
            </span>
          )}

          {isPast && (
            <span className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full">
              Completed
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
