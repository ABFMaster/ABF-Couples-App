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
  {
    id: 'attachment_style',
    title: 'Attachment Style',
    shortTitle: 'Attachment Style',
    icon: '🔗',
    description: 'Discover your attachment pattern — the invisible blueprint shaping how you love, connect, and handle closeness in your relationship.',
    color: 'from-violet-500 to-purple-600',
    bgColor: 'bg-violet-50',
    textColor: 'text-violet-600',
    researchBasis: 'Based on attachment theory research by Hazan & Shaver (1987) and Bartholomew & Horowitz (1991)',
    estimatedMinutes: 8,
    questionCount: 20,
    standalone: true,
  },
  {
    id: 'conflict_style',
    title: 'Conflict Style',
    shortTitle: 'Conflict Style',
    icon: '⚡',
    description: 'Understand how you handle disagreement — and why. Your conflict style shapes every hard conversation in your relationship.',
    color: 'from-[#E8614D] to-[#c94a39]',
    bgColor: 'bg-red-50',
    textColor: 'text-[#E8614D]',
    researchBasis: 'Based on research by Gottman (1994), Thomas & Kilmann (1974), and Johnson & Tulagan (2000)',
    estimatedMinutes: 7,
    questionCount: 18,
    standalone: true,
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

  // ========================================
  // MODULE 6: ATTACHMENT STYLE (20 questions)
  // Standalone module — based on attachment theory
  // Hazan & Shaver (1987), Bartholomew & Horowitz (1991)
  // Each option stores the full object { value, label, style }
  // so scoreAttachmentStyle can tally by style key.
  // ========================================
  attachment_style: [
    // ── Theme 1: Response to conflict ──
    {
      id: 'att_01',
      question: 'When my partner and I disagree, my instinct is to…',
      type: 'choice',
      dimension: 'conflict_response',
      options: [
        { value: 1, label: 'Talk it through calmly — I want us to understand each other', style: 'secure' },
        { value: 2, label: 'Push for resolution right away — unresolved tension is really hard for me', style: 'anxious' },
        { value: 3, label: 'Take some space to process before we talk it through', style: 'avoidant' },
        { value: 4, label: 'Feel pulled toward them but also want to pull back at the same time', style: 'fearful' },
      ],
    },
    {
      id: 'att_02',
      question: 'After an argument with my partner, I usually feel…',
      type: 'choice',
      dimension: 'post_conflict',
      options: [
        { value: 1, label: 'Back to normal relatively quickly — I don\'t tend to dwell on it', style: 'avoidant' },
        { value: 2, label: 'Closer to them, especially after a good repair conversation', style: 'secure' },
        { value: 3, label: 'Unsettled — I worry it might mean something is wrong between us', style: 'fearful' },
        { value: 4, label: 'Anxious until I\'m completely sure things are truly okay again', style: 'anxious' },
      ],
    },
    {
      id: 'att_03',
      question: 'When my partner seems distant or distracted, I tend to…',
      type: 'choice',
      dimension: 'partner_distance_response',
      options: [
        { value: 1, label: 'Wonder if they\'re upset with me and feel the urge to reach out', style: 'anxious' },
        { value: 2, label: 'Feel uneasy — part of me wants to ask, part of me wants to pull back', style: 'fearful' },
        { value: 3, label: 'Give them space and trust they\'ll come to me when they\'re ready', style: 'secure' },
        { value: 4, label: 'Focus on my own things — their mood doesn\'t usually affect mine much', style: 'avoidant' },
      ],
    },
    // ── Theme 2: Need for closeness vs independence ──
    {
      id: 'att_04',
      question: 'In my relationship, I feel most comfortable when…',
      type: 'choice',
      dimension: 'closeness_preference',
      options: [
        { value: 1, label: 'We have a healthy mix of closeness and room to be ourselves', style: 'secure' },
        { value: 2, label: 'We each maintain our independence while still being connected', style: 'avoidant' },
        { value: 3, label: 'We\'re close, connected, and in frequent contact', style: 'anxious' },
        { value: 4, label: 'We\'re close, but honestly I sometimes feel overwhelmed by closeness too', style: 'fearful' },
      ],
    },
    {
      id: 'att_05',
      question: 'The idea of my partner having a very independent life…',
      type: 'choice',
      dimension: 'independence_reaction',
      options: [
        { value: 1, label: 'Makes me feel uneasy — I want to be included but feel I shouldn\'t need that', style: 'fearful' },
        { value: 2, label: 'Feels healthy — we\'re whole people who choose each other', style: 'secure' },
        { value: 3, label: 'Can feel threatening — I want to know I\'m still a clear priority', style: 'anxious' },
        { value: 4, label: 'Feels natural and healthy — I want that for both of us', style: 'avoidant' },
      ],
    },
    {
      id: 'att_06',
      question: 'When I need support, my first instinct is…',
      type: 'choice',
      dimension: 'support_seeking',
      options: [
        { value: 1, label: 'Handle it myself — asking feels unnecessary or uncomfortable', style: 'avoidant' },
        { value: 2, label: 'Reach out to my partner right away — I want to feel close and reassured', style: 'anxious' },
        { value: 3, label: 'Want to reach out but hesitate — I don\'t want to seem needy', style: 'fearful' },
        { value: 4, label: 'Ask for what I need directly — I know my partner wants to support me', style: 'secure' },
      ],
    },
    // ── Theme 3: Trust and vulnerability ──
    {
      id: 'att_07',
      question: 'Sharing my deepest fears and insecurities with my partner feels…',
      type: 'choice',
      dimension: 'vulnerability_comfort',
      options: [
        { value: 1, label: 'Important and necessary — it makes me feel truly known and loved', style: 'anxious' },
        { value: 2, label: 'Natural — vulnerability is how we build real intimacy', style: 'secure' },
        { value: 3, label: 'Scary but something I want — I just worry about how they\'ll react', style: 'fearful' },
        { value: 4, label: 'Uncomfortable — I prefer to keep those things to myself', style: 'avoidant' },
      ],
    },
    {
      id: 'att_08',
      question: 'When my partner shares something vulnerable with me, I…',
      type: 'choice',
      dimension: 'receiving_vulnerability',
      options: [
        { value: 1, label: 'Feel honored and make sure they feel truly heard and supported', style: 'secure' },
        { value: 2, label: 'Want to help but sometimes feel unsure of what they need from me', style: 'fearful' },
        { value: 3, label: 'Listen and offer practical help, though deep emotion can feel hard to sit with', style: 'avoidant' },
        { value: 4, label: 'Feel closer to them and glad they trust me with something important', style: 'anxious' },
      ],
    },
    {
      id: 'att_09',
      question: 'I believe that in general, people…',
      type: 'choice',
      dimension: 'trust_worldview',
      options: [
        { value: 1, label: 'Need to be self-reliant — depending on others usually leads to disappointment', style: 'avoidant' },
        { value: 2, label: 'Mean well but don\'t always follow through the way you hope', style: 'anxious' },
        { value: 3, label: 'Are generally trustworthy and want to show up for those they love', style: 'secure' },
        { value: 4, label: 'Can be caring, but relationships can also be a real source of pain', style: 'fearful' },
      ],
    },
    // ── Theme 4: Fear of abandonment or engulfment ──
    {
      id: 'att_10',
      question: 'The thought of my partner leaving the relationship makes me feel…',
      type: 'choice',
      dimension: 'abandonment_fear',
      options: [
        { value: 1, label: 'Sad to imagine — but I know I\'d be okay and could rebuild', style: 'secure' },
        { value: 2, label: 'Deeply afraid — and yet part of me worries I\'d push them away first', style: 'fearful' },
        { value: 3, label: 'Very anxious — it\'s a fear that sometimes affects how I act with them', style: 'anxious' },
        { value: 4, label: 'Difficult to sit with, but I\'d manage — I\'d lean on myself', style: 'avoidant' },
      ],
    },
    {
      id: 'att_11',
      question: 'When things are going really well in my relationship, I…',
      type: 'choice',
      dimension: 'positive_state_response',
      options: [
        { value: 1, label: 'Enjoy it but sometimes wait for something to go wrong', style: 'anxious' },
        { value: 2, label: 'Feel good, though I don\'t get too attached to any particular state', style: 'avoidant' },
        { value: 3, label: 'Feel happy but also a little suspicious — good things feel fragile to me', style: 'fearful' },
        { value: 4, label: 'Feel genuinely content and grateful', style: 'secure' },
      ],
    },
    {
      id: 'att_12',
      question: 'If my partner needs more space than usual, I typically…',
      type: 'choice',
      dimension: 'partner_space_response',
      options: [
        { value: 1, label: 'Feel conflicted — worried they\'re pulling away, but don\'t want to seem clingy', style: 'fearful' },
        { value: 2, label: 'Feel unsettled and want to check in to make sure everything\'s okay', style: 'anxious' },
        { value: 3, label: 'Understand completely — I appreciate when space is mutual and respected', style: 'avoidant' },
        { value: 4, label: 'Give it without overthinking — I trust it doesn\'t mean anything is wrong', style: 'secure' },
      ],
    },
    // ── Theme 5: How you show affection ──
    {
      id: 'att_13',
      question: 'I most naturally show my partner I care by…',
      type: 'choice',
      dimension: 'affection_expression',
      options: [
        { value: 1, label: 'Doing things for them practically — actions feel more natural than words', style: 'avoidant' },
        { value: 2, label: 'A mix of words, touch, presence, and thoughtfulness depending on the moment', style: 'secure' },
        { value: 3, label: 'Frequent affection and check-ins so they always know how much I care', style: 'anxious' },
        { value: 4, label: 'Small gestures when I feel safe enough — it can take effort to open up', style: 'fearful' },
      ],
    },
    {
      id: 'att_14',
      question: 'When my partner does something loving, I…',
      type: 'choice',
      dimension: 'receiving_love',
      options: [
        { value: 1, label: 'Feel genuinely grateful and usually express it right away', style: 'secure' },
        { value: 2, label: 'Feel deeply loved — it eases any anxiety I\'ve been carrying', style: 'anxious' },
        { value: 3, label: 'Feel touched, though I sometimes struggle to fully let it in', style: 'fearful' },
        { value: 4, label: 'Appreciate it inwardly, even if I don\'t always show it expressively', style: 'avoidant' },
      ],
    },
    // ── Theme 6: Response to partner's emotional needs ──
    {
      id: 'att_15',
      question: 'When my partner is upset, my natural response is…',
      type: 'choice',
      dimension: 'caregiving_response',
      options: [
        { value: 1, label: 'Drop everything and be there — their distress matters deeply to me', style: 'anxious' },
        { value: 2, label: 'Want to help, but feel some anxiety about whether I\'ll do it right', style: 'fearful' },
        { value: 3, label: 'Focus on solving the problem — sitting with emotions can feel hard', style: 'avoidant' },
        { value: 4, label: 'Hold space for them, let them be heard, and offer support without rushing', style: 'secure' },
      ],
    },
    {
      id: 'att_16',
      question: 'I feel most connected to my partner when…',
      type: 'choice',
      dimension: 'connection_style',
      options: [
        { value: 1, label: 'We have low-pressure, easy moments — intense closeness can feel overwhelming', style: 'fearful' },
        { value: 2, label: 'We\'re doing something together side by side, without needing to process emotions', style: 'avoidant' },
        { value: 3, label: 'We\'re both being honest about what we feel and what we need', style: 'secure' },
        { value: 4, label: 'We\'re deeply open with each other and I can really feel how much they care', style: 'anxious' },
      ],
    },
    {
      id: 'att_17',
      question: 'When my partner expresses a need I\'m not sure how to meet…',
      type: 'choice',
      dimension: 'unmet_need_response',
      options: [
        { value: 1, label: 'Feel stuck — I\'d rather help with something I know how to do', style: 'avoidant' },
        { value: 2, label: 'Ask what would actually help rather than guess', style: 'secure' },
        { value: 3, label: 'Worry I\'m not enough for them, and feel guilty and uncertain', style: 'fearful' },
        { value: 4, label: 'Feel anxious I might be disappointing them and try hard to figure it out', style: 'anxious' },
      ],
    },
    // ── Theme 7: Comfort with intimacy ──
    {
      id: 'att_18',
      question: 'Deep emotional intimacy in my relationship feels…',
      type: 'choice',
      dimension: 'intimacy_comfort',
      options: [
        { value: 1, label: 'Like the whole point — it\'s what I came here for', style: 'secure' },
        { value: 2, label: 'Nice in moderation, but sometimes more than I naturally want', style: 'avoidant' },
        { value: 3, label: 'Both deeply desired and sometimes frightening at the same time', style: 'fearful' },
        { value: 4, label: 'Necessary and wonderful — I can\'t feel truly close without it', style: 'anxious' },
      ],
    },
    {
      id: 'att_19',
      question: 'My ideal level of togetherness with my partner is…',
      type: 'choice',
      dimension: 'togetherness_ideal',
      options: [
        { value: 1, label: 'High — I want to share a lot of our lives and feel close most of the time', style: 'anxious' },
        { value: 2, label: 'Close enough to feel loved, but I sometimes need unexpected distance too', style: 'fearful' },
        { value: 3, label: 'Independent with good connection — enough together time, plenty of space', style: 'avoidant' },
        { value: 4, label: 'A natural, flexible balance that adapts to what we each need', style: 'secure' },
      ],
    },
    {
      id: 'att_20',
      question: 'When I imagine a truly secure, loving relationship…',
      type: 'choice',
      dimension: 'relationship_ideal',
      options: [
        { value: 1, label: 'I want it deeply — and part of me wonders if I\'d know how to keep it', style: 'fearful' },
        { value: 2, label: 'It feels like what I\'ve always been searching for — love without the fear', style: 'anxious' },
        { value: 3, label: 'I see my relationship in that description, with room to keep growing', style: 'secure' },
        { value: 4, label: 'It sounds ideal, though I value independence alongside closeness', style: 'avoidant' },
      ],
    },
  ],

  // ========================================
  // MODULE 7: CONFLICT STYLE (18 questions)
  // Standalone module — based on Gottman (1994),
  // Thomas & Kilmann (1974), Johnson & Tulagan (2000)
  // Four styles: validator, volatile, avoider, hostile
  // Each option stores { value, label, style }
  // ========================================
  conflict_style: [
    // ── Theme 1: How you start difficult conversations ──
    {
      id: 'con_01',
      question: 'When I need to bring up something that bothers me, I usually…',
      type: 'choice',
      dimension: 'conflict_initiation',
      options: [
        { value: 1, label: 'Choose a calm moment and explain what I\'m feeling and what I need', style: 'validator' },
        { value: 2, label: 'Bring it up right away — I don\'t wait, even if the timing isn\'t perfect', style: 'volatile' },
        { value: 3, label: 'Put it off as long as possible, hoping it will resolve on its own', style: 'avoider' },
        { value: 4, label: 'Bring it up when I\'m already frustrated, which means it often comes out harsh', style: 'hostile' },
      ],
    },
    {
      id: 'con_02',
      question: 'Before a hard conversation, I typically feel…',
      type: 'choice',
      dimension: 'pre_conflict_state',
      options: [
        { value: 1, label: 'Dread — I really don\'t want to have this conversation', style: 'avoider' },
        { value: 2, label: 'A little tense but ready — I know it\'s necessary', style: 'validator' },
        { value: 3, label: 'Energized — I\'d rather get it out than let it linger', style: 'volatile' },
        { value: 4, label: 'Braced — like I need to protect myself before it even starts', style: 'hostile' },
      ],
    },
    {
      id: 'con_03',
      question: 'I tend to bring up issues with my partner…',
      type: 'choice',
      dimension: 'timing',
      options: [
        { value: 1, label: 'Rarely — I usually let things go or handle them privately', style: 'avoider' },
        { value: 2, label: 'When I\'ve been holding it in so long that it comes out as an explosion', style: 'hostile' },
        { value: 3, label: 'After I\'ve had time to think about what I want to say', style: 'validator' },
        { value: 4, label: 'As soon as I feel it — I process by talking, not by waiting', style: 'volatile' },
      ],
    },
    // ── Theme 2: How you behave during conflict ──
    {
      id: 'con_04',
      question: 'When my partner says something that upsets me mid-argument, I…',
      type: 'choice',
      dimension: 'mid_conflict_response',
      options: [
        { value: 1, label: 'React immediately — my feelings come out loud and fast', style: 'volatile' },
        { value: 2, label: 'Take a breath and try to address what they said specifically', style: 'validator' },
        { value: 3, label: 'Get defensive and point out what they\'re doing wrong too', style: 'hostile' },
        { value: 4, label: 'Go quiet — I pull back rather than escalate', style: 'avoider' },
      ],
    },
    {
      id: 'con_05',
      question: 'During a disagreement, my body language tends to be…',
      type: 'choice',
      dimension: 'body_language',
      options: [
        { value: 1, label: 'Closed off — I cross my arms or avoid eye contact', style: 'avoider' },
        { value: 2, label: 'Open and engaged, even if I disagree with what I\'m hearing', style: 'validator' },
        { value: 3, label: 'Animated — I use my hands, lean in, show everything I\'m feeling', style: 'volatile' },
        { value: 4, label: 'Tense — my jaw tightens and I can feel my walls going up', style: 'hostile' },
      ],
    },
    {
      id: 'con_06',
      question: 'When the argument gets intense, I…',
      type: 'choice',
      dimension: 'intensity_response',
      options: [
        { value: 1, label: 'Say things I later regret or completely shut down', style: 'hostile' },
        { value: 2, label: 'Try to change the subject or de-escalate as fast as possible', style: 'avoider' },
        { value: 3, label: 'Stay fully in it — intensity doesn\'t scare me, it\'s just how we fight', style: 'volatile' },
        { value: 4, label: 'Slow down deliberately — I know intensity is when we most need to be careful', style: 'validator' },
      ],
    },
    // ── Theme 3: Emotional regulation under stress ──
    {
      id: 'con_07',
      question: 'When I feel unheard during a fight, I…',
      type: 'choice',
      dimension: 'unheard_response',
      options: [
        { value: 1, label: 'Calmly say "I don\'t feel heard right now — can we slow down?"', style: 'validator' },
        { value: 2, label: 'Get louder — if they\'re not listening, I need to make them hear me', style: 'volatile' },
        { value: 3, label: 'Shut down completely or start hitting back harder', style: 'hostile' },
        { value: 4, label: 'Give up on the conversation and withdraw', style: 'avoider' },
      ],
    },
    {
      id: 'con_08',
      question: 'My emotional temperature during conflict tends to…',
      type: 'choice',
      dimension: 'emotional_temperature',
      options: [
        { value: 1, label: 'Stay low — I prefer to keep calm even if I\'m bothered inside', style: 'avoider' },
        { value: 2, label: 'Spike fast — I feel everything immediately and intensely', style: 'volatile' },
        { value: 3, label: 'Build gradually then suddenly overflow', style: 'hostile' },
        { value: 4, label: 'Stay manageable — I can feel strongly and still stay present', style: 'validator' },
      ],
    },
    {
      id: 'con_09',
      question: 'When I\'m flooded with emotion during an argument, I…',
      type: 'choice',
      dimension: 'flooding_response',
      options: [
        { value: 1, label: 'Ask for a short break so I can come back calmer', style: 'validator' },
        { value: 2, label: 'Lose control of what I say or go completely cold', style: 'hostile' },
        { value: 3, label: 'Mentally check out while physically staying in the room', style: 'avoider' },
        { value: 4, label: 'Let it out — holding it in would feel worse than expressing it', style: 'volatile' },
      ],
    },
    // ── Theme 4: Repair and recovery ──
    {
      id: 'con_10',
      question: 'After an argument, I usually want to…',
      type: 'choice',
      dimension: 'post_conflict_need',
      options: [
        { value: 1, label: 'Reconnect fast — fights make me want closeness, not distance', style: 'volatile' },
        { value: 2, label: 'Have space and not talk about it for a while', style: 'avoider' },
        { value: 3, label: 'Debrief calmly — understand what happened and make sure we\'re okay', style: 'validator' },
        { value: 4, label: 'Be left alone until I\'ve cooled down completely', style: 'hostile' },
      ],
    },
    {
      id: 'con_11',
      question: 'When my partner tries to lighten the mood mid-fight, I…',
      type: 'choice',
      dimension: 'repair_attempt_response',
      options: [
        { value: 1, label: 'Appreciate it — humor is a good repair tool and I use it too', style: 'validator' },
        { value: 2, label: 'Feel like they\'re dismissing what I\'m saying', style: 'hostile' },
        { value: 3, label: 'Might laugh but jump back in — I need to finish what we started', style: 'volatile' },
        { value: 4, label: 'Feel relieved — any chance to de-escalate is welcome', style: 'avoider' },
      ],
    },
    {
      id: 'con_12',
      question: 'I feel like a conflict is truly resolved when…',
      type: 'choice',
      dimension: 'resolution_criteria',
      options: [
        { value: 1, label: 'The tension has lifted and we\'re acting normal again', style: 'avoider' },
        { value: 2, label: 'We\'ve both said our piece, understood each other, and made a plan', style: 'validator' },
        { value: 3, label: 'We\'ve had it all out — every feeling expressed — and we\'ve made up', style: 'volatile' },
        { value: 4, label: 'I feel like I\'ve been heard and acknowledged, not just placated', style: 'hostile' },
      ],
    },
    // ── Theme 5: Patterns and triggers ──
    {
      id: 'con_13',
      question: 'The thing that most often escalates our conflicts is…',
      type: 'choice',
      dimension: 'escalation_pattern',
      options: [
        { value: 1, label: 'Me reacting before I\'ve had a chance to calm down', style: 'hostile' },
        { value: 2, label: 'Unspoken tension that built up before we ever talked about it', style: 'avoider' },
        { value: 3, label: 'The intensity we both bring — we don\'t do anything halfway', style: 'volatile' },
        { value: 4, label: 'Timing — bringing something up when one of us is already stressed', style: 'validator' },
      ],
    },
    {
      id: 'con_14',
      question: 'I tend to feel most triggered when my partner…',
      type: 'choice',
      dimension: 'trigger',
      options: [
        { value: 1, label: 'Pushes me to talk when I\'m not ready', style: 'avoider' },
        { value: 2, label: 'Criticizes me or makes me feel attacked', style: 'hostile' },
        { value: 3, label: 'Shuts down or refuses to engage', style: 'volatile' },
        { value: 4, label: 'Misrepresents what I said or doesn\'t seem to really listen', style: 'validator' },
      ],
    },
    {
      id: 'con_15',
      question: 'Looking back at past conflicts, I notice I often…',
      type: 'choice',
      dimension: 'conflict_pattern',
      options: [
        { value: 1, label: 'Come out with a clearer understanding of both of us', style: 'validator' },
        { value: 2, label: 'Fight passionately and then reconnect just as passionately', style: 'volatile' },
        { value: 3, label: 'Said something I regret or withdrew in a way that made things worse', style: 'hostile' },
        { value: 4, label: 'Avoided the issue until it was bigger than it needed to be', style: 'avoider' },
      ],
    },
    // ── Theme 6: Your conflict beliefs ──
    {
      id: 'con_16',
      question: 'I believe conflict in a relationship is…',
      type: 'choice',
      dimension: 'conflict_belief',
      options: [
        { value: 1, label: 'Normal and healthy when handled well — even useful for growth', style: 'validator' },
        { value: 2, label: 'Part of how you love someone deeply — passion includes disagreement', style: 'volatile' },
        { value: 3, label: 'Something to minimize — unnecessary conflict damages a relationship', style: 'avoider' },
        { value: 4, label: 'Stressful and something I\'m still learning to handle well', style: 'hostile' },
      ],
    },
    {
      id: 'con_17',
      question: 'After a big fight, I typically feel…',
      type: 'choice',
      dimension: 'post_fight_state',
      options: [
        { value: 1, label: 'Drained but close — we got it out and now we can move forward', style: 'volatile' },
        { value: 2, label: 'Ashamed of how I acted or resentful about how they acted', style: 'hostile' },
        { value: 3, label: 'Relieved it\'s over but uneasy — I\'m never sure it\'s truly done', style: 'avoider' },
        { value: 4, label: 'Tired but okay — conflicts are hard but we usually end in a better place', style: 'validator' },
      ],
    },
    {
      id: 'con_18',
      question: 'My ideal way to handle disagreement would be…',
      type: 'choice',
      dimension: 'conflict_ideal',
      options: [
        { value: 1, label: 'Calm, brief, and rare — most things don\'t need a big conversation', style: 'avoider' },
        { value: 2, label: 'I\'m working toward being able to stay calm and actually resolve things', style: 'hostile' },
        { value: 3, label: 'A structured, honest conversation where we both feel heard', style: 'validator' },
        { value: 4, label: 'Passionate and open — get everything on the table and then make up', style: 'volatile' },
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

export function scoreAttachmentStyle(answers) {
  const counts = { secure: 0, anxious: 0, avoidant: 0, fearful: 0 }

  Object.values(answers).forEach(a => {
    if (a?.style && a.style in counts) counts[a.style]++
  })

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  const primary = sorted[0][0]
  const secondary = sorted[1][0]

  const profiles = {
    secure: {
      label: 'Securely Attached',
      emoji: '💚',
      tagline: 'You feel safe in love — and that safety creates space for genuine connection.',
      summary: 'You approach relationships with confidence and comfort. You\'re able to be close without losing yourself, and you trust that your partner is there for you. You handle conflict without catastrophizing, and you make your partner feel safe to be vulnerable.',
      strengths: ['Comfortable with both closeness and independence', 'Communicates needs clearly and directly', 'Handles conflict constructively without shutting down'],
      growth: 'Even secure attachment benefits from awareness — especially when partnered with someone with a different style. Learning to recognize and respond to your partner\'s specific patterns can deepen your connection further.',
      coachInsight: 'Your secure base is a gift — to your relationship and to your partner. The work is staying curious about how your attachment shows up under stress.',
      color: '#3D9970',
    },
    anxious: {
      label: 'Anxiously Attached',
      emoji: '💛',
      tagline: 'Your love runs deep — and your heart is working overtime to protect it.',
      summary: 'You love with intensity and care deeply about your relationship. But anxiety about abandonment or not being "enough" can lead to seeking constant reassurance or reading distance as rejection. Your passion for connection is a strength — learning to source more security from within will transform how you love.',
      strengths: ['Deeply emotionally attuned to your partner', 'Highly invested in the relationship', 'Strong desire for genuine, lasting connection'],
      growth: 'Practice noticing the difference between a real threat and an anxiety response. When you feel the urge to seek reassurance, try self-soothing first — then reach out from a calmer place.',
      coachInsight: 'Anxious attachment often comes from learning that love was conditional or unpredictable. Healing happens as you build inner security and experience a partner who shows up consistently.',
      color: '#E8A020',
    },
    avoidant: {
      label: 'Dismissive-Avoidant',
      emoji: '💙',
      tagline: 'You value independence deeply — and connection on your own terms.',
      summary: 'You\'re self-reliant and capable, often preferring emotional distance to avoid the vulnerability of depending on others. You may minimize emotional needs — your own or your partner\'s — and feel uncomfortable with too much closeness. There\'s nothing wrong with valuing independence; the growth edge is letting people in without losing yourself.',
      strengths: ['Self-sufficient and emotionally grounded', 'Calm and steady under pressure', 'Doesn\'t burden partner with unnecessary anxiety'],
      growth: 'Practice naming emotions, even small ones, and sharing them. Notice when you\'re pulling back as a protective move, and consider whether connection might feel safer than you expect.',
      coachInsight: 'Avoidant attachment often develops as a smart adaptation — you learned that others weren\'t always reliable, so you became your own source of strength. The invitation now is to let a safe person share that role.',
      color: '#2196F3',
    },
    fearful: {
      label: 'Fearful-Avoidant',
      emoji: '🤍',
      tagline: 'You want love deeply — and you also know firsthand how much it can hurt.',
      summary: 'You experience a push-pull in relationships: a deep longing for closeness alongside real fear of getting hurt. Intimacy can feel simultaneously essential and threatening. This is often rooted in past experiences where love came with pain or unpredictability. With support, it\'s absolutely possible to build a relationship that feels safe.',
      strengths: ['Deep capacity for love and empathy', 'Highly perceptive of relational dynamics', 'Powerful self-awareness once the patterns become visible'],
      growth: 'Work on building tolerance for intimacy in small steps. Notice the push-pull when it happens and name it — to yourself, and eventually to your partner. Therapy can be genuinely transformative here.',
      coachInsight: 'Fearful-avoidant attachment is sometimes called "disorganized" — because love and danger got mixed together early on. Healing comes from experiences of safe, consistent love that gradually rewires the association.',
      color: '#9C27B0',
    },
  }

  return { primary, secondary, counts, profile: profiles[primary], secondaryProfile: profiles[secondary] }
}

export function scoreConflictStyle(answers) {
  const counts = { validator: 0, volatile: 0, avoider: 0, hostile: 0 }

  Object.values(answers).forEach(a => {
    if (a?.style && a.style in counts) counts[a.style]++
  })

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  const primary = sorted[0][0]
  const secondary = sorted[1][0]

  const profiles = {
    validator: {
      label: 'The Validator',
      emoji: '🤝',
      tagline: 'You fight fair — and you make your partner feel heard even when you disagree.',
      summary: 'You approach conflict as a problem to solve together. You stay calm, listen actively, and look for common ground. You validate your partner\'s perspective even when you don\'t agree with it, which makes you a safe person to disagree with.',
      strengths: ['Stays calm and solution-focused', 'Makes partner feel heard during conflict', 'Repairs quickly and cleanly', 'Conflict rarely escalates dangerously'],
      growth: 'Watch for over-validating at the expense of your own needs. Sometimes the relationship needs your full honest perspective, not just harmony.',
      coachInsight: 'Validator conflict style. Calm and fair. May suppress own needs for harmony. Encourage them to voice disagreement fully, not just seek resolution.',
      color: '#3D9970',
    },
    volatile: {
      label: 'The Passionate Fighter',
      emoji: '🔥',
      tagline: 'You fight with everything you have — and you repair just as hard.',
      summary: 'Conflict for you is passionate and expressive. You feel things intensely and say so. Arguments can get heated, but you also recover quickly and genuinely. Your relationship has high highs and low lows, and you wouldn\'t have it any other way.',
      strengths: ['Honest and direct — nothing goes unsaid', 'Repairs genuinely and fully', 'High emotional intimacy overall', 'Partner always knows where they stand'],
      growth: 'Work on regulating intensity in the moment. The passion that makes you loving can make conflict feel unsafe for a less volatile partner.',
      coachInsight: 'Volatile conflict style. Passionate and expressive. Repairs well but can overwhelm avoidant partners. Needs de-escalation tools for intense moments.',
      color: '#E8614D',
    },
    avoider: {
      label: 'The Peacekeeper',
      emoji: '🕊️',
      tagline: 'You keep the peace — and sometimes keep too much inside.',
      summary: 'You dislike conflict and will go a long way to avoid it. You value harmony deeply and are good at minimizing tension. But issues that don\'t get addressed don\'t disappear — they accumulate. Your avoidance often comes from a place of care, not indifference.',
      strengths: ['Keeps relationship atmosphere calm', 'Rarely escalates or attacks', 'Patient and tolerant', 'Good at letting small things go'],
      growth: 'Practice naming what\'s bothering you before it becomes resentment. Your partner can\'t respond to needs they don\'t know you have.',
      coachInsight: 'Avoider conflict style. Prioritizes harmony. May suppress issues until they explode. Needs safe, low-pressure structure to voice concerns. Partner should not mistake silence for satisfaction.',
      color: '#6B5CE7',
    },
    hostile: {
      label: 'The Reactive Fighter',
      emoji: '⚡',
      tagline: 'You react fast and feel deeply — and you\'re ready to do the work.',
      summary: 'When triggered, you tend to go on the defensive quickly — sometimes attacking, sometimes shutting down completely. This isn\'t who you are, it\'s a protection pattern. You likely learned early that conflict was dangerous, and your nervous system still responds that way.',
      strengths: ['Highly aware of relationship dynamics', 'Deeply motivated to improve', 'Feels things with great intensity', 'Ready to do real work'],
      growth: 'Learning to recognize your triggers before they take over is the highest-leverage work you can do. A 20-second pause before responding can transform your conflicts.',
      coachInsight: 'Reactive/hostile conflict style. Defensive or stonewalling under stress. Needs de-escalation practice and trigger awareness. Respond with patience, not pressure.',
      color: '#E8A020',
    },
  }

  return { primary, secondary, counts, profile: profiles[primary], secondaryProfile: profiles[secondary] }
}

export default {
  ASSESSMENT_MODULES,
  ASSESSMENT_QUESTIONS,
  generateModuleInsights,
  ASSESSMENT_ATTRIBUTION,
  scoreAttachmentStyle,
  scoreConflictStyle,
}
