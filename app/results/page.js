'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const questions = [
  { id: 'q1', category: 'Communication', question: 'How do you prefer to discuss important topics?' },
  { id: 'q2', category: 'Communication', question: "When your partner shares a problem, what's your first instinct?" },
  { id: 'q3', category: 'Communication', question: 'How often do you like checking in about your day?' },
  { id: 'q4', category: 'Conflict Resolution', question: "When you disagree, what's your typical approach?" },
  { id: 'q5', category: 'Conflict Resolution', question: "During a disagreement, you're most likely to:" },
  { id: 'q6', category: 'Conflict Resolution', question: 'After a conflict, you feel reconnected when:' },
  { id: 'q7', category: 'Emotional Intimacy', question: 'How comfortable are you sharing your deepest feelings?' },
  { id: 'q8', category: 'Emotional Intimacy', question: 'You feel most loved when your partner:' },
  { id: 'q9', category: 'Emotional Intimacy', question: "When you're stressed, you prefer your partner to:" },
  { id: 'q10', category: 'Values & Goals', question: "What's most important to you in life?" },
  { id: 'q11', category: 'Values & Goals', question: 'In 5 years, you see yourself:' },
  { id: 'q12', category: 'Values & Goals', question: 'How do you approach big life decisions?' },
  { id: 'q13', category: 'Affection & Quality Time', question: 'Your ideal date night is:' },
  { id: 'q14', category: 'Affection & Quality Time', question: 'How much physical affection do you like daily?' },
  { id: 'q15', category: 'Affection & Quality Time', question: 'Quality time together means:' },
  { id: 'q16', category: 'Support & Partnership', question: 'When your partner is struggling, you:' },
  { id: 'q17', category: 'Support & Partnership', question: 'In a partnership, you believe in:' },
  { id: 'q18', category: 'Support & Partnership', question: 'You feel like a team when:' },
]

const answerLabels = {
  q1: { A: 'Right away when they come up', B: "After I've had time to think about it", C: "When we're both calm and relaxed", D: 'Through a mix of talking and messaging' },
  q2: { A: 'Offer solutions and advice', B: 'Listen and validate their feelings', C: 'Share a similar experience', D: 'Ask questions to understand better' },
  q3: { A: 'Multiple times throughout the day', B: 'Once in the morning and evening', C: 'Mainly at the end of the day', D: 'When something important happens' },
  q4: { A: 'Talk it through immediately', B: 'Take space, then discuss later', C: 'Try to find a compromise quickly', D: 'Let minor things go, address major issues' },
  q5: { A: 'Express your feelings openly', B: 'Focus on finding a solution', C: 'Try to understand their perspective first', D: 'Need time alone to process' },
  q6: { A: 'We talk through what happened', B: 'We do something fun together', C: 'We give each other physical affection', D: "We both say we're sorry and move on" },
  q7: { A: "Very comfortable - I'm an open book", B: 'Comfortable with some topics, not all', C: 'It takes time for me to open up', D: 'I prefer showing love through actions' },
  q8: { A: 'Tells you verbally', B: 'Spends quality time with you', C: 'Does thoughtful things for you', D: 'Shows physical affection' },
  q9: { A: 'Give you space to work through it', B: "Talk with you about what's wrong", C: 'Distract you with something fun', D: 'Simply be present without pressure' },
  q10: { A: 'Career and personal achievement', B: 'Family and close relationships', C: 'Adventure and new experiences', D: 'Security and stability' },
  q11: { A: 'In the same place, deeper roots', B: 'Exploring new opportunities or locations', C: 'Focused on family growth (kids, etc.)', D: 'Building financial security and comfort' },
  q12: { A: 'Research thoroughly, then decide', B: 'Trust my gut feeling', C: 'Discuss extensively with my partner', D: 'Consider practical factors first' },
  q13: { A: 'Staying in - cooking, movies, games', B: 'Going out - dinner, activities, events', C: 'Something active and adventurous', D: 'Whatever feels spontaneous that day' },
  q14: { A: 'A lot - frequent hugs, kisses, touching', B: 'Moderate - regular but not constant', C: 'Some - morning/evening connection', D: 'Varies - depends on my mood/energy' },
  q15: { A: 'Doing activities side by side', B: 'Deep conversations and connection', C: 'Trying new experiences together', D: 'Relaxing without needing to do anything' },
  q16: { A: 'Jump in to help solve the problem', B: 'Listen and offer emotional support', C: 'Give them space unless they ask', D: 'Check in regularly and offer help' },
  q17: { A: 'Equal division of all responsibilities', B: "Playing to each person's strengths", C: 'Traditional roles and expectations', D: 'Flexibility - adjust as needs change' },
  q18: { A: 'We tackle challenges together', B: "We celebrate each other's wins", C: 'We make decisions jointly', D: 'We can rely on each other completely' },
}

