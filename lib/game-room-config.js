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
  story: {
    id: 'story',
    name: 'Write a Story',
    description: 'Build a story together, one blind sentence at a time.',
    playPath: '/game-room/challenge/play',
    supportsTimer: false,
    supportsTogether: true,
    supportsRemote: true,
  },
  pitch: {
    id: 'pitch',
    name: 'The Pitch',
    description: 'Pitch an idea. Nora challenges it. Defend it.',
    playPath: '/game-room/challenge/play',
    supportsTimer: false,
    supportsTogether: true,
    supportsRemote: true,
    // Solo-eligible (task #260/#262) — the opponent is always Nora, never the
    // partner, so this plays end-to-end with one account and no second person
    // needed at all. Unlike the pass-and-play candidates below, this isn't
    // "your partner just doesn't have an account" — it's genuinely solo.
    soloEligible: true,
  },
  rank: {
    id: 'rank',
    name: 'Rank It',
    description: 'Rank independently. Reconcile together. See where you land.',
    playPath: '/game-room/challenge/play',
    supportsTimer: false,
    supportsTogether: true,
    supportsRemote: true,
  },
  plan: {
    id: 'plan',
    name: 'Make a Plan',
    description: 'Nora gives you something to plan. You build it together.',
    playPath: '/game-room/challenge/play',
    supportsTimer: false,
    supportsTogether: true,
    supportsRemote: true,
    // Solo-eligible (task #260/#262) — one person can plan something on their
    // own with Nora; no partner account required. See pitch's comment above.
    soloEligible: true,
  },
  memory: {
    id: 'memory',
    name: 'Memory Test',
    description: 'How well do you actually know each other? Nora finds out.',
    playPath: '/game-room/challenge/play',
    supportsTimer: false,
    supportsTogether: true,
    supportsRemote: true,
    locked: true,
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
    tagline: 'Nora gives you a mission. You go do it.',
    hasTimer: false,
    materials: [
      { emoji: '🗺️', text: 'Nora picks a mission built for you two' },
      { emoji: '📍', text: 'Leave the app — come back with a story' },
    ],
    playPath: '/game-room/the-hunt/play',
  },
}

export const getModeConfig = (mode) => GAME_MODE_CONFIG[mode] || GAME_MODE_CONFIG['rabbit-hole']

// Single source of truth for which modes a solo (no-partner-account) user can
// actually play today — task #260/#262. Derived from soloEligible rather than
// hand-maintained twice, so lobby/page.js and game-room/page.js can't drift.
// Hot Take, The Call, Rank It, and Write a Story were audited (Aug 19 2026,
// Sessions/PRODUCT_BACKLOG.md) as good single-device pass-and-play candidates
// — but that shape needs a real-life second person on the same device using a
// proxy-answer data model (like Bet's solo_proxy pattern), which doesn't exist
// yet for any of these four. Deliberately NOT marked soloEligible until that's
// actually built — see the "tracked fast-follow" note in the backlog.
export const SOLO_ELIGIBLE_MODES = Object.values(GAME_MODE_CONFIG)
  .filter(m => m.soloEligible)
  .map(m => m.id)

// Copy for the Game Room home page's solo-lock state — modes that work fine
// for coupled users today but have no solo path yet (distinct from Memory
// Test's eligibility lock and Remake's not-built-yet "Soon" state, which keep
// their own existing copy/labels).
export const SOLO_LOCKED_COPY = {
  headline: 'This one needs your partner in the app.',
  body: 'Right now this game plays across two accounts. Once your partner joins, it unlocks automatically — no extra setup.',
  cta: 'Invite your partner',
}
