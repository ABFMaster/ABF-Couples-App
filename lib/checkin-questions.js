// Daily Check-in Question Bank
// Intelligent selection based on assessment scores, patterns, and context

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
  // PRIORITY 1: Crisis Detection Questions
  stress_support: [
    {
      id: 'stress_sup_1',
      text: "What's one thing that would help reduce your stress right now?",
      type: 'text',
      placeholder: 'Something that would help...',
    },
    {
      id: 'stress_sup_2',
      text: "I notice you've been feeling stressed lately. What's the biggest thing on your mind?",
      type: 'text',
      placeholder: 'Share what\'s weighing on you...',
    },
    {
      id: 'stress_sup_3',
      text: 'How can your partner best support you through this tough time?',
      type: 'choice',
      options: [
        { value: 'listen', label: 'Just listen without trying to fix it' },
        { value: 'help', label: 'Help with practical tasks' },
        { value: 'space', label: 'Give me some space' },
        { value: 'together', label: 'Spend quality time together' },
        { value: 'reassure', label: 'Reassure me that we\'re okay' },
      ],
    },
    {
      id: 'stress_sup_4',
      text: "What's one small thing you could do today to take care of yourself?",
      type: 'text',
      placeholder: 'A small act of self-care...',
    },
  ],

  relationship_concern: [
    {
      id: 'concern_1',
      text: "It seems like you've been feeling less connected lately. Is there something you've been wanting to talk about?",
      type: 'choice',
      options: [
        { value: 'yes', label: 'Yes, there\'s something on my mind' },
        { value: 'unsure', label: 'I\'m not sure, I need to think' },
        { value: 'no', label: 'No, just a rough patch' },
      ],
    },
    {
      id: 'concern_2',
      text: 'What would help you feel more connected to your partner right now?',
      type: 'text',
      placeholder: 'Something that would help...',
    },
    {
      id: 'concern_3',
      text: 'Is there anything you wish your partner understood better about how you\'re feeling?',
      type: 'text',
      placeholder: 'Share your thoughts...',
    },
    {
      id: 'concern_4',
      text: 'On a scale of 1-5, how important is it to have a conversation about your relationship this week?',
      type: 'scale',
      scale: { min: 1, max: 5, minLabel: 'Not urgent', maxLabel: 'Very important' },
    },
  ],

  change_detection: [
    {
      id: 'change_1',
      text: "Your connection score has shifted recently. What's different this week that might be affecting things?",
      type: 'text',
      placeholder: 'What\'s changed...',
    },
    {
      id: 'change_2',
      text: 'Has anything happened recently that you haven\'t had a chance to talk about together?',
      type: 'choice',
      options: [
        { value: 'yes_big', label: 'Yes, something significant' },
        { value: 'yes_small', label: 'A few small things adding up' },
        { value: 'no', label: 'Nothing specific comes to mind' },
      ],
    },
    {
      id: 'change_3',
      text: 'Is there something from this week you need to process together?',
      type: 'text',
      placeholder: 'Something to discuss...',
    },
  ],

  // PRIORITY 2: Assessment-Driven Questions
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

  shared_vision: [
    {
      id: 'vision_1',
      text: "What's one goal you'd love to work towards together this year?",
      type: 'text',
      placeholder: 'A shared goal...',
    },
    {
      id: 'vision_2',
      text: 'Do you feel like you and your partner are on the same page about the future?',
      type: 'scale',
      scale: { min: 1, max: 5, minLabel: 'Not aligned', maxLabel: 'Completely aligned' },
    },
    {
      id: 'vision_3',
      text: "What's something you've been dreaming about that you haven't shared yet?",
      type: 'text',
      placeholder: 'A dream or hope...',
    },
    {
      id: 'vision_4',
      text: 'When was the last time you talked about your future together?',
      type: 'choice',
      options: [
        { value: 'recently', label: 'This week' },
        { value: 'month', label: 'This month' },
        { value: 'longer', label: 'It\'s been a while' },
        { value: 'never', label: 'We haven\'t really' },
      ],
    },
  ],

  // PRIORITY 3: Engagement Pattern Questions
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

  celebration: [
    {
      id: 'celeb_1',
      text: "You've been checking in consistently! What's kept you committed to your relationship growth?",
      type: 'text',
      placeholder: 'What motivates you...',
    },
    {
      id: 'celeb_2',
      text: 'Looking back at your journey together, what are you most proud of?',
      type: 'text',
      placeholder: 'Something you\'re proud of...',
    },
    {
      id: 'celeb_3',
      text: 'What positive changes have you noticed in your relationship lately?',
      type: 'text',
      placeholder: 'Positive changes...',
    },
    {
      id: 'celeb_4',
      text: "What's the best piece of relationship advice you'd give to other couples?",
      type: 'text',
      placeholder: 'Your wisdom...',
    },
  ],

  weekend_fun: [
    {
      id: 'weekend_1',
      text: "What's one fun thing you could do together this weekend?",
      type: 'text',
      placeholder: 'Something fun...',
    },
    {
      id: 'weekend_2',
      text: 'If you had a surprise day off together, what would you do?',
      type: 'text',
      placeholder: 'Your ideal day...',
    },
    {
      id: 'weekend_3',
      text: "What's something silly that always makes you two laugh?",
      type: 'text',
      placeholder: 'An inside joke or memory...',
    },
    {
      id: 'weekend_4',
      text: 'Rate your excitement for the weekend together!',
      type: 'scale',
      scale: { min: 1, max: 5, minLabel: 'Meh', maxLabel: 'Can\'t wait!' },
    },
  ],

  // PRIORITY 4: Default Questions
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

  // Weekly reflection questions
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
// INTELLIGENT QUESTION SELECTION
// ============================================

