'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// Answer option mappings for insight generation
const answerMappings = {
  // Communication
  q1: {
    A: { style: 'discuss things right away when they come up', advice: 'be ready for spontaneous important conversations', preference: 'immediate' },
    B: { style: 'think things through before discussing', advice: 'give them a heads up about big topics so they can process', preference: 'reflective' },
    C: { style: 'talk when you\'re both calm and relaxed', advice: 'wait for a peaceful moment rather than bringing things up during stress', preference: 'calm' },
    D: { style: 'communicate through a mix of talking and messaging', advice: 'use both in-person and text conversations - sometimes a message lets them gather thoughts', preference: 'mixed' },
  },
  q2: {
    A: { style: 'get solutions and practical advice', advice: 'offer concrete suggestions when they share problems', response: 'problem-solver' },
    B: { style: 'feel heard and have their feelings validated', advice: 'listen first and acknowledge their emotions before jumping to solutions', response: 'listener' },
    C: { style: 'hear that you\'ve been through similar things', advice: 'share your own experiences to help them feel less alone', response: 'relater' },
    D: { style: 'have you ask questions to understand better', advice: 'ask clarifying questions and show genuine curiosity about their situation', response: 'questioner' },
  },
  q3: {
    A: { style: 'check in multiple times throughout the day', advice: 'send periodic texts or quick calls - they love staying connected', frequency: 'frequent' },
    B: { style: 'connect once in the morning and evening', advice: 'make your morning goodbye and evening hello meaningful rituals', frequency: 'bookends' },
    C: { style: 'catch up mainly at the end of the day', advice: 'save your daily download for evening when you\'re both winding down', frequency: 'evening' },
    D: { style: 'share when something important happens', advice: 'focus on quality over quantity - share the meaningful moments', frequency: 'selective' },
  },
  // Conflict Resolution
  q4: {
    A: { style: 'talk through disagreements immediately', advice: 'address issues in the moment rather than letting them simmer', approach: 'immediate' },
    B: { style: 'take space first, then discuss later', advice: 'give them breathing room before working through conflict', approach: 'space-first' },
    C: { style: 'find a compromise quickly', advice: 'come prepared with middle-ground options to resolve things efficiently', approach: 'compromiser' },
    D: { style: 'let minor things go and address major issues', advice: 'pick your battles - not everything needs to be a discussion', approach: 'selective' },
  },
  q5: {
    A: { style: 'express their feelings openly', advice: 'create space for emotional expression without judgment', tendency: 'expressive' },
    B: { style: 'focus on finding a solution', advice: 'help them problem-solve rather than dwelling on emotions', tendency: 'solution-focused' },
    C: { style: 'understand your perspective first', advice: 'share your side clearly - they want to understand where you\'re coming from', tendency: 'perspective-seeker' },
    D: { style: 'need time alone to process', advice: 'give them space to think before expecting resolution', tendency: 'processor' },
  },
  q6: {
    A: { style: 'talk through what happened', advice: 'have a debrief conversation after conflicts settle down', reconnection: 'verbal' },
    B: { style: 'do something fun together', advice: 'plan an enjoyable activity to rebuild connection after disagreements', reconnection: 'activity' },
    C: { style: 'share physical affection', advice: 'offer hugs, cuddles, or physical closeness to reconnect', reconnection: 'physical' },
    D: { style: 'say sorry and move on', advice: 'give a sincere apology and don\'t over-discuss - they\'re ready to move forward', reconnection: 'closure' },
  },
  // Emotional Intimacy & Trust
  q7: {
    A: { style: 'very open and shares freely', advice: 'ask them questions - they\'re happy to go deep', openness: 'open-book' },
    B: { style: 'comfortable with some topics but not all', advice: 'respect their boundaries while gently encouraging deeper sharing over time', openness: 'selective' },
    C: { style: 'takes time to open up', advice: 'be patient and create safety - trust builds slowly for them', openness: 'gradual' },
    D: { style: 'shows love through actions rather than words', advice: 'watch for what they DO, not just what they say - actions are their love language', openness: 'action-oriented' },
  },
  q8: {
    A: { style: 'being told they\'re loved verbally', advice: 'say "I love you" and express appreciation in words', loveStyle: 'words' },
    B: { style: 'spending quality time together', advice: 'prioritize undivided attention and shared experiences', loveStyle: 'time' },
    C: { style: 'thoughtful gestures and acts of service', advice: 'do helpful things and remember the little details that matter to them', loveStyle: 'acts' },
    D: { style: 'physical touch and affection', advice: 'offer hugs, hand-holding, and physical closeness regularly', loveStyle: 'touch' },
  },
  q9: {
    A: { style: 'have space to work through it alone', advice: 'give them room without taking it personally - they\'ll come to you when ready', stressResponse: 'space' },
    B: { style: 'talk through what\'s wrong', advice: 'ask what\'s on their mind and be present for the conversation', stressResponse: 'talk' },
    C: { style: 'be distracted with something fun', advice: 'suggest a fun activity or lighten the mood to help them decompress', stressResponse: 'distraction' },
    D: { style: 'have you simply be present without pressure', advice: 'just be there quietly - no fixing needed, just your presence', stressResponse: 'presence' },
  },
  // Values & Future Goals
  q10: {
    A: { style: 'career and personal achievement', advice: 'support their professional goals and celebrate their accomplishments', priority: 'achievement' },
    B: { style: 'family and close relationships', advice: 'prioritize family time and nurturing your close circle together', priority: 'family' },
    C: { style: 'adventure and new experiences', advice: 'plan novel experiences and be open to spontaneity', priority: 'adventure' },
    D: { style: 'security and stability', advice: 'build predictable routines and long-term financial planning together', priority: 'stability' },
  },
  q11: {
    A: { style: 'deepening roots in their current place', advice: 'invest in your current home and community together', vision: 'settled' },
    B: { style: 'exploring new opportunities and locations', advice: 'stay open to change and discuss possibilities for growth', vision: 'explorer' },
    C: { style: 'focusing on family growth', advice: 'have open conversations about family planning and timelines', vision: 'family-focused' },
    D: { style: 'building financial security', advice: 'work together on savings goals and financial planning', vision: 'security-focused' },
  },
  q12: {
    A: { style: 'researches thoroughly before deciding', advice: 'give them time to gather information - don\'t rush big decisions', decisionStyle: 'researcher' },
    B: { style: 'trusts their gut feeling', advice: 'respect their intuition even when they can\'t fully explain it', decisionStyle: 'intuitive' },
    C: { style: 'discusses extensively with you', advice: 'make time for deep conversations about major choices - they need your input', decisionStyle: 'collaborative' },
    D: { style: 'considers practical factors first', advice: 'lead with logistics and feasibility in decision discussions', decisionStyle: 'practical' },
  },
  // Affection & Quality Time
  q13: {
    A: { style: 'cozy nights in with cooking, movies, or games', advice: 'plan comfortable home dates - they love quality time in', dateStyle: 'homebody' },
    B: { style: 'going out to dinner, activities, or events', advice: 'plan outings and experiences outside the house', dateStyle: 'adventurer' },
    C: { style: 'active and adventurous activities', advice: 'try hiking, sports, or physical activities together', dateStyle: 'active' },
    D: { style: 'spontaneous, whatever feels right', advice: 'stay flexible and let the day unfold naturally', dateStyle: 'spontaneous' },
  },
  q14: {
    A: { style: 'lots of physical affection throughout the day', advice: 'initiate frequent hugs, kisses, and casual touch', affectionLevel: 'high' },
    B: { style: 'moderate, regular but not constant touch', advice: 'maintain steady physical connection without overwhelming', affectionLevel: 'moderate' },
    C: { style: 'meaningful moments in morning and evening', advice: 'make hello and goodbye physical - bookend your days with touch', affectionLevel: 'bookend' },
    D: { style: 'varied based on mood and energy', advice: 'read their cues and match their energy day by day', affectionLevel: 'variable' },
  },
  q15: {
    A: { style: 'doing activities side by side', advice: 'spend time in the same space, even doing different things - parallel presence counts', qualityTime: 'parallel' },
    B: { style: 'deep conversations and emotional connection', advice: 'create space for meaningful talks without distractions', qualityTime: 'conversational' },
    C: { style: 'trying new experiences together', advice: 'seek out novel activities and shared adventures', qualityTime: 'experiential' },
    D: { style: 'relaxing without needing to do anything', advice: 'enjoy quiet, low-key time together - no agenda needed', qualityTime: 'restful' },
  },
  // Support & Partnership
  q16: {
    A: { style: 'jumps in to help solve problems', advice: 'let them help when you\'re struggling - they show love through action', supportStyle: 'fixer' },
    B: { style: 'listens and offers emotional support', advice: 'lean on them for comfort and validation when times are tough', supportStyle: 'listener' },
    C: { style: 'gives space unless asked', advice: 'explicitly ask for help when you need it - they respect your autonomy', supportStyle: 'respectful' },
    D: { style: 'checks in regularly and offers help', advice: 'appreciate their consistent presence - they\'re always in your corner', supportStyle: 'steady' },
  },
  q17: {
    A: { style: 'equal division of all responsibilities', advice: 'aim for fair, balanced splitting of tasks and duties', partnershipStyle: 'equal' },
    B: { style: 'playing to each person\'s strengths', advice: 'divide tasks based on who\'s better at what, not strict equality', partnershipStyle: 'strengths-based' },
    C: { style: 'more traditional roles', advice: 'understand their expectations around roles and discuss openly', partnershipStyle: 'traditional' },
    D: { style: 'flexibility that adjusts as needs change', advice: 'stay adaptable - they value fluid roles over rigid structures', partnershipStyle: 'flexible' },
  },
  q18: {
    A: { style: 'tackling challenges together', advice: 'face problems as a united front - "us vs. the problem"', teamFeeling: 'challenge-oriented' },
    B: { style: 'celebrating each other\'s wins', advice: 'actively celebrate their successes and share in their joy', teamFeeling: 'celebratory' },
    C: { style: 'making decisions jointly', advice: 'include them in decisions big and small - they want to be consulted', teamFeeling: 'collaborative' },
    D: { style: 'knowing they can rely on each other', advice: 'be dependable and consistent - reliability is everything to them', teamFeeling: 'dependable' },
  },
}

