// Daily Check-in Question Bank
// Smart selection based on assessment scores and recent patterns

// ============================================
// MOOD OPTIONS
// ============================================
export const MOOD_OPTIONS = [
  { value: 'amazing', emoji: '🌟', label: 'Amazing', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'good', emoji: '😊', label: 'Good', color: 'bg-blue-100 text-blue-700' },
  { value: 'okay', emoji: '😐', label: 'Okay', color: 'bg-amber-100 text-amber-700' },
  { value: 'stressed', emoji: '😰', label: 'Stressed', color: 'bg-orange-100 text-orange-700' },
  { value: 'struggling', emoji: '😔', label: 'Struggling', color: 'bg-rose-100 text-rose-700' },
]

// ============================================
// CORE QUESTIONS (Always asked)
// ============================================
export const CORE_QUESTIONS = {
  mood: {
    id: 'mood',
    text: 'How are you feeling today?',
    type: 'mood_select',
    required: true,
  },
  connection: {
    id: 'connection',
    text: 'How connected do you feel to your partner right now?',
    type: 'scale',
    scale: {
      min: 1,
      max: 5,
      minLabel: 'Distant',
      maxLabel: 'Very close',
    },
    required: true,
  },
}

// ============================================
// ROTATING QUESTIONS (Selected based on conditions)
// ============================================
export const ROTATING_QUESTIONS = {
  // For couples with low communication scores
  low_communication: [
    {
      id: 'comm_1',
      text: "What's one thing you wish you'd told your partner this week?",
      type: 'text',
      placeholder: 'Something on your mind...',
    },
    {
      id: 'comm_2',
      text: 'When did you last have a conversation that felt really connecting?',
      type: 'text',
      placeholder: 'Describe the moment...',
    },
    {
      id: 'comm_3',
      text: "Is there something you've been avoiding talking about?",
      type: 'choice',
      options: [
        { value: 'yes', label: 'Yes, there is something' },
        { value: 'maybe', label: 'Maybe, I need to think about it' },
        { value: 'no', label: 'No, we talk about everything' },
      ],
    },
    {
      id: 'comm_4',
      text: 'How well do you feel heard by your partner lately?',
      type: 'scale',
      scale: { min: 1, max: 5, minLabel: 'Not heard', maxLabel: 'Completely heard' },
    },
    {
      id: 'comm_5',
      text: "What's one topic you'd like to discuss more openly with your partner?",
      type: 'text',
      placeholder: 'A topic that matters to you...',
    },
  ],

  // For couples with attachment concerns
  low_attachment: [
    {
      id: 'attach_1',
      text: 'Do you feel secure in your relationship right now?',
      type: 'scale',
      scale: { min: 1, max: 5, minLabel: 'Uncertain', maxLabel: 'Very secure' },
    },
    {
      id: 'attach_2',
      text: "What's one thing your partner did recently that made you feel loved?",
      type: 'text',
      placeholder: 'A small or big gesture...',
    },
    {
      id: 'attach_3',
      text: 'How comfortable are you being vulnerable with your partner?',
      type: 'scale',
      scale: { min: 1, max: 5, minLabel: 'Not comfortable', maxLabel: 'Completely comfortable' },
    },
    {
      id: 'attach_4',
      text: 'When you need support, do you turn to your partner first?',
      type: 'choice',
      options: [
        { value: 'always', label: 'Almost always' },
        { value: 'sometimes', label: 'Sometimes' },
        { value: 'rarely', label: 'Not usually' },
      ],
    },
    {
      id: 'attach_5',
      text: "What would help you feel more secure in your relationship?",
      type: 'text',
      placeholder: 'Something that would help...',
    },
  ],

  // For couples with mismatched love languages
  love_language_mismatch: [
    {
      id: 'love_1',
      text: 'Did you feel loved by your partner today? How?',
      type: 'text',
      placeholder: 'Describe what made you feel loved...',
    },
    {
      id: 'love_2',
      text: "What's one small thing your partner could do that would mean a lot to you?",
      type: 'text',
      placeholder: 'A gesture that would matter...',
    },
    {
      id: 'love_3',
      text: 'Which would mean more to you right now?',
      type: 'choice',
      options: [
        { value: 'words', label: 'Hearing "I love you" or a compliment' },
        { value: 'time', label: 'Quality time together, no distractions' },
        { value: 'acts', label: 'Help with something or a thoughtful gesture' },
        { value: 'touch', label: 'A long hug or physical closeness' },
        { value: 'gifts', label: 'A small surprise or thoughtful gift' },
      ],
    },
    {
      id: 'love_4',
      text: 'How did you show love to your partner today?',
      type: 'text',
      placeholder: 'Something you did...',
    },
  ],

  // For couples who haven't had recent quality time
  low_date_frequency: [
    {
      id: 'date_1',
      text: "When was your last date night or quality time together?",
      type: 'choice',
      options: [
        { value: 'this_week', label: 'This week' },
        { value: 'last_week', label: 'Last week' },
        { value: 'few_weeks', label: 'A few weeks ago' },
        { value: 'longer', label: 'I honestly can\'t remember' },
      ],
    },
    {
      id: 'date_2',
      text: "What's something fun you'd love to do together soon?",
      type: 'text',
      placeholder: 'An activity or adventure...',
    },
    {
      id: 'date_3',
      text: 'Do you feel like you make enough time for each other?',
      type: 'scale',
      scale: { min: 1, max: 5, minLabel: 'Not enough', maxLabel: 'Plenty of time' },
    },
    {
      id: 'date_4',
      text: "What's getting in the way of spending more quality time together?",
      type: 'choice',
      options: [
        { value: 'work', label: 'Work schedules' },
        { value: 'kids', label: 'Kids or family obligations' },
        { value: 'tired', label: 'We\'re just too tired' },
        { value: 'different', label: 'We want different things' },
        { value: 'nothing', label: 'Nothing, we\'re doing great!' },
      ],
    },
  ],

  // For times of high stress (detected from recent check-ins)
  high_stress: [
    {
      id: 'stress_1',
      text: "What's weighing on you the most right now?",
      type: 'text',
      placeholder: 'Share what\'s on your mind...',
    },
    {
      id: 'stress_2',
      text: 'How is stress affecting your relationship?',
      type: 'choice',
      options: [
        { value: 'closer', label: 'We\'re pulling together' },
        { value: 'neutral', label: 'About the same as usual' },
        { value: 'distant', label: 'We\'re a bit more distant' },
        { value: 'tense', label: 'There\'s more tension' },
      ],
    },
    {
      id: 'stress_3',
      text: 'What kind of support do you need from your partner right now?',
      type: 'choice',
      options: [
        { value: 'listen', label: 'Just listen and be there' },
        { value: 'help', label: 'Help with practical things' },
        { value: 'space', label: 'Some space to decompress' },
        { value: 'fun', label: 'Distraction and fun together' },
      ],
    },
    {
      id: 'stress_4',
      text: "What's one thing you're grateful for about your partner during this stressful time?",
      type: 'text',
      placeholder: 'Something you appreciate...',
    },
  ],

  // Gratitude questions (positive, always available as fallback)
  gratitude: [
    {
      id: 'grat_1',
      text: "What's one thing your partner did recently that made you smile?",
      type: 'text',
      placeholder: 'A moment that made you happy...',
    },
    {
      id: 'grat_2',
      text: "What do you appreciate most about your partner right now?",
      type: 'text',
      placeholder: 'Something you\'re thankful for...',
    },
    {
      id: 'grat_3',
      text: "What's your favorite thing about your relationship?",
      type: 'text',
      placeholder: 'Something special about you two...',
    },
    {
      id: 'grat_4',
      text: 'When did you last laugh together?',
      type: 'choice',
      options: [
        { value: 'today', label: 'Today!' },
        { value: 'yesterday', label: 'Yesterday' },
        { value: 'this_week', label: 'This week' },
        { value: 'longer', label: 'It\'s been a while' },
      ],
    },
    {
      id: 'grat_5',
      text: "If you could relive one moment with your partner, which would it be?",
      type: 'text',
      placeholder: 'A favorite memory...',
    },
    {
      id: 'grat_6',
      text: "What's something your partner does that no one else knows about?",
      type: 'text',
      placeholder: 'A special quirk or habit...',
    },
    {
      id: 'grat_7',
      text: 'How would you describe your partner to a stranger?',
      type: 'text',
      placeholder: 'In a few words...',
    },
    {
      id: 'grat_8',
      text: "What's one dream you'd love to achieve together?",
      type: 'text',
      placeholder: 'A shared goal or dream...',
    },
  ],

  // Reflection questions (for weekly/periodic use)
  reflection: [
    {
      id: 'reflect_1',
      text: 'What was the highlight of your week together?',
      type: 'text',
      placeholder: 'Your best moment...',
    },
    {
      id: 'reflect_2',
      text: 'Is there anything from this week you wish had gone differently?',
      type: 'text',
      placeholder: 'Something to learn from...',
    },
    {
      id: 'reflect_3',
      text: 'How would you rate your connection this week overall?',
      type: 'scale',
      scale: { min: 1, max: 5, minLabel: 'Disconnected', maxLabel: 'Very connected' },
    },
    {
      id: 'reflect_4',
      text: "What's one thing you'd like to do differently next week?",
      type: 'text',
      placeholder: 'Something to try...',
    },
  ],
}