/**
 * Get a deterministic but varied index for question selection
 * Uses date + category to ensure variety while being reproducible
 */
function getRotationIndex(category, questionsLength, usedIds = []) {
  const today = new Date()
  const dateHash = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
  const categoryHash = category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)

  // Start with a deterministic index based on date + category
  let baseIndex = (dateHash + categoryHash) % questionsLength

  // Find the next available question that hasn't been used recently
  const questions = ROTATING_QUESTIONS[category] || []
  for (let i = 0; i < questionsLength; i++) {
    const checkIndex = (baseIndex + i) % questionsLength
    if (questions[checkIndex] && !usedIds.includes(questions[checkIndex].id)) {
      return checkIndex
    }
  }

  // If all used, just return the base index
  return baseIndex
}

/**
 * PRIORITY 1: Crisis Detection
 * Detects stress, low connection, or sudden drops in connection
 */
function detectCrisis(recentCheckins) {
  if (!recentCheckins || recentCheckins.length < 2) {
    return { detected: false, type: null, reason: null }
  }

  // Sort by date descending (most recent first)
  const sorted = [...recentCheckins].sort((a, b) =>
    new Date(b.check_date || b.created_at) - new Date(a.check_date || a.created_at)
  )

  // Check for consecutive stressed/struggling moods (3+ days)
  const stressedMoods = ['stressed', 'struggling']
  let consecutiveStress = 0
  for (const checkin of sorted) {
    if (stressedMoods.includes(checkin.mood)) {
      consecutiveStress++
    } else {
      break
    }
  }
  if (consecutiveStress >= 3) {
    return {
      detected: true,
      type: 'stress_support',
      reason: `Detected ${consecutiveStress} consecutive days of stress/struggling`
    }
  }

  // Check for low connection score (< 3) for 3+ consecutive days
  let consecutiveLowConnection = 0
  for (const checkin of sorted) {
    if (checkin.connection_score && checkin.connection_score < 3) {
      consecutiveLowConnection++
    } else {
      break
    }
  }
  if (consecutiveLowConnection >= 3) {
    return {
      detected: true,
      type: 'relationship_concern',
      reason: `Connection score below 3 for ${consecutiveLowConnection} consecutive days`
    }
  }

  // Check for sudden drop in connection (2+ points in last 3 days)
  if (sorted.length >= 3) {
    const recent = sorted.slice(0, 3).filter(c => c.connection_score != null)
    if (recent.length >= 2) {
      const newest = recent[0].connection_score
      const oldest = recent[recent.length - 1].connection_score
      if (oldest - newest >= 2) {
        return {
          detected: true,
          type: 'change_detection',
          reason: `Connection dropped ${oldest - newest} points (from ${oldest} to ${newest}) in recent days`
        }
      }
    }
  }

  return { detected: false, type: null, reason: null }
}

/**
 * PRIORITY 2: Assessment-Driven Selection
 * Uses module scores to identify areas needing attention
 */