const categories = [
  { name: 'Communication', emoji: '💬', questions: ['q1', 'q2', 'q3'] },
  { name: 'Conflict Resolution', emoji: '🤝', questions: ['q4', 'q5', 'q6'] },
  { name: 'Emotional Intimacy', emoji: '💕', questions: ['q7', 'q8', 'q9'] },
  { name: 'Values & Goals', emoji: '🎯', questions: ['q10', 'q11', 'q12'] },
  { name: 'Affection & Quality Time', emoji: '🥰', questions: ['q13', 'q14', 'q15'] },
  { name: 'Support & Partnership', emoji: '💪', questions: ['q16', 'q17', 'q18'] },
]

function CircularProgress({ percent, size = 180 }) {
  const strokeWidth = 12
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percent / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#fce7f3"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#gradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-bold text-pink-600">{Math.round(percent)}%</span>
        <span className="text-sm text-gray-500">Compatible</span>
      </div>
    </div>
  )
}

function CategoryBar({ name, emoji, percent }) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <span className="flex items-center gap-2">
          <span>{emoji}</span>
          <span className="font-medium text-gray-700">{name}</span>
        </span>
        <span className="font-bold text-pink-600">{Math.round(percent)}%</span>
      </div>
      <div className="w-full bg-pink-100 rounded-full h-3 overflow-hidden">
        <div
          className="bg-gradient-to-r from-pink-400 to-pink-500 h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${percent}%` }}
        ></div>
      </div>
    </div>
  )
}

