/**
 * Relationship Assessment Question Bank
 *
 * Questions original to ABF. Frameworks informed by Gottman Institute research,
 * ECR-S attachment measurement (Wei et al., 2007), and Emotionally Focused Therapy (Johnson).
 */

export const ASSESSMENT_MODULES = [
  {
    id: 'attachment_profile',
    title: 'How You Attach',
    shortTitle: 'Attachment',
    icon: '🔗',
    description: 'The way you learned to love shapes everything about how you love now.',
    noraIntro: 'The way you learned to love shapes everything about how you love now. I need to understand your patterns before I can see yours clearly.',
    color: 'from-stone-600 to-stone-800',
    bgColor: 'bg-stone-50',
    textColor: 'text-stone-700',
  },
  {
    id: 'conflict_profile',
    title: 'How You Fight',
    shortTitle: 'Conflict',
    icon: '⚡',
    description: 'Not whether you fight — how you move through it.',
    noraIntro: "I'm not going to pretend conflict doesn't happen. I need to know how you move through it — so I know when to step in and when to stay out of the way.",
    color: 'from-amber-600 to-amber-800',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
  },
  {
    id: 'love_expression',
    title: 'How You Love',
    shortTitle: 'Love',
    icon: '❤️',
    description: 'How you actually give and receive love — not how you think you should.',
    noraIntro: 'Before I can do anything useful for you two — I need to know how you actually feel loved. Not how you think you should. How you actually do.',
    color: 'from-rose-600 to-rose-800',
    bgColor: 'bg-rose-50',
    textColor: 'text-rose-700',
  },
  {
    id: 'attachment_style',
    title: 'Attachment Style',
    shortTitle: 'Attachment Style',
    icon: '🧠',
    description: 'A deeper look at your attachment patterns.',
    standalone: true,
    researchBasis: 'Based on ECR-S validated attachment research',
    estimatedMinutes: 8,
    questionCount: 20,
  },
  {
    id: 'conflict_style',
    title: 'Conflict Style',
    shortTitle: 'Conflict Style',
    icon: '💬',
    description: 'A deeper look at your conflict patterns.',
    standalone: true,
    researchBasis: 'Based on Gottman conflict style research',
    estimatedMinutes: 7,
    questionCount: 18,
  },
]