const categories = [
  {
    name: 'Communication',
    emoji: '💬',
    questions: ['q1', 'q2', 'q3'],
    description: 'How they prefer to talk and be heard'
  },
  {
    name: 'Conflict Resolution',
    emoji: '🤝',
    questions: ['q4', 'q5', 'q6'],
    description: 'How they handle disagreements'
  },
  {
    name: 'Emotional Intimacy',
    emoji: '💕',
    questions: ['q7', 'q8', 'q9'],
    description: 'How they connect and feel loved'
  },
  {
    name: 'Values & Goals',
    emoji: '🎯',
    questions: ['q10', 'q11', 'q12'],
    description: 'What matters most to them'
  },
  {
    name: 'Affection & Quality Time',
    emoji: '🥰',
    questions: ['q13', 'q14', 'q15'],
    description: 'How they like to spend time together'
  },
  {
    name: 'Support & Partnership',
    emoji: '💪',
    questions: ['q16', 'q17', 'q18'],
    description: 'How they show up as a partner'
  },
]

function generateCategoryInsight(category, partnerAnswers, partnerName) {
  const { questions } = category

  switch (category.name) {
    case 'Communication': {
      const q1 = answerMappings.q1[partnerAnswers.q1]
      const q2 = answerMappings.q2[partnerAnswers.q2]
      const q3 = answerMappings.q3[partnerAnswers.q3]

      return {
        insight: `${partnerName} prefers to ${q1?.style || 'communicate thoughtfully'}. When discussing important topics, ${q1?.advice || 'be mindful of timing'}. When sharing problems with them, they want to ${q2?.style || 'understand and support you'}. For daily connection, they like to ${q3?.style || 'stay in touch'}.`,
        tips: [
          q1?.preference === 'reflective'
            ? `Text them "Hey, can we talk about [topic] tonight?" to give them processing time`
            : q1?.preference === 'calm'
            ? `Wait for a relaxed moment before bringing up important subjects`
            : `Be ready for on-the-spot conversations about things that matter`,
          q2?.response === 'listener'
            ? `When they share a problem, start with "That sounds hard" before offering solutions`
            : q2?.response === 'questioner'
            ? `Ask "Tell me more about that" when they share something with you`
            : `Share your own experiences to help them feel understood`,
          q3?.frequency === 'frequent'
            ? `Send a quick "thinking of you" text during the day`
            : `Save meaningful conversations for ${q3?.frequency === 'evening' ? 'evening wind-down time' : 'when you\'re both present'}`,
        ],
      }
    }

    case 'Conflict Resolution': {
      const q4 = answerMappings.q4[partnerAnswers.q4]
      const q5 = answerMappings.q5[partnerAnswers.q5]
      const q6 = answerMappings.q6[partnerAnswers.q6]

      return {
        insight: `When disagreements happen, ${partnerName} tends to ${q4?.style || 'work through things'}. During conflict, they're most likely to ${q5?.style || 'express themselves'}. After an argument, they feel reconnected when you ${q6?.style || 'make things right together'}.`,
        tips: [
          q4?.approach === 'space-first'
            ? `If tensions rise, say "Let's take 20 minutes and come back to this"`
            : q4?.approach === 'immediate'
            ? `Address issues in the moment rather than letting things build up`
            : `Focus on the big stuff - they're okay letting small things slide`,
          q5?.tendency === 'processor'
            ? `Give them quiet time to think before expecting a response`
            : q5?.tendency === 'perspective-seeker'
            ? `Clearly explain your side - they genuinely want to understand you`
            : `Create space for them to share their feelings without interruption`,
          q6?.reconnection === 'physical'
            ? `After resolving a conflict, offer a hug to seal the reconnection`
            : q6?.reconnection === 'activity'
            ? `Plan something fun together after working through disagreements`
            : `Have a brief "what we learned" conversation after conflicts settle`,
        ],
      }
    }

    case 'Emotional Intimacy': {
      const q7 = answerMappings.q7[partnerAnswers.q7]
      const q8 = answerMappings.q8[partnerAnswers.q8]
      const q9 = answerMappings.q9[partnerAnswers.q9]

      return {
        insight: `${partnerName} is ${q7?.style || 'thoughtful about vulnerability'}. They feel most loved when you ${q8?.style || 'show you care'}. When they're stressed, they need you to ${q9?.style || 'be there for them'}.`,
        tips: [
          q7?.openness === 'gradual'
            ? `Be patient with deeper topics - trust builds slowly for them`
            : q7?.openness === 'action-oriented'
            ? `Watch their actions, not just words - that's how they express love`
            : `Ask them thoughtful questions - they enjoy opening up`,
          q8?.loveStyle === 'words'
            ? `Say "I love you" and specific things you appreciate about them`
            : q8?.loveStyle === 'time'
            ? `Put away your phone and give them your full attention`
            : q8?.loveStyle === 'acts'
            ? `Do something helpful without being asked - they'll notice`
            : `Reach for their hand, give random hugs, stay physically close`,
          q9?.stressResponse === 'space'
            ? `When they're stressed, give them room without taking it personally`
            : q9?.stressResponse === 'distraction'
            ? `Suggest something fun when they're overwhelmed - help them reset`
            : `Simply be present - sometimes they just need you nearby`,
        ],
      }
    }

    case 'Values & Goals': {
      const q10 = answerMappings.q10[partnerAnswers.q10]
      const q11 = answerMappings.q11[partnerAnswers.q11]
      const q12 = answerMappings.q12[partnerAnswers.q12]

      return {
        insight: `What matters most to ${partnerName} is ${q10?.style || 'building a meaningful life'}. Looking ahead, they see themselves ${q11?.style || 'growing'}. When facing big decisions, they prefer to ${q12?.style || 'think carefully'}.`,
        tips: [
          q10?.priority === 'achievement'
            ? `Ask about their career goals and celebrate their professional wins`
            : q10?.priority === 'family'
            ? `Prioritize time with family and close friends together`
            : q10?.priority === 'adventure'
            ? `Suggest new experiences and stay open to spontaneity`
            : `Work on building security and stability together`,
          q11?.vision === 'explorer'
            ? `Discuss possibilities and stay open to change and new opportunities`
            : q11?.vision === 'family-focused'
            ? `Have open conversations about your family planning timeline`
            : `Invest in your current home and community together`,
          q12?.decisionStyle === 'researcher'
            ? `Give them time to gather information before big decisions`
            : q12?.decisionStyle === 'collaborative'
            ? `Make time for deep discussions about major choices together`
            : `Respect their intuition, even when they can't fully explain it`,
        ],
      }
    }

    case 'Affection & Quality Time': {
      const q13 = answerMappings.q13[partnerAnswers.q13]
      const q14 = answerMappings.q14[partnerAnswers.q14]
      const q15 = answerMappings.q15[partnerAnswers.q15]

      return {
        insight: `${partnerName}'s ideal date involves ${q13?.style || 'quality time together'}. For physical affection, they prefer ${q14?.style || 'meaningful connection'}. Quality time for them means ${q15?.style || 'being together'}.`,
        tips: [
          q13?.dateStyle === 'homebody'
            ? `Plan cozy nights in - cook together, watch movies, play games`
            : q13?.dateStyle === 'active'
            ? `Suggest hikes, sports, or physical activities for dates`
            : q13?.dateStyle === 'spontaneous'
            ? `Leave room for spontaneity - don't over-plan every moment`
            : `Make reservations and plan outings to new places`,
          q14?.affectionLevel === 'high'
            ? `Initiate physical touch throughout the day - they love it`
            : q14?.affectionLevel === 'bookend'
            ? `Make morning goodbye and evening hello hugs/kisses meaningful`
            : `Match their energy - some days they want more, some days less`,
          q15?.qualityTime === 'conversational'
            ? `Put phones away and create space for meaningful conversations`
            : q15?.qualityTime === 'parallel'
            ? `Enjoy being in the same room, even doing separate activities`
            : q15?.qualityTime === 'experiential'
            ? `Seek out new activities and adventures to share`
            : `Embrace quiet, low-key time together - no agenda needed`,
        ],
      }
    }

    case 'Support & Partnership': {
      const q16 = answerMappings.q16[partnerAnswers.q16]
      const q17 = answerMappings.q17[partnerAnswers.q17]
      const q18 = answerMappings.q18[partnerAnswers.q18]

      return {
        insight: `When you're struggling, ${partnerName} ${q16?.style || 'wants to help'}. In partnership, they believe in ${q17?.style || 'working together'}. They feel like a team when ${q18?.style || 'you\'re in sync'}.`,
        tips: [
          q16?.supportStyle === 'fixer'
            ? `Let them help solve problems - it's how they show love`
            : q16?.supportStyle === 'respectful'
            ? `Explicitly ask for help when you need it - they respect your space`
            : `Lean on them for comfort - they're great at emotional support`,
          q17?.partnershipStyle === 'equal'
            ? `Aim for fair, balanced splitting of household responsibilities`
            : q17?.partnershipStyle === 'strengths-based'
            ? `Divide tasks based on who's better at what, not strict 50/50`
            : `Stay adaptable - they value flexible roles over rigid structures`,
          q18?.teamFeeling === 'challenge-oriented'
            ? `Frame problems as "us vs. the problem" - tackle challenges together`
            : q18?.teamFeeling === 'celebratory'
            ? `Actively celebrate their wins and share in their successes`
            : q18?.teamFeeling === 'collaborative'
            ? `Include them in decisions big and small - they want to be consulted`
            : `Be reliable and consistent - dependability means everything to them`,
        ],
      }
    }

    default:
      return { insight: '', tips: [] }
  }
}

