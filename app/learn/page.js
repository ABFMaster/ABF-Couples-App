'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ASSESSMENT_MODULES } from '@/lib/relationship-questions'

const TOPICS = [
  { id: 'all', label: 'All', emoji: '✨' },
  { id: 'intimacy', label: 'Intimacy', emoji: '💕' },
  { id: 'conflict', label: 'Conflict', emoji: '⚡' },
  { id: 'communication', label: 'Communication', emoji: '💬' },
  { id: 'attachment', label: 'Attachment', emoji: '🔗' },
  { id: 'connection', label: 'Connection', emoji: '🤝' },
  { id: 'wellbeing', label: 'Wellbeing', emoji: '🌱' },
]

// ── Recommended books ──────────────────────────────────────────────────────────

const RECOMMENDED_BOOKS = [
  {
    id: 'seven-principles',
    title: 'The Seven Principles for Making Marriage Work',
    author: 'Dr. John Gottman',
    emoji: '💑',
    color: '#E8614D',
    topics: ['conflict', 'communication', 'connection'],
    primaryTopic: 'conflict',
    blurb: 'The most science-backed book on relationships ever written. Gottman\'s 40 years of research distilled into 7 actionable principles every couple can use.',
    bestFor: 'Every couple',
    amazonUrl: 'https://www.amazon.com/dp/0553447718',
  },
  {
    id: 'attached',
    title: 'Attached',
    author: 'Amir Levine & Rachel Heller',
    emoji: '🔗',
    color: '#6B5CE7',
    topics: ['attachment', 'intimacy', 'connection'],
    primaryTopic: 'attachment',
    blurb: 'Discover your attachment style and understand why you relate the way you do. A game-changer for understanding patterns that shape every relationship.',
    bestFor: 'Understanding yourself',
    amazonUrl: 'https://www.amazon.com/dp/1585429139',
  },
  {
    id: 'hold-me-tight',
    title: 'Hold Me Tight',
    author: 'Dr. Sue Johnson',
    emoji: '🤝',
    color: '#3D9970',
    topics: ['attachment', 'intimacy', 'connection'],
    primaryTopic: 'attachment',
    blurb: 'Based on Emotionally Focused Therapy (EFT), this book reveals the secret to lasting love: emotional responsiveness and creating a safe connection.',
    bestFor: 'Rebuilding connection',
    amazonUrl: 'https://www.amazon.com/dp/031611300X',
  },
  {
    id: 'five-love-languages',
    title: 'The 5 Love Languages',
    author: 'Gary Chapman',
    emoji: '💝',
    color: '#F39C12',
    topics: ['intimacy', 'communication', 'connection'],
    primaryTopic: 'intimacy',
    blurb: 'The classic that introduced the world to love languages. Simple, practical, and surprisingly powerful for understanding how you each give and receive love.',
    bestFor: 'Speaking each other\'s language',
    amazonUrl: 'https://www.amazon.com/dp/080241270X',
  },
  {
    id: 'mating-in-captivity',
    title: 'Mating in Captivity',
    author: 'Esther Perel',
    emoji: '🔥',
    color: '#C44A38',
    topics: ['intimacy', 'connection', 'wellbeing'],
    primaryTopic: 'intimacy',
    blurb: 'How do you sustain desire in a long-term relationship? Perel\'s provocative, brilliant answer challenges everything you thought you knew about love and lust.',
    bestFor: 'Long-term couples',
    amazonUrl: 'https://www.amazon.com/dp/0060753641',
  },
  {
    id: 'wired-for-love',
    title: 'Wired for Love',
    author: 'Stan Tatkin',
    emoji: '🧠',
    color: '#3D3580',
    topics: ['attachment', 'communication', 'connection'],
    primaryTopic: 'attachment',
    blurb: 'How neuroscience explains why we behave the way we do in relationships — and how to use that understanding to build a genuinely secure partnership.',
    bestFor: 'Science-minded couples',
    amazonUrl: 'https://www.amazon.com/dp/1608820580',
  },
  {
    id: 'come-as-you-are',
    title: 'Come As You Are',
    author: 'Emily Nagoski',
    emoji: '🌸',
    color: '#E91E8C',
    topics: ['intimacy', 'wellbeing', 'connection'],
    primaryTopic: 'intimacy',
    blurb: 'The science of why women\'s sexuality works the way it does. Groundbreaking research that helps couples understand desire, arousal, and intimacy on a deeper level.',
    bestFor: 'Understanding desire',
    amazonUrl: 'https://www.amazon.com/dp/1476762090',
  },
]