export const ASSESSMENT_QUESTIONS = {
  attachment_profile: [
    {
      id: 'ap_1',
      question: "Your partner hasn't responded to your message in a few hours. You're not in a fight — it's just quiet. What actually happens inside you?",
      type: 'choice',
      dimension: 'anxiety',
      options: [
        { value: 1, label: "I barely notice. I'm in my own world too." },
        { value: 2, label: "I wonder what they're up to, but I'm not worried." },
        { value: 3, label: "I find myself checking my phone more than I'd like to admit." },
        { value: 4, label: "I start running through reasons it might mean something." },
      ],
    },
    {
      id: 'ap_2',
      question: "After a really good weekend together — close, connected, a lot of time just the two of you — Monday morning feels:",
      type: 'choice',
      dimension: 'avoidance',
      options: [
        { value: 1, label: "Like I wish it wasn't over. I could have stayed in that bubble longer." },
        { value: 2, label: "Good. I'm glad we had it and I'm ready for the week." },
        { value: 3, label: "Honestly, a little relieving. I love them and I also need my space." },
        { value: 4, label: "Like I can finally exhale. I love them but I was starting to feel crowded." },
      ],
    },
    {
      id: 'ap_3',
      question: "Your partner seems off — quieter than usual, a little distant. They say everything's fine. You:",
      type: 'choice',
      dimension: 'anxiety',
      options: [
        { value: 1, label: "Take them at their word and give them space." },
        { value: 2, label: "Check in once and then let it go." },
        { value: 3, label: "Find it hard to let go of the feeling that something's wrong." },
        { value: 4, label: "Need to understand what's happening before you can relax." },
      ],
    },
    {
      id: 'ap_4',
      question: "When things get emotionally intense between you two — a real conversation about feelings, needs, fears — your instinct is:",
      type: 'choice',
      dimension: 'avoidance',
      options: [
        { value: 1, label: "To lean in. These conversations make us closer." },
        { value: 2, label: "To be present even if it's uncomfortable." },
        { value: 3, label: "To get through it and feel relieved when it's over." },
        { value: 4, label: "To pull back a little. Too much intensity makes me want distance." },
      ],
    },
  ],

  conflict_profile: [
    {
      id: 'cp_1',
      question: "You're upset about something your partner did. It wasn't a big deal but it bothered you. You most likely:",
      type: 'choice',
      dimension: 'conflict_style',
      options: [
        { value: 'volatile', label: "Bring it up directly, even if it's minor. Better out than in." },
        { value: 'validating', label: "Find the right moment and talk it through calmly." },
        { value: 'avoiding', label: "Weigh whether it's worth bringing up at all — usually decide to let it go." },
        { value: 'validating_2', label: "Sit with it for a while before deciding what to do." },
      ],
    },
    {
      id: 'cp_2',
      question: "You're in the middle of a disagreement and you can feel yourself getting flooded — heart rate up, thoughts racing. You:",
      type: 'choice',
      dimension: 'conflict_style',
      options: [
        { value: 'volatile', label: "Stay in it. I'd rather push through than lose the thread." },
        { value: 'validating', label: "Call a timeout. I know I can't think straight right now." },
        { value: 'avoiding', label: "Go quiet. When I'm overwhelmed I shut down." },
        { value: 'validating_2', label: "Try to de-escalate — change my tone, slow down." },
      ],
    },
    {
      id: 'cp_3',
      question: "After a conflict that didn't fully resolve — you went to bed still tense — the next morning you:",
      type: 'choice',
      dimension: 'conflict_style',
      options: [
        { value: 'volatile', label: "Pick it back up. I can't move on until we've worked it out." },
        { value: 'validating', label: "Check in gently and feel out whether they're ready to revisit it." },
        { value: 'avoiding', label: "Act normal and hope the air clears on its own." },
        { value: 'avoiding_2', label: "Wait for them to bring it up if they want to." },
      ],
    },
  ],

  love_expression: [
    {
      id: 'le_1',
      question: "Your partner had a brutal week. The most meaningful thing you could do right now is:",
      type: 'choice',
      dimension: 'love_language',
      options: [
        { value: 'time', label: "Clear your schedule and just be with them, fully present." },
        { value: 'service', label: "Do something for them — handle dinner, take something off their plate." },
        { value: 'words', label: "Tell them specifically what you admire about how they're handling it." },
        { value: 'touch', label: "Hold them. Physical closeness says what words can't right now." },
        { value: 'gifts', label: "Find something small but specific — something that shows you were paying attention." },
      ],
    },
    {
      id: 'le_2',
      question: "On an ordinary Tuesday, the thing that makes you feel most loved is:",
      type: 'choice',
      dimension: 'love_language',
      options: [
        { value: 'words', label: "A text mid-day that's just about you — not logistics, just them thinking of you." },
        { value: 'service', label: "They remembered something you mentioned and did something about it." },
        { value: 'time', label: "They put their phone down and just talk to you." },
        { value: 'touch', label: "They reach for your hand or come find you just to be close." },
        { value: 'gifts', label: "Something small that shows they'd been paying attention to who I am." },
      ],
    },
    {
      id: 'le_3',
      question: "The last time you felt really, truly seen by your partner — what did they do?",
      type: 'choice',
      dimension: 'love_language',
      options: [
        { value: 'words', label: "Said something that showed they understood me deeply." },
        { value: 'time', label: "Made time for me when they didn't have to." },
        { value: 'service', label: "Did something without being asked that made my life easier." },
        { value: 'touch', label: "Stayed physically close when I needed it." },
        { value: 'gifts', label: "Gave me something that showed they'd been paying attention to who I am." },
      ],
    },
  ],

  // ========================================
  // MODULE 4: ATTACHMENT STYLE (20 questions)
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
  // MODULE 5: CONFLICT STYLE (18 questions)
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

export const generateModuleInsights = (moduleId, answers) => {
  if (moduleId === 'attachment_profile') {
    const anxietyScore = (Number(answers['ap_1'] || 1) + Number(answers['ap_3'] || 1)) / 2
    const avoidanceScore = (Number(answers['ap_2'] || 1) + Number(answers['ap_4'] || 1)) / 2
    const anxietyHigh = anxietyScore >= 3
    const avoidanceHigh = avoidanceScore >= 3
    let style, headline, description
    if (!anxietyHigh && !avoidanceHigh) {
      style = 'secure'; headline = 'Securely Attached'; description = 'You move toward intimacy with ease and handle distance without alarm. This is a strong foundation.'
    } else if (anxietyHigh && !avoidanceHigh) {
      style = 'anxious'; headline = 'Anxiously Attached'; description = "You feel connection deeply and notice disconnection quickly. Your attunement is a strength — learning to trust the silence is the work."
    } else if (!anxietyHigh && avoidanceHigh) {
      style = 'avoidant'; headline = 'Avoidantly Attached'; description = "You value independence and handle your own emotional world well. The growth edge is letting someone in without it feeling like a loss of self."
    } else {
      style = 'fearful'; headline = 'Fearfully Attached'; description = "You want closeness and feel wary of it at the same time. This is one of the most human experiences there is — and one Nora can help with."
    }
    return { moduleId, title: 'How You Attach', style, anxietyScore, avoidanceScore, headline, description, percentage: Math.round(((anxietyScore + avoidanceScore) / 8) * 100) }
  }

  if (moduleId === 'conflict_profile') {
    const tally = { volatile: 0, validating: 0, avoiding: 0 }
    Object.values(answers).forEach(v => {
      if (v === 'volatile') tally.volatile++
      if (v === 'validating' || v === 'validating_2') tally.validating++
      if (v === 'avoiding' || v === 'avoiding_2') tally.avoiding++
    })
    const primary = Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0]
    const headlines = { volatile: 'Volatile', validating: 'Validating', avoiding: 'Conflict-Avoiding' }
    const descriptions = {
      volatile: "You move toward conflict directly and with intensity. You'd rather have the fight than carry the tension. That directness is a strength — regulating intensity is the work.",
      validating: "You approach conflict with care and a desire to understand. You regulate well under pressure. The risk is sometimes keeping the peace at the cost of full honesty.",
      avoiding: "You pick your battles carefully and value harmony. You handle a lot gracefully by letting go. The growth edge is staying present for the conversations that actually need to happen.",
    }
    return { moduleId, title: 'How You Fight', primary, tally, headline: headlines[primary], description: descriptions[primary], percentage: Math.round((tally[primary] / 3) * 100) }
  }

  if (moduleId === 'love_expression') {
    const tally = { words: 0, time: 0, touch: 0, service: 0, gifts: 0 }
    Object.values(answers).forEach(v => { if (tally[v] !== undefined) tally[v]++ })
    const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1])
    const primary = sorted[0][0]
    const labels = { words: 'Words of Affirmation', time: 'Quality Time', touch: 'Physical Touch', service: 'Acts of Service', gifts: 'Thoughtful Gestures' }
    const descriptions = {
      words: "You feel most loved when someone tells you — specifically, not generically. A well-chosen sentence means more to you than most gestures.",
      time: "Presence is the point for you. Not activities, not multitasking — just someone choosing to be where you are.",
      touch: "Physical closeness is how you feel connected and safe. A hand on your back says more than a paragraph.",
      service: "When someone handles something for you without being asked, it tells you they were paying attention. That matters.",
      gifts: "It's never about the thing — it's about the thought behind it. Evidence that someone was thinking about you specifically.",
    }
    return { moduleId, title: 'How You Love', primary, tally, profile: sorted.map(([k, v]) => ({ language: k, label: labels[k], count: v, percentage: Math.round((v / 3) * 100) })), headline: labels[primary], description: descriptions[primary], percentage: Math.round((sorted[0][1] / 3) * 100) }
  }

  return { moduleId, title: moduleId, percentage: 0 }
}

