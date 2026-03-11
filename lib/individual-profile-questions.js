// ── PROFILE MODULES ───────────────────────────────────────────────────────────

export const PROFILE_MODULES = [
  {
    id: 'conflict_style',
    title: 'How You Handle Conflict',
    description: 'Discover how you navigate disagreement and tension',
    icon: '⚡',
    color: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-50',
  },
  {
    id: 'attachment_style',
    title: 'How You Connect',
    description: 'Understand how you form bonds and need closeness',
    icon: '🔗',
    color: 'from-purple-500 to-indigo-500',
    bgColor: 'bg-purple-50',
  },
  {
    id: 'love_language',
    title: 'How You Give and Receive Love',
    description: 'Learn the specific ways love lands for you',
    icon: '💝',
    color: 'from-pink-500 to-rose-500',
    bgColor: 'bg-pink-50',
  },
  {
    id: 'flooding_repair',
    title: 'Your Stress and Repair Style',
    description: 'Discover how you manage emotional intensity and reconnect',
    icon: '🌊',
    color: 'from-teal-500 to-cyan-500',
    bgColor: 'bg-teal-50',
  },
]

// ── PROFILE QUESTIONS ─────────────────────────────────────────────────────────

export const PROFILE_QUESTIONS = {

  conflict_style: [
    {
      id: 'cs_1',
      text: "When something your partner did is bothering you, your natural first move is:",
      type: 'single',
      options: [
        { value: 'cs1_a', label: "Talk about it soon — you'd rather address it than let it sit.", scores: { validating: 2 } },
        { value: 'cs1_b', label: "Bring it up directly, even if it gets heated — honesty matters more than comfort.", scores: { volatile: 2 } },
        { value: 'cs1_c', label: "Give it some time — most things look different after a day or two.", scores: { avoiding: 2 } },
        { value: 'cs1_d', label: "Weigh whether it's worth a conversation — not everything needs to be said.", scores: { avoiding: 1, validating: 1 } },
      ]
    },
    {
      id: 'cs_2',
      text: "During a disagreement, you're most likely to:",
      type: 'single',
      options: [
        { value: 'cs2_a', label: "Stay focused on understanding each other's perspective before anything else.", scores: { validating: 2 } },
        { value: 'cs2_b', label: "Push hard for your point of view — you think the best solutions come from honest debate.", scores: { volatile: 2 } },
        { value: 'cs2_c', label: "Withdraw until things feel calmer — you do your best thinking outside the heat of the moment.", scores: { avoiding: 2 } },
        { value: 'cs2_d', label: "Look for the fastest path to a resolution you can both live with.", scores: { validating: 1, avoiding: 1 } },
      ]
    },
    {
      id: 'cs_3',
      text: "After a disagreement that didn't fully resolve, you:",
      type: 'single',
      options: [
        { value: 'cs3_a', label: "Feel unsettled until you've had a real conversation about what happened.", scores: { volatile: 2, validating: 1 } },
        { value: 'cs3_b', label: "Can set it aside and move on — time handles most things.", scores: { avoiding: 2 } },
        { value: 'cs3_c', label: "Want to revisit it calmly once the dust has settled.", scores: { validating: 2 } },
        { value: 'cs3_d', label: "Feel drained and need significant space before you could go back to it.", scores: { avoiding: 2, flooding: 1 } },
      ]
    },
    {
      id: 'cs_4',
      text: "When your partner raises something that bothers them about you, your first reaction is usually:",
      type: 'single',
      options: [
        { value: 'cs4_a', label: "Lean in — you want to understand exactly what they're feeling.", scores: { validating: 2 } },
        { value: 'cs4_b', label: "Defend your position — you need them to hear your side too.", scores: { volatile: 2 } },
        { value: 'cs4_c', label: "Feel overwhelmed and need a moment before you can really listen.", scores: { avoiding: 1, flooding: 2 } },
        { value: 'cs4_d', label: "Take it seriously but process it internally before responding.", scores: { avoiding: 1, validating: 1 } },
      ]
    },
    {
      id: 'cs_5',
      text: "Your idea of resolving conflict well looks like:",
      type: 'single',
      options: [
        { value: 'cs5_a', label: "A real conversation where both people feel heard and something actually changes.", scores: { validating: 2 } },
        { value: 'cs5_b', label: "A passionate back-and-forth where nothing's off the table — and you come out closer for it.", scores: { volatile: 2 } },
        { value: 'cs5_c', label: "A quiet reconnection — not everything needs to be dissected.", scores: { avoiding: 2 } },
        { value: 'cs5_d', label: "One person makes a gesture that signals it's over, even without a full debrief.", scores: { avoiding: 1, repair: 1 } },
      ]
    },
    {
      id: 'cs_6',
      text: "When tension is running high between you two, you most naturally:",
      type: 'single',
      options: [
        { value: 'cs6_a', label: "Name it directly — 'I think we need to talk about what's going on.'", scores: { validating: 2, volatile: 1 } },
        { value: 'cs6_b', label: "Push through it — you'd rather have the hard conversation now than wait.", scores: { volatile: 2 } },
        { value: 'cs6_c', label: "Create some distance and come back when you're both in a better place.", scores: { avoiding: 2 } },
        { value: 'cs6_d', label: "Redirect to something positive — sometimes a shift in mood beats a conversation.", scores: { avoiding: 1, repair: 2 } },
      ]
    },
  ],

  attachment_style: [
    {
      id: 'as_1',
      text: "When your partner hasn't responded to a message in a few hours, you typically:",
      type: 'single',
      options: [
        { value: 'as1_a', label: "Assume they're busy and check back later — it doesn't really register.", scores: { secure: 2, avoidance: 1 } },
        { value: 'as1_b', label: "Notice it but stay focused on what you're doing — you'll connect later.", scores: { secure: 2 } },
        { value: 'as1_c', label: "Find yourself checking your phone more and wondering if something's off.", scores: { anxiety: 2 } },
        { value: 'as1_d', label: "Appreciate the space — you're probably busy yourself.", scores: { avoidance: 2 } },
      ]
    },
    {
      id: 'as_2',
      text: "Getting very close to someone emotionally tends to make you feel:",
      type: 'single',
      options: [
        { value: 'as2_a', label: "Comfortable — closeness is something you welcome.", scores: { secure: 2 } },
        { value: 'as2_b', label: "Good, though you also need your own space to feel like yourself.", scores: { secure: 1, avoidance: 1 } },
        { value: 'as2_c', label: "Slightly uneasy — you value connection but like to keep some emotional distance.", scores: { avoidance: 2 } },
        { value: 'as2_d', label: "Drawn in but sometimes worried about how much you need the other person.", scores: { anxiety: 2 } },
      ]
    },
    {
      id: 'as_3',
      text: "When your relationship feels a little off — not fighting, just distant — you:",
      type: 'single',
      options: [
        { value: 'as3_a', label: "Notice it and bring it up — you'd rather address it than wonder.", scores: { secure: 2, anxiety: 1 } },
        { value: 'as3_b', label: "Give it time — distance comes and goes and usually resolves on its own.", scores: { avoidance: 2 } },
        { value: 'as3_c', label: "Start to worry whether something is wrong between you.", scores: { anxiety: 2 } },
        { value: 'as3_d', label: "Enjoy the space a bit — you recharge when you have room to breathe.", scores: { avoidance: 2 } },
      ]
    },
    {
      id: 'as_4',
      text: "When you need emotional support, you usually:",
      type: 'single',
      options: [
        { value: 'as4_a', label: "Ask for it directly — you know what you need and you trust your partner to show up.", scores: { secure: 2 } },
        { value: 'as4_b', label: "Hope your partner notices and offers — asking feels vulnerable in a way that's hard to explain.", scores: { anxiety: 2 } },
        { value: 'as4_c', label: "Handle it on your own first — you turn to your partner once you've processed a bit.", scores: { avoidance: 2 } },
        { value: 'as4_d', label: "Find it easier to talk to friends or think it through alone.", scores: { avoidance: 2 } },
      ]
    },
    {
      id: 'as_5',
      text: "When your partner wants more togetherness than you do in a given period, your honest reaction is:",
      type: 'single',
      options: [
        { value: 'as5_a', label: "You adjust — connection is important and you're happy to lean in.", scores: { secure: 2 } },
        { value: 'as5_b', label: "You try to meet them but feel some tension between their needs and yours.", scores: { avoidance: 1, anxiety: 1 } },
        { value: 'as5_c', label: "You feel pulled — you care about them but too much togetherness starts to feel draining.", scores: { avoidance: 2 } },
        { value: 'as5_d', label: "You worry you're not giving them enough and feel guilty about needing space.", scores: { anxiety: 2, avoidance: 1 } },
      ]
    },
    {
      id: 'as_6',
      text: "How much do you think about where you and your partner stand — how solid things are between you?",
      type: 'single',
      options: [
        { value: 'as6_a', label: "Not much — you feel settled in the relationship and trust it.", scores: { secure: 2 } },
        { value: 'as6_b', label: "Some — you check in with yourself occasionally but it doesn't dominate your thinking.", scores: { secure: 1 } },
        { value: 'as6_c', label: "Regularly — you find yourself monitoring the relationship more than you'd like.", scores: { anxiety: 2 } },
        { value: 'as6_d', label: "Rarely — you tend to focus on the present rather than evaluating the relationship.", scores: { avoidance: 1, secure: 1 } },
      ]
    },
    {
      id: 'as_7',
      text: "When your partner is going through something hard, your instinct is to:",
      type: 'single',
      options: [
        { value: 'as7_a', label: "Move toward them — you want to be there and you usually know what helps.", scores: { secure: 2 } },
        { value: 'as7_b', label: "Be present but give them space to come to you — you don't want to crowd them.", scores: { avoidance: 1, secure: 1 } },
        { value: 'as7_c', label: "Worry about whether you're doing enough and check in frequently.", scores: { anxiety: 2 } },
        { value: 'as7_d', label: "Offer practical help — you're more comfortable with doing than with emotional processing.", scores: { avoidance: 1 } },
      ]
    },
    {
      id: 'as_8',
      text: "At your most honest — how much do you need reassurance from your partner that things are good between you?",
      type: 'single',
      options: [
        { value: 'as8_a', label: "Not much — you feel secure and don't need frequent confirmation.", scores: { secure: 2 } },
        { value: 'as8_b', label: "Some — everyone needs to feel appreciated and that's normal.", scores: { secure: 1, anxiety: 1 } },
        { value: 'as8_c', label: "More than you think you should — you sometimes need to hear it even when you already know it.", scores: { anxiety: 2 } },
        { value: 'as8_d', label: "Very little — you'd rather show love through actions than words of reassurance.", scores: { avoidance: 1 } },
      ]
    },
  ],

  love_language: [
    {
      id: 'll_1',
      text: "When you've had a genuinely hard day, what does your partner do that actually helps most?",
      type: 'single',
      options: [
        { value: 'll1_a', label: "Tell you they love you, that you handled it well, or that they're proud of you.", scores: { words_of_affirmation: 2 } },
        { value: 'll1_b', label: "Put their phone away and just be fully present with you.", scores: { quality_time: 2 } },
        { value: 'll1_c', label: "Take something off your plate — handle dinner, the dishes, a task you're dreading.", scores: { acts_of_service: 2 } },
        { value: 'll1_d', label: "Hold you, sit close, or give you a long hug without saying much.", scores: { physical_touch: 2 } },
      ]
    },
    {
      id: 'll_2',
      text: "When you want to show your partner you're thinking of them, you most naturally:",
      type: 'single',
      options: [
        { value: 'll2_a', label: "Send them a message that says something specific about why you appreciate them.", scores: { words_of_affirmation: 2 } },
        { value: 'll2_b', label: "Suggest doing something together — an activity, a walk, a night in.", scores: { quality_time: 2 } },
        { value: 'll2_c', label: "Pick up something small you knew they'd like — their favourite snack, a book, something random.", scores: { gifts: 2 } },
        { value: 'll2_d', label: "Do something for them without being asked — handle a task, make a reservation, take care of something.", scores: { acts_of_service: 2 } },
      ]
    },
    {
      id: 'll_3',
      text: "Which of these moments would make you feel most seen by your partner?",
      type: 'single',
      options: [
        { value: 'll3_a', label: "They write you a note — even a short one — that captures something specific about you.", scores: { words_of_affirmation: 2 } },
        { value: 'll3_b', label: "They plan a day around things they know you love, with no distractions.", scores: { quality_time: 2, gifts: 1 } },
        { value: 'll3_c', label: "They handle something you've been anxious about, completely unprompted.", scores: { acts_of_service: 2 } },
        { value: 'll3_d', label: "They reach for your hand when you're stressed, even if nothing needs to be said.", scores: { physical_touch: 2 } },
      ]
    },
    {
      id: 'll_4',
      text: "When your partner is having a hard week, what do you most want to do for them?",
      type: 'single',
      options: [
        { value: 'll4_a', label: "Tell them specifically what you admire about how they're handling it.", scores: { words_of_affirmation: 2 } },
        { value: 'll4_b', label: "Cancel other plans to just be with them, no agenda.", scores: { quality_time: 2 } },
        { value: 'll4_c', label: "Get them something that would make them smile — food, flowers, something small.", scores: { gifts: 2 } },
        { value: 'll4_d', label: "Be physically close — sit with them, touch their shoulder, be present in your body.", scores: { physical_touch: 2 } },
      ]
    },
    {
      id: 'll_5',
      text: "Your partner has just had a major win. How do you celebrate?",
      type: 'single',
      options: [
        { value: 'll5_a', label: "You say it — directly, specifically, and with feeling.", scores: { words_of_affirmation: 2 } },
        { value: 'll5_b', label: "You take them somewhere or plan something just for them.", scores: { quality_time: 1, gifts: 2 } },
        { value: 'll5_c', label: "You handle everything around them for the evening so they can just enjoy it.", scores: { acts_of_service: 2 } },
        { value: 'll5_d', label: "You're physically affectionate — a long hug, holding them close.", scores: { physical_touch: 2 } },
      ]
    },
    {
      id: 'll_6',
      text: "What would make you feel most loved on an ordinary Tuesday — no occasion, nothing special?",
      type: 'single',
      options: [
        { value: 'll6_a', label: "Your partner saying something specific that reminds you they really know you.", scores: { words_of_affirmation: 2 } },
        { value: 'll6_b', label: "Fifteen minutes of undivided attention — phones away, just the two of you.", scores: { quality_time: 2 } },
        { value: 'll6_c', label: "Coming home to find something handled that you were both dreading.", scores: { acts_of_service: 2 } },
        { value: 'll6_d', label: "Physical affection that has nothing to do with sex — a long hug, sitting close.", scores: { physical_touch: 2 } },
      ]
    },
    {
      id: 'll_7',
      text: "When your partner gives you a thoughtful gift — even something small — what makes it land?",
      type: 'single',
      options: [
        { value: 'll7_a', label: "The fact that they remembered something specific you mentioned.", scores: { gifts: 2, words_of_affirmation: 1 } },
        { value: 'll7_b', label: "That they took time to find it — the effort is the message.", scores: { gifts: 2, quality_time: 1 } },
        { value: 'll7_c', label: "Honestly, the gesture matters but it's not the thing that moves you most.", scores: { gifts: 0 } },
        { value: 'll7_d', label: "That it came with words — an explanation of why they thought of you.", scores: { words_of_affirmation: 2, gifts: 1 } },
      ]
    },
    {
      id: 'll_8',
      text: "When you're feeling disconnected from your partner, what tends to bridge that gap most quickly?",
      type: 'single',
      options: [
        { value: 'll8_a', label: "Them saying something warm — acknowledgment, appreciation, or affection in words.", scores: { words_of_affirmation: 2 } },
        { value: 'll8_b', label: "Doing something together — even something small like a walk or a meal.", scores: { quality_time: 2 } },
        { value: 'll8_c', label: "Them doing something thoughtful for you, out of nowhere.", scores: { acts_of_service: 1, gifts: 1 } },
        { value: 'll8_d', label: "Physical closeness — touch reconnects you faster than conversation sometimes.", scores: { physical_touch: 2 } },
      ]
    },
    {
      id: 'll_9',
      text: "In a healthy relationship, the thing you'd miss most if it disappeared is:",
      type: 'single',
      options: [
        { value: 'll9_a', label: "Being told you're loved, appreciated, or doing well — in specific words.", scores: { words_of_affirmation: 2 } },
        { value: 'll9_b', label: "Having a person who really shows up — present, attentive, there for things.", scores: { quality_time: 2 } },
        { value: 'll9_c', label: "The feeling that your partner is carrying things with you — not just beside you.", scores: { acts_of_service: 2 } },
        { value: 'll9_d', label: "Physical connection — the kind that says 'I choose you' without words.", scores: { physical_touch: 2 } },
      ]
    },
    {
      id: 'll_10',
      text: "When you think about how you show love best — what feels most natural to you?",
      type: 'single',
      options: [
        { value: 'll10_a', label: "Saying it — finding the right words for how you feel about someone.", scores: { words_of_affirmation: 2 } },
        { value: 'll10_b', label: "Being there — consistently, attentively, with your full presence.", scores: { quality_time: 2 } },
        { value: 'll10_c', label: "Doing things — anticipating needs and handling them before they're asked.", scores: { acts_of_service: 2 } },
        { value: 'll10_d', label: "Touching — affection and physical closeness as a constant expression of love.", scores: { physical_touch: 2 } },
      ]
    },
  ],

  flooding_repair: [
    {
      id: 'fr_1',
      text: "When a conversation with your partner gets heated, what happens in your body first?",
      type: 'single',
      options: [
        { value: 'fr1_a', label: "Your heart rate goes up and you feel urgency — you want to resolve it now.", scores: { flooding: 1, volatile: 1 } },
        { value: 'fr1_b', label: "You feel tension but can stay in the conversation — you've been here before.", scores: { validating: 1 } },
        { value: 'fr1_c', label: "Something shuts down — you can hear words but you stop being able to process them.", scores: { flooding: 2 } },
        { value: 'fr1_d', label: "You feel an urge to leave the room or end the conversation.", scores: { flooding: 1, avoiding: 1 } },
      ]
    },
    {
      id: 'fr_2',
      text: "When you know a difficult conversation is coming, you tend to:",
      type: 'single',
      options: [
        { value: 'fr2_a', label: "Prepare mentally — you think through what you want to say and feel ready.", scores: { validating: 1 } },
        { value: 'fr2_b', label: "Feel anxious leading up to it but usually fine once it starts.", scores: { anxiety: 1 } },
        { value: 'fr2_c', label: "Dread it in a way that's hard to shake — it takes up more mental space than it should.", scores: { flooding: 2, anxiety: 1 } },
        { value: 'fr2_d', label: "Try not to think about it until you have to — you deal with it when it arrives.", scores: { avoiding: 1 } },
      ]
    },
    {
      id: 'fr_3',
      text: "After a hard conversation — even one that resolved well — you typically need:",
      type: 'single',
      options: [
        { value: 'fr3_a', label: "Very little recovery time — you feel fine relatively quickly.", scores: { secure: 1 } },
        { value: 'fr3_b', label: "A little space and then you're good — maybe an hour or two.", scores: { avoiding: 1 } },
        { value: 'fr3_c', label: "Significant downtime — your nervous system takes a while to settle.", scores: { flooding: 2 } },
        { value: 'fr3_d', label: "Physical closeness after — reconnection through presence, not more talking.", scores: { physical_touch: 1, repair: 1 } },
      ]
    },
    {
      id: 'fr_4',
      text: "When you want to signal you're ready to reconnect after conflict, you most naturally:",
      type: 'single',
      options: [
        { value: 'fr4_a', label: "Say it directly — 'I want to come back to this when we're both ready.'", scores: { validating: 1, repair: 2 } },
        { value: 'fr4_b', label: "Do something kind — make them a coffee, touch their shoulder, handle something for them.", scores: { acts_of_service: 1, physical_touch: 1, repair: 2 } },
        { value: 'fr4_c', label: "Wait for them to reach out — you struggle to make the first move after conflict.", scores: { anxiety: 1, repair: 1 } },
        { value: 'fr4_d', label: "Suggest doing something together — a walk, a show, anything that shifts the energy.", scores: { quality_time: 1, avoiding: 1, repair: 2 } },
      ]
    },
  ],
}

