// lib/ritual-suggestions.js
// Curated ritual suggestions for The Ritual feature.
// Grounded in Gottman research on rituals of connection.
// Tiers: 1 = free/zero friction, 2 = light planning, 3 = seasonal/bigger investment
// Tags used for profile-based matching and filtering.

export const RITUAL_SUGGESTIONS = [

  // ─── TIER 1: DAILY ───────────────────────────────────────────────────────

  {
    id: 'r001',
    title: 'The Six-Second Kiss',
    description: 'Not a peck — a real one. Pick your moment: morning goodbye, coming home, before bed. Gottman calls it a kiss with potential.',
    frequency: 'daily',
    tier: 1,
    tags: ['physical', 'morning', 'evening', 'goodbye', 'reunion'],
    seasonal: false,
  },
  {
    id: 'r002',
    title: 'Name One Thing',
    description: 'Before bed, one of you names something specific you appreciated about the other today. No discussion required. Just say it and let it land.',
    frequency: 'daily',
    tier: 1,
    tags: ['verbal', 'evening', 'appreciation', 'emotional'],
    seasonal: false,
  },
  {
    id: 'r003',
    title: 'The Reunion',
    description: 'When you first see each other after the day, 20 seconds of real contact before anything else. No phones, no logistics, no "what\'s for dinner." Just hello.',
    frequency: 'daily',
    tier: 1,
    tags: ['physical', 'evening', 'reunion', 'emotional'],
    seasonal: false,
  },
  {
    id: 'r004',
    title: 'The Stress Download',
    description: 'Fifteen minutes. One of you talks about what\'s weighing on them — work, family, anything outside this relationship. The other\'s only job is to listen and be on their side. No advice unless asked.',
    frequency: 'daily',
    tier: 1,
    tags: ['verbal', 'emotional', 'evening', 'support'],
    seasonal: false,
  },
  {
    id: 'r005',
    title: 'The Real Question',
    description: 'Before the day starts, one of you asks something that actually matters. Not "what do you have today." Something real. You\'ll know it when you think of it.',
    frequency: 'daily',
    tier: 1,
    tags: ['verbal', 'morning', 'emotional', 'curiosity'],
    seasonal: false,
  },
  {
    id: 'r006',
    title: 'Eyes Before Phones',
    description: 'First thing in the morning, before either of you looks at a screen, look at each other. Even for thirty seconds. It sets a different tone for the whole day.',
    frequency: 'daily',
    tier: 1,
    tags: ['physical', 'morning', 'presence', 'emotional'],
    seasonal: false,
  },
  {
    id: 'r007',
    title: 'The Goodnight Check-In',
    description: 'Before sleep, one sentence each: how you\'re actually feeling right now. Not a recap of the day — just where you are in this moment.',
    frequency: 'daily',
    tier: 1,
    tags: ['verbal', 'evening', 'emotional', 'presence'],
    seasonal: false,
  },
  {
    id: 'r008',
    title: 'The Long Hug',
    description: 'Once a day, a hug that lasts longer than feels normal. No agenda. Just hold on for a second longer than you usually would.',
    frequency: 'daily',
    tier: 1,
    tags: ['physical', 'emotional', 'daily'],
    seasonal: false,
  },

  // ─── TIER 1: WEEKLY ──────────────────────────────────────────────────────

  {
    id: 'r009',
    title: 'Your Weekly Meal',
    description: 'Same night every week. One of you cooks, or you cook together. No phones at the table. It becomes yours — the Thursday steak, the Sunday soup, whatever it is.',
    frequency: 'weekly',
    tier: 1,
    tags: ['food', 'weekly', 'presence', 'tradition'],
    seasonal: false,
  },
  {
    id: 'r010',
    title: 'The Walk',
    description: 'Same time, same general direction, no destination required. No phones. The conversation finds you. Even twenty minutes changes something.',
    frequency: 'weekly',
    tier: 1,
    tags: ['outdoor', 'physical', 'weekly', 'presence'],
    seasonal: false,
  },
  {
    id: 'r011',
    title: 'Sunday Morning Slow',
    description: 'No agenda for the first hour of Sunday. Coffee, no scrolling, nowhere to be yet. Just the two of you and whatever comes up.',
    frequency: 'weekly',
    tier: 1,
    tags: ['morning', 'presence', 'weekly', 'slow'],
    seasonal: false,
  },
  {
    id: 'r012',
    title: 'The Show',
    description: 'One show, watched together, one or two episodes at a time. No watching ahead. The anticipation and the conversation after are the ritual.',
    frequency: 'weekly',
    tier: 1,
    tags: ['indoor', 'evening', 'weekly', 'shared'],
    seasonal: false,
  },
  {
    id: 'r013',
    title: 'The Appreciation Round',
    description: 'Once a week, each of you names three specific things you appreciated about the other this week. Not general — specific. "The way you handled that call on Tuesday." That level.',
    frequency: 'weekly',
    tier: 1,
    tags: ['verbal', 'weekly', 'appreciation', 'emotional'],
    seasonal: false,
  },
  {
    id: 'r014',
    title: 'Tech-Free Evening',
    description: 'One evening a week, phones go face-down at dinner and stay there. No exceptions. It feels strange the first time. Less strange every time after that.',
    frequency: 'weekly',
    tier: 1,
    tags: ['presence', 'weekly', 'indoor', 'evening'],
    seasonal: false,
  },
  {
    id: 'r015',
    title: 'The Song',
    description: 'One of you picks a song on Friday that represents your week or how you\'re feeling about the relationship right now. Share it without explaining it. Let the other one figure it out.',
    frequency: 'weekly',
    tier: 1,
    tags: ['music', 'weekly', 'creative', 'emotional'],
    seasonal: false,
  },
  {
    id: 'r016',
    title: 'Morning Coffee Together',
    description: 'Before the day takes over, fifteen minutes with coffee and no agenda. Talk about whatever. Or don\'t talk. Just be in the same space with intention.',
    frequency: 'weekly',
    tier: 1,
    tags: ['morning', 'weekly', 'presence', 'slow'],
    seasonal: false,
  },
  {
    id: 'r017',
    title: 'The Dream Check-In',
    description: 'Once a week, ask each other: what\'s one thing you\'re looking forward to in the next month? Keeps you both oriented toward the future together, not just managing the present.',
    frequency: 'weekly',
    tier: 1,
    tags: ['verbal', 'weekly', 'future', 'dreams'],
    seasonal: false,
  },
  {
    id: 'r018',
    title: 'Something That Made Me Think of You',
    description: 'Once this week, send each other something — a song, a photo, a sentence — with no explanation other than "this made me think of you." No context required.',
    frequency: 'weekly',
    tier: 1,
    tags: ['creative', 'weekly', 'thoughtfulness', 'surprise'],
    seasonal: false,
  },

  // ─── TIER 2: MONTHLY / REQUIRES LIGHT PLANNING ───────────────────────────

  {
    id: 'r019',
    title: 'Date Night Standing Order',
    description: 'Same night every month, one of you plans it. No budget required, no logistics discussion allowed during it. The only rule is it\'s intentional.',
    frequency: 'monthly',
    tier: 2,
    tags: ['date', 'monthly', 'tradition', 'intentional'],
    seasonal: false,
  },
  {
    id: 'r020',
    title: 'The Big Question Night',
    description: 'Once a month, Nora gives you one question to sit with together — bigger than a Spark, meant for a real conversation over an evening. No rush, no right answer.',
    frequency: 'monthly',
    tier: 2,
    tags: ['verbal', 'monthly', 'deep', 'emotional'],
    seasonal: false,
  },
  {
    id: 'r021',
    title: 'Try Something Neither of You Has Done',
    description: 'Once a month, do one thing together that\'s new to both of you. Doesn\'t have to be big. A class, a neighborhood you\'ve never walked, a recipe you\'ve never made.',
    frequency: 'monthly',
    tier: 2,
    tags: ['adventure', 'monthly', 'shared', 'new'],
    seasonal: false,
  },
  {
    id: 'r022',
    title: 'The Relationship Review',
    description: 'Once a month, thirty minutes to talk about the relationship itself — not the logistics of life, but how you\'re feeling about each other. What\'s working. What needs more attention.',
    frequency: 'monthly',
    tier: 2,
    tags: ['verbal', 'monthly', 'deep', 'intentional'],
    seasonal: false,
  },
  {
    id: 'r023',
    title: 'Cook Something Ambitious Together',
    description: 'Once a month, pick a recipe that neither of you could pull off easily alone. The point isn\'t the food — it\'s the chaos and collaboration of making it together.',
    frequency: 'monthly',
    tier: 2,
    tags: ['food', 'monthly', 'collaborative', 'playful'],
    seasonal: false,
  },

  // ─── TIER 3: SEASONAL / BIGGER INVESTMENT ────────────────────────────────

  {
    id: 'r024',
    title: 'The Annual Trip',
    description: 'Somewhere neither of you has been. Planned together. Could be two hours away — doesn\'t matter. The ritual is the planning as much as the going.',
    frequency: 'annual',
    tier: 3,
    tags: ['travel', 'annual', 'adventure', 'tradition'],
    seasonal: false,
  },
  {
    id: 'r025',
    title: 'Your Seasonal Ritual',
    description: 'Something that only works part of the year. The therapy float. The winter Sunday soup. The farmers market run in spring. It expires — and that\'s what makes it worth protecting.',
    frequency: 'seasonal',
    tier: 3,
    tags: ['seasonal', 'outdoor', 'tradition', 'yours'],
    seasonal: true,
  },
  {
    id: 'r026',
    title: 'The Anniversary Debrief',
    description: 'Every year, on or near your anniversary, spend an evening looking back at the year and forward to the next one. What did you build? What do you want to build? Nora can help frame it.',
    frequency: 'annual',
    tier: 3,
    tags: ['annual', 'reflection', 'tradition', 'deep'],
    seasonal: false,
  },

];

// Helper: get all Tier 1 suggestions for onboarding / new couples
export function getStarterRituals() {
  return RITUAL_SUGGESTIONS.filter(r => r.tier === 1);
}

// Helper: get suggestions by tag
export function getRitualsByTag(tag) {
  return RITUAL_SUGGESTIONS.filter(r => r.tags.includes(tag));
}

// Helper: get suggestions by tier
export function getRitualsByTier(tier) {
  return RITUAL_SUGGESTIONS.filter(r => r.tier === tier);
}

// Helper: get seasonal rituals
export function getSeasonalRituals() {
  return RITUAL_SUGGESTIONS.filter(r => r.seasonal === true);
}