export const ASSESSMENT_ATTRIBUTION = "Questions original to ABF. Frameworks informed by Gottman Institute research, ECR-S attachment measurement (Wei et al., 2007), and Emotionally Focused Therapy (Johnson)."

export function scoreAttachmentStyle(answers) {
  const anxietyScore = (Number(answers['ap_1'] || 1) + Number(answers['ap_3'] || 1)) / 2
  const avoidanceScore = (Number(answers['ap_2'] || 1) + Number(answers['ap_4'] || 1)) / 2
  const anxietyHigh = anxietyScore >= 3
  const avoidanceHigh = avoidanceScore >= 3
  let primary, profile
  if (!anxietyHigh && !avoidanceHigh) {
    primary = 'secure'
    profile = { label: 'Secure', emoji: '🌿', tagline: 'Comfortable with closeness and independence', summary: 'You move toward intimacy with ease and handle distance without alarm.', strengths: ['Emotionally available', 'Handles conflict without catastrophizing', 'Trusts without excessive reassurance-seeking'], growth: 'Staying attuned to partners with different attachment patterns', coachInsight: 'Your security is a resource for the relationship. Nora will help you use it well.', color: '#7A8C6E' }
  } else if (anxietyHigh && !avoidanceHigh) {
    primary = 'anxious'
    profile = { label: 'Anxious', emoji: '🌊', tagline: 'Deeply attuned, quickly activated', summary: "You feel connection deeply and notice disconnection quickly.", strengths: ['Highly attuned to partner', 'Invests fully in relationships', 'Emotionally expressive'], growth: 'Learning to sit with uncertainty without interpreting silence as distance', coachInsight: "Your attunement is a gift. Nora will help you trust it without letting it run you.", color: '#C4714A' }
  } else if (!anxietyHigh && avoidanceHigh) {
    primary = 'avoidant'
    profile = { label: 'Avoidant', emoji: '🏔️', tagline: 'Self-sufficient, wary of dependence', summary: "You value independence and handle your own emotional world well.", strengths: ['Self-sufficient', 'Low reactivity under pressure', 'Brings calm to charged situations'], growth: 'Letting someone in without experiencing it as a loss of self', coachInsight: "Your steadiness is real. Nora will help you use it to connect, not just to cope.", color: '#8B7355' }
  } else {
    primary = 'fearful'
    profile = { label: 'Fearful', emoji: '🌓', tagline: 'Wants closeness, wary of it', summary: "You want closeness and feel wary of it at the same time.", strengths: ['Deep capacity for empathy', 'Understands relational complexity', 'Highly self-aware when supported'], growth: 'Building enough safety to stay present when intimacy feels threatening', coachInsight: "This is one of the most human experiences there is. Nora will move carefully with you.", color: '#6B5D4F' }
  }
  return { primary, anxietyScore, avoidanceScore, profile, counts: { secure: !anxietyHigh && !avoidanceHigh ? 1 : 0, anxious: anxietyHigh && !avoidanceHigh ? 1 : 0, avoidant: !anxietyHigh && avoidanceHigh ? 1 : 0, fearful: anxietyHigh && avoidanceHigh ? 1 : 0 } }
}