// ── Featured podcasts ──────────────────────────────────────────────────────────

// TODO Sprint 2: Personalize podcast order based on
// user's attachment and conflict style results.
// Anxious attachment → surface Secure Love first
// Avoidant attachment → surface Therapist Uncensored first
// Hostile conflict → surface Where Should We Begin first

const FEATURED_PODCASTS = [
  {
    id: 'where-should-we-begin',
    title: 'Where Should We Begin?',
    host: 'Esther Perel',
    description: 'Real couples, real sessions. Esther Perel conducts live therapy sessions with couples navigating love, desire, and conflict.',
    episodeCount: '100+ episodes',
    tags: ['intimacy', 'conflict', 'connection'],
    primaryTopic: 'intimacy',
    emoji: '🎙️',
    accentColor: '#E8614D',
    spotifyUrl: 'https://open.spotify.com/search/Where%20Should%20We%20Begin%20Esther%20Perel',
    applePodcastsUrl: 'https://podcasts.apple.com/us/podcast/where-should-we-begin-with-esther-perel/id1237931798',
    whyItMatters: 'Hearing real couples work through real issues normalizes the struggles you face and shows what resolution actually looks like.',
  },
  {
    id: 'gottman-relationship-coach',
    title: 'The Gottman Relationship Coach',
    host: 'John & Julie Gottman',
    description: "Research-backed advice from the world's leading relationship scientists. Practical tools for real couples.",
    episodeCount: '50+ episodes',
    tags: ['conflict', 'communication', 'connection'],
    primaryTopic: 'conflict',
    emoji: '🔬',
    accentColor: '#3D9970',
    spotifyUrl: 'https://open.spotify.com/search/Gottman%20Relationship%20Coach',
    applePodcastsUrl: 'https://podcasts.apple.com/us/podcast/gottman-relationship-coach/id1474856585',
    whyItMatters: "The research behind your assessments, made accessible. Gottman's decades of couples research distilled into actionable episodes.",
  },
  {
    id: 'therapist-uncensored',
    title: 'Therapist Uncensored',
    host: 'Ann Kelley & Sue Marriott',
    description: 'The neuroscience and attachment theory behind why we do what we do in relationships — explained accessibly.',
    episodeCount: '200+ episodes',
    tags: ['attachment', 'connection', 'wellbeing'],
    primaryTopic: 'attachment',
    emoji: '🧠',
    accentColor: '#6B5CE7',
    spotifyUrl: 'https://open.spotify.com/search/Therapist%20Uncensored',
    applePodcastsUrl: 'https://podcasts.apple.com/us/podcast/therapist-uncensored-podcast/id1148737853',
    whyItMatters: 'If you want to understand WHY your attachment style works the way it does, this is the deep dive.',
  },
  {
    id: 'secure-love',
    title: 'Secure Love',
    host: 'Julie Menanno',
    description: 'Practical attachment theory for couples. How to break anxious-avoidant cycles and build real security together.',
    episodeCount: '80+ episodes',
    tags: ['attachment', 'intimacy', 'connection'],
    primaryTopic: 'attachment',
    emoji: '💚',
    accentColor: '#2196F3',
    spotifyUrl: 'https://open.spotify.com/search/Secure%20Love%20Julie%20Menanno',
    applePodcastsUrl: 'https://podcasts.apple.com/us/podcast/secure-love/id1601758404',
    whyItMatters: 'Directly complements your Attachment Style assessment — practical tools for moving toward more secure relating.',
  },
  {
    id: 'science-of-happiness',
    title: 'The Science of Happiness',
    host: 'Greater Good Science Center',
    description: 'UC Berkeley researchers share science-backed practices for a happier, more connected life and relationship.',
    episodeCount: '150+ episodes',
    tags: ['wellbeing', 'connection', 'intimacy'],
    primaryTopic: 'wellbeing',
    emoji: '✨',
    accentColor: '#E8A020',
    spotifyUrl: 'https://open.spotify.com/search/Science%20of%20Happiness%20Greater%20Good',
    applePodcastsUrl: 'https://podcasts.apple.com/us/podcast/the-science-of-happiness/id1340505607',
    whyItMatters: 'From the same team behind Greater Good Magazine. Research made practical and warm.',
  },
]

