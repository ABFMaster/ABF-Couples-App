'use client'

export default function PackingItem({ item, partnerName, partnerId, userId, onToggle, onDelete }) {
  const isAssignedToMe = item.assigned_to === userId
  const assigneeName = isAssignedToMe ? 'You' : partnerName

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl transition-all group ${
        item.is_packed ? 'bg-green-50' : 'bg-gray-50 hover:bg-gray-100'
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
          item.is_packed
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-gray-300 hover:border-pink-400'
        }`}
      >
        {item.is_packed && (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Item Name */}
      <span
        className={`flex-1 ${
          item.is_packed ? 'text-gray-400 line-through' : 'text-gray-800'
        }`}
      >
        {item.item}
      </span>

      {/* Assignee Badge */}
      <span
        className={`text-xs px-2 py-1 rounded-full ${
          isAssignedToMe
            ? 'bg-pink-100 text-pink-600'
            : 'bg-purple-100 text-purple-600'
        }`}
      >
        {assigneeName}
      </span>

      {/* Delete Button */}
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
