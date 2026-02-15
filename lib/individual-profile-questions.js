// Individual Profile Assessment Questions
// Research-backed framework combining Big Five, Emotional Intelligence, and Attachment Theory
// 5 modules × 6 questions = 30 total questions

export const PROFILE_MODULES = [
  {
    id: 'processing_style',
    title: 'Processing Style',
    description: 'Discover how you think, decide, and approach life',
    icon: '🧠',
    color: 'from-indigo-500 to-purple-500',
    bgColor: 'bg-indigo-50',
  },
  {
    id: 'emotional_patterns',
    title: 'Emotional Patterns',
    description: 'Understand how you experience and express emotions',
    icon: '💫',
    color: 'from-rose-500 to-pink-500',
    bgColor: 'bg-rose-50',
  },
  {
    id: 'connection_style',
    title: 'Connection Style',
    description: 'Learn how you form bonds and relate to others',
    icon: '🔗',
    color: 'from-teal-500 to-cyan-500',
    bgColor: 'bg-teal-50',
  },
  {
    id: 'core_values',
    title: 'Core Values',
    description: 'Identify what matters most to you in life',
    icon: '⭐',
    color: 'from-amber-500 to-yellow-500',
    bgColor: 'bg-amber-50',
  },
  {
    id: 'love_needs',
    title: 'Love Needs',
    description: 'Discover how you need to be loved and appreciated',
    icon: '💝',
    color: 'from-pink-500 to-red-500',
    bgColor: 'bg-pink-50',
  },
]