// ── SCORE HELPERS ─────────────────────────────────────────────────────────────

function accumulateScores(moduleId, answers) {
  const questions = PROFILE_QUESTIONS[moduleId]
  if (!questions) return {}
  const totals = {}
  questions.forEach(q => {
    const selected = answers[q.id]
    if (!selected) return
    const option = q.options.find(o => o.value === selected)
    if (!option?.scores) return
    Object.entries(option.scores).forEach(([dim, val]) => {
      totals[dim] = (totals[dim] || 0) + val
    })
  })
  return totals
}

function answeredCount(moduleId, answers) {
  const questions = PROFILE_QUESTIONS[moduleId]
  if (!questions) return 0
  return questions.filter(q => answers[q.id] !== undefined).length
}

// ── MODULE INSIGHT BUILDERS ───────────────────────────────────────────────────

const CONFLICT_INSIGHTS = {
  validating: {
    headline: 'You bring calm to conflict',
    description: "You have a natural ability to navigate disagreement without it escalating. You value understanding before being understood, and you're able to stay in difficult conversations without shutting down or blowing up. This is a significant strength in a relationship.",
    strengths: ['Stays regulated under pressure', 'Values mutual understanding', "Can hear hard things without going defensive"],
    tips: ["Make sure you're also asserting your own needs, not just managing the other person's", "Your calmness can sometimes read as not caring — be explicit about how much you do care"],
  },
  volatile: {
    headline: 'You bring intensity to conflict',
    description: "You're direct and emotionally honest, and you'd rather have a hard conversation than let something fester. Your style can create real depth — volatile couples often have high intimacy and passionate reconnection. The growth edge is learning when to dial it down and how to repair quickly.",
    strengths: ['Direct and honest under pressure', 'Not afraid of hard conversations', 'High emotional engagement'],
    tips: ["Practice self-soothing before re-engaging — even 20 minutes changes the quality of the conversation", 'Your partner may need explicit reassurance that intensity is not contempt'],
  },
  avoiding: {
    headline: 'You value peace and perspective',
    description: "You tend to weigh whether something is worth addressing before bringing it up, and you process conflict internally before you're ready to talk. This can be a real strength — but if important things consistently go unaddressed, resentment can build quietly.",
    strengths: ["Doesn't create unnecessary conflict", 'Long perspective', 'Stays calm under pressure'],
    tips: ["Practice naming the thing once — you don't have to push for a full resolution, just name it", "Let your partner know when you're taking space, so it doesn't read as stonewalling"],
  },
}