// ── Skeleton card for loading state ───────────────────────────────────────────

function SkeletonFeatured() {
  return (
    <div className="bg-white rounded-3xl shadow-sm overflow-hidden animate-pulse">
      <div className="h-48 bg-gray-200" />
      <div className="p-6">
        <div className="h-3 w-24 bg-gray-200 rounded-full mb-3" />
        <div className="h-6 w-full bg-gray-200 rounded-full mb-2" />
        <div className="h-6 w-3/4 bg-gray-200 rounded-full mb-4" />
        <div className="h-4 w-full bg-gray-100 rounded-full mb-2" />
        <div className="h-4 w-5/6 bg-gray-100 rounded-full mb-6" />
        <div className="h-10 w-36 bg-gray-200 rounded-full" />
      </div>
    </div>
  )
}

function SkeletonCompact() {
  return (
    <div className="bg-white rounded-2xl p-4 animate-pulse flex gap-3 items-center">
      <div className="w-1 h-12 bg-gray-200 rounded-full flex-shrink-0" />
      <div className="flex-1">
        <div className="h-4 w-full bg-gray-200 rounded-full mb-2" />
        <div className="h-3 w-24 bg-gray-100 rounded-full" />
      </div>
    </div>
  )
}

// ── Book preview modal ────────────────────────────────────────────────────────

function BookPreviewModal({ book, onClose }) {
  if (!book) return null
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-6" style={{ background: `linear-gradient(135deg, ${book.color}22, ${book.color}11)`, borderBottom: `3px solid ${book.color}` }}>
          <div className="flex items-start justify-between mb-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl" style={{ backgroundColor: book.color + '20' }}>
              {book.emoji}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none mt-1">×</button>
          </div>
          <h2 className="text-[#2D3648] font-bold text-lg leading-snug mb-1">{book.title}</h2>
          <p className="text-[#6B7280] text-sm">{book.author}</p>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap gap-1.5 mb-4">
            {book.topics.map(t => (
              <span key={t} className="px-2.5 py-1 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: book.color }}>{t}</span>
            ))}
          </div>
          <p className="text-[#6B7280] text-sm leading-relaxed mb-4">{book.blurb}</p>
          <div className="bg-[#F8F6F3] rounded-xl px-4 py-2.5 mb-5">
            <p className="text-xs text-[#9CA3AF] font-medium">Best for</p>
            <p className="text-[#2D3648] text-sm font-semibold">{book.bestFor}</p>
          </div>
          <a href={book.amazonUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-white text-sm hover:opacity-90 transition-opacity" style={{ backgroundColor: book.color }}>
            Get this book →
          </a>
        </div>
      </div>
    </div>
  )
}

// ── Podcast detail modal ───────────────────────────────────────────────────────

