'use client'

const activityTypeConfig = {
  flight: { icon: '✈️', label: 'Flight', color: 'bg-blue-100 text-blue-600' },
  hotel: { icon: '🏨', label: 'Hotel', color: 'bg-cream-100 text-indigo-500' },
  restaurant: { icon: '🍽️', label: 'Restaurant', color: 'bg-orange-100 text-orange-600' },
  activity: { icon: '🎯', label: 'Activity', color: 'bg-green-100 text-green-600' },
  transport: { icon: '🚗', label: 'Transport', color: 'bg-gray-100 text-gray-600' },
  other: { icon: '📍', label: 'Other', color: 'bg-cream-100 text-coral-600' },
}

export default function ItineraryDay({ dayNumber, date, items, onAddItem, onDeleteItem }) {
  const formatTime = (time) => {
    if (!time) return null
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Day Header */}
      <div className="bg-gradient-to-r from-coral-500 to-indigo-500 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Day {dayNumber}</h3>
            <p className="text-coral-100 text-sm">
              {date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>
          <button
            onClick={onAddItem}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Activities */}
      <div className="p-4">
        {items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item) => {
              const config = activityTypeConfig[item.activity_type] || activityTypeConfig.other

              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group"
                >
                  {/* Time Column */}
                  <div className="w-16 text-center flex-shrink-0">
                    {item.start_time ? (
                      <p className="text-sm font-medium text-gray-800">
                        {formatTime(item.start_time)}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400">TBD</p>
                    )}
                  </div>

                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${config.color}`}>
                    <span className="text-lg">{config.icon}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-800">{item.title}</h4>
                    {item.location && (
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                        <span>📍</span> {item.location}
                      </p>
                    )}
                    {item.confirmation_number && (
                      <p className="text-xs text-gray-400 mt-1 font-mono">
                        Conf: {item.confirmation_number}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-sm text-gray-500 mt-1">{item.notes}</p>
                    )}
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-1"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-gray-400 mb-3">No activities planned yet</p>
            <button
              onClick={onAddItem}
              className="text-coral-500 hover:text-coral-600 text-sm font-medium"
            >
              + Add your first activity
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