const ATTACHMENT_INSIGHTS = {
  secure: {
    headline: "You're grounded in how you connect",
    description: "You're comfortable with intimacy and with independence. You can ask for what you need, give space without reading it as rejection, and recover from conflict without prolonged anxiety. Relationships with secure partners tend to feel steadier and more resilient.",
    strengths: ['Communicates needs directly', "Doesn't catastrophize distance", 'Recovers from conflict well'],
    tips: ["Your security can sometimes mean you underestimate how much reassurance your partner needs — be explicit about how much you value them", "Security isn't invulnerability — let yourself be moved by your partner"],
  },
  anxious: {
    headline: "You're highly attuned and deeply invested",
    description: "You pay close attention to your partner's emotional state, and you feel the relationship intensely. This kind of attunement can be a gift — you notice things others miss and care deeply. The growth edge is learning to self-regulate when things feel uncertain.",
    strengths: ["Deeply attuned to partner's emotional state", 'Emotionally invested', 'Notices when something is off'],
    tips: ["Practice naming your need directly instead of escalating — 'I just need to hear that we're okay' lands differently than reaching out ten times", "Your partner's need for space is almost never about you"],
  },
  avoidant: {
    headline: "You're independent and self-reliant",
    description: "You process internally, value your autonomy, and feel most yourself with room to breathe. Closeness is something you need on your own terms. The growth edge is signaling to your partner when you're processing so they don't read your silence as withdrawal.",
    strengths: ['Self-reliant and autonomous', "Doesn't need constant reassurance", 'Processes thoughtfully before responding'],
    tips: ["Try 'I need an hour to think, and then I'm here' instead of just going quiet", "Small acts of connection — a text, a touch — communicate you're still there even when you need space"],
  },
  disorganized: {
    headline: 'You want closeness and sometimes fear it',
    description: "You experience some tension between wanting to be close and feeling uncomfortable when you get there. This pattern often comes from early experiences and doesn't reflect anything wrong with you. Consistency, patience, and a partner who shows up predictably make a real difference.",
    strengths: ['Deeply self-aware', 'Genuinely wants closeness', 'Motivated to grow'],
    tips: ["Work with a therapist if you haven't — this pattern is very changeable with the right support", "Name the contradiction to your partner when you can: 'I want to be close right now and I'm also feeling anxious about it'"],
  },
}