function PodcastDetailModal({ podcast, onClose }) {
  if (!podcast) return null
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-6" style={{ background: `linear-gradient(135deg, ${podcast.accentColor}22, ${podcast.accentColor}11)`, borderBottom: `3px solid ${podcast.accentColor}` }}>
          <div className="flex items-start justify-between mb-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl" style={{ backgroundColor: podcast.accentColor + '20' }}>
              {podcast.emoji}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none mt-1">×</button>
          </div>
          <h2 className="text-[#2D3648] font-bold text-lg leading-snug mb-1">{podcast.title}</h2>
          <p className="text-[#6B7280] text-sm">{podcast.host} · {podcast.episodeCount}</p>
        </div>
        <div className="p-6">
          <p className="text-[#6B7280] text-sm leading-relaxed mb-4">{podcast.description}</p>
          <div className="bg-[#FDF6EF] rounded-xl px-4 py-3 mb-5">
            <p className="text-[10px] font-bold text-[#E8614D] uppercase tracking-wide mb-1">Why This Podcast</p>
            <p className="text-[#6B7280] text-xs leading-relaxed italic">{podcast.whyItMatters}</p>
          </div>
          <div className="flex gap-2">
            <a href={podcast.spotifyUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold border-2 border-[#1DB954] text-[#1DB954] hover:bg-[#1DB954] hover:text-white transition-all">
              🎵 Spotify
            </a>
            <a href={podcast.applePodcastsUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold border-2 border-[#9C27B0] text-[#9C27B0] hover:bg-[#9C27B0] hover:text-white transition-all">
              🎙️ Apple
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Featured article card ──────────────────────────────────────────────────────

function FeaturedCard({ article }) {
  return (
    <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-[#E5E2DD]">
      {article.image && (
        <div className="h-48 overflow-hidden">
          <img src={article.image} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-block px-2.5 py-1 rounded-full text-white text-xs font-semibold" style={{ backgroundColor: article.sourceColor }}>
            {article.source}
          </span>
          <span className="text-gray-400 text-xs">5 min read</span>
        </div>
        <h2 className="text-xl font-bold text-[#2D3648] leading-snug mb-3">{article.title}</h2>
        {article.description && (
          <p className="text-[#6B7280] text-sm leading-relaxed mb-5">{article.description}</p>
        )}
        <a href={article.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-[#E8614D] hover:bg-[#C44A38] text-white font-semibold px-5 py-2.5 rounded-full text-sm transition-colors">
          Read Article →
        </a>
        <button className="ml-3 text-gray-300 hover:text-[#E8614D] transition-colors text-lg" title="Save (coming soon)">🤍</button>
      </div>
    </div>
  )
}

// ── Compact article card ───────────────────────────────────────────────────────

function CompactCard({ article }) {
  return (
    <a href={article.url} target="_blank" rel="noopener noreferrer" className="bg-white rounded-2xl p-4 flex gap-3 items-start hover:shadow-md transition-shadow border border-[#E5E2DD] group">
      <div className="w-1 rounded-full self-stretch flex-shrink-0 mt-0.5" style={{ backgroundColor: article.sourceColor }} />
      <div className="flex-1 min-w-0">
        <p className="text-[#2D3648] text-sm font-semibold leading-snug group-hover:text-[#E8614D] transition-colors line-clamp-2">{article.title}</p>
        <p className="text-[#9CA3AF] text-xs mt-1">{article.source} · 5 min read</p>
      </div>
      <span className="text-gray-300 group-hover:text-[#E8614D] transition-colors flex-shrink-0 text-sm">→</span>
    </a>
  )
}

// ── Assessment module card ─────────────────────────────────────────────────────

function ModuleCard({ module, completed, scores, onClick }) {
  const score = scores?.[module.id]
  return (
    <button onClick={onClick} className="w-full bg-white rounded-2xl p-5 shadow-sm border border-[#E5E2DD] flex items-center gap-4 hover:shadow-md transition-shadow text-left">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0 ${module.bgColor}`}>
        {module.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[#2D3648] font-semibold text-sm">{module.title}</p>
        <p className="text-[#9CA3AF] text-xs mt-0.5 line-clamp-2">{module.description}</p>
      </div>
      <div className="flex-shrink-0">
        {completed && score !== undefined ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FDF6EF] text-[#E8614D] text-xs font-bold">{score}%</span>
        ) : completed ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FDF6EF] text-[#E8614D] text-xs font-bold">✓</span>
        ) : (
          <span className="text-gray-300 text-lg">🔒</span>
        )}
      </div>
    </button>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function LearnPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('discover')

  // Discover state
  const [articles, setArticles] = useState([])
  const [loadingArticles, setLoadingArticles] = useState(true)
  const [articlesError, setArticlesError] = useState(null)
  const [selectedTopic, setSelectedTopic] = useState('all')
  const [selectedBook, setSelectedBook] = useState(null)
  const [selectedPodcast, setSelectedPodcast] = useState(null)
  const [showMoreArticles, setShowMoreArticles] = useState(false)

  // Assessments state
  const [user, setUser] = useState(null)
  const [assessment, setAssessment] = useState(null)
  const [attachmentResult, setAttachmentResult] = useState(null)
  const [conflictResult, setConflictResult] = useState(null)
  const [loadingUser, setLoadingUser] = useState(true)

  // ── Fetch articles ──────────────────────────────────────────────────────────

  const fetchArticles = async () => {
    setLoadingArticles(true)
    setArticlesError(null)
    try {
      const res = await fetch('/api/learn/feed')
      if (!res.ok) throw new Error('Feed unavailable')
      const data = await res.json()
      setArticles(data.articles || [])
    } catch (err) {
      console.error('Articles error:', err)
      setArticlesError('Couldn\'t load articles today. Check back soon.')
    } finally {
      setLoadingArticles(false)
    }
  }

  // ── Fetch user + assessment ────────────────────────────────────────────────

  const fetchUserData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.push('/login'); return }
      setUser(authUser)

      const { data: existing } = await supabase
        .from('relationship_assessments')
        .select('completed_at, scores, results')
        .eq('user_id', authUser.id)
        .not('completed_at', 'is', null)
        .maybeSingle()

      setAssessment(existing || null)

      // Fetch attachment style assessment (table may not exist yet — fail silently)
      try {
        const { data: attData } = await supabase
          .from('attachment_assessments')
          .select('primary_style, secondary_style, counts, completed_at')
          .eq('user_id', authUser.id)
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (attData?.primary_style) {
          const profiles = {
            secure: { emoji: '💚', label: 'Securely Attached', color: '#3D9970' },
            anxious: { emoji: '💛', label: 'Anxiously Attached', color: '#E8A020' },
            avoidant: { emoji: '💙', label: 'Dismissive-Avoidant', color: '#2196F3' },
            fearful: { emoji: '🤍', label: 'Fearful-Avoidant', color: '#9C27B0' },
          }
          setAttachmentResult({
            primary_style: attData.primary_style,
            profile: profiles[attData.primary_style] || null,
            completed_at: attData.completed_at,
          })
        } else {
          setAttachmentResult(null)
        }
      } catch {
        setAttachmentResult(null)
      }

      // Fetch conflict style assessment (table may not exist yet — fail silently)
      try {
        const { data: conflictData } = await supabase
          .from('conflict_assessments')
          .select('primary_style, completed_at')
          .eq('user_id', authUser.id)
          .maybeSingle()
        if (conflictData?.primary_style) {
          const conflictProfiles = {
            validator: { emoji: '🤝', label: 'The Validator', color: '#3D9970' },
            volatile: { emoji: '🔥', label: 'The Passionate Fighter', color: '#E8614D' },
            avoider: { emoji: '🕊️', label: 'The Peacekeeper', color: '#6B5CE7' },
            hostile: { emoji: '⚡', label: 'The Reactive Fighter', color: '#E8A020' },
          }
          setConflictResult({
            primary_style: conflictData.primary_style,
            profile: conflictProfiles[conflictData.primary_style] || null,
            completed_at: conflictData.completed_at,
          })
        } else {
          setConflictResult(null)
        }
      } catch {
        setConflictResult(null)
      }
    } catch (err) {
      console.error('User data error:', err)
    } finally {
      setLoadingUser(false)
    }
  }

  useEffect(() => {
    fetchArticles()
    fetchUserData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Filtered articles ──────────────────────────────────────────────────────

  const filteredArticles = useMemo(() => {
    if (selectedTopic === 'all') return articles
    return articles.filter(a => a.tags?.includes(selectedTopic))
  }, [articles, selectedTopic])

  const featuredArticle = filteredArticles[0] || null
  const restArticles = filteredArticles.slice(1)

  const filteredBooks = useMemo(() => {
    if (selectedTopic === 'all') return RECOMMENDED_BOOKS
    return RECOMMENDED_BOOKS.filter(b => b.topics?.includes(selectedTopic))
  }, [selectedTopic])

  const filteredPodcasts = useMemo(() => {
    if (selectedTopic === 'all') return FEATURED_PODCASTS
    return FEATURED_PODCASTS.filter(p => p.tags?.includes(selectedTopic))
  }, [selectedTopic])

  // ── Module score lookup ────────────────────────────────────────────────────

  const moduleScores = assessment?.results?.modules
    ? Object.fromEntries(
        assessment.results.modules.map(m => [m.moduleId, m.percentage])
      )
    : {}

  const completedAt = assessment?.completed_at
    ? new Date(assessment.completed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div className="min-h-screen bg-[#F8F6F3] pb-28">
      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-[#E5E2DD] px-4 pt-10 pb-0">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-[#2D3648]">Learn</h1>
          <p className="text-[#6B7280] text-sm mt-0.5 mb-4">Reading and tools for your relationship</p>

          {/* Tab pills */}
          <div className="flex gap-2">
            {[{ id: 'discover', label: '📰 Discover' }, { id: 'assessments', label: '🧠 Assessments' }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 rounded-t-xl text-sm font-semibold border-b-2 transition-colors ${activeTab === tab.id ? 'border-[#E8614D] text-[#E8614D]' : 'border-transparent text-[#6B7280] hover:text-[#2D3648]'}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* ── DISCOVER TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'discover' && (
          <div className="flex flex-col gap-6">

            {/* Today's Read */}
            <div>
              <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">Today's Read</p>
              {loadingArticles && <SkeletonFeatured />}
              {!loadingArticles && articlesError && (
                <div className="bg-white rounded-2xl p-8 text-center border border-[#E5E2DD]">
                  <p className="text-4xl mb-3">📡</p>
                  <p className="text-[#6B7280] text-sm mb-4">{articlesError}</p>
                  <button onClick={fetchArticles} className="px-4 py-2 bg-[#E8614D] text-white text-sm font-semibold rounded-full hover:bg-[#C44A38] transition-colors">Try Again</button>
                </div>
              )}
              {!loadingArticles && !articlesError && featuredArticle && (
                <FeaturedCard article={featuredArticle} />
              )}
              {!loadingArticles && !articlesError && filteredArticles.length === 0 && (
                <p className="text-[#9CA3AF] text-sm text-center py-4">No articles on this topic yet.</p>
              )}
            </div>

            {/* Topic chips */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
              {TOPICS.map(topic => (
                <button
                  key={topic.id}
                  onClick={() => { setSelectedTopic(topic.id); setShowMoreArticles(false) }}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${selectedTopic === topic.id ? 'bg-[#E8614D] text-white' : 'bg-white border border-[#E5E2DD] text-[#6B7280] hover:border-[#E8614D] hover:text-[#E8614D]'}`}
                >
                  {topic.emoji} {topic.label}
                </button>
              ))}
            </div>

            {/* Articles */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">📰 Articles</p>
                {restArticles.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-[#F3F4F6] text-[#9CA3AF] text-[10px] font-bold">{restArticles.length}</span>
                )}
              </div>
              {loadingArticles && (
                <div className="flex flex-col gap-3">
                  <SkeletonCompact />
                  <SkeletonCompact />
                  <SkeletonCompact />
                </div>
              )}
              {!loadingArticles && restArticles.length === 0 && (
                <p className="text-[#9CA3AF] text-sm">No articles on this topic yet.</p>
              )}
              {!loadingArticles && restArticles.length > 0 && (
                <div className="flex flex-col gap-3">
                  {(showMoreArticles ? restArticles : restArticles.slice(0, 4)).map(article => (
                    <CompactCard key={article.id} article={article} />
                  ))}
                  {restArticles.length > 4 && (
                    <button
                      onClick={() => setShowMoreArticles(!showMoreArticles)}
                      className="w-full py-3 text-sm font-semibold text-[#E8614D] hover:text-[#C44A38] transition-colors"
                    >
                      {showMoreArticles ? 'Show less ↑' : `Show ${restArticles.length - 4} more →`}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Books */}
            {filteredBooks.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">📚 Books</p>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
                  {filteredBooks.map(book => (
                    <button key={book.id} onClick={() => setSelectedBook(book)} className="flex-shrink-0 w-[140px] bg-white rounded-2xl p-4 shadow-sm border border-[#E5E2DD] text-left hover:shadow-md transition-shadow">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl mb-3" style={{ backgroundColor: book.color + '20' }}>
                        {book.emoji}
                      </div>
                      <p className="text-[#2D3648] font-semibold text-xs leading-snug line-clamp-2 mb-1">{book.title}</p>
                      <p className="text-[#9CA3AF] text-[10px]">{book.author.split('&')[0].trim()}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Podcasts */}
            {filteredPodcasts.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">🎧 Podcasts</p>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
                  {filteredPodcasts.map(podcast => (
                    <button key={podcast.id} onClick={() => setSelectedPodcast(podcast)} className="flex-shrink-0 w-[160px] bg-white rounded-2xl p-4 shadow-sm border border-[#E5E2DD] text-left hover:shadow-md transition-shadow" style={{ borderTop: `3px solid ${podcast.accentColor}` }}>
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-3xl mb-3" style={{ backgroundColor: podcast.accentColor + '18' }}>
                        {podcast.emoji}
                      </div>
                      <p className="text-[#2D3648] font-bold text-xs leading-snug line-clamp-2 mb-1">{podcast.title}</p>
                      <p className="text-[#9CA3AF] text-[10px]">{podcast.host}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* Book preview modal */}
        {selectedBook && <BookPreviewModal book={selectedBook} onClose={() => setSelectedBook(null)} />}
        {/* Podcast detail modal */}
        {selectedPodcast && <PodcastDetailModal podcast={selectedPodcast} onClose={() => setSelectedPodcast(null)} />}

        {/* ── ASSESSMENTS TAB ──────────────────────────────────────────────── */}
        {activeTab === 'assessments' && (
          <div className="flex flex-col gap-4">

            {/* CTA or completion state */}
            {loadingUser ? (
              <div className="bg-white rounded-2xl p-8 text-center animate-pulse">
                <div className="h-6 w-48 bg-gray-200 rounded-full mx-auto mb-3" />
                <div className="h-4 w-64 bg-gray-100 rounded-full mx-auto" />
              </div>
            ) : assessment ? (
              <div className="bg-white rounded-2xl p-6 border border-[#E5E2DD] shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">✅</span>
                      <p className="text-[#2D3648] font-bold">Relationship Profile Complete</p>
                    </div>
                    <p className="text-[#9CA3AF] text-xs">Completed {completedAt}</p>
                  </div>
                  <button onClick={() => router.push('/assessment')} className="text-[#9CA3AF] hover:text-[#6B7280] text-xs font-medium transition-colors">
                    Retake →
                  </button>
                </div>
                {assessment.results?.overallPercentage !== undefined && (
                  <div className="mt-4 bg-[#FDF6EF] rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-[#6B7280]">Overall relationship health</p>
                        <p className="text-sm font-bold text-[#E8614D]">{assessment.results.overallPercentage}%</p>
                      </div>
                      <div className="h-2 bg-white rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#E8614D] to-[#C44A38] rounded-full transition-all" style={{ width: `${assessment.results.overallPercentage}%` }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gradient-to-br from-[#E8614D] to-[#C44A38] rounded-3xl p-6 text-white shadow-lg">
                <p className="text-3xl mb-3">💝</p>
                <h2 className="text-xl font-bold mb-1">Start Your Relationship Profile</h2>
                <p className="text-white/80 text-sm mb-5">5 modules, ~15 minutes. Unlock personalized coaching insights.</p>
                <div className="flex flex-col gap-2 mb-5">
                  {['Love language insights', 'Communication style profile', 'Attachment patterns', 'Personalized AI coach advice'].map(item => (
                    <div key={item} className="flex items-center gap-2 text-sm text-white/90">
                      <span className="text-white font-bold">✓</span>
                      {item}
                    </div>
                  ))}
                </div>
                <button onClick={() => router.push('/assessment')} className="w-full py-3 bg-white text-[#E8614D] font-bold rounded-xl text-sm hover:bg-white/90 transition-colors">
                  Begin Assessment →
                </button>
              </div>
            )}

            {/* Module cards — main assessment only (no standalone modules) */}
            <div>
              <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">Assessment Modules</p>
              <div className="flex flex-col gap-3">
                {ASSESSMENT_MODULES.filter(m => !m.standalone).map(module => (
                  <ModuleCard key={module.id} module={module} completed={!!assessment} scores={moduleScores} onClick={() => router.push(assessment ? '/assessment/results' : '/assessment')} />
                ))}
              </div>
            </div>

            {/* Deep Dive Assessments */}
            <div>
              <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">Deep Dive Assessments</p>
              <div className="flex flex-col gap-3">
                <button onClick={() => router.push('/learn/assessment/attachment')} className="w-full bg-white rounded-2xl p-5 shadow-sm border border-[#E5E2DD] hover:shadow-md transition-shadow text-left">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center text-2xl flex-shrink-0">🔗</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#2D3648] font-semibold text-sm">Attachment Style</p>
                      {attachmentResult ? (
                        <p className="text-violet-600 text-xs mt-0.5 font-medium">{attachmentResult.profile?.emoji} {attachmentResult.profile?.label} · Tap to retake</p>
                      ) : (
                        <p className="text-[#9CA3AF] text-xs mt-0.5 line-clamp-2">Discover your attachment pattern — the invisible blueprint shaping how you love.</p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {attachmentResult ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-50 text-violet-600 text-xs font-bold">✓</span>
                      ) : (
                        <span className="text-gray-400 text-sm">→</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-[#9CA3AF] text-xs pl-16">
                    <span>20 questions</span>
                    <span>·</span>
                    <span>~8 minutes</span>
                    <span>·</span>
                    <span className="text-violet-500 font-medium">Free</span>
                  </div>
                </button>
                <button onClick={() => router.push('/learn/assessment/conflict')} className="w-full bg-white rounded-2xl p-5 shadow-sm border border-[#E5E2DD] hover:shadow-md transition-shadow text-left">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-2xl flex-shrink-0">⚡</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#2D3648] font-semibold text-sm">Conflict Style</p>
                      {conflictResult ? (
                        <p className="text-[#E8614D] text-xs mt-0.5 font-medium">{conflictResult.profile?.emoji} {conflictResult.profile?.label} · Tap to retake</p>
                      ) : (
                        <p className="text-[#9CA3AF] text-xs mt-0.5 line-clamp-2">Understand how you handle disagreement — and why it matters.</p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {conflictResult ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-[#E8614D] text-xs font-bold">✓</span>
                      ) : (
                        <span className="text-gray-400 text-sm">→</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-[#9CA3AF] text-xs pl-16">
                    <span>18 questions</span>
                    <span>·</span>
                    <span>~7 minutes</span>
                    <span>·</span>
                    <span className="text-[#E8614D] font-medium">Free</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Coming Soon */}
            <div className="bg-gradient-to-br from-[#2D3648] to-[#1a1f2e] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">✨</span>
                <p className="text-white font-bold text-sm">More Assessments Coming Soon</p>
              </div>
              <p className="text-purple-300 text-xs leading-relaxed">
                Love Languages Deep Dive · Intimacy Profile
              </p>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}