function calculateCategoryAlignment(userAnswers, partnerAnswers, questions) {
  let matches = 0
  questions.forEach(q => {
    if (userAnswers[q] === partnerAnswers[q]) {
      matches++
    }
  })
  return matches
}

export default function PartnerInsights() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)
  const [partnerName, setPartnerName] = useState('Your Partner')
  const [myAnswers, setMyAnswers] = useState(null)
  const [partnerAnswers, setPartnerAnswers] = useState(null)
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (!loading && partnerAnswers) {
      setTimeout(() => setShowContent(true), 100)
    }
  }, [loading, partnerAnswers])

  const checkAuth = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        router.push('/login')
        return
      }

      setUser(user)

      // Get couple data
      const { data: coupleData, error: coupleError } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .single()

      if (coupleError || !coupleData) {
        router.push('/connect')
        return
      }

      // Get both onboarding responses
      const { data: myResponse } = await supabase
        .from('onboarding_responses')
        .select('*')
        .eq('user_id', user.id)
        .eq('couple_id', coupleData.id)
        .single()

      if (!myResponse) {
        router.push('/onboarding')
        return
      }

      const partnerId = coupleData.user1_id === user.id ? coupleData.user2_id : coupleData.user1_id

      const { data: partnerResponse } = await supabase
        .from('onboarding_responses')
        .select('*')
        .eq('user_id', partnerId)
        .eq('couple_id', coupleData.id)
        .single()

      if (!partnerResponse) {
        router.push('/onboarding')
        return
      }

      // Get partner's name from profiles or auth
      const { data: partnerProfile } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', partnerId)
        .single()

      if (partnerProfile?.first_name) {
        setPartnerName(partnerProfile.first_name)
      }

      setMyAnswers(myResponse.answers)
      setPartnerAnswers(partnerResponse.answers)
      setLoading(false)
    } catch (err) {
      setError('Something went wrong')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-pink-500 text-lg">Loading insights...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-pink-100 pb-8">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="bg-gradient-to-r from-pink-400 to-pink-500 text-white rounded-xl px-4 py-2">
            <h1 className="text-lg font-bold tracking-wider">ABF</h1>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-pink-500 hover:text-pink-600 font-medium"
          >
            Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-8">
        {/* Title Section */}
        <div className={`text-center mb-8 transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h2 className="text-3xl font-bold text-pink-600 mb-2">
            Understanding {partnerName}
          </h2>
          <p className="text-gray-600">
            Here's how to connect with them in ways that matter
          </p>
        </div>

        {/* Category Insights */}
        {categories.map((category, index) => {
          const { insight, tips } = generateCategoryInsight(category, partnerAnswers, partnerName)
          const alignment = calculateCategoryAlignment(myAnswers, partnerAnswers, category.questions)
          const isGrowthArea = alignment <= 1
          const isAligned = alignment >= 2

          return (
            <div
              key={category.name}
              className={`bg-white rounded-2xl shadow-lg p-6 mb-6 transition-all duration-700 ${
                showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: `${(index + 1) * 100}ms` }}
            >
              {/* Category Header */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{category.emoji}</span>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{category.name}</h3>
                  <p className="text-sm text-gray-500">{category.description}</p>
                </div>
              </div>

              {/* Insight Paragraph */}
              <p className="text-gray-700 leading-relaxed mb-4">
                {insight}
              </p>

              {/* Try This Section */}
              <div className="bg-pink-50 rounded-xl p-4 mb-4">
                <h4 className="font-semibold text-pink-600 mb-2 flex items-center gap-2">
                  <span>✨</span> Try This
                </h4>
                <ul className="space-y-2">
                  {tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700 text-sm">
                      <span className="text-pink-400 mt-1">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Alignment Indicator */}
              {isGrowthArea && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                  <span className="text-amber-600">
                    Growth area for you — your styles differ here, which means your effort matters more
                  </span>
                </div>
              )}
              {isAligned && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  <span className="text-green-600">
                    Natural alignment — you're already wired similarly here
                  </span>
                </div>
              )}
            </div>
          )
        })}

        {/* Building Together Section */}
        <div className={`bg-gradient-to-r from-pink-500 to-pink-400 rounded-2xl shadow-xl p-6 mb-6 text-white transition-all duration-700 ${
          showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
        style={{ transitionDelay: '700ms' }}
        >
          <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
            <span>🌱</span> Building Your Relationship Together
          </h3>
          <p className="text-pink-100 mb-4">
            Your relationship needs both of you to tend to all six areas. The growth areas show where your effort will be most meaningful — and most noticed.
          </p>
          <div className="bg-white/20 rounded-xl p-4 mb-4">
            <p className="font-medium">
              This week, pick ONE growth area and try ONE suggestion.
            </p>
            <p className="text-pink-100 text-sm mt-1">
              Small, consistent efforts build stronger relationships than occasional grand gestures.
            </p>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className={`space-y-3 transition-all duration-700 ${
          showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
        style={{ transitionDelay: '800ms' }}
        >
          <button
            onClick={() => router.push('/results')}
            className="w-full bg-white text-pink-500 py-4 rounded-full font-bold text-lg shadow-lg hover:bg-pink-50 transition-all border-2 border-pink-200"
          >
            View Compatibility Results
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-gradient-to-r from-pink-400 to-pink-500 text-white py-4 rounded-full font-bold text-lg shadow-lg hover:from-pink-500 hover:to-pink-600 transition-all transform hover:scale-[1.02]"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