function getAssessmentDrivenCategory(userScores, partnerScores) {
  if (!userScores) {
    return { category: null, reason: null, probability: 0 }
  }

  const weakAreas = []

  // Check each module for scores below 70%
  const checkModule = (moduleId, categoryName, displayName) => {
    const userModule = userScores.modules?.find(m => m.moduleId === moduleId)
    const userScore = userModule?.percentage || 100

    if (userScore < 70) {
      weakAreas.push({
        category: categoryName,
        score: userScore,
        reason: `${displayName} module at ${userScore}%`,
        probability: 0.25 // 25% chance
      })
    }
  }

  checkModule('communication', 'low_communication', 'Communication')
  checkModule('attachment', 'low_attachment', 'Attachment')
  checkModule('trust', 'low_attachment', 'Trust') // Maps to same questions
  checkModule('shared_vision', 'shared_vision', 'Shared Vision')
  checkModule('intimacy', 'love_language_mismatch', 'Intimacy')

  // Check for love language mismatch if partner scores available
  if (partnerScores?.modules) {
    const userLove = userScores.modules?.find(m => m.moduleId === 'love_needs')
    const partnerLove = partnerScores.modules?.find(m => m.moduleId === 'love_needs')

    if (userLove?.traits && partnerLove?.traits) {
      const getRanking = (traits) => Object.entries(traits)
        .sort(([,a], [,b]) => b - a)
        .map(([key]) => key)

      const userRanking = getRanking(userLove.traits)
      const partnerRanking = getRanking(partnerLove.traits)

      // Check if top love languages differ significantly
      if (userRanking[0] && partnerRanking[0] && userRanking[0] !== partnerRanking[0]) {
        weakAreas.push({
          category: 'love_language_mismatch',
          score: 0,
          reason: `Love language mismatch: you value ${userRanking[0]}, partner values ${partnerRanking[0]}`,
          probability: 0.20 // 20% chance
        })
      }
    }
  }

  if (weakAreas.length === 0) {
    return { category: null, reason: null, probability: 0 }
  }

  // Roll dice to see if we select from weak areas
  const roll = Math.random()
  let cumulative = 0

  for (const area of weakAreas) {
    cumulative += area.probability
    if (roll < cumulative) {
      return {
        category: area.category,
        reason: area.reason,
        probability: area.probability
      }
    }
  }

  return { category: null, reason: null, probability: 0 }
}

/**
 * PRIORITY 3: Engagement Patterns
 * Checks for dates, streaks, weekends
 */
function getEngagementCategory(recentCheckins, streak, todayIsWeekend, hasRecentDates) {
  // Check streak milestone (30+ days)
  if (streak >= 30) {
    // 30% chance to show celebration question
    if (Math.random() < 0.30) {
      return {
        category: 'celebration',
        reason: `Streak milestone: ${streak} days of check-ins`
      }
    }
  }

  // Weekend - lighter questions
  if (todayIsWeekend) {
    // 40% chance for fun weekend questions
    if (Math.random() < 0.40) {
      return {
        category: 'weekend_fun',
        reason: 'Weekend - selecting lighter, fun questions'
      }
    }
  }

  // No recent dates
  if (hasRecentDates === false) {
    // 30% chance to prompt about quality time
    if (Math.random() < 0.30) {
      return {
        category: 'low_date_frequency',
        reason: 'No dates in past 2 weeks'
      }
    }
  }

  return { category: null, reason: null }
}

/**
 * Main question selection function
 *
 * @param {Object} params - Selection parameters
 * @param {Object} params.userAssessmentScores - User's assessment results with modules array
 * @param {Object} params.partnerAssessmentScores - Partner's assessment results (optional)
 * @param {Array} params.recentCheckins - Last 7 days of check-ins for user
 * @param {Array} params.usedQuestionIds - Recently used question IDs (last 14 days)
 * @param {number} params.streak - Current check-in streak
 * @param {boolean} params.todayIsWeekend - Whether today is Saturday or Sunday
 * @param {boolean} params.hasRecentDates - Whether couple has had dates in past 2 weeks
 * @returns {Object} - { question, reason, category, priority }
 */