export default function Results() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)
  const [couple, setCouple] = useState(null)
  const [myAnswers, setMyAnswers] = useState(null)
  const [partnerAnswers, setPartnerAnswers] = useState(null)
  const [partnerName, setPartnerName] = useState('Partner')
  const [overallScore, setOverallScore] = useState(0)
  const [categoryScores, setCategoryScores] = useState({})
  const [matches, setMatches] = useState([])
  const [differences, setDifferences] = useState([])
  const [showAnimations, setShowAnimations] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (!loading && myAnswers && partnerAnswers) {
      // Trigger animations after a short delay
      setTimeout(() => setShowAnimations(true), 100)
    }
  }, [loading, myAnswers, partnerAnswers])

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

      setCouple(coupleData)

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

      // Get partner's name
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

      // Calculate scores
      calculateScores(myResponse.answers, partnerResponse.answers)

      setLoading(false)
    } catch (err) {
      setError('Something went wrong')
      setLoading(false)
    }
  }

  const calculateScores = (myAns, partnerAns) => {
    // Overall score
    let totalMatches = 0
    const matchList = []
    const diffList = []

    questions.forEach(q => {
      if (myAns[q.id] === partnerAns[q.id]) {
        totalMatches++
        matchList.push({
          id: q.id,
          question: q.question,
          category: q.category,
          answer: myAns[q.id],
          answerLabel: answerLabels[q.id][myAns[q.id]],
        })
      } else {
        diffList.push({
          id: q.id,
          question: q.question,
          category: q.category,
          myAnswer: myAns[q.id],
          myAnswerLabel: answerLabels[q.id][myAns[q.id]],
          partnerAnswer: partnerAns[q.id],
          partnerAnswerLabel: answerLabels[q.id][partnerAns[q.id]],
        })
      }
    })

    setOverallScore((totalMatches / 18) * 100)
    setMatches(matchList)
    setDifferences(diffList)

    // Category scores
    const catScores = {}
    categories.forEach(cat => {
      let catMatches = 0
      cat.questions.forEach(qId => {
        if (myAns[qId] === partnerAns[qId]) {
          catMatches++
        }
      })
      catScores[cat.name] = (catMatches / 3) * 100
    })
    setCategoryScores(catScores)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-pink-500 text-lg">Calculating your compatibility...</p>
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
      <div className="bg-white/90 backdrop-blur-sm shadow-sm">
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
        {/* Celebration Header */}
        <div className={`text-center mb-8 transition-all duration-700 ${showAnimations ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-pink-600 mb-2">
            Your Compatibility Results
          </h2>
          <p className="text-gray-600">
            Here's how you and {partnerName} align!
          </p>
        </div>

        {/* Overall Score */}
        <div className={`bg-white rounded-3xl shadow-xl p-8 mb-8 text-center transition-all duration-700 delay-200 ${showAnimations ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h3 className="text-xl font-bold text-gray-700 mb-6">Overall Compatibility</h3>
          <CircularProgress percent={showAnimations ? overallScore : 0} />
          <p className="mt-6 text-gray-600">
            You matched on <span className="font-bold text-pink-600">{matches.length} out of 18</span> questions
          </p>
        </div>

        {/* Category Breakdown */}
        <div className={`bg-white rounded-3xl shadow-xl p-6 mb-8 transition-all duration-700 delay-400 ${showAnimations ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h3 className="text-xl font-bold text-gray-700 mb-6">Category Breakdown</h3>
          {categories.map(cat => (
            <CategoryBar
              key={cat.name}
              name={cat.name}
              emoji={cat.emoji}
              percent={showAnimations ? categoryScores[cat.name] || 0 : 0}
            />
          ))}
        </div>

        {/* Where You Align */}
        {matches.length > 0 && (
          <div className={`bg-white rounded-3xl shadow-xl p-6 mb-8 transition-all duration-700 delay-500 ${showAnimations ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span>✨</span> Where You Align
            </h3>
            <p className="text-gray-500 text-sm mb-4">You both answered the same on these questions!</p>
            <div className="space-y-4">
              {matches.map(match => (
                <div key={match.id} className="bg-green-50 rounded-xl p-4 border border-green-100">
                  <p className="text-gray-700 font-medium mb-2">{match.question}</p>
                  <div className="flex items-center gap-2">
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">Match!</span>
                    <span className="text-green-700 text-sm">{match.answerLabel}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Growth Opportunities */}
        {differences.length > 0 && (
          <div className={`bg-white rounded-3xl shadow-xl p-6 mb-8 transition-all duration-700 delay-600 ${showAnimations ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span>🌱</span> Growth Opportunities
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              Different answers mean different perspectives - and a chance to learn from each other!
            </p>
            <div className="space-y-4">
              {differences.map(diff => (
                <div key={diff.id} className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                  <p className="text-gray-700 font-medium mb-3">{diff.question}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">You said:</p>
                      <p className="text-sm text-gray-700">
                        <span className="font-bold text-pink-500">{diff.myAnswer})</span> {diff.myAnswerLabel}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">{partnerName} said:</p>
                      <p className="text-sm text-gray-700">
                        <span className="font-bold text-pink-500">{diff.partnerAnswer})</span> {diff.partnerAnswerLabel}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dashboard Button */}
        <div className={`transition-all duration-700 delay-700 ${showAnimations ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-gradient-to-r from-pink-400 to-pink-500 text-white py-4 rounded-full font-bold text-lg shadow-lg hover:from-pink-500 hover:to-pink-600 transition-all transform hover:scale-[1.02]"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