// ============================================
// SMART QUESTION SELECTION
// ============================================

/**
 * Analyzes recent check-ins to detect stress patterns
 * @param {Array} recentCheckins - Last 7 days of check-ins
 * @returns {boolean} - Whether high stress is detected
 */
function detectHighStress(recentCheckins) {
  if (!recentCheckins || recentCheckins.length < 2) return false

  const stressedMoods = ['stressed', 'struggling']
  const stressCount = recentCheckins.filter(
    c => stressedMoods.includes(c.mood) || (c.connection_score && c.connection_score <= 2)
  ).length

  // High stress if 50%+ of recent check-ins show stress indicators
  return stressCount >= Math.ceil(recentCheckins.length / 2)
}

/**
 * Gets the weakest area from assessment results
 * @param {Object} assessmentResults - The user's assessment results
 * @returns {string|null} - The module ID with lowest score, or null
 */
function getWeakestArea(assessmentResults) {
  if (!assessmentResults?.modules) return null

  const modules = assessmentResults.modules
  let weakest = null
  let lowestScore = 100

  modules.forEach(m => {
    if (m.percentage < lowestScore) {
      lowestScore = m.percentage
      weakest = m.moduleId
    }
  })

  // Only return if score is below threshold
  return lowestScore < 70 ? weakest : null
}