const LOVE_LANGUAGE_INSIGHTS = {
  words_of_affirmation: {
    headline: 'Words are how love lands for you',
    description: "Hearing it matters. Specific appreciation, acknowledgment, and affirmation aren't just nice — they're how you actually register that you're loved. Your partner expressing care in words, even briefly, has an outsized impact on how connected you feel.",
    strengths: ['Expressive and verbal in return', 'Notices and acknowledges effort', 'Thrives on genuine appreciation'],
    tips: ["Let your partner know that silence reads as indifference — even a short message makes a difference to you", "Be specific about what kind of words help most: appreciation, reassurance, daily check-ins"],
  },
  quality_time: {
    headline: 'Your full presence is how love feels',
    description: "Undivided attention is the currency. When your partner chooses you deliberately — puts the phone away, shows up for things that matter to you, makes time rather than fitting you in — that's when you feel most loved. Distracted togetherness doesn't count the same way.",
    strengths: ['Fully present in return', 'Values depth over frequency', 'Creates space for real connection'],
    tips: ["Name the difference between physical presence and real presence — your partner may not realize they're giving you one but not the other", "Even 15 minutes of real attention can reset a disconnected week"],
  },
  acts_of_service: {
    headline: 'Love shows up in what gets done',
    description: "You feel most loved when someone handles things — not because they were asked, but because they noticed and did it anyway. That quiet act of carrying something with you, without being prompted, lands as real care.",
    strengths: ["Highly attentive to partner's practical needs", 'Shows love through action', 'Notices what would actually help'],
    tips: ["Tell your partner what would mean the most — they may want to show up this way but not know where to start", "Unacknowledged service builds resentment — make what you do visible, not to get credit but to make it count"],
  },
  gifts: {
    headline: 'Thoughtfulness is how love lands',
    description: "It's not about the gift — it's about what the gift represents. Something picked up because your partner was thinking of you, a small thing that shows they know who you are, matters more than gestures that took no thought. Forgotten milestones hit hard because they feel like being forgotten.",
    strengths: ["Thoughtful and observant of partner's preferences", 'Marks occasions and milestones', 'Shows love through meaningful gestures'],
    tips: ["Teach your partner what lands: it's not about price, it's about thought — a specific example helps more than a general request", "Help your partner understand that forgetting an anniversary is genuinely painful for you, not just disappointing"],
  },
  physical_touch: {
    headline: 'Touch is the language of connection for you',
    description: "Physical presence and contact aren't optional — they're how you regulate, reconnect, and feel that someone is genuinely there with you. This isn't primarily sexual; it's the hand on the shoulder, the sitting close, the long hug that says I see you.",
    strengths: ['Physically present and affectionate in return', 'Reconnects quickly through touch', 'Uses presence to communicate care'],
    tips: ["Physical distance — even when unintentional — can feel like emotional distance to you. Let your partner know that small, frequent touch matters more than occasional grand gestures", "Identify the specific kinds of touch that feel most connecting for you"],
  },
}

