export const GAME_MODE_CONFIG = {
  'rabbit-hole': {
    id: 'rabbit-hole',
    name: 'The Rabbit Hole',
    tagline: 'Follow a thread together. See where it leads.',
    hasTimer: true,
    timerOptions: [
      { minutes: 30, label: '30 min', description: 'Quick dive' },
      { minutes: 60, label: '1 hour', description: 'Good depth' },
      { minutes: 90, label: '90 min', description: 'Go deep' },
    ],
    defaultTimer: 60,
    materials: [
      { emoji: '📱', text: 'Your phone — you\'ll be leaving the app to explore' },
      { emoji: '🧠', text: 'A curious mind. Nora picks the topic.' },
    ],
    playPath: '/game-room/rabbit-hole/play',
  },
  'hot-take': {
    id: 'hot-take',
    name: 'Hot Take',
    tagline: 'Rapid fire. Agree or disagree.',
    hasTimer: false,
    materials: [
      { emoji: '🔥', text: 'Just yourselves. Opinions optional but recommended.' },
      { emoji: '👀', text: 'In person? You\'ll be showing each other your screens.' },
    ],
    playPath: '/game-room/hot-take',
  },
  'the-call': {
    id: 'the-call',
    name: 'The Call',
    tagline: 'How well does your partner know your instincts?',
    hasTimer: false,
    materials: [
      { emoji: '🧠', text: 'Just yourselves. No prep needed.' },
      { emoji: '👀', text: 'Your partner thinks they know what you\'d do. Let\'s find out.' },
    ],
    playPath: '/game-room/call/play',
  },
  challenge: {
    id: 'challenge',
    name: 'The Challenge',
    description: 'Nora picks a challenge. You two deliver.',
    playPath: '/game-room/challenge/play',
    supportsTimer: false,
    supportsTogether: true,
    supportsRemote: true,
  },
  'remake': {
    id: 'remake',
    name: 'The Remake',
    tagline: 'Recreate something from your story.',
    hasTimer: false,
    materials: [
      { emoji: '📸', text: 'Camera roll — you might need a photo for reference' },
      { emoji: '❓', text: 'Nora picks a moment from your history. You bring it back.' },
    ],
    playPath: '/game-room/remake/play',
  },
  'the-hunt': {
    id: 'the-hunt',
    name: 'The Hunt',
    tagline: 'Nora builds you a scavenger hunt.',
    hasTimer: false,
    materials: [
      { emoji: '🧠', text: 'Your memory — the clues come from your relationship' },
      { emoji: '💡', text: 'Hints are available but cost you' },
    ],
    playPath: '/game-room/the-hunt/play',
  },
}

export const getModeConfig = (mode) => GAME_MODE_CONFIG[mode] || GAME_MODE_CONFIG['rabbit-hole']