/**
 * Checks if love languages are mismatched between partners
 * @param {Object} userProfile - User's individual profile
 * @param {Object} partnerProfile - Partner's individual profile
 * @returns {boolean} - Whether there's a significant mismatch
 */
function detectLoveLanguageMismatch(userProfile, partnerProfile) {
  if (!userProfile?.results?.modules || !partnerProfile?.results?.modules) return false

  const userLoveModule = userProfile.results.modules.find(m => m.moduleId === 'love_needs')
  const partnerLoveModule = partnerProfile.results.modules.find(m => m.moduleId === 'love_needs')

  if (!userLoveModule?.traits || !partnerLoveModule?.traits) return false

  // Get top love need for each person
  const getTopTrait = (traits) => {
    return Object.entries(traits)
      .sort(([, a], [, b]) => b - a)[0]?.[0]
  }

  const userTopNeed = getTopTrait(userLoveModule.traits)
  const partnerTopNeed = getTopTrait(partnerLoveModule.traits)

  // Mismatch if different top needs
  return userTopNeed !== partnerTopNeed
}

/**
 * Checks recent date activity
 * @param {Array} recentCheckins - Recent check-in data
 * @returns {boolean} - Whether date frequency seems low
 */
function detectLowDateFrequency(recentCheckins) {
  if (!recentCheckins || recentCheckins.length < 5) return false

  // Check if any recent check-ins mentioned quality time
  const dateRelatedAnswers = recentCheckins.filter(c => {
    if (!c.rotating_answer) return false
    const answer = typeof c.rotating_answer === 'string'
      ? c.rotating_answer.toLowerCase()
      : ''
    return answer.includes('date') || answer.includes('together') || answer.includes('time')
  })

  // If very few mentions of quality time in answers, might need prompting
  return dateRelatedAnswers.length < 2
}