// ── GENERATE PROFILE INSIGHTS ─────────────────────────────────────────────────

export function generateProfileInsights(moduleId, answers) {
  const scores = accumulateScores(moduleId, answers)
  const answered = answeredCount(moduleId, answers)
  const total = (PROFILE_QUESTIONS[moduleId] || []).length
  const percentage = total > 0 ? Math.round((answered / total) * 100) : 0

  if (moduleId === 'conflict_style') {
    const v = scores.validating || 0
    const vol = scores.volatile || 0
    const av = scores.avoiding || 0
    const fl = scores.flooding || 0

    const styleEntries = [['validating', v], ['volatile', vol], ['avoiding', av]]
    styleEntries.sort((a, b) => b[1] - a[1])
    const primary = styleEntries[0][0]

    const strengthLevel = primary === 'validating' && v >= 6 ? 'strong'
      : primary === 'validating' ? 'good'
      : primary === 'volatile' ? 'good'
      : primary === 'avoiding' && av >= 6 ? 'developing'
      : 'developing'

    const ins = CONFLICT_INSIGHTS[primary]
    return {
      moduleId,
      title: 'How You Handle Conflict',
      summary: `Primary style: ${primary}`,
      traits: { validating: v, volatile: vol, avoiding: av, flooding: fl },
      percentage,
      strengthLevel,
      insights: ins,
    }
  }

  if (moduleId === 'attachment_style') {
    const anx = scores.anxiety || 0
    const avo = scores.avoidance || 0
    const sec = scores.secure || 0

    const style = anx <= 3 && avo <= 3 ? 'secure'
      : anx > 3 && avo <= 3 ? 'anxious'
      : anx <= 3 && avo > 3 ? 'avoidant'
      : 'disorganized'

    const strengthLevel = style === 'secure' ? 'strong'
      : style === 'anxious' || style === 'avoidant' ? 'developing'
      : 'growth_area'

    const ins = ATTACHMENT_INSIGHTS[style]
    return {
      moduleId,
      title: 'How You Connect',
      summary: `Attachment style: ${style}`,
      traits: { anxiety: anx, avoidance: avo, secure: sec, style },
      percentage,
      strengthLevel,
      insights: ins,
    }
  }

  if (moduleId === 'love_language') {
    const ll = {
      words_of_affirmation: scores.words_of_affirmation || 0,
      quality_time: scores.quality_time || 0,
      acts_of_service: scores.acts_of_service || 0,
      gifts: scores.gifts || 0,
      physical_touch: scores.physical_touch || 0,
    }
    const sorted = Object.entries(ll).sort((a, b) => b[1] - a[1])
    const primary = sorted[0][0]
    const primaryScore = sorted[0][1]

    const strengthLevel = primaryScore >= 12 ? 'strong'
      : primaryScore >= 8 ? 'good'
      : primaryScore >= 4 ? 'developing'
      : 'growth_area'

    const ins = LOVE_LANGUAGE_INSIGHTS[primary]
    return {
      moduleId,
      title: 'How You Give and Receive Love',
      summary: `Primary love language: ${primary.replace(/_/g, ' ')}`,
      traits: ll,
      percentage,
      strengthLevel,
      insights: ins,
    }
  }

  if (moduleId === 'flooding_repair') {
    const fl = scores.flooding || 0
    const rep = scores.repair || 0
    const floodingProne = fl >= 3

    const fr4 = answers['fr_4']
    const repairStyle = fr4 === 'fr4_a' ? 'verbal'
      : fr4 === 'fr4_b' ? 'behavioral'
      : fr4 === 'fr4_c' ? 'behavioral'
      : fr4 === 'fr4_d' ? 'activity'
      : null

    const strengthLevel = !floodingProne && repairStyle ? 'strong'
      : !floodingProne ? 'good'
      : repairStyle ? 'developing'
      : 'growth_area'

    const headline = floodingProne
      ? 'Intense conflict can overwhelm your system'
      : "You can stay regulated through hard conversations"
    const description = floodingProne
      ? "When disagreements get heated, your nervous system responds strongly — it can be hard to process or communicate clearly in the moment. This isn't weakness; it's physiology. The most important thing you can do is learn your early signs and take a break before you're flooded, not after."
      : "You're able to process and communicate even when things are tense. This is a real asset — it means you can be present for difficult conversations without shutting down or escalating. The growth edge is staying attuned to whether your partner is still able to process, even when you are."
    const strengths = floodingProne
      ? ['Self-aware about emotional intensity', 'Motivated to find healthier patterns']
      : ['Stays regulated under pressure', 'Able to process during conflict', "Doesn't need long recovery time"]
    const tips = floodingProne
      ? ["Agree in advance on a 'pause signal' with your partner — something that means 'I need 20 minutes, I'll come back'", "During the break, do something genuinely calming — not rehearsing arguments in your head"]
      : ["Check in on your partner's capacity, not just your own — they may need a pause even when you don't", "Being regulated is a resource; use it to create safety, not to push for resolution before your partner is ready"]

    return {
      moduleId,
      title: 'Your Stress and Repair Style',
      summary: floodingProne ? 'Flooding-prone' : 'Regulated under pressure',
      traits: { flooding: fl, repair: rep, flooding_prone: floodingProne, repair_style: repairStyle },
      percentage,
      strengthLevel,
      insights: { headline, description, strengths, tips },
    }
  }

  return { moduleId, title: '', summary: '', traits: scores, percentage, strengthLevel: 'developing', insights: {} }
}