export const PROFILE_QUESTIONS = {
  // Module 1: Processing Style (Big Five: Openness, Conscientiousness)
  processing_style: [
    {
      id: 'ps_1',
      text: 'When facing a big decision, I typically:',
      type: 'single',
      options: [
        { value: 'analyze', label: 'Research thoroughly and weigh all options', score: { analytical: 3, intuitive: 1 } },
        { value: 'intuition', label: 'Trust my gut feeling', score: { analytical: 1, intuitive: 3 } },
        { value: 'consult', label: 'Talk it through with people I trust', score: { analytical: 2, intuitive: 2, social: 2 } },
        { value: 'delay', label: 'Wait and let the answer become clear over time', score: { analytical: 2, intuitive: 2 } },
      ],
    },
    {
      id: 'ps_2',
      text: 'My ideal environment for thinking clearly is:',
      type: 'single',
      options: [
        { value: 'quiet', label: 'Complete silence and solitude', score: { introvert: 3 } },
        { value: 'background', label: 'Soft background noise or music', score: { introvert: 2, extrovert: 1 } },
        { value: 'active', label: 'Busy places with energy around me', score: { extrovert: 3 } },
        { value: 'movement', label: 'While walking or doing something physical', score: { kinesthetic: 3 } },
      ],
    },
    {
      id: 'ps_3',
      text: 'When I receive new information that challenges my beliefs:',
      type: 'single',
      options: [
        { value: 'curious', label: 'I get curious and want to explore it further', score: { openness: 3 } },
        { value: 'skeptical', label: 'I question the source and look for evidence', score: { analytical: 3 } },
        { value: 'uncomfortable', label: 'I feel uncomfortable but try to consider it', score: { openness: 2 } },
        { value: 'dismiss', label: 'I tend to stick with what I already know', score: { openness: 1 } },
      ],
    },
    {
      id: 'ps_4',
      text: 'My approach to planning is:',
      type: 'single',
      options: [
        { value: 'detailed', label: 'I create detailed plans and follow them closely', score: { structure: 3 } },
        { value: 'flexible', label: 'I have a rough outline but stay flexible', score: { structure: 2, flexibility: 2 } },
        { value: 'spontaneous', label: 'I prefer to figure things out as I go', score: { flexibility: 3 } },
        { value: 'dependent', label: 'It depends on what I\'m planning for', score: { adaptive: 2 } },
      ],
    },
    {
      id: 'ps_5',
      text: 'When learning something new, I learn best by:',
      type: 'single',
      options: [
        { value: 'reading', label: 'Reading or watching explanations', score: { visual: 3 } },
        { value: 'discussing', label: 'Discussing it with others', score: { social: 3 } },
        { value: 'doing', label: 'Hands-on practice and experimentation', score: { kinesthetic: 3 } },
        { value: 'observing', label: 'Watching someone else do it first', score: { visual: 2, observational: 2 } },
      ],
    },
    {
      id: 'ps_6',
      text: 'When I\'m stressed, my thinking tends to:',
      type: 'single',
      options: [
        { value: 'racing', label: 'Race with many thoughts at once', score: { anxiety: 2 } },
        { value: 'focused', label: 'Become hyper-focused on the problem', score: { analytical: 2 } },
        { value: 'scattered', label: 'Feel scattered and hard to concentrate', score: { overwhelm: 2 } },
        { value: 'shutdown', label: 'Slow down or feel blank', score: { shutdown: 2 } },
      ],
    },
  ],

  // Module 2: Emotional Patterns (Emotional Intelligence)
  emotional_patterns: [
    {
      id: 'ep_1',
      text: 'When I feel a strong emotion, I usually:',
      type: 'single',
      options: [
        { value: 'express', label: 'Express it openly and immediately', score: { expression: 3 } },
        { value: 'process', label: 'Take time to understand it before sharing', score: { processing: 3 } },
        { value: 'contain', label: 'Keep it to myself until I\'ve processed it', score: { containment: 3 } },
        { value: 'distract', label: 'Try to distract myself or move past it', score: { avoidance: 2 } },
      ],
    },
    {
      id: 'ep_2',
      text: 'I\'m most aware of my emotions when:',
      type: 'single',
      options: [
        { value: 'always', label: 'Throughout the day—I check in often', score: { awareness: 3 } },
        { value: 'intense', label: 'They become intense or overwhelming', score: { awareness: 2 } },
        { value: 'reflection', label: 'I deliberately reflect, like journaling', score: { awareness: 2, processing: 2 } },
        { value: 'rarely', label: 'Others point them out to me', score: { awareness: 1 } },
      ],
    },
    {
      id: 'ep_3',
      text: 'When someone I care about is upset, I naturally:',
      type: 'single',
      options: [
        { value: 'feel', label: 'Feel their emotions alongside them', score: { empathy: 3 } },
        { value: 'fix', label: 'Want to help solve the problem', score: { problem_solving: 3 } },
        { value: 'space', label: 'Give them space unless they ask for help', score: { boundaries: 2 } },
        { value: 'uncomfortable', label: 'Feel uncomfortable and unsure what to do', score: { discomfort: 2 } },
      ],
    },
    {
      id: 'ep_4',
      text: 'My emotional recovery after a setback is typically:',
      type: 'single',
      options: [
        { value: 'quick', label: 'Quick—I bounce back within hours or a day', score: { resilience: 3 } },
        { value: 'moderate', label: 'Moderate—it takes a few days', score: { resilience: 2 } },
        { value: 'slow', label: 'Slow—I need significant time to process', score: { deep_processing: 2 } },
        { value: 'variable', label: 'Variable—depends on the situation', score: { adaptive: 2 } },
      ],
    },
    {
      id: 'ep_5',
      text: 'I express love and care primarily through:',
      type: 'single',
      options: [
        { value: 'words', label: 'Words—telling people how I feel', score: { verbal: 3 } },
        { value: 'actions', label: 'Actions—doing things for them', score: { acts: 3 } },
        { value: 'presence', label: 'Presence—being there and listening', score: { quality_time: 3 } },
        { value: 'touch', label: 'Physical affection and touch', score: { physical: 3 } },
      ],
    },
    {
      id: 'ep_6',
      text: 'When I\'m feeling overwhelmed, I need:',
      type: 'single',
      options: [
        { value: 'talk', label: 'Someone to talk to and process with', score: { social_support: 3 } },
        { value: 'alone', label: 'Time alone to decompress', score: { solitude: 3 } },
        { value: 'activity', label: 'Physical activity or a change of scenery', score: { active_coping: 3 } },
        { value: 'comfort', label: 'Comfort—cozy environment, familiar things', score: { comfort: 3 } },
      ],
    },
  ],

  // Module 3: Connection Style (Attachment Theory)
  connection_style: [
    {
      id: 'cs_1',
      text: 'In close relationships, I tend to:',
      type: 'single',
      options: [
        { value: 'secure', label: 'Feel comfortable with closeness and independence', score: { secure: 3 } },
        { value: 'anxious', label: 'Worry about whether people truly care about me', score: { anxious: 3 } },
        { value: 'independent', label: 'Value my independence and need space', score: { avoidant: 2 } },
        { value: 'variable', label: 'Feel pulled between wanting closeness and needing distance', score: { disorganized: 2 } },
      ],
    },
    {
      id: 'cs_2',
      text: 'When conflict arises with someone close to me:',
      type: 'single',
      options: [
        { value: 'address', label: 'I address it directly and calmly', score: { secure: 3 } },
        { value: 'anxious', label: 'I worry intensely about the relationship', score: { anxious: 3 } },
        { value: 'withdraw', label: 'I need space before I can discuss it', score: { avoidant: 2 } },
        { value: 'avoid', label: 'I prefer to avoid the conversation', score: { avoidant: 3 } },
      ],
    },
    {
      id: 'cs_3',
      text: 'My ideal balance of togetherness vs. alone time is:',
      type: 'single',
      options: [
        { value: 'mostly_together', label: 'Mostly together with some alone time', score: { high_connection: 3 } },
        { value: 'balanced', label: 'Fairly balanced—about 50/50', score: { balanced: 3 } },
        { value: 'mostly_alone', label: 'Significant alone time with quality togetherness', score: { high_autonomy: 3 } },
        { value: 'flexible', label: 'Flexible based on how I\'m feeling', score: { adaptive: 2 } },
      ],
    },
    {
      id: 'cs_4',
      text: 'When meeting new people, I typically:',
      type: 'single',
      options: [
        { value: 'energized', label: 'Feel energized and enjoy it', score: { extrovert: 3 } },
        { value: 'curious', label: 'Am curious but warm up slowly', score: { ambivert: 2 } },
        { value: 'drained', label: 'Find it draining even if I enjoy it', score: { introvert: 2 } },
        { value: 'anxious', label: 'Feel anxious and prefer small groups', score: { social_anxiety: 2 } },
      ],
    },
    {
      id: 'cs_5',
      text: 'I feel most connected to someone when we:',
      type: 'single',
      options: [
        { value: 'deep_talk', label: 'Have deep, meaningful conversations', score: { depth: 3 } },
        { value: 'activities', label: 'Do activities or experiences together', score: { shared_experience: 3 } },
        { value: 'comfortable', label: 'Can be comfortable in silence together', score: { presence: 3 } },
        { value: 'support', label: 'Support each other through challenges', score: { mutual_support: 3 } },
      ],
    },
    {
      id: 'cs_6',
      text: 'When I haven\'t heard from someone I care about:',
      type: 'single',
      options: [
        { value: 'fine', label: 'I assume all is well and reach out when I think of them', score: { secure: 3 } },
        { value: 'worry', label: 'I start to worry something is wrong', score: { anxious: 2 } },
        { value: 'appreciate', label: 'I appreciate the space and independent time', score: { avoidant: 2 } },
        { value: 'mixed', label: 'I feel a mix of relief and concern', score: { ambivalent: 2 } },
      ],
    },
  ],

  // Module 4: Core Values
  core_values: [
    {
      id: 'cv_1',
      text: 'What drives you most in life?',
      type: 'ranking',
      options: [
        { value: 'growth', label: 'Personal growth and self-improvement' },
        { value: 'connection', label: 'Deep relationships and belonging' },
        { value: 'achievement', label: 'Accomplishment and success' },
        { value: 'peace', label: 'Inner peace and contentment' },
        { value: 'contribution', label: 'Making a difference for others' },
      ],
    },
    {
      id: 'cv_2',
      text: 'In a partnership, which quality matters most?',
      type: 'single',
      options: [
        { value: 'trust', label: 'Trust and reliability', score: { trust: 3 } },
        { value: 'passion', label: 'Passion and chemistry', score: { passion: 3 } },
        { value: 'communication', label: 'Open communication', score: { communication: 3 } },
        { value: 'shared_goals', label: 'Shared goals and vision', score: { alignment: 3 } },
      ],
    },
    {
      id: 'cv_3',
      text: 'How important is personal ambition to you?',
      type: 'single',
      options: [
        { value: 'very', label: 'Essential—I\'m driven to achieve my goals', score: { ambition: 3 } },
        { value: 'important', label: 'Important but balanced with other priorities', score: { ambition: 2 } },
        { value: 'moderate', label: 'Moderate—I prefer contentment over striving', score: { contentment: 2 } },
        { value: 'low', label: 'Not very—I value peace over achievement', score: { peace: 3 } },
      ],
    },
    {
      id: 'cv_4',
      text: 'Your approach to honesty in relationships:',
      type: 'single',
      options: [
        { value: 'radical', label: 'Complete honesty, even when it\'s hard', score: { radical_honesty: 3 } },
        { value: 'kind', label: 'Honest but with kindness and timing', score: { compassionate_honesty: 3 } },
        { value: 'protective', label: 'Sometimes I soften truth to protect feelings', score: { protective: 2 } },
        { value: 'selective', label: 'Not everything needs to be shared', score: { privacy: 2 } },
      ],
    },
    {
      id: 'cv_5',
      text: 'How do you view personal freedom within a relationship?',
      type: 'single',
      options: [
        { value: 'essential', label: 'Essential—I need significant independence', score: { autonomy: 3 } },
        { value: 'important', label: 'Important but I\'m willing to compromise', score: { autonomy: 2, flexibility: 2 } },
        { value: 'balanced', label: 'I prefer building a life that\'s deeply shared', score: { togetherness: 3 } },
        { value: 'secondary', label: 'My partner\'s needs often come before my own', score: { self_sacrifice: 2 } },
      ],
    },
    {
      id: 'cv_6',
      text: 'What role does spirituality or meaning play in your life?',
      type: 'single',
      options: [
        { value: 'central', label: 'Central—it guides most of my decisions', score: { spiritual: 3 } },
        { value: 'important', label: 'Important but more personal than organized', score: { spiritual: 2 } },
        { value: 'curious', label: 'I\'m curious and exploring', score: { seeking: 2 } },
        { value: 'minimal', label: 'Not a significant focus for me', score: { secular: 2 } },
      ],
    },
  ],

  // Module 5: Love Needs
  love_needs: [
    {
      id: 'ln_1',
      text: 'I feel most loved when someone:',
      type: 'ranking',
      options: [
        { value: 'words', label: 'Tells me they love and appreciate me' },
        { value: 'time', label: 'Gives me their undivided attention' },
        { value: 'acts', label: 'Does thoughtful things to help me' },
        { value: 'gifts', label: 'Surprises me with meaningful gifts' },
        { value: 'touch', label: 'Shows affection through physical closeness' },
      ],
    },
    {
      id: 'ln_2',
      text: 'When I\'m going through a hard time, I most need:',
      type: 'single',
      options: [
        { value: 'listen', label: 'Someone to listen without trying to fix it', score: { emotional_support: 3 } },
        { value: 'advice', label: 'Practical advice and solutions', score: { practical_support: 3 } },
        { value: 'distraction', label: 'Distraction and help getting my mind off it', score: { distraction: 3 } },
        { value: 'space', label: 'Space to work through it on my own', score: { independence: 3 } },
      ],
    },
    {
      id: 'ln_3',
      text: 'Physical affection to me is:',
      type: 'single',
      options: [
        { value: 'essential', label: 'Essential—I need regular physical connection', score: { touch_need: 3 } },
        { value: 'important', label: 'Important but not my primary need', score: { touch_need: 2 } },
        { value: 'nice', label: 'Nice but I can go without it', score: { touch_need: 1 } },
        { value: 'complicated', label: 'Complicated—depends on my mood and comfort', score: { touch_variable: 2 } },
      ],
    },
    {
      id: 'ln_4',
      text: 'What makes you feel truly appreciated?',
      type: 'single',
      options: [
        { value: 'noticed', label: 'When someone notices the small things I do', score: { recognition: 3 } },
        { value: 'respected', label: 'When my opinions are respected and valued', score: { respect: 3 } },
        { value: 'prioritized', label: 'When someone prioritizes time with me', score: { priority: 3 } },
        { value: 'celebrated', label: 'When my achievements are celebrated', score: { celebration: 3 } },
      ],
    },
    {
      id: 'ln_5',
      text: 'My ideal way to spend quality time is:',
      type: 'single',
      options: [
        { value: 'talking', label: 'Deep conversation without distractions', score: { verbal_intimacy: 3 } },
        { value: 'adventure', label: 'Exploring or trying something new together', score: { adventure: 3 } },
        { value: 'relaxing', label: 'Relaxing together at home', score: { comfort: 3 } },
        { value: 'alongside', label: 'Doing our own things but together', score: { parallel_play: 3 } },
      ],
    },
    {
      id: 'ln_6',
      text: 'How do you prefer to receive feedback or criticism?',
      type: 'single',
      options: [
        { value: 'direct', label: 'Directly and straightforwardly', score: { direct: 3 } },
        { value: 'gentle', label: 'Gently with acknowledgment of what I do well', score: { gentle: 3 } },
        { value: 'written', label: 'In writing so I can process it', score: { written: 2 } },
        { value: 'rarely', label: 'Rarely—I\'m quite sensitive to criticism', score: { sensitive: 2 } },
      ],
    },
  ],
}

