// Challenge prompt library
// Structure: each type has an array of prompts
// Each prompt has: key (unique id), prompt (the challenge text), category (for Nora context)
// Rank prompts always framed "most to least [X]" — position 1 = most, last = least
// Memory prompts include dataSource so Nora knows where to pull the specific fact

export const CHALLENGE_PROMPTS = {
  story: [
    { key: 'story_01', category: 'absurd', prompt: 'Write the world\'s worst first date — that somehow leads to a second one.' },
    { key: 'story_02', category: 'domestic', prompt: 'Your apartment is haunted. The ghost only bothers one of you. Write the story of the first week.' },
    { key: 'story_03', category: 'absurd', prompt: 'You\'ve just won a competition neither of you entered. Write what happens next.' },
    { key: 'story_04', category: 'tender', prompt: 'Write a love letter from your pet\'s perspective. If you don\'t have a pet, invent one.' },
    { key: 'story_05', category: 'dramatic', prompt: 'You\'re both astronauts. One of you has to stay on the station. Write the goodbye.' },
    { key: 'story_06', category: 'absurd', prompt: 'You open a business together that has absolutely no right to succeed. Write the opening day.' },
    { key: 'story_07', category: 'romantic', prompt: 'Write the origin story of how you met — but set it 200 years ago.' },
    { key: 'story_08', category: 'absurd', prompt: 'One of you can suddenly read minds. Write the first 24 hours.' },
    { key: 'story_09', category: 'tender', prompt: 'Write a children\'s book about your relationship. Two sentences per page. At least five pages.' },
    { key: 'story_10', category: 'dramatic', prompt: 'You\'re the last two people who know a secret that would change everything. Write the moment you decide what to do.' },
    { key: 'story_11', category: 'domestic', prompt: 'Write the Yelp review one of you would leave for the other as a roommate. Be honest.' },
    { key: 'story_12', category: 'absurd', prompt: 'A documentary crew has been following you for a year without your knowledge. Write the scene where you find out.' },
    { key: 'story_13', category: 'romantic', prompt: 'Write the story of your relationship as if it\'s being told by a stranger who only saw you together once, briefly, in public.' },
    { key: 'story_14', category: 'dramatic', prompt: 'One of you wakes up ten years in the future. Write the first conversation you have with your partner.' },
    { key: 'story_15', category: 'absurd', prompt: 'You\'ve been assigned to negotiate a peace treaty between two countries. Write the moment it nearly falls apart because of something trivial.' },
    { key: 'story_16', category: 'tender', prompt: 'Write the speech one of you would give at the other\'s retirement party — in 30 years.' },
    { key: 'story_17', category: 'domestic', prompt: 'Write the email chain between you two planning a holiday that slowly descends into chaos.' },
    { key: 'story_18', category: 'romantic', prompt: 'Write the scene where you both realise, without saying it out loud, that this is serious.' },
    { key: 'story_19', category: 'absurd', prompt: 'You\'re both contestants on a reality show designed to end relationships. Write the episode where you win.' },
    { key: 'story_20', category: 'dramatic', prompt: 'Write the last conversation you\'d want to have together if you knew it was the last one. Make it count.' },
  ],

  pitch: [
    { key: 'pitch_01', category: 'food', prompt: 'Pitch a restaurant where the entire menu is foods your partner refuses to eat.' },
    { key: 'pitch_02', category: 'tech', prompt: 'Pitch an app that solves a problem only the two of you have.' },
    { key: 'pitch_03', category: 'entertainment', prompt: 'Pitch a reality TV show starring the two of you. Give it a name, a format, and a tagline.' },
    { key: 'pitch_04', category: 'product', prompt: 'Pitch a product made entirely from something you\'d otherwise throw away.' },
    { key: 'pitch_05', category: 'hospitality', prompt: 'Pitch a hotel where every room is themed around a different relationship stage.' },
    { key: 'pitch_06', category: 'product', prompt: 'Pitch a subscription box for people who are terrible at gift-giving.' },
    { key: 'pitch_07', category: 'entertainment', prompt: 'Pitch a theme park ride based on a specific memory from your relationship.' },
    { key: 'pitch_08', category: 'publishing', prompt: 'Pitch a self-help book neither of you is remotely qualified to write.' },
    { key: 'pitch_09', category: 'food', prompt: 'Pitch a fast food chain built around a single ingredient you both love. Name it. Price the menu.' },
    { key: 'pitch_10', category: 'tech', prompt: 'Pitch a social network for a demographic that has never been targeted before.' },
    { key: 'pitch_11', category: 'hospitality', prompt: 'Pitch a travel company that designs trips specifically for couples who disagree on everything.' },
    { key: 'pitch_12', category: 'product', prompt: 'Pitch a board game based on the unspoken rules of your relationship.' },
    { key: 'pitch_13', category: 'entertainment', prompt: 'Pitch a podcast hosted by the two of you. Topic, format, episode one.' },
    { key: 'pitch_14', category: 'product', prompt: 'Pitch a clothing line that solves one specific problem you have getting dressed.' },
    { key: 'pitch_15', category: 'tech', prompt: 'Pitch an AI product — but it can only do one extremely specific thing.' },
    { key: 'pitch_16', category: 'hospitality', prompt: 'Pitch a gym concept where the entire workout is disguised as something else.' },
    { key: 'pitch_17', category: 'publishing', prompt: 'Pitch a children\'s book series based on a life lesson one of you learned the hard way.' },
    { key: 'pitch_18', category: 'entertainment', prompt: 'Pitch a museum exhibit about modern relationships. Three rooms, three themes.' },
    { key: 'pitch_19', category: 'food', prompt: 'Pitch a meal kit service but the twist is it\'s designed for people who hate cooking.' },
    { key: 'pitch_20', category: 'product', prompt: 'Pitch the worst possible product you could actually see people buying anyway.' },
  ],

  rank: [
    {
      key: 'rank_01',
      category: 'relationship',
      prompt: 'Rank from most to least likely to change your relationship:',
      items: ['Winning the lottery', 'Moving countries', 'One of you becomes briefly famous', 'Adopting a dog']
    },
    {
      key: 'rank_02',
      category: 'domestic',
      prompt: 'Rank from most to least challenging to navigate together:',
      items: ['Money', 'Shared chores', 'Personal space', 'Different schedules', 'Clashing tastes']
    },
    {
      key: 'rank_03',
      category: 'dates',
      prompt: 'Rank from most to least "you two" as a date night:',
      items: ['An outdoor adventure', 'A cultural experience', 'A full stay-in night', 'A long foodie dinner', 'Trying something neither of you has done']
    },
    {
      key: 'rank_04',
      category: 'relationship',
      prompt: 'Rank from most to least defining moment in a relationship:',
      items: ['The first fight', 'Moving in together', 'Meeting each other\'s families', 'The first big trip', 'Saying I love you']
    },
    {
      key: 'rank_05',
      category: 'future',
      prompt: 'Rank from most to least important in a home:',
      items: ['Location', 'Size', 'Character and history', 'Price', 'Outdoor space']
    },
    {
      key: 'rank_06',
      category: 'leisure',
      prompt: 'Rank from most to least how you\'d want to spend a surprise free weekend:',
      items: ['A spontaneous city trip', 'Getting into nature', 'Complete rest', 'Finally catching up on life', 'Something brand new']
    },
    {
      key: 'rank_07',
      category: 'relationship',
      prompt: 'Rank from most to least threatening to a long relationship:',
      items: ['Money stress', 'Growing apart', 'Living far apart', 'Outside opinions', 'Wanting different futures']
    },
    {
      key: 'rank_08',
      category: 'domestic',
      prompt: 'Rank from most to least stressful to plan together:',
      items: ['A holiday', 'A big purchase', 'A dinner party', 'Redecorating a room', 'Choosing where to eat tonight']
    },
    {
      key: 'rank_09',
      category: 'future',
      prompt: 'Rank from most to least excited you\'d be about:',
      items: ['Moving to a new city', 'Buying your first home', 'Getting a pet', 'Starting a business together', 'Taking a year off to travel']
    },
    {
      key: 'rank_10',
      category: 'leisure',
      prompt: 'Rank from most to least satisfying to accomplish together:',
      items: ['Running a race', 'Finishing a renovation', 'Cooking a complex meal from scratch', 'Completing a long trip', 'Learning something new side by side']
    },
    {
      key: 'rank_11',
      category: 'relationship',
      prompt: 'Rank from most to least important in a partner long-term:',
      items: ['Shared values', 'Physical attraction', 'Making each other laugh', 'Financial compatibility', 'Wanting the same future']
    },
    {
      key: 'rank_12',
      category: 'domestic',
      prompt: 'Rank from most to least likely to start a disagreement in your house:',
      items: ['Temperature of the room', 'What to watch', 'When to sleep', 'How to spend money', 'Who does what']
    },
  ],

  memory: [
    {
      key: 'memory_01',
      category: 'firsts',
      dataSource: 'timeline',
      prompt: 'What was the first trip you took together? Name the place, one thing that went wrong, and one thing that went perfectly.',
    },
    {
      key: 'memory_02',
      category: 'firsts',
      dataSource: 'timeline',
      prompt: 'What was the first movie or show you watched together — the one that appears first in your timeline? Who picked it, and what did the other one think?',
    },
    {
      key: 'memory_03',
      category: 'firsts',
      dataSource: 'timeline',
      prompt: 'What was the first meal one of you cooked for the other? What did you make, and how did it actually go?',
    },
    {
      key: 'memory_04',
      category: 'moments',
      dataSource: 'timeline',
      prompt: 'Look at your earliest timeline entry together. What was happening in your lives that week that isn\'t written down anywhere?',
    },
    {
      key: 'memory_05',
      category: 'moments',
      dataSource: 'sparks',
      prompt: 'Think back to one of your earliest Spark questions. Without looking, what do you think your partner said? How close are you?',
    },
    {
      key: 'memory_06',
      category: 'bets',
      dataSource: 'bets',
      prompt: 'You\'ve made predictions about each other. Which one surprised you most when you found out the answer — and why?',
    },
    {
      key: 'memory_07',
      category: 'firsts',
      dataSource: 'timeline',
      prompt: 'What was the first thing you disagreed about that actually mattered? How did it end?',
    },
    {
      key: 'memory_08',
      category: 'moments',
      dataSource: 'timeline',
      prompt: 'Name a moment from your timeline that looks small on paper but was actually significant. What made it matter?',
    },
    {
      key: 'memory_09',
      category: 'firsts',
      dataSource: 'timeline',
      prompt: 'When did you first meet each other\'s families? Who was more nervous, and what gave it away?',
    },
    {
      key: 'memory_10',
      category: 'moments',
      dataSource: 'sparks',
      prompt: 'Think of a Spark answer your partner gave that you still think about. What did they say, and why did it stick?',
    },
  ],

  plan: [
    { key: 'plan_01', category: 'travel', prompt: 'Plan a 72-hour trip to a city neither of you has been to. Pick the city, name three things you\'d do, and decide what you\'d skip.' },
    { key: 'plan_02', category: 'future', prompt: 'Plan your ideal Sunday five years from now. Where are you, what\'s changed, what\'s exactly the same?' },
    { key: 'plan_03', category: 'social', prompt: 'Plan a dinner party for six. Who\'s invited, what\'s on the menu, and name the one thing that\'s guaranteed to go sideways.' },
    { key: 'plan_04', category: 'travel', prompt: 'Plan a trip to visit one of your families — and design it so it\'s actually fun for both of you.' },
    { key: 'plan_05', category: 'adventure', prompt: 'Plan a micro-adventure you could realistically do in the next 30 days. No flights required.' },
    { key: 'plan_06', category: 'future', prompt: 'Plan your dream home. Not the building — the life inside it. Daily rhythms, who does what, what it feels like on a Tuesday.' },
    { key: 'plan_07', category: 'travel', prompt: 'Plan a sabbatical. One month, anywhere, both of you. Make it specific enough that you could actually book it.' },
    { key: 'plan_08', category: 'celebration', prompt: 'Plan a milestone birthday trip for whichever of you has one coming up. Make it worth remembering.' },
    { key: 'plan_09', category: 'adventure', prompt: 'Plan a 24-hour date in your own city as if you\'re tourists who\'ve never been there before.' },
    { key: 'plan_10', category: 'future', prompt: 'Plan the first year of living somewhere completely new. City, neighbourhood, how you\'d find your people, what you\'d miss.' },
    { key: 'plan_11', category: 'social', prompt: 'Plan a holiday tradition you\'d want to start this year and do every year after. What is it, and why would it stick?' },
    { key: 'plan_12', category: 'travel', prompt: 'Plan a trip built around one specific thing — a food, a landscape, a sport, an artist. Let that one thing drive every decision.' },
    { key: 'plan_13', category: 'adventure', prompt: 'Plan a weekend designed specifically to get you both out of your comfort zones. What scares you a little but excites you more?' },
    { key: 'plan_14', category: 'future', prompt: 'Plan your retirement. Where, how, with who around you, and what does a good day look like?' },
    { key: 'plan_15', category: 'celebration', prompt: 'Plan how you\'d celebrate if one of you achieved something you\'ve been working toward for years. Make it specific to them.' },
  ],
};

// Memory unlock thresholds
export const MEMORY_UNLOCK = {
  minTimelineEvents: 5,
  minSparkBetResponses: 10,
  minAccountAgeWeeks: 3,
};

// Memory locked state copy
export const MEMORY_LOCKED_COPY = {
  headline: 'Memory unlocks as your story grows.',
  body: 'The more you add to your timeline and answer each other\'s questions, the better Nora knows your story — and the harder she can make it. Come back after a few more weeks together in ABF.',
  cta: 'Add to your timeline',
};

// Memory unlock notification copy (fires when all thresholds met)
export const MEMORY_UNLOCK_COPY = {
  title: 'Nora\'s ready to test you.',
  body: 'She\'s been paying attention. Think you remember everything?',
};