/**
 * Selects the most relevant rotating question based on context
 * @param {Object} userAssessment - User's relationship assessment results
 * @param {Object} userProfile - User's individual profile
 * @param {Object} partnerProfile - Partner's individual profile
 * @param {Array} recentCheckins - Recent check-in history (last 7 days)
 * @param {Array} usedQuestionIds - Question IDs used recently (to avoid repetition)
 * @returns {Object} - Selected question object
 */
export function selectRotatingQuestion(
  userAssessment,
  userProfile,
  partnerProfile,
  recentCheckins = [],
  usedQuestionIds = []
) {
  // Determine which category to pull from based on conditions
  let category = 'gratitude' // Default fallback

  // Priority 1: High stress detected
  if (detectHighStress(recentCheckins)) {
    category = 'high_stress'
  }
  // Priority 2: Check assessment weak areas
  else if (userAssessment?.results) {
    const weakArea = getWeakestArea(userAssessment.results)
    if (weakArea === 'communication') {
      category = 'low_communication'
    } else if (weakArea === 'attachment' || weakArea === 'trust') {
      category = 'low_attachment'
    }
  }
  // Priority 3: Love language mismatch
  else if (detectLoveLanguageMismatch(userProfile, partnerProfile)) {
    category = 'love_language_mismatch'
  }
  // Priority 4: Low date frequency
  else if (detectLowDateFrequency(recentCheckins)) {
    category = 'low_date_frequency'
  }

  // Get questions from selected category
  const categoryQuestions = ROTATING_QUESTIONS[category] || ROTATING_QUESTIONS.gratitude

  // Filter out recently used questions
  const availableQuestions = categoryQuestions.filter(
    q => !usedQuestionIds.includes(q.id)
  )

  // If all questions in category used, fall back to gratitude
  const questionsToChooseFrom = availableQuestions.length > 0
    ? availableQuestions
    : ROTATING_QUESTIONS.gratitude.filter(q => !usedQuestionIds.includes(q.id))

  // If still no questions (all used), reset and pick from full gratitude list
  const finalQuestions = questionsToChooseFrom.length > 0
    ? questionsToChooseFrom
    : ROTATING_QUESTIONS.gratitude

  // Randomly select one question
  const randomIndex = Math.floor(Math.random() * finalQuestions.length)
  return {
    ...finalQuestions[randomIndex],
    category, // Include category for analytics
  }
}

/**
 * Gets a reflection question for weekly summaries
 * @param {Array} usedQuestionIds - Recently used question IDs
 * @returns {Object} - Selected reflection question
 */
export function selectReflectionQuestion(usedQuestionIds = []) {
  const available = ROTATING_QUESTIONS.reflection.filter(
    q => !usedQuestionIds.includes(q.id)
  )

  const questions = available.length > 0 ? available : ROTATING_QUESTIONS.reflection
  const randomIndex = Math.floor(Math.random() * questions.length)

  return {
    ...questions[randomIndex],
    category: 'reflection',
  }
}

/**
 * Gets all questions for a complete daily check-in
 * @param {Object} context - Assessment and profile data
 * @returns {Array} - Array of questions to ask
 */
export function getDailyCheckinQuestions(context = {}) {
  const {
    userAssessment,
    userProfile,
    partnerProfile,
    recentCheckins,
    usedQuestionIds,
  } = context

  return [
    CORE_QUESTIONS.mood,
    CORE_QUESTIONS.connection,
    selectRotatingQuestion(
      userAssessment,
      userProfile,
      partnerProfile,
      recentCheckins,
      usedQuestionIds
    ),
  ]
}