// Generate insights for a profile module
export function generateProfileInsights(moduleId, answers) {
  const module = PROFILE_MODULES.find(m => m.id === moduleId)
  if (!module) return null

  const questions = PROFILE_QUESTIONS[moduleId]
  if (!questions) return null

  // Calculate scores based on answers
  let totalScore = 0
  let maxScore = 0
  const traits = {}

  questions.forEach(q => {
    const answer = answers[q.id]
    if (answer === undefined) return

    if (q.type === 'single') {
      const option = q.options.find(o => o.value === answer)
      if (option?.score) {
        Object.entries(option.score).forEach(([trait, score]) => {
          traits[trait] = (traits[trait] || 0) + score
        })
        totalScore += 3 // Assume max score of 3 per question
        maxScore += 3
      }
    } else if (q.type === 'ranking') {
      // For rankings, we just store them for insights
      totalScore += 5 // Completed ranking
      maxScore += 5
    }
  })

  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0

  // Generate module-specific insights
  const insights = getModuleInsights(moduleId, traits, answers)

  return {
    moduleId,
    title: module.title,
    percentage: Math.min(100, percentage),
    traits,
    insights,
  }
}

function getModuleInsights(moduleId, traits, answers) {
  const insights = {
    headline: '',
    description: '',
    strengths: [],
    tips: [],
  }

  switch (moduleId) {
    case 'processing_style':
      if (traits.analytical > (traits.intuitive || 0)) {
        insights.headline = 'The Thoughtful Analyst'
        insights.description = 'You approach life with careful consideration, gathering information and weighing options before making decisions. Your methodical nature helps you avoid hasty choices.'
        insights.strengths = ['Thorough decision-making', 'Attention to detail', 'Logical problem-solving']
      } else if (traits.intuitive > (traits.analytical || 0)) {
        insights.headline = 'The Intuitive Navigator'
        insights.description = 'You trust your inner wisdom and gut feelings to guide you. This intuitive approach often leads you to insights that pure logic might miss.'
        insights.strengths = ['Quick decision-making', 'Reading between the lines', 'Trusting inner guidance']
      } else {
        insights.headline = 'The Balanced Thinker'
        insights.description = 'You blend analytical thinking with intuitive insight, choosing your approach based on the situation. This flexibility serves you well.'
        insights.strengths = ['Adaptable thinking', 'Situational awareness', 'Balanced perspective']
      }
      insights.tips = [
        'Notice when you default to analysis vs. intuition',
        'Practice your less-dominant style in low-stakes situations',
        'Share your thinking process with your partner',
      ]
      break

    case 'emotional_patterns':
      if (traits.expression > (traits.containment || 0)) {
        insights.headline = 'The Open Heart'
        insights.description = 'You wear your heart on your sleeve and believe in expressing emotions openly. This authenticity creates space for genuine connection.'
        insights.strengths = ['Emotional authenticity', 'Creating safe spaces', 'Building intimacy quickly']
      } else if (traits.containment > (traits.expression || 0)) {
        insights.headline = 'The Still Waters'
        insights.description = 'You process emotions deeply and privately before sharing them. This thoughtful approach means your expressions carry weight.'
        insights.strengths = ['Emotional depth', 'Thoughtful responses', 'Steady presence']
      } else {
        insights.headline = 'The Emotional Navigator'
        insights.description = 'You adapt your emotional expression to the situation, reading the room and responding appropriately.'
        insights.strengths = ['Emotional flexibility', 'Situational awareness', 'Balanced expression']
      }
      insights.tips = [
        'Learn your partner\'s emotional processing style',
        'Create rituals for emotional check-ins',
        'Name your emotions to help your partner understand you',
      ]
      break

    case 'connection_style':
      if (traits.secure > (traits.anxious || 0) && traits.secure > (traits.avoidant || 0)) {
        insights.headline = 'The Secure Connector'
        insights.description = 'You\'re comfortable with both intimacy and independence. You trust in relationships while maintaining your sense of self.'
        insights.strengths = ['Healthy boundaries', 'Trust in relationships', 'Emotional stability']
      } else if (traits.anxious > (traits.avoidant || 0)) {
        insights.headline = 'The Heart-First Connector'
        insights.description = 'You connect deeply and value reassurance in relationships. Your sensitivity to connection makes you an attentive partner.'
        insights.strengths = ['Deep attunement to partner', 'Emotional investment', 'Relationship prioritization']
      } else if (traits.avoidant > (traits.anxious || 0)) {
        insights.headline = 'The Independent Spirit'
        insights.description = 'You value your autonomy and need space to feel your best. You connect deeply but on your own terms and timeline.'
        insights.strengths = ['Self-sufficiency', 'Clear boundaries', 'Low-drama approach']
      } else {
        insights.headline = 'The Growing Connector'
        insights.description = 'You\'re learning to balance closeness and independence, developing your own unique connection style.'
        insights.strengths = ['Self-awareness', 'Willingness to grow', 'Adaptability']
      }
      insights.tips = [
        'Communicate your needs for space or closeness directly',
        'Recognize your patterns when feeling triggered',
        'Practice self-soothing when anxious about the relationship',
      ]
      break

    case 'core_values':
      const topValues = Object.entries(traits)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([key]) => key)

      insights.headline = 'Your Value Compass'
      insights.description = `Your core values center around ${topValues.join(', ').replace(/_/g, ' ')}. These principles guide your decisions and shape your expectations in relationships.`
      insights.strengths = topValues.map(v => v.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
      insights.tips = [
        'Share your values openly with your partner',
        'Discuss where your values align and differ',
        'Use values as a guide when making joint decisions',
      ]
      break

    case 'love_needs':
      insights.headline = 'Your Love Blueprint'
      insights.description = 'Understanding how you need to be loved helps your partner show up for you in meaningful ways. Remember: how you give love may differ from how you need to receive it.'

      if (traits.touch_need >= 3) {
        insights.strengths.push('Physical affection is primary')
      }
      if (traits.emotional_support >= 3) {
        insights.strengths.push('Emotional presence matters most')
      }
      if (traits.recognition >= 3) {
        insights.strengths.push('Being seen and appreciated')
      }
      if (traits.verbal_intimacy >= 3) {
        insights.strengths.push('Deep conversation as connection')
      }

      if (insights.strengths.length === 0) {
        insights.strengths = ['Multiple ways of receiving love', 'Flexible love language', 'Appreciation of varied expressions']
      }

      insights.tips = [
        'Tell your partner exactly how to love you well',
        'Learn how your partner needs to receive love',
        'Notice when you feel most loved and why',
      ]
      break

    default:
      insights.headline = 'Insights Pending'
      insights.description = 'Complete more questions to unlock your personalized insights.'
      insights.strengths = []
      insights.tips = []
  }

  return insights
}

export const PROFILE_ATTRIBUTION = 'Based on research from the Big Five personality model, Emotional Intelligence theory, and Attachment Theory.'