export function scoreConflictStyle(answers) {
  const tally = { volatile: 0, validating: 0, avoiding: 0 }
  Object.values(answers).forEach(v => {
    if (v === 'volatile') tally.volatile++
    if (v === 'validating' || v === 'validating_2') tally.validating++
    if (v === 'avoiding' || v === 'avoiding_2') tally.avoiding++
  })
  const primary = Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0]
  const profiles = {
    volatile: { label: 'Volatile', emoji: '⚡', tagline: 'Direct, intense, move-toward', summary: "You move toward conflict with intensity. You'd rather have the fight than carry the tension.", strengths: ['Rarely lets things fester', 'High emotional honesty', 'Clears the air quickly'], growth: 'Regulating intensity so the message lands without the delivery becoming the issue', coachInsight: "Your directness is a strength. Nora will help you use it without burning things down.", color: '#C4714A' },
    validating: { label: 'Validating', emoji: '🤝', tagline: 'Measured, empathetic, collaborative', summary: "You approach conflict with care and a genuine desire to understand.", strengths: ['Regulates well under pressure', 'Creates safety for hard conversations', 'Collaborative problem-solver'], growth: 'Not sacrificing full honesty in the service of keeping the peace', coachInsight: "Your care for the relationship is evident. Nora will help you stay honest inside it.", color: '#7A8C6E' },
    avoiding: { label: 'Conflict-Avoiding', emoji: '🌊', tagline: 'Harmony-seeking, selective, patient', summary: "You pick your battles and value harmony. You handle a lot gracefully by letting go.", strengths: ['Low reactivity', 'Preserves goodwill', "Doesn't escalate unnecessarily"], growth: 'Staying present for the conversations that actually need to happen', coachInsight: "Your patience is real. Nora will help you know when to use it and when to speak.", color: '#8B7355' },
  }
  return { primary, tally, profile: profiles[primary], counts: tally }
}

export default {
  ASSESSMENT_MODULES,
  ASSESSMENT_QUESTIONS,
  generateModuleInsights,
  ASSESSMENT_ATTRIBUTION,
  scoreAttachmentStyle,
  scoreConflictStyle,
}
