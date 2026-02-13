/**
 * Relationship Assessment Question Bank
 *
 * This assessment is informed by relationship research including work by
 * Dr. John Gottman, Dr. Gary Chapman, and attachment theory (Bowlby/Ainsworth).
 *
 * All questions are original and designed to measure research-validated
 * relationship dimensions without using copyrighted or trademarked content.
 */

export const ASSESSMENT_MODULES = [
  {
    id: 'know_your_partner',
    title: 'Know Your Partner',
    shortTitle: 'Partner Knowledge',
    icon: '🗺️',
    description: 'How well do you know your partner\'s inner world? Research shows that couples who stay curious about each other\'s dreams, worries, and daily experiences build stronger emotional connections.',
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  {
    id: 'love_expressions',
    title: 'How You Give & Receive Love',
    shortTitle: 'Love Expressions',
    icon: '💝',
    description: 'We all express and receive love differently. Understanding your unique preferences helps you and your partner connect in ways that feel most meaningful.',
    color: 'from-pink-500 to-rose-500',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-600',
  },
  {
    id: 'communication',
    title: 'Communication Patterns',
    shortTitle: 'Communication',
    icon: '💬',
    description: 'How you talk—especially during disagreements—shapes your relationship\'s health. This explores your patterns for expressing needs, handling conflict, and reconnecting after tension.',
    color: 'from-purple-500 to-indigo-500',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-600',
  },
  {
    id: 'attachment_security',
    title: 'Attachment & Security',
    shortTitle: 'Attachment',
    icon: '🤝',
    description: 'Our early experiences shape how we approach intimacy and independence. Understanding your attachment patterns helps you build a more secure bond with your partner.',
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-600',
  },
  {
    id: 'shared_vision',
    title: 'Shared Vision',
    shortTitle: 'Shared Vision',
    icon: '🌟',
    description: 'Couples who create shared meaning—through rituals, values, and dreams—report deeper satisfaction. This explores how aligned you and your partner are on life\'s bigger picture.',
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-600',
  },
]

export const ASSESSMENT_QUESTIONS = {
  // ========================================
  // MODULE 1: KNOW YOUR PARTNER (6 questions)
  // Inspired by Gottman's Love Maps research
  // ========================================
  know_your_partner: [
    {
      id: 'kp_1',
      question: 'If your partner had a stressful day, how confident are you that you\'d know what\'s bothering them before they tell you?',
      type: 'scale',
      dimension: 'emotional_awareness',
      options: [
        { value: 1, label: 'Not at all confident' },
        { value: 2, label: 'Slightly confident' },
        { value: 3, label: 'Moderately confident' },
        { value: 4, label: 'Very confident' },
        { value: 5, label: 'Extremely confident' },
      ],
    },
    {
      id: 'kp_2',
      question: 'How often do you ask your partner about their current hopes, dreams, or goals?',
      type: 'scale',
      dimension: 'curiosity',
      options: [
        { value: 1, label: 'Rarely or never' },
        { value: 2, label: 'A few times a year' },
        { value: 3, label: 'Monthly' },
        { value: 4, label: 'Weekly' },
        { value: 5, label: 'Multiple times a week' },
      ],
    },
    {
      id: 'kp_3',
      question: 'Could you name your partner\'s three closest friends and describe what makes each friendship meaningful to them?',
      type: 'choice',
      dimension: 'social_knowledge',
      options: [
        { value: 1, label: 'I couldn\'t name them confidently' },
        { value: 2, label: 'I know the names but not much else' },
        { value: 3, label: 'I know the names and some details' },
        { value: 4, label: 'I could describe each friendship well' },
        { value: 5, label: 'I know these friends almost as well as my partner does' },
      ],
    },
    {
      id: 'kp_4',
      question: 'When your partner is facing a challenge at work or in life, how well do you understand what success would look like for them?',
      type: 'scale',
      dimension: 'aspiration_awareness',
      options: [
        { value: 1, label: 'I\'m often unsure what they\'re aiming for' },
        { value: 2, label: 'I have a vague idea' },
        { value: 3, label: 'I understand the basics' },
        { value: 4, label: 'I understand it well' },
        { value: 5, label: 'I could articulate it as clearly as they could' },
      ],
    },
    {
      id: 'kp_5',
      question: 'How much do you know about what brings your partner genuine joy—not just what they like, but what truly lights them up?',
      type: 'scale',
      dimension: 'joy_awareness',
      options: [
        { value: 1, label: 'I\'m not really sure' },
        { value: 2, label: 'I know a few things' },
        { value: 3, label: 'I have a good sense' },
        { value: 4, label: 'I know them very well' },
        { value: 5, label: 'I could write a book about it' },
      ],
    },
    {
      id: 'kp_6',
      question: 'If your partner received unexpected good news, what would be the first thing they\'d want to do?',
      type: 'choice',
      dimension: 'celebration_style',
      options: [
        { value: 1, label: 'I honestly have no idea' },
        { value: 2, label: 'I could guess but I\'m not sure' },
        { value: 3, label: 'I have a pretty good idea' },
        { value: 4, label: 'I\'m confident I know' },
        { value: 5, label: 'I know exactly—we\'ve celebrated together many times' },
      ],
    },
  ],

  // ========================================
  // MODULE 2: LOVE EXPRESSIONS (6 questions)
  // Based on Chapman's love languages research
  // ========================================
  love_expressions: [
    {
      id: 'le_1',
      question: 'When you\'re feeling disconnected from your partner, what would help you feel most loved?',
      type: 'ranking',
      dimension: 'receiving_preference',
      options: [
        { value: 'words', label: 'Hearing words of appreciation and affirmation' },
        { value: 'time', label: 'Having their undivided attention for quality time' },
        { value: 'touch', label: 'Physical closeness like hugs, holding hands, or cuddling' },
        { value: 'service', label: 'Them doing something thoughtful to make my life easier' },
        { value: 'gifts', label: 'A meaningful gift that shows they were thinking of me' },
      ],
    },
    {
      id: 'le_2',
      question: 'How do you naturally tend to show your partner you care?',
      type: 'ranking',
      dimension: 'giving_preference',
      options: [
        { value: 'words', label: 'Telling them what I appreciate about them' },
        { value: 'time', label: 'Making dedicated time to be fully present with them' },
        { value: 'touch', label: 'Physical affection and closeness' },
        { value: 'service', label: 'Doing things to help or support them' },
        { value: 'gifts', label: 'Surprising them with thoughtful gifts' },
      ],
    },
    {
      id: 'le_3',
      question: 'When your partner is stressed, what kind of support do they seem to appreciate most?',
      type: 'choice',
      dimension: 'partner_preference_awareness',
      options: [
        { value: 'words', label: 'Encouragement and reassurance' },
        { value: 'time', label: 'Just being there, giving them attention' },
        { value: 'touch', label: 'A hug or physical comfort' },
        { value: 'service', label: 'Helping take things off their plate' },
        { value: 'gifts', label: 'A small treat to cheer them up' },
        { value: 'unsure', label: 'I\'m not really sure' },
      ],
    },
    {
      id: 'le_4',
      question: 'Think of a time you felt deeply loved by your partner. What did they do?',
      type: 'choice',
      dimension: 'peak_experience',
      options: [
        { value: 'words', label: 'Said something meaningful that I still remember' },
        { value: 'time', label: 'Gave me their complete, focused attention' },
        { value: 'touch', label: 'The way they held me or showed physical affection' },
        { value: 'service', label: 'Went out of their way to help me with something' },
        { value: 'gifts', label: 'Gave me something that showed real thought and care' },
      ],
    },
    {
      id: 'le_5',
      question: 'How often do you and your partner express love in each other\'s preferred ways (not just your own)?',
      type: 'scale',
      dimension: 'expression_alignment',
      options: [
        { value: 1, label: 'We haven\'t really discussed this' },
        { value: 2, label: 'Sometimes, but we often miss the mark' },
        { value: 3, label: 'We try, with mixed results' },
        { value: 4, label: 'Usually—we\'re pretty attuned' },
        { value: 5, label: 'Always—we know exactly what the other needs' },
      ],
    },
    {
      id: 'le_6',
      question: 'What hurts you most when you\'re feeling unloved?',
      type: 'choice',
      dimension: 'pain_point',
      options: [
        { value: 'words', label: 'Criticism or lack of verbal appreciation' },
        { value: 'time', label: 'Feeling like I\'m not a priority for their time' },
        { value: 'touch', label: 'Lack of physical affection or intimacy' },
        { value: 'service', label: 'Feeling like I carry the burden alone' },
        { value: 'gifts', label: 'Forgotten occasions or thoughtless gestures' },
      ],
    },
  ],

  // ========================================
  // MODULE 3: COMMUNICATION PATTERNS (6 questions)
  // Drawing from Gottman's conflict research
  // ========================================
  communication: [
    {
      id: 'cp_1',
      question: 'When you and your partner disagree about something important, how do you typically begin the conversation?',
      type: 'choice',
      dimension: 'conflict_initiation',
      options: [
        { value: 5, label: 'I share my feelings calmly and ask for their perspective' },
        { value: 4, label: 'I try to find a good time and start gently' },
        { value: 3, label: 'I bring it up directly but try to stay neutral' },
        { value: 2, label: 'I sometimes start with frustration or criticism' },
        { value: 1, label: 'I avoid it until it builds up, then it comes out harshly' },
      ],
    },
    {
      id: 'cp_2',
      question: 'During an argument, if your partner says something hurtful, what\'s your typical response?',
      type: 'choice',
      dimension: 'defensiveness',
      options: [
        { value: 1, label: 'I shut down and stop engaging' },
        { value: 2, label: 'I defend myself and point out their faults too' },
        { value: 3, label: 'I feel hurt but try to stay in the conversation' },
        { value: 4, label: 'I take a breath and try to understand where it\'s coming from' },
        { value: 5, label: 'I acknowledge any truth in it, even if it\'s hard to hear' },
      ],
    },
    {
      id: 'cp_3',
      question: 'After a disagreement, how do you and your partner typically reconnect?',
      type: 'choice',
      dimension: 'repair_attempts',
      options: [
        { value: 1, label: 'We often don\'t—things stay tense for a while' },
        { value: 2, label: 'We wait until it blows over on its own' },
        { value: 3, label: 'One of us eventually breaks the ice, sometimes awkwardly' },
        { value: 4, label: 'We have our ways of signaling we\'re ready to reconnect' },
        { value: 5, label: 'We actively repair—apologize, check in, and reconnect intentionally' },
      ],
    },
    {
      id: 'cp_4',
      question: 'When your partner shares something vulnerable, how do you usually respond?',
      type: 'scale',
      dimension: 'emotional_responsiveness',
      options: [
        { value: 1, label: 'I sometimes dismiss it or offer quick solutions' },
        { value: 2, label: 'I listen but might change the subject' },
        { value: 3, label: 'I try to be supportive but don\'t always know what to say' },
        { value: 4, label: 'I listen carefully and validate their feelings' },
        { value: 5, label: 'I create space for them to feel fully heard and understood' },
      ],
    },
    {
      id: 'cp_5',
      question: 'How do you handle it when you realize you were wrong in a disagreement?',
      type: 'choice',
      dimension: 'accountability',
      options: [
        { value: 1, label: 'I have trouble admitting when I\'m wrong' },
        { value: 2, label: 'I might acknowledge it internally but not out loud' },
        { value: 3, label: 'I\'ll admit it eventually, but it takes time' },
        { value: 4, label: 'I apologize and take responsibility' },
        { value: 5, label: 'I own it fully and ask how I can make it right' },
      ],
    },
    {
      id: 'cp_6',
      question: 'When you\'re feeling flooded (overwhelmed) during a conflict, what do you do?',
      type: 'choice',
      dimension: 'self_soothing',
      options: [
        { value: 1, label: 'I say things I later regret' },
        { value: 2, label: 'I shut down completely and can\'t respond' },
        { value: 3, label: 'I push through even though I\'m overwhelmed' },
        { value: 4, label: 'I ask for a break and come back when I\'m calmer' },
        { value: 5, label: 'I recognize it early and we have a system for pausing' },
      ],
    },
  ],

  // ========================================
  // MODULE 4: ATTACHMENT & SECURITY (6 questions)
  // Based on attachment theory (Bowlby/Ainsworth)
  // ========================================
  attachment_security: [
    {
      id: 'as_1',
      question: 'When your partner needs space or time alone, how does it make you feel?',
      type: 'choice',
      dimension: 'anxiety_response',
      options: [
        { value: 1, label: 'Worried they\'re pulling away from me' },
        { value: 2, label: 'A bit anxious, but I try not to show it' },
        { value: 3, label: 'Neutral—I understand everyone needs alone time' },
        { value: 4, label: 'Fine—I use the time for myself too' },
        { value: 5, label: 'Comfortable—I trust our connection is solid' },
      ],
    },
    {
      id: 'as_2',
      question: 'How comfortable are you depending on your partner during difficult times?',
      type: 'scale',
      dimension: 'comfort_with_dependence',
      options: [
        { value: 1, label: 'Very uncomfortable—I prefer to handle things alone' },
        { value: 2, label: 'Somewhat uncomfortable' },
        { value: 3, label: 'It depends on the situation' },
        { value: 4, label: 'Generally comfortable' },
        { value: 5, label: 'Very comfortable—they\'re my safe place' },
      ],
    },
    {
      id: 'as_3',
      question: 'When there\'s emotional distance between you and your partner, what\'s your typical response?',
      type: 'choice',
      dimension: 'distance_response',
      options: [
        { value: 'pursue', label: 'I try to close the gap—texting more, initiating conversations' },
        { value: 'withdraw', label: 'I pull back too and wait for them to come to me' },
        { value: 'communicate', label: 'I name what I\'m noticing and ask about it directly' },
        { value: 'distract', label: 'I focus on other things and hope it resolves itself' },
        { value: 'secure', label: 'I stay grounded, trusting we\'ll find our way back' },
      ],
    },
    {
      id: 'as_4',
      question: 'How do you feel about being emotionally vulnerable with your partner?',
      type: 'scale',
      dimension: 'vulnerability_comfort',
      options: [
        { value: 1, label: 'I avoid it—it feels too risky' },
        { value: 2, label: 'I struggle with it but I\'m working on it' },
        { value: 3, label: 'I can be vulnerable about some things' },
        { value: 4, label: 'I\'m usually comfortable being open' },
        { value: 5, label: 'I feel safe being completely myself' },
      ],
    },
    {
      id: 'as_5',
      question: 'When your partner is upset with you, what\'s your internal experience?',
      type: 'choice',
      dimension: 'conflict_attachment',
      options: [
        { value: 1, label: 'I panic inside, worried they might leave' },
        { value: 2, label: 'I feel defensive and want to protect myself' },
        { value: 3, label: 'I feel bad but can stay present' },
        { value: 4, label: 'I\'m concerned but confident we can work through it' },
        { value: 5, label: 'I focus on understanding and resolution, not fear' },
      ],
    },
    {
      id: 'as_6',
      question: 'How would you describe the balance of togetherness and independence in your relationship?',
      type: 'choice',
      dimension: 'interdependence',
      options: [
        { value: 'too_close', label: 'We\'re very enmeshed—hard to tell where I end and they begin' },
        { value: 'needs_more_closeness', label: 'I wish we were closer and more connected' },
        { value: 'balanced', label: 'We have a healthy balance of together and apart' },
        { value: 'needs_more_space', label: 'I sometimes feel I need more independence' },
        { value: 'too_distant', label: 'We\'re quite independent—maybe too much so' },
      ],
    },
  ],

  // ========================================
  // MODULE 5: SHARED VISION (6 questions)
  // Inspired by Gottman's shared meaning research
  // ========================================
  shared_vision: [
    {
      id: 'sv_1',
      question: 'How aligned are you and your partner on your major life goals for the next 5-10 years?',
      type: 'scale',
      dimension: 'goal_alignment',
      options: [
        { value: 1, label: 'We haven\'t really discussed them' },
        { value: 2, label: 'We have different visions that may conflict' },
        { value: 3, label: 'We agree on some things but differ on others' },
        { value: 4, label: 'We\'re mostly aligned with minor differences' },
        { value: 5, label: 'We\'re completely aligned and excited about our shared future' },
      ],
    },
    {
      id: 'sv_2',
      question: 'Do you and your partner have rituals or traditions that are meaningful to your relationship?',
      type: 'scale',
      dimension: 'rituals',
      options: [
        { value: 1, label: 'Not really—we don\'t have any established rituals' },
        { value: 2, label: 'A few informal ones, nothing deliberate' },
        { value: 3, label: 'Some traditions we enjoy together' },
        { value: 4, label: 'Several meaningful rituals we both cherish' },
        { value: 5, label: 'Many—our rituals are a cornerstone of our connection' },
      ],
    },
    {
      id: 'sv_3',
      question: 'How do your core values compare with your partner\'s?',
      type: 'choice',
      dimension: 'value_alignment',
      options: [
        { value: 1, label: 'We have significant value differences that cause tension' },
        { value: 2, label: 'We differ on some important values' },
        { value: 3, label: 'Our values are somewhat similar' },
        { value: 4, label: 'We share most core values' },
        { value: 5, label: 'Our values are deeply aligned' },
      ],
    },
    {
      id: 'sv_4',
      question: 'When it comes to supporting each other\'s individual dreams, how would you describe your relationship?',
      type: 'scale',
      dimension: 'dream_support',
      options: [
        { value: 1, label: 'We don\'t really discuss individual dreams' },
        { value: 2, label: 'We know each other\'s dreams but don\'t actively support them' },
        { value: 3, label: 'We\'re supportive when it\'s convenient' },
        { value: 4, label: 'We actively encourage each other\'s dreams' },
        { value: 5, label: 'We\'re each other\'s biggest champions' },
      ],
    },
    {
      id: 'sv_5',
      question: 'How often do you and your partner have meaningful conversations about your relationship and where it\'s going?',
      type: 'scale',
      dimension: 'relationship_dialogue',
      options: [
        { value: 1, label: 'Almost never' },
        { value: 2, label: 'Only when there\'s a problem' },
        { value: 3, label: 'Occasionally' },
        { value: 4, label: 'Regularly' },
        { value: 5, label: 'Frequently—it\'s part of how we stay connected' },
      ],
    },
    {
      id: 'sv_6',
      question: 'How would you describe the "story" of your relationship that you both tell?',
      type: 'choice',
      dimension: 'shared_narrative',
      options: [
        { value: 1, label: 'We don\'t really have a shared story' },
        { value: 2, label: 'Our versions of our story differ significantly' },
        { value: 3, label: 'We have a basic shared narrative' },
        { value: 4, label: 'We tell a positive, mostly aligned story' },
        { value: 5, label: 'We have a beautiful shared story that we both cherish' },
      ],
    },
  ],
}

// Scoring and insight generation
export const generateModuleInsights = (moduleId, answers) => {
  const module = ASSESSMENT_MODULES.find(m => m.id === moduleId)
  const questions = ASSESSMENT_QUESTIONS[moduleId]

  if (!module || !questions) return null

  // Calculate average score (for scale/choice questions with numeric values)
  let totalScore = 0
  let scoredQuestions = 0

  questions.forEach(q => {
    const answer = answers[q.id]
    if (answer && typeof answer === 'number') {
      totalScore += answer
      scoredQuestions++
    } else if (answer && typeof answer === 'object' && answer.value) {
      totalScore += answer.value
      scoredQuestions++
    }
  })

  const averageScore = scoredQuestions > 0 ? totalScore / scoredQuestions : 0
  const percentage = Math.round((averageScore / 5) * 100)

  // Generate strength level
  let strengthLevel
  if (percentage >= 80) strengthLevel = 'strong'
  else if (percentage >= 60) strengthLevel = 'good'
  else if (percentage >= 40) strengthLevel = 'developing'
  else strengthLevel = 'growth_area'

  // Generate insights based on module
  const insights = getModuleInsights(moduleId, answers, strengthLevel, percentage)

  return {
    moduleId,
    title: module.title,
    score: averageScore,
    percentage,
    strengthLevel,
    insights,
  }
}

const getModuleInsights = (moduleId, answers, strengthLevel, percentage) => {
  const insightsByModule = {
    know_your_partner: {
      strong: {
        headline: 'Deep Emotional Connection',
        description: 'You\'ve built a rich understanding of your partner\'s inner world. This emotional attunement is a powerful foundation for lasting intimacy.',
        tips: [
          'Keep nurturing your curiosity—people change, and staying updated matters',
          'Share your own inner world just as openly',
          'Use this knowledge to surprise and delight your partner',
        ],
      },
      good: {
        headline: 'Growing Understanding',
        description: 'You know your partner well in many areas. There\'s room to deepen your connection by exploring the corners you haven\'t visited yet.',
        tips: [
          'Try asking one new question about their dreams or stresses this week',
          'Pay attention to what excites them when they talk',
          'Create space for deeper conversations during everyday moments',
        ],
      },
      developing: {
        headline: 'Building Your Map',
        description: 'You\'re still discovering who your partner really is beneath the surface. This is an opportunity for exciting exploration.',
        tips: [
          'Start with simple questions: "What was the best part of your day?"',
          'Listen without trying to fix or advise—just be curious',
          'Remember small details and follow up on them later',
        ],
      },
      growth_area: {
        headline: 'An Opportunity for Discovery',
        description: 'There\'s so much to learn about your partner\'s inner world. Making this a priority can transform your relationship.',
        tips: [
          'Set aside distraction-free time to really talk',
          'Ask open-ended questions about their hopes and worries',
          'Be patient—building this knowledge takes time and trust',
        ],
      },
    },
    love_expressions: {
      strong: {
        headline: 'Love Languages Aligned',
        description: 'You understand how you each give and receive love, and you\'re attuned to each other\'s needs. This creates a powerful sense of being truly seen.',
        tips: [
          'Continue to express love in your partner\'s preferred ways',
          'Check in occasionally—preferences can shift over time',
          'Celebrate how far you\'ve come in understanding each other',
        ],
      },
      good: {
        headline: 'Mostly Speaking the Same Language',
        description: 'You have a good grasp of how to make each other feel loved. A little fine-tuning could make your expressions even more impactful.',
        tips: [
          'Notice when your partner lights up—that\'s a clue to what matters',
          'Ask directly: "What makes you feel most loved by me?"',
          'Stretch yourself to express love in ways that don\'t come naturally',
        ],
      },
      developing: {
        headline: 'Learning Each Other\'s Language',
        description: 'You may be showing love in ways that don\'t fully land for your partner, and vice versa. Understanding this can unlock deeper connection.',
        tips: [
          'Have a conversation about how you each prefer to receive love',
          'Experiment with different expressions and notice the response',
          'Remember: it\'s not about what you want to give, but what they need to receive',
        ],
      },
      growth_area: {
        headline: 'A Translation Opportunity',
        description: 'You might be "missing" each other—both giving love, but not in ways that feel meaningful to the other.',
        tips: [
          'Start by observing: How does your partner naturally show love?',
          'Share openly about what makes YOU feel loved',
          'Be patient as you learn to "speak" each other\'s language',
        ],
      },
    },
    communication: {
      strong: {
        headline: 'Communication Champions',
        description: 'You\'ve developed healthy patterns for talking through challenges and staying connected. This skill will serve your relationship for life.',
        tips: [
          'Model these skills for others—you have wisdom to share',
          'Stay vigilant during stressful times when old patterns can resurface',
          'Keep prioritizing repair and reconnection',
        ],
      },
      good: {
        headline: 'Solid Communication Foundation',
        description: 'You handle most conversations well, though some patterns could use attention. You\'re on a good path.',
        tips: [
          'Notice your "triggers" and develop strategies for staying calm',
          'Practice starting difficult conversations gently',
          'Celebrate your successful repairs—they matter',
        ],
      },
      developing: {
        headline: 'Communication in Progress',
        description: 'Your conversations sometimes go sideways, but you\'re aware of the patterns. Awareness is the first step to change.',
        tips: [
          'Focus on understanding before being understood',
          'Take breaks when flooded—it\'s not giving up, it\'s self-care',
          'Practice "I feel..." statements instead of "You always..."',
        ],
      },
      growth_area: {
        headline: 'Communication Opportunity',
        description: 'Your communication patterns may be causing more hurt than connection. The good news: these skills can absolutely be learned.',
        tips: [
          'Consider couples communication resources or support',
          'Start with one small change: softer startups or taking breaks',
          'Remember you\'re on the same team, not opposing sides',
        ],
      },
    },
    attachment_security: {
      strong: {
        headline: 'Secure Base Built',
        description: 'You\'ve created a secure attachment where both of you feel safe to be vulnerable and independent. This is relationship gold.',
        tips: [
          'Continue to be a safe harbor for each other',
          'Maintain the balance of togetherness and autonomy',
          'Use your security to take healthy risks together',
        ],
      },
      good: {
        headline: 'Growing Security',
        description: 'Your relationship feels mostly safe, with some areas where old patterns or fears still show up. You\'re building something solid.',
        tips: [
          'Notice when anxiety or avoidance shows up—name it',
          'Reassure each other during uncertain moments',
          'Keep building trust through consistent follow-through',
        ],
      },
      developing: {
        headline: 'Navigating Attachment',
        description: 'Past patterns are influencing how you connect. Understanding your attachment styles can help you grow toward security.',
        tips: [
          'Learn about attachment styles—knowledge is power',
          'Communicate your needs clearly, even when it\'s scary',
          'Be patient with yourself and each other\'s patterns',
        ],
      },
      growth_area: {
        headline: 'Attachment Work Ahead',
        description: 'Anxiety, avoidance, or both may be creating disconnection. With awareness and effort, you can build a more secure bond.',
        tips: [
          'Consider individual or couples support to understand your patterns',
          'Start with small steps toward vulnerability',
          'Remember: attachment patterns CAN change with safe relationships',
        ],
      },
    },
    shared_vision: {
      strong: {
        headline: 'United Vision',
        description: 'You\'re building a life together with shared meaning, rituals, and dreams. This creates a "we" that\'s greater than the sum of its parts.',
        tips: [
          'Keep dreaming together—and follow through on plans',
          'Protect and nurture your meaningful rituals',
          'Tell your relationship story to others—it strengthens your bond',
        ],
      },
      good: {
        headline: 'Aligned Paths',
        description: 'You share many values and goals, with some areas to explore further. You\'re building something meaningful together.',
        tips: [
          'Have a "dreams" conversation—where do you each want to be in 5 years?',
          'Create a new ritual that\'s just yours',
          'Check in on values when making big decisions',
        ],
      },
      developing: {
        headline: 'Finding Common Ground',
        description: 'You may be on parallel paths that haven\'t fully merged yet. Intentional alignment can deepen your connection.',
        tips: [
          'Start sharing your individual dreams and see where they overlap',
          'Create one small ritual to start building shared meaning',
          'Discuss your core values—you might be more aligned than you think',
        ],
      },
      growth_area: {
        headline: 'Vision Alignment Needed',
        description: 'You may be moving in different directions. Finding shared meaning is essential for long-term relationship health.',
        tips: [
          'Make time for a serious conversation about your future',
          'Look for ANY shared values or goals as a starting point',
          'Consider what "we" means to you both',
        ],
      },
    },
  }

  return insightsByModule[moduleId]?.[strengthLevel] || {
    headline: 'Assessment Complete',
    description: 'Review your responses for personalized insights.',
    tips: [],
  }
}

// Attribution text
export const ASSESSMENT_ATTRIBUTION = 'This assessment is informed by relationship research including work by Dr. John Gottman, Dr. Gary Chapman, and attachment theory (Bowlby/Ainsworth). All questions are original.'

export default {
  ASSESSMENT_MODULES,
  ASSESSMENT_QUESTIONS,
  generateModuleInsights,
  ASSESSMENT_ATTRIBUTION,
}