export function selectRotatingQuestion(params = {}) {
  const {
    userAssessmentScores = null,
    partnerAssessmentScores = null,
    recentCheckins = [],
    usedQuestionIds = [],
    streak = 0,
    todayIsWeekend = false,
    hasRecentDates = null,
  } = params

  // Handle legacy API (positional arguments)
  if (arguments.length > 1 || (params && params.results)) {
    // Legacy call: selectRotatingQuestion(userAssessment, userProfile, partnerProfile, recentCheckins, usedQuestionIds)
    const legacyUserAssessment = arguments[0]
    const legacyRecentCheckins = arguments[3] || []
    const legacyUsedQuestionIds = arguments[4] || []

    return selectRotatingQuestion({
      userAssessmentScores: legacyUserAssessment?.results || legacyUserAssessment,
      recentCheckins: legacyRecentCheckins,
      usedQuestionIds: legacyUsedQuestionIds,
    })
  }

  const log = (priority, message) => {
    if (typeof console !== 'undefined') {
      console.log(`[CheckinQ] P${priority}: ${message}`)
    }
  }

  let selectedCategory = null
  let selectionReason = null
  let priority = 4 // Default

  // PRIORITY 1: Crisis Detection (highest priority)
  const crisis = detectCrisis(recentCheckins)
  if (crisis.detected) {
    selectedCategory = crisis.type
    selectionReason = crisis.reason
    priority = 1
    log(1, `CRISIS: ${crisis.reason} → ${crisis.type}`)
  }

  // PRIORITY 2: Assessment-Driven (if no crisis)
  if (!selectedCategory) {
    const assessment = getAssessmentDrivenCategory(userAssessmentScores, partnerAssessmentScores)
    if (assessment.category) {
      selectedCategory = assessment.category
      selectionReason = assessment.reason
      priority = 2
      log(2, `ASSESSMENT: ${assessment.reason} → ${assessment.category}`)
    }
  }

  // PRIORITY 3: Engagement Patterns (if nothing higher priority)
  if (!selectedCategory) {
    const engagement = getEngagementCategory(recentCheckins, streak, todayIsWeekend, hasRecentDates)
    if (engagement.category) {
      selectedCategory = engagement.category
      selectionReason = engagement.reason
      priority = 3
      log(3, `ENGAGEMENT: ${engagement.reason} → ${engagement.category}`)
    }
  }

  // PRIORITY 4: Default to gratitude (20% of the time) or random positive category
  if (!selectedCategory) {
    // 20% chance for gratitude
    const roll = Math.random()
    if (roll < 0.20) {
      selectedCategory = 'gratitude'
      selectionReason = 'Default selection: gratitude (20% base rate)'
    } else if (roll < 0.40) {
      selectedCategory = 'weekend_fun'
      selectionReason = 'Default selection: fun/light question'
    } else if (roll < 0.60) {
      selectedCategory = 'love_language_mismatch'
      selectionReason = 'Default selection: appreciation question'
    } else if (roll < 0.80) {
      selectedCategory = 'low_communication'
      selectionReason = 'Default selection: connection question'
    } else {
      selectedCategory = 'reflection'
      selectionReason = 'Default selection: reflection question'
    }
    priority = 4
    log(4, `DEFAULT: ${selectionReason}`)
  }

  // Get questions from selected category
  const categoryQuestions = ROTATING_QUESTIONS[selectedCategory] || ROTATING_QUESTIONS.gratitude

  // Get rotation index for varied but deterministic selection
  const questionIndex = getRotationIndex(selectedCategory, categoryQuestions.length, usedQuestionIds)
  const selectedQuestion = categoryQuestions[questionIndex]

  // Fallback if somehow null
  if (!selectedQuestion) {
    const fallback = ROTATING_QUESTIONS.gratitude[0]
    return {
      question: { ...fallback, category: 'gratitude' },
      reason: 'Fallback: no valid question found',
      category: 'gratitude',
      priority: 4
    }
  }

  return {
    question: {
      ...selectedQuestion,
      category: selectedCategory,
    },
    reason: selectionReason,
    category: selectedCategory,
    priority
  }
}

/**
 * Simplified version for basic usage (backwards compatible)
 * Returns just the question object
 */
export function selectQuestion(params = {}) {
  const result = selectRotatingQuestion(params)
  return result.question
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
  const index = getRotationIndex('reflection', questions.length, usedQuestionIds)

  return {
    ...questions[index],
    category: 'reflection',
  }
}

/**
 * Gets all questions for a complete daily check-in
 * @param {Object} context - Assessment and profile data
 * @returns {Array} - Array of questions to ask
 */
export function getDailyCheckinQuestions(context = {}) {
  const rotatingResult = selectRotatingQuestion(context)

  return {
    questions: [
      CORE_QUESTIONS.mood,
      CORE_QUESTIONS.connection,
      rotatingResult.question,
    ],
    rotatingQuestionReason: rotatingResult.reason,
    rotatingQuestionPriority: rotatingResult.priority,
  }
}