// ── SCORE FULL ASSESSMENT ─────────────────────────────────────────────────────

export function scoreFullAssessment(allAnswers) {
  // Accumulate scores across ALL questions in ALL modules
  const totals = {}
  PROFILE_MODULES.forEach(module => {
    const s = accumulateScores(module.id, allAnswers)
    Object.entries(s).forEach(([dim, val]) => {
      totals[dim] = (totals[dim] || 0) + val
    })
  })

  // ── Conflict style
  const v = totals.validating || 0
  const vol = totals.volatile || 0
  const av = totals.avoiding || 0
  const styleEntries = [['validating', v], ['volatile', vol], ['avoiding', av]]
  styleEntries.sort((a, b) => b[1] - a[1])
  const conflictStyle = styleEntries[0][0]
  const conflictSecondary = (styleEntries[1][1] >= styleEntries[0][1] - 2 && styleEntries[1][1] > 0)
    ? styleEntries[1][0]
    : null

  // ── Flooding
  const floodingProne = (totals.flooding || 0) >= 3

  // ── Attachment style
  const anx = totals.anxiety || 0
  const avo = totals.avoidance || 0
  const attachmentStyle = anx <= 3 && avo <= 3 ? 'secure'
    : anx > 3 && avo <= 3 ? 'anxious'
    : anx <= 3 && avo > 3 ? 'avoidant'
    : 'disorganized'

  // ── Love language
  const ll = {
    words_of_affirmation: totals.words_of_affirmation || 0,
    quality_time: totals.quality_time || 0,
    acts_of_service: totals.acts_of_service || 0,
    gifts: totals.gifts || 0,
    physical_touch: totals.physical_touch || 0,
  }
  const llPrimary = Object.entries(ll).sort((a, b) => b[1] - a[1])[0][0]

  // ── Repair style from fr_4 specifically
  const fr4 = allAnswers['fr_4']
  const repairStyle = fr4 === 'fr4_a' ? 'verbal'
    : fr4 === 'fr4_b' ? 'behavioral'
    : fr4 === 'fr4_c' ? 'behavioral'
    : fr4 === 'fr4_d' ? 'activity'
    : null

  return {
    conflict_style: conflictStyle,
    conflict_secondary: conflictSecondary,
    flooding_prone: floodingProne,
    attachment_style: attachmentStyle,
    attachment_anxiety: anx,
    attachment_avoidance: avo,
    love_language_primary: llPrimary,
    love_language_profile: ll,
    repair_style: repairStyle,
  }
}

// ── ATTRIBUTION ───────────────────────────────────────────────────────────────

export const PROFILE_ATTRIBUTION = 'Informed by Gottman conflict typology research, ECR attachment dimensions, and Chapman love language constructs. Questions written independently by ABF.'
