import { useState, useEffect, useRef } from 'react'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Badge } from '@ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/tabs'
import { ScrollArea } from '@ui/scroll-area'
import { Textarea } from '@ui/textarea'
import { useToast } from '@shared/hooks/use-toast'
import { SEO } from '@shared/components'
import {
  Search,
  TrendingUp,
  MessageCircle,
  Brain,
  Flame,
  CheckCircle,
  Globe,
  ExternalLink,
  Loader2,
  FileText,
  Sparkles,
  Send,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Volume2,
  BookmarkIcon,
  ChevronRight,
  Settings,
} from 'lucide-react'
import {
  synthesizeNews,
  askQuestion,
  SynthesisRequest,
  NewsData,
} from '@/services/openaiService'
import { MorganFreemanPlayer } from '@/components/MorganFreemanPlayer'
import { useAuth, AuthModal } from '@/features/auth'
import { useSubscription } from '@/features/subscription'
import { saveArticle, checkIfArticleSaved } from '@/features/articles'
import { saveSearchToHistory } from '@/features/search'
import { DebateSection } from '@/features/debates'
import { useLocation, useNavigate } from 'react-router-dom'
import LandingPage from '@/components/LandingPage'
import { OnboardingSurveyModal } from '@/components/OnboardingSurveyModal'
import UnifiedNavigation from '@/components/UnifiedNavigation'
import { QueuedRecommendations } from '@/components/QueuedRecommendations'
import { TOPIC_CATEGORIES } from '@/data/topicCategories'
import { articleTracker, trackArticleSave } from '@/services/articleInteractionService'
import { SearchFiltersModal } from '@/components/SearchFiltersModal'
import { SearchFilters, DEFAULT_FILTERS } from '@/types/searchFilters.types'
import {
  getEffectiveSearchFilters,
  saveUserSearchPreferences,
  saveLocalSearchPreferences,
  getUserSearchPreferences
} from '@/services/searchPreferencesService'
import { ThoughtProvokingQuestions } from '@/features/articles/components/ThoughtProvokingQuestions'
import { supabase } from '@/integrations/supabase/client'

const Index = () => {
  const [newsData, setNewsData] = useState<NewsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [topic, setTopic] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [loadingStage, setLoadingStage] = useState<'searching' | 'analyzing' | 'generating' | ''>(
    ''
  )
  const [synthesisAborted, setSynthesisAborted] = useState(false)

  // Search filters state
  const [searchFilters, setSearchFilters] = useState<SearchFilters>(DEFAULT_FILTERS)
  const [filtersModalOpen, setFiltersModalOpen] = useState(false)
  const [hasSavedPreferences, setHasSavedPreferences] = useState(false)
  
  // Landing page style animations
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 })
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([])

  // Chat state
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: 'user' | 'assistant'; content: string }>
  >([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState('')

  // Chat management states
  const [chatExpanded, setChatExpanded] = useState(false)

  // Add state for tracking selected reading level
  const [selectedReadingLevel, setSelectedReadingLevel] = useState<'base' | 'eli5' | 'phd'>('base')

  // Add new states for section visibility
  const [keyPointsVisible, setKeyPointsVisible] = useState(true)
  const [articleVisible, setArticleVisible] = useState(true)
  const [morganFreemanVisible, setMorganFreemanVisible] = useState(true)
  const [debateVisible, setDebateVisible] = useState(true)
  const [allSectionsCollapsed, setAllSectionsCollapsed] = useState(false)

  // Article expansion state
  const [expandedParts, setExpandedParts] = useState<{
    [key in 'base' | 'eli5' | 'phd']?: Array<{ title: string; content: string }>
  }>({})
  const [expanding, setExpanding] = useState<{
    [key in 'base' | 'eli5' | 'phd']?: boolean
  }>({})
  const [expansionError, setExpansionError] = useState<{
    [key in 'base' | 'eli5' | 'phd']?: string
  }>({})


  // Auth modal state
  const [authModalOpen, setAuthModalOpen] = useState(false)

  // Save functionality state
  const [articleSaved, setArticleSaved] = useState(false)
  const [savingArticle, setSavingArticle] = useState(false)
  
  // Onboarding state
  const [showOnboardingSurvey, setShowOnboardingSurvey] = useState(false)

  // AbortController for cancelling requests
  const abortControllerRef = useRef<AbortController | null>(null)

  // Add this ref to track which request is current
  const currentRequestIdRef = useRef<string | null>(null)

  const { toast } = useToast()
  const { user, loading: authLoading } = useAuth()
  const { isProUser, canUseFeature, incrementSearchCount } =
    useSubscription()
  const location = useLocation()
  const navigate = useNavigate()
  
  // Initialize floating particles
  useEffect(() => {
    const initialParticles = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 20,
    }))
    setParticles(initialParticles)
  }, [])
  
  // Mouse movement and parallax effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e
      setMousePosition({ x: clientX, y: clientY })
      
      // Calculate parallax offset for subtle blob movement
      const moveX = (clientX - window.innerWidth / 2) * 0.015
      const moveY = (clientY - window.innerHeight / 2) * 0.015
      setParallaxOffset({ x: moveX, y: moveY })
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])
  
  // Intersection Observer for scroll animations
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    }
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate-in")
        }
      })
    }, observerOptions)
    
    // Wait for DOM to be ready
    setTimeout(() => {
      const animatedElements = document.querySelectorAll(".animate-on-scroll")
      animatedElements.forEach((el) => observer.observe(el))
    }, 100)
    
    return () => observer.disconnect()
  }, [])


  // Check if article is saved when newsData changes
  useEffect(() => {
    if (newsData && user) {
      checkSavedStatus()
    }
  }, [newsData, user])

  // Track article viewing when newsData changes
  useEffect(() => {
    if (newsData) {
      // Start tracking this article view
      articleTracker.startTracking(newsData.topic, selectedReadingLevel)

      // Cleanup function to stop tracking when article changes or unmounts
      return () => {
        articleTracker.stopTracking()
      }
    }
  }, [newsData?.topic]) // Only re-run if topic changes, not reading level
  
  // Remove automatic survey popup - survey should only show when explicitly triggered
  useEffect(() => {
    // Keep survey hidden by default
    setShowOnboardingSurvey(false)
  }, [user])

  // Load user's search filter preferences
  useEffect(() => {
    const loadPreferences = async () => {
      const effectiveFilters = await getEffectiveSearchFilters(user?.id)
      setSearchFilters(effectiveFilters)

      // Check if user has saved preferences
      if (user) {
        const prefs = await getUserSearchPreferences(user.id)
        setHasSavedPreferences(prefs !== null && prefs.applyByDefault)
      }
    }

    loadPreferences()
  }, [user])

  // Prevent survey from reappearing when tab regains focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Do nothing on visibility change to prevent survey re-triggers
      // The survey state is already managed by the user authentication flow
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const checkSavedStatus = async () => {
    if (!user || !newsData) return

    const isSaved = await checkIfArticleSaved(user.id, newsData.topic)
    setArticleSaved(isSaved)
  }

  const handleSaveArticle = async () => {
    if (!newsData) return;

    // For now, just show a message that saving requires sign up
    // but don't block the functionality
    if (!user) {
      toast({
        title: 'Sign up to save articles',
        description: 'Create an account to save articles to your personal library.',
        duration: 5000,
      });
      return;
    }

    setSavingArticle(true);

    const result = await saveArticle(user.id, newsData);

    if (result.success) {
      setArticleSaved(true);
      // Track article save interaction
      await trackArticleSave(newsData.topic);
      toast({
        title: 'Article Saved',
        description: 'Article saved to your library successfully!',
        duration: 3000,
      });
    } else if (result.alreadySaved) {
      toast({
        title: 'Already Saved',
        description: 'This article is already in your saved library.',
        variant: 'default',
      });
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to save article. Please try again.',
        variant: 'destructive',
      });
    }

    setSavingArticle(false);
  };

  // Handle applying filters for one search only
  const handleApplyFiltersOnce = (filters: SearchFilters) => {
    setSearchFilters(filters)
    toast({
      title: 'Filters Applied',
      description: 'These filters will be used for your next search only.',
      duration: 3000,
    })
  }

  // Handle saving filters as default
  const handleSaveFiltersAsDefault = async (filters: SearchFilters) => {
    setSearchFilters(filters)

    if (user) {
      // Save to database for authenticated users
      const result = await saveUserSearchPreferences(user.id, filters, true)
      if (result.success) {
        setHasSavedPreferences(true)
        toast({
          title: 'Preferences Saved',
          description: 'Your search filter preferences have been saved and will be used for all future searches.',
          duration: 4000,
        })
      } else {
        toast({
          title: 'Error',
          description: 'Failed to save preferences. Please try again.',
          variant: 'destructive',
        })
      }
    } else {
      // Save to localStorage for anonymous users
      saveLocalSearchPreferences(filters)
      setHasSavedPreferences(true)
      toast({
        title: 'Preferences Saved Locally',
        description: 'Your filters will be remembered on this device. Sign up to sync across devices!',
        duration: 4000,
      })
    }
  }


  // Loading stages with just labels and icons
  const loadingStages = [
    {
      id: 'searching',
      label: 'Searching for articles...',
      icon: Search,
    },
    {
      id: 'analyzing',
      label: 'Analyzing sources...',
      icon: FileText,
    },
    {
      id: 'generating',
      label: 'Generating synthesis...',
      icon: Sparkles,
    },
  ]

  // Chat personalization function
  const getChatPersonalization = () => {
    if (!newsData) return { title: 'Ask Me Anything', subtitle: 'Ready to dig deeper?' }

    const shortTopic =
      newsData.topic.length > 40 ? newsData.topic.substring(0, 40) + '...' : newsData.topic

    const subtitles = [
      `Let's unpack ${newsData.topic} - what's really going on here?`,
      `Got questions about ${newsData.topic}? Let's get personal.`,
      `Time to dig deeper into ${newsData.topic}. What's on your mind?`,
      `${newsData.topic} - let's talk about what this means for YOU.`,
    ]

    const subtitleIndex = newsData.topic.length % subtitles.length

    return {
      title: `Let's Talk: ${shortTopic}`,
      subtitle: subtitles[subtitleIndex],
    }
  }

  // Updated handleQuestionClick function
  const handleQuestionClick = async (question: string) => {
    console.log('Question clicked:', question)

    // 1. Expand chat if collapsed
    setChatExpanded(true)

    // 2. Clear previous messages and set the question
    setChatMessages([{ role: 'user', content: question }])
    setChatLoading(true)
    setChatError('')

    // 3. Scroll to chat section smoothly with delay to ensure expansion
    setTimeout(() => {
      const chatSection = document.getElementById('news-chat-section')
      if (chatSection) {
        chatSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)

    try {
      // 4. Send to AI
      const response = await askQuestion({
        question,
        topic: newsData?.topic || '',
        context: {
          headline: newsData?.headline || '',
          summaryPoints: newsData?.summaryPoints || [],
          sources:
            newsData?.sources.map((s) => ({
              outlet: s.outlet,
              headline: s.headline,
              url: s.url,
            })) || [],
        },
      })

      // 5. Add AI response
      setChatMessages((prev) => [...prev, { role: 'assistant', content: response }])
    } catch (error) {
      console.error('Chat error:', error)
      setChatError('Failed to get response. Please try again.')
    } finally {
      setChatLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return

    const userMessage = chatInput.trim()
    setChatInput('')
    setChatMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setChatLoading(true)
    setChatError('')

    try {
      const response = await askQuestion({
        question: userMessage,
        topic: newsData?.topic || '',
        context: {
          headline: newsData?.headline || '',
          summaryPoints: newsData?.summaryPoints || [],
          sources:
            newsData?.sources.map((s) => ({
              outlet: s.outlet,
              headline: s.headline,
              url: s.url,
            })) || [],
          previousMessages: chatMessages,
        },
      })

      setChatMessages((prev) => [...prev, { role: 'assistant', content: response }])
    } catch (error) {
      console.error('Chat error:', error)
      setChatError('Failed to get response. Please try again.')
    } finally {
      setChatLoading(false)
    }
  }

  const handleClearChat = () => {
    setChatMessages([])
    setChatInput('')
    setChatError('')
    setChatExpanded(false)
  }

  const handleExpandArticle = async (readingLevel: 'base' | 'eli5' | 'phd') => {
    if (!newsData) return

    setExpanding({ ...expanding, [readingLevel]: true })
    setExpansionError({ ...expansionError, [readingLevel]: undefined })

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        throw new Error('Authentication required')
      }

      const currentContent = newsData.article[readingLevel]
      const existingParts = expandedParts[readingLevel] || []
      const allPreviousContent = [
        currentContent,
        ...existingParts.map(part => part.content)
      ]

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/expand-article`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            topic: newsData.topic,
            headline: newsData.headline,
            originalContent: currentContent,
            allPreviousContent,
            readingLevel,
            sources: newsData.sources.map(s => ({
              id: s.id,
              outlet: s.outlet,
              headline: s.headline,
              url: s.url
            })),
            partNumber: allPreviousContent.length + 1
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to expand article')
      }

      const data = await response.json()

      setExpandedParts({
        ...expandedParts,
        [readingLevel]: [
          ...existingParts,
          { title: data.partTitle, content: data.expandedContent }
        ]
      })

      toast({
        title: 'Article Expanded',
        description: `Part ${allPreviousContent.length + 1}: ${data.partTitle}`,
        duration: 3000
      })
    } catch (error) {
      console.error('Expansion error:', error)
      setExpansionError({
        ...expansionError,
        [readingLevel]: error instanceof Error ? error.message : 'Failed to expand article'
      })
      toast({
        title: 'Expansion Failed',
        description: 'Could not expand the article. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setExpanding({ ...expanding, [readingLevel]: false })
    }
  }

  // Simpler loading stage management
  useEffect(() => {
    if (!loading) {
      setLoadingStage('')
      return
    }

    // Set initial stage
    setLoadingStage('searching')

    // Progress through stages automatically
    const stage1 = setTimeout(() => setLoadingStage('analyzing'), 5000)
    const stage2 = setTimeout(() => setLoadingStage('generating'), 10000)

    return () => {
      clearTimeout(stage1)
      clearTimeout(stage2)
    }
  }, [loading])


  const handleCancelSynthesis = () => {
    // Invalidate the current request
    currentRequestIdRef.current = null

    // Abort the current request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    setSynthesisAborted(true)
    setLoading(false)
    setLoadingStage('')
    toast({
      title: 'Search Cancelled',
      description: 'News synthesis was cancelled. Try another topic!',
    })
  }

  const handleSynthesize = async (searchTopic?: string) => {
    const currentTopic = searchTopic || topic.trim()
    if (!currentTopic) {
      toast({
        title: 'Error',
        description: 'Please enter a topic to search for current news.',
        variant: 'destructive',
      })
      return
    }

    // Check search limits - removed for now, everyone gets unlimited
    // if (!isProUser && !canUseFeature('unlimited_searches')) {
    //   toast({
    //     title: 'Search Limit Reached',
    //     description: `You've used all ${searchLimit} free searches today. Upgrade to Pro for unlimited searches!`,
    //     variant: 'destructive',
    //   })
    //   return
    // }

    // Set the topic in the input field when using example topics
    if (searchTopic) {
      setTopic(searchTopic)
    }

    // Abort any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController()

    setLoading(true)
    setLoadingStage('searching')
    setSynthesisAborted(false) // Reset abort flag

    // Generate a unique ID for this request
    const requestId = `req_${Date.now()}_${Math.random()}`
    currentRequestIdRef.current = requestId
    console.log('Starting request:', requestId)

    try {
      // Check if user cancelled before making the API call
      if (synthesisAborted) {
        return
      }

      const request: SynthesisRequest = {
        topic: currentTopic,
        targetOutlets: [
          { name: 'Reuters', type: 'News Agency' },
          { name: 'Bloomberg', type: 'Online Media' },
          { name: 'CNN', type: 'Broadcast Media' },
          { name: 'The Guardian', type: 'National Newspaper' },
        ],
        freshnessHorizonHours: searchFilters.freshnessHorizonHours,
        targetWordCount: searchFilters.targetWordCount,
        includePhdAnalysis: searchFilters.includePhdAnalysis,
      }

      const result = await synthesizeNews(request, abortControllerRef.current.signal)

      // Check if this request is still valid
      if (currentRequestIdRef.current === requestId) {
        console.log('Request completed and is still valid:', requestId)
        setNewsData(result)
        setShowResults(true)
      } else {
        console.log('Request completed but was cancelled, ignoring results:', requestId)
        return // Exit early, don't process cancelled results
      }

      // Increment search count for free users
      if (user && !isProUser) {
        try {
          await incrementSearchCount()
          console.log('Search count incremented successfully')
        } catch (error) {
          console.error('Failed to increment search count:', error)
        }
      }

      // Auto-save to search history if user is logged in
      if (user) {
        // Don't await - do this async so it doesn't block UI
        saveSearchToHistory(user.id, currentTopic, result)
          .then(() => console.log('Search saved to history'))
          .catch((err: Error) => console.error('Failed to save search:', err))
      }

      toast({
        title: '✓ Analysis Complete',
        description: `Found and synthesized ${result.sources.length} current news articles`,
        duration: 5000,
        className: 'bg-green-50 border-green-200',
      })
    } catch (error) {
      console.error('Synthesis failed:', error)

      // Don't show error toast for user-initiated cancellations
      if (
        error instanceof Error &&
        (error.name === 'AbortError' || error.message === 'Request cancelled')
      ) {
        return // Request was cancelled by user
      }

      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to find current news articles',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      setLoadingStage('')
      abortControllerRef.current = null
    }
  }

  const handleBackToHome = () => {
    setShowResults(false)
    setNewsData(null)
    setTopic('')
    setChatMessages([])
    setChatError('')
    setArticleSaved(false)
  }

  // Check for search topic or pre-loaded article data from navigation state (from search history)
  // This useEffect is placed after handleSynthesize is defined to avoid reference errors
  useEffect(() => {
    // Check if we have pre-loaded article data (from viewing search history)
    if (location.state?.newsData) {
      setNewsData(location.state.newsData)
      setTopic(location.state.topic || '')
      setShowResults(true)
      // Clear the location state to prevent re-triggering
      navigate(location.pathname, { replace: true, state: {} })
      return
    }

    // Only auto-trigger search if user is authenticated and explicitly navigated with a topic
    if (location.state?.searchTopic && user) {
      setTopic(location.state.searchTopic)
      // Auto-trigger search only for authenticated users
      handleSynthesize(location.state.searchTopic)

      // Clear the location state to prevent re-triggering
      navigate(location.pathname, { replace: true, state: {} })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, user, navigate, location.pathname]) // handleSynthesize excluded from deps


  // Premium loading overlay component
  const LoadingOverlay = () => {
    if (!loading) return null

    const currentStage = loadingStages.find((s) => s.id === loadingStage) || loadingStages[0]
    const IconComponent = currentStage.icon

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 relative animate-in fade-in slide-in-from-bottom duration-500">
          {/* Add Cancel Button */}
          <Button
            onClick={handleCancelSynthesis}
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 hover:bg-slate-100 rounded-lg transition-all duration-300"
            aria-label="Cancel search"
          >
            <X className="h-5 w-5 text-slate-400" />
          </Button>

          <div className="text-center">
            {/* Premium pulsing icon */}
            <div className="relative mx-auto w-20 h-20 mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full blur-xl animate-pulse"></div>
              <div className="relative flex items-center justify-center h-full">
                <IconComponent className="h-10 w-10 text-blue-600 animate-pulse" />
              </div>
            </div>

            {/* Stage text */}
            <h3 className="text-xl font-semibold text-slate-900 mb-2">{currentStage.label}</h3>

            {/* Topic */}
            <p className="text-sm text-slate-600 mb-6">
              Analyzing: <span className="font-medium text-slate-900">{topic}</span>
            </p>

            {/* Premium gradient progress bar */}
            <div className="mb-4">
              <div className="bg-slate-200/50 rounded-full h-2 overflow-hidden relative">
                <div className="absolute inset-0 -translate-x-full animate-progress-slide">
                  <div className="h-full w-full bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
                </div>
              </div>
            </div>

            {/* Premium stage indicators */}
            <div className="flex justify-center gap-2 mt-6">
              {loadingStages.map((stage, index) => {
                const StageIcon = stage.icon
                const isComplete = loadingStages.findIndex((s) => s.id === loadingStage) > index
                const isCurrent = stage.id === loadingStage

                return (
                  <div
                    key={stage.id}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-500 ${
                      isComplete
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : isCurrent
                          ? 'bg-blue-500 text-white border border-blue-600 shadow-sm'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <StageIcon className="h-3 w-3" />
                    )}
                    <span className="hidden sm:inline capitalize">{stage.id}</span>
                  </div>
                )
              })}
            </div>

            {/* Premium tip with sparkle */}
            <p className="text-xs text-slate-500 mt-6 flex items-center justify-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-blue-500" />
              Tip: More specific topics yield better results
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (showResults && newsData) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Enhanced Breathing Gradient Background */}
        <div className="fixed inset-0 z-0">
          <div
            className="absolute inset-0 transition-all duration-1000 ease-in-out"
            style={{
              background: `linear-gradient(135deg,
                hsl(212, 42%, 97%) 0%,
                hsl(210, 44%, 95%) 25%,
                hsl(215, 42%, 96%) 50%,
                hsl(213, 43%, 98%) 75%,
                hsl(210, 41%, 98%) 100%)`,
            }}
          />

          {/* Subtle Background Texture */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(59, 130, 246, 0.3) 1px, transparent 0)`,
              backgroundSize: "24px 24px",
              animation: "textureShift 60s linear infinite",
            }}
          />
        </div>
        
        {/* Interactive Mouse Glow */}
        <div
          className="fixed inset-0 pointer-events-none z-1 opacity-0 transition-opacity duration-500 hover:opacity-100"
          style={{
            background: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(59, 130, 246, 0.08), rgba(6, 182, 212, 0.05), transparent 60%)`,
          }}
        />
        
        {/* Floating Light Particles */}
        <div className="fixed inset-0 pointer-events-none z-1">
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="absolute w-1 h-1 bg-blue-300/40 rounded-full"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                animation: `floatUp 25s linear infinite, fadeInOut 25s ease-in-out infinite`,
                animationDelay: `${particle.delay}s`,
              }}
            />
          ))}
        </div>

        <div className="relative container mx-auto p-6 max-w-7xl z-10">
          <UnifiedNavigation />

          <div className="mb-4 mt-8">
            <div className="flex items-center justify-between mb-3">
              <Button onClick={handleBackToHome} variant="ghost" className="glass-card glass-card-hover px-4 py-2">
                ← Back to Search
              </Button>

              {/* Save Article Button */}
              <Button
                onClick={handleSaveArticle}
                disabled={savingArticle}
                variant={articleSaved ? 'default' : 'outline'}
                className={`glass-card glass-card-hover ${articleSaved ? 'bg-green-600/80 hover:bg-green-700/80 text-white' : ''}`}
              >
                {savingArticle ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <BookmarkIcon
                    className={`h-4 w-4 mr-2 ${articleSaved ? 'fill-current' : ''}`}
                  />
                )}
                {articleSaved ? 'Saved ✓' : 'Save Article'}
              </Button>
            </div>
          </div>

          {/* Collapse All Button */}
          <div className="flex justify-end mb-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (allSectionsCollapsed) {
                  // Expand all (except Morgan Freeman)
                  setKeyPointsVisible(true)
                  setArticleVisible(true)
                  setDebateVisible(true)
                  setAllSectionsCollapsed(false)
                } else {
                  // Collapse all (except Morgan Freeman)
                  setKeyPointsVisible(false)
                  setArticleVisible(false)
                  setDebateVisible(false)
                  setAllSectionsCollapsed(true)
                }
              }}
              className="text-xs flex items-center gap-1 glass-card glass-card-hover px-3 py-1.5"
            >
              {allSectionsCollapsed ? (
                <>
                  <Eye className="h-3 w-3" />
                  Expand All Sections
                </>
              ) : (
                <>
                  <EyeOff className="h-3 w-3" />
                  Collapse All Sections
                </>
              )}
            </Button>
          </div>

          <div className="flex gap-6 flex-col lg:flex-row">
            {/* Main Content Column */}
            <div className="flex-1 space-y-4 animate-fade-in">
            {/* Simplified Header Card - Key Points & Questions removed (see comments below to restore) */}
            <div className="glass-card glass-card-hover rounded-2xl shadow-xl animate-fade-in p-6">
              <h2 className="text-2xl font-bold">
                <span className="bg-gradient-to-r from-slate-800 via-sky-700 to-slate-800 bg-clip-text text-transparent">{newsData.headline}</span>
                <div className="text-sm text-slate-600 font-normal mt-2">
                  {(() => {
                    const date = new Date(newsData.generatedAtUTC);
                    const timeStr = date.toLocaleString('en-US', {
                      month: 'numeric',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                      timeZoneName: 'short'
                    });
                    // Replace EDT with EST, PDT with PST, CDT with CST, MDT with MST (use standard time year-round)
                    return timeStr.replace(/EDT/g, 'EST')
                      .replace(/PDT/g, 'PST')
                      .replace(/CDT/g, 'CST')
                      .replace(/MDT/g, 'MST');
                  })()}
                </div>
              </h2>
            </div>

            {/* TEMPORARILY HIDDEN - Key Points & Key Questions sections */}
            {/* To restore: uncomment this entire section and replace the simplified header above */}
            {/*
            <div className="glass-card glass-card-hover rounded-2xl shadow-xl animate-fade-in">
              <div
                className="p-6 cursor-pointer select-none"
                onClick={() => setKeyPointsVisible(!keyPointsVisible)}
              >
                <h2 className="text-2xl font-bold flex items-center justify-between">
                  <div>
                    <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{headlineWithDate}</span>
                    <div className="text-sm text-slate-600 font-normal mt-1">
                      Generated: {new Date(newsData.generatedAtUTC).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-2">
                      <Badge
                        variant={newsData.confidenceLevel === 'High' ? 'default' : 'secondary'}
                        className="glass-card px-3 py-1 bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-green-700 border-green-200/50"
                      >
                        {newsData.confidenceLevel} Confidence
                      </Badge>
                      <Badge
                        variant={newsData.topicHottness === 'High' ? 'destructive' : 'outline'}
                        className="glass-card px-3 py-1 bg-gradient-to-r from-orange-500/10 to-red-500/10 text-orange-700 border-orange-200/50 flex items-center gap-1"
                      >
                        <Flame className="h-3 w-3" />
                        {newsData.topicHottness} Interest
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 ml-2 hover:bg-white/20 rounded-lg transition-all duration-300"
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation()
                        setKeyPointsVisible(!keyPointsVisible)
                      }}
                    >
                      {keyPointsVisible ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </h2>
              </div>

              {keyPointsVisible && (
                <div className="px-6 pb-6 animate-fade-in">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="glass-card rounded-xl p-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2 text-slate-800">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Key Points
                      </h3>
                      <ul className="space-y-2">
                        {newsData.summaryPoints.map((point, i) => (
                          <li key={i} className="text-sm flex items-start gap-2 text-slate-700">
                            <div className="w-1.5 h-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full mt-2 flex-shrink-0"></div>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="glass-card rounded-xl p-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2 text-slate-800">
                        <Brain className="h-4 w-4 text-purple-500" />
                        Key Questions
                      </h3>
                      <ul className="space-y-2">
                        {newsData.keyQuestions.map((question, i) => (
                          <li key={i} className="text-sm flex items-start gap-2 group">
                            <div className="w-1.5 h-1.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mt-2 flex-shrink-0"></div>
                            <button
                              onClick={() => handleQuestionClick(question)}
                              className="text-left hover:text-purple-600 transition-colors duration-200 flex items-start gap-2 group flex-1 cursor-pointer text-slate-700"
                            >
                              <span className="underline decoration-purple-300 decoration-1 underline-offset-2 group-hover:decoration-purple-500 group-hover:decoration-2">
                                {question}
                              </span>
                              <MessageCircle className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 flex-shrink-0 text-purple-500" />
                            </button>
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-slate-500 mt-3 italic">
                        💡 Click any question to explore with AI • Chat opens below ↓
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            */}

            {/* Disagreements Section */}
            {newsData.disagreements && newsData.disagreements.length > 0 && (
              <div className="glass-card glass-card-hover rounded-2xl shadow-xl border-l-4 border-l-orange-500 animate-fade-in">
                <div className="p-6">
                  <h3 className="text-xl font-bold flex items-center gap-2 text-orange-700 mb-4">
                    <TrendingUp className="h-5 w-5" />
                    Source Disagreements ({newsData.disagreements.length})
                  </h3>
                  <div className="space-y-4">
                    {newsData.disagreements.map((disagreement, i) => (
                      <div key={i} className="glass-card rounded-lg p-4 bg-gradient-to-r from-orange-50/50 to-amber-50/50 border border-orange-200/50">
                        <h4 className="font-semibold text-orange-800 mb-2">
                          {disagreement.pointOfContention}
                        </h4>
                        <p className="text-sm text-slate-700 mb-2">
                          <strong>What they disagree on:</strong> {disagreement.details}
                        </p>
                        <p className="text-xs text-slate-600">
                          <strong>Likely reason:</strong> {disagreement.likelyReason}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Reading Level Tabs - Collapsible */}
            <div className="space-y-4">
              <div
                className="flex items-center justify-between cursor-pointer select-none p-4 glass-card glass-card-hover rounded-xl transition-all duration-300"
                onClick={() => setArticleVisible(!articleVisible)}
              >
                <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Read Full Analysis
                </h2>
                <Button variant="ghost" size="sm" className="p-1 hover:bg-white/20 rounded-lg">
                  {articleVisible ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {articleVisible && (
                <Tabs
                  defaultValue="base"
                  value={selectedReadingLevel}
                  onValueChange={(value: string) => {
                    // Don't allow selecting PhD if it wasn't generated
                    if (value === 'phd' && !newsData.article.phd) {
                      toast({
                        title: 'PhD Analysis Not Available',
                        description: "Re-run the search with 'Include PhD-level analysis' checked",
                        variant: 'destructive',
                      })
                      return
                    }
                    const newLevel = value as 'base' | 'eli5' | 'phd'
                    setSelectedReadingLevel(newLevel)
                    // Track reading level change
                    articleTracker.trackReadingLevelChange(newLevel)
                  }}
                  className="w-full animate-fade-in"
                >
                  <TabsList className="grid w-full grid-cols-3 glass-card rounded-lg p-1">
                    <TabsTrigger value="base">📰 Essentials</TabsTrigger>
                    <TabsTrigger value="eli5" className="flex items-center gap-2">
                      <img src="/images/child-eli5.svg" alt="Child" className="h-4 w-4" />
                      ELI5
                    </TabsTrigger>
                    <TabsTrigger
                      value="phd"
                      disabled={!newsData.article.phd}
                      className={
                        !newsData.article.phd
                          ? 'opacity-50 cursor-not-allowed'
                          : ''
                      }
                    >
                      🔬 PhD{' '}
                      {!newsData.article.phd ? '(Not generated)' : ''}
                    </TabsTrigger>
                  </TabsList>
                  {Object.entries(newsData.article).map(
                    ([level, content]) =>
                      content && (
                        <TabsContent key={level} value={level} className="mt-4">
                          <div className="glass-card glass-card-hover rounded-2xl shadow-xl">
                            <div className="p-6 max-w-4xl mx-auto">
                              {/* Add reading level indicator */}
                              <div className="mb-4 text-sm text-slate-600 border-b border-slate-200/50 pb-3">
                                <span className="font-semibold">Reading Level:</span>{' '}
                                {level === 'base'
                                  ? 'Everyone'
                                  : level === 'eli5'
                                    ? 'Ages 5+'
                                    : level === 'phd'
                                      ? 'Academic Analysis'
                                      : 'General Audience'}
                                <span className="ml-4">
                                  <span className="font-semibold">Length:</span> ~
                                  {content.split(' ').length} words
                                </span>
                              </div>

                              {/* Format content with proper paragraphs */}
                              <div className="prose prose-lg max-w-none" data-reading-level={level}>
                                {content.split('\n\n').map((paragraph: string, idx: number) => (
                                  <p key={idx} className="mb-4 leading-relaxed text-slate-700">
                                    {paragraph}
                                  </p>
                                ))}
                              </div>

                              {/* Expanded Parts */}
                              {expandedParts[level as 'base' | 'eli5' | 'phd']?.map((part, partIndex) => (
                                <div key={`part-${partIndex}`} className="mt-8">
                                  <div className="border-t-2 border-gray-200 pt-6 mb-4">
                                    <h3 className="text-xl font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                      <Sparkles className="h-5 w-5 text-purple-500" />
                                      Part {partIndex + 2}: {part.title}
                                    </h3>
                                  </div>
                                  <div className="prose prose-lg max-w-none" data-reading-level={level}>
                                    {part.content.split('\n\n').map((paragraph: string, idx: number) => (
                                      <p key={idx} className="mb-4 leading-relaxed text-slate-700">
                                        {paragraph}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              ))}

                              {/* Write More Please Button */}
                              <div className="mt-6 pt-6 border-t border-slate-200/50 flex flex-col items-center gap-3">
                                {expansionError[level as 'base' | 'eli5' | 'phd'] && (
                                  <p className="text-sm text-red-600">
                                    {expansionError[level as 'base' | 'eli5' | 'phd']}
                                  </p>
                                )}
                                <Button
                                  onClick={() => handleExpandArticle(level as 'base' | 'eli5' | 'phd')}
                                  disabled={expanding[level as 'base' | 'eli5' | 'phd']}
                                  className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                                >
                                  {expanding[level as 'base' | 'eli5' | 'phd'] ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Generating Part {(expandedParts[level as 'base' | 'eli5' | 'phd']?.length || 0) + 2}...
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="mr-2 h-4 w-4" />
                                      Write More Please
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </TabsContent>
                      )
                  )}
                </Tabs>
              )}
            </div>

            {/* AI Debate Section - Now free for all users */}
            <div className="mt-8 animate-fade-in">
              <div className="space-y-2">
                <div
                  className="flex items-center justify-between cursor-pointer select-none p-3 hover:bg-gray-50 rounded-lg transition-colors"
                  onClick={() => setDebateVisible(!debateVisible)}
                >
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    AI Debate Generator
                  </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1"
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation()
                        setDebateVisible(!debateVisible)
                      }}
                    >
                      {debateVisible ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {debateVisible && (
                    <div className="animate-fade-in">
                      <DebateSection
                        newsData={newsData}
                        selectedReadingLevel={selectedReadingLevel}
                        onDebateView={() => {
                          // Track debate view when component mounts
                          articleTracker.trackDebateView()
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

            {/* Interactive Q&A Chat Section - with proper ID */}
            <div className="mt-8 mb-8 animate-fade-in" id="news-chat-section">
              <div
                className={`glass-card glass-card-hover rounded-2xl shadow-xl transition-all duration-300 ${
                  chatExpanded ? '' : 'overflow-hidden'
                }`}
              >
                {!chatExpanded ? (
                  // Collapsed state - single line
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      <MessageCircle className="h-5 w-5 text-purple-500 flex-shrink-0" />
                      <div className="flex-1 relative">
                        <Input
                          placeholder={`Ask about ${newsData?.topic || 'this news'}...`}
                          value={chatInput}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            setChatInput(e.target.value)
                          }}
                          onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                            if (e.key === 'Enter' && !e.shiftKey && chatInput.trim()) {
                              e.preventDefault()
                              setChatExpanded(true)
                              handleSendMessage()
                            }
                          }}
                          className="pr-10 bg-white/50 border-white/20 focus:border-purple-300"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                          onClick={() => {
                            if (chatInput.trim()) {
                              setChatExpanded(true)
                              handleSendMessage()
                            }
                          }}
                        >
                          <Send className="h-4 w-4 text-purple-600" />
                        </Button>
                      </div>
                    </div>

                    {/* Quick action buttons */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setChatExpanded(true)
                          handleQuestionClick('How does this affect me personally?')
                        }}
                        className="text-xs glass-card glass-card-hover px-3 py-1.5"
                      >
                        How does this affect me? 🤔
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setChatExpanded(true)
                          handleQuestionClick("What's the hot take on this?")
                        }}
                        className="text-xs glass-card glass-card-hover px-3 py-1.5"
                      >
                        Give me a hot take 🔥
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setChatExpanded(true)
                          handleQuestionClick("What's everyone missing about this story?")
                        }}
                        className="text-xs glass-card glass-card-hover px-3 py-1.5"
                      >
                        Hidden angle? 🕵️
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Expanded state - full chat interface
                  <>
                    <div className="p-6 pb-3 bg-gradient-to-r from-purple-50/50 to-blue-50/50 rounded-t-2xl">
                      <h3 className="text-lg font-semibold flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-5 w-5 text-purple-500" />
                          <span className="text-lg">{getChatPersonalization().title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {chatMessages.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleClearChat}
                              className="text-xs"
                            >
                              Clear
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setChatExpanded(false)
                              setChatInput('')
                            }}
                            className="p-1"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                        </div>
                      </h3>
                    </div>

                    <div className="p-6 pt-4">
                      <div className="h-[300px] flex flex-col">
                        {/* Chat messages area */}
                        {chatMessages.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                              <MessageCircle className="h-10 w-10 mx-auto mb-3 text-purple-400/50" />
                              <p className="text-sm text-gray-700 mb-3 font-medium">
                                {getChatPersonalization().subtitle}
                              </p>
                              <div className="flex flex-wrap gap-2 justify-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleQuestionClick('How does this affect me personally?')
                                  }
                                  className="text-xs glass-card glass-card-hover px-3 py-1.5"
                                >
                                  How does this affect me? 🤔
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleQuestionClick("What's the hot take on this?")
                                  }
                                  className="text-xs glass-card glass-card-hover px-3 py-1.5"
                                >
                                  Give me a hot take 🔥
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleQuestionClick("What's everyone missing about this story?")
                                  }
                                  className="text-xs glass-card glass-card-hover px-3 py-1.5"
                                >
                                  Hidden angle? 🕵️
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleQuestionClick("Explain this like I'm 5 years old")
                                  }
                                  className="text-xs glass-card glass-card-hover px-3 py-1.5"
                                >
                                  ELI5 version? 👶
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <ScrollArea className="flex-1 pr-4">
                            <div className="space-y-3">
                              {chatMessages.map((message, idx) => (
                                <div
                                  key={idx}
                                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} chat-message`}
                                >
                                  <div
                                    className={`max-w-[85%] rounded-lg p-3 text-sm glass-card ${
                                      message.role === 'user'
                                        ? 'bg-gradient-to-r from-purple-100/80 to-blue-100/80 text-purple-900'
                                        : 'bg-white/60 text-slate-800'
                                    }`}
                                  >
                                    <p className="whitespace-pre-wrap leading-relaxed">
                                      {message.content}
                                    </p>
                                  </div>
                                </div>
                              ))}

                              {chatLoading && (
                                <div className="flex justify-start chat-message">
                                  <div className="bg-gray-100 rounded-lg p-3">
                                    <div className="flex items-center gap-2">
                                      <Loader2 className="h-3 w-3 animate-spin text-gray-600" />
                                      <span className="text-xs text-gray-600">Thinking...</span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {chatError && (
                                <div className="text-center">
                                  <p className="text-xs text-red-600">{chatError}</p>
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        )}

                        {/* Input Area */}
                        <div className="mt-4 pt-4 border-t border-slate-200/50">
                          <div className="flex gap-2">
                            <Textarea
                              value={chatInput}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setChatInput(e.target.value)}
                              onKeyPress={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault()
                                  handleSendMessage()
                                }
                              }}
                              placeholder={`Ask about ${newsData?.topic || 'this news'}...`}
                              className="resize-none min-h-[40px] text-sm bg-white/50 border-white/20 focus:border-purple-300"
                              rows={1}
                              disabled={chatLoading}
                            />
                            <Button
                              onClick={handleSendMessage}
                              disabled={!chatInput.trim() || chatLoading}
                              size="sm"
                              className="px-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300"
                            >
                              <Send className="h-3 w-3" />
                            </Button>
                          </div>

                          <p className="text-xs text-gray-500 mt-1">
                            Enter to send • Shift+Enter for new line
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Morgan Freeman Voice Player Section - Collapsible */}
            <div className="mt-6 animate-fade-in">
              <div className="space-y-2">
                <div
                  className="flex items-center justify-between cursor-pointer select-none p-3 hover:bg-gray-50 rounded-lg transition-colors"
                  onClick={() => setMorganFreemanVisible(!morganFreemanVisible)}
                >
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Volume2 className="h-5 w-5 text-purple-600" />
                    Listen with Morgan Freeman
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1"
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation()
                      setMorganFreemanVisible(!morganFreemanVisible)
                    }}
                  >
                    {morganFreemanVisible ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {morganFreemanVisible && (
                  <div className="animate-fade-in">
                    <MorganFreemanPlayer
                      text={newsData.article[selectedReadingLevel]}
                      articleType={selectedReadingLevel}
                      topic={newsData.topic}
                      canUseFeature={canUseFeature('morgan_freeman')}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Sources Section */}
            <div className="glass-card glass-card-hover rounded-2xl shadow-xl animate-fade-in">
              <div className="p-6">
                <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800 mb-4">
                  <Globe className="h-5 w-5 text-blue-600" />
                  Sources ({newsData.sources.length})
                </h3>
                {newsData.sources.length > 0 ? (
                  <div className="grid gap-4">
                    {newsData.sources.map((source) => (
                      <div
                        key={source.id}
                        className="glass-card rounded-lg p-4 hover:scale-[1.02] transition-all duration-200"
                      >
                        <div className="flex justify-between items-start mb-2">
                          {source.url ? (
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-blue-600 hover:text-blue-800 underline decoration-blue-300 hover:decoration-blue-600 flex items-center gap-1 group transition-all duration-200"
                              title="Click to read original article"
                              onClick={() => {
                                // Track source click
                                articleTracker.trackSourceClick(source.outlet)
                              }}
                            >
                              {source.outlet}
                              <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                            </a>
                          ) : (
                            <h4 className="font-semibold text-blue-600">{source.outlet}</h4>
                          )}
                          <Badge variant="outline" className="glass-card px-2 py-0.5 text-xs">{source.type}</Badge>
                        </div>
                        <p className="text-sm font-medium">{source.headline}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <p className="mb-2">No sources found for this analysis.</p>
                    <p className="text-sm">
                      This may be due to limited availability of recent articles on this topic.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Queued Recommendations */}
            <QueuedRecommendations 
              className="mt-8 animate-fade-in"
              onSelectTopic={(topic) => {
                setTopic(topic)
                handleSynthesize()
              }}
            />
            </div>

            {/* Questions Sidebar */}
            {newsData.keyQuestions && newsData.keyQuestions.length > 0 && (
              <div className="lg:w-[380px] lg:flex-shrink-0">
                <ThoughtProvokingQuestions questions={newsData.keyQuestions} />
              </div>
            )}
          </div>
        </div>

        {/* Auth Modal */}
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => {
            setAuthModalOpen(false)
          }}
          defaultTab={'signin'}
        />
        
        <OnboardingSurveyModal
          isOpen={showOnboardingSurvey}
          onClose={() => setShowOnboardingSurvey(false)}
          onComplete={() => {
            setShowOnboardingSurvey(false)
            toast({
              title: 'Welcome to NewsGlide!',
              description: 'Your personalized news experience is ready.',
              variant: 'success',
            })
          }}
        />
        
        {/* Enhanced Premium Animations CSS for Results */}
        <style>{`
          @keyframes fade-in {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .animate-fade-in {
            animation: fade-in 0.6s ease-out;
          }
          
          .chat-message {
            animation: fade-in 0.3s ease-out;
          }
        `}</style>
      </div>
    )
  }

  // Show landing page for non-authenticated users
  if (!authLoading && !user) {
    return <LandingPage />
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Enhanced Breathing Gradient Background */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 transition-all duration-1000 ease-in-out"
          style={{
            background: `linear-gradient(135deg,
              hsl(212, 42%, 97%) 0%,
              hsl(210, 44%, 95%) 25%,
              hsl(215, 42%, 96%) 50%,
              hsl(213, 43%, 98%) 75%,
              hsl(210, 41%, 98%) 100%)`
          }}
        />
        
        {/* Subtle Background Texture */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(59, 130, 246, 0.3) 1px, transparent 0)`,
            backgroundSize: "24px 24px",
            animation: "textureShift 60s linear infinite",
          }}
        />
      </div>
      
      {/* Interactive Mouse Glow */}
      <div
        className="fixed inset-0 pointer-events-none z-1 opacity-0 transition-opacity duration-500 hover:opacity-100"
        style={{
          background: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(59, 130, 246, 0.08), rgba(6, 182, 212, 0.05), transparent 60%)`,
        }}
      />
      
      {/* Floating Light Particles */}
      <div className="fixed inset-0 pointer-events-none z-1">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-1 h-1 bg-blue-300/40 rounded-full"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              animation: `floatUp 25s linear infinite, fadeInOut 25s ease-in-out infinite`,
              animationDelay: `${particle.delay}s`,
            }}
          />
        ))}
      </div>
      
      <SEO />
      <UnifiedNavigation />
      <LoadingOverlay />

      {/* Hero Section */}
      <div className="relative overflow-hidden pt-16 z-10">
        {/* Enhanced Interactive Gradient Mesh Background */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {/* Large Interactive Morphing Gradient Blob 1 */}
          <div
            className="absolute top-20 left-10 w-80 h-80 rounded-full opacity-40 blur-3xl transition-all duration-500 ease-out will-change-transform"
            style={{
              background:
                "radial-gradient(ellipse 120% 80%, rgba(59, 130, 246, 0.5) 0%, rgba(6, 182, 212, 0.3) 50%, transparent 70%)",
              transform: `translate(${parallaxOffset.x * 0.3}px, ${parallaxOffset.y * 0.3}px)`,
              borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%",
            }}
          />

          {/* Large Interactive Morphing Gradient Blob 2 */}
          <div
            className="absolute top-40 right-20 w-96 h-96 rounded-full opacity-35 blur-3xl transition-all duration-500 ease-out will-change-transform"
            style={{
              background:
                "radial-gradient(circle, rgba(6, 182, 212, 0.4) 0%, rgba(14, 165, 233, 0.3) 50%, transparent 70%)",
              transform: `translate(${parallaxOffset.x * -0.2}px, ${parallaxOffset.y * 0.2}px)`,
            }}
          />

          {/* Large Interactive Morphing Gradient Blob 3 */}
          <div
            className="absolute bottom-32 left-1/3 w-72 h-72 rounded-full opacity-45 blur-3xl transition-all duration-500 ease-out will-change-transform"
            style={{
              background:
                "radial-gradient(circle, rgba(37, 99, 235, 0.5) 0%, rgba(59, 130, 246, 0.25) 50%, transparent 70%)",
              transform: `translate(${parallaxOffset.x * 0.25}px, ${parallaxOffset.y * -0.25}px)`,
            }}
          />
        </div>
        
        <div className="relative container mx-auto px-6 py-20 z-20">
          <div className="text-center max-w-4xl mx-auto">
            {/* Hero title with animation */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 mb-8 leading-tight tracking-tight animate-in fade-in slide-in-from-bottom duration-1000">
              <span className="relative">
                Glide Through the Noise
                <div
                  className="absolute -bottom-2 left-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 rounded-full opacity-60"
                  style={{
                    width: "0%",
                    animation: "underlineDraw 2s ease-out 1s forwards",
                  }}
                ></div>
              </span>
            </h1>

            <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom duration-1000 delay-200">
              Our AI model does not serve an agenda — it serves you. Get unbiased news synthesis from thousands of sources.
            </p>

            {/* Enhanced Glass Morphism Search Bar */}
            <div className="max-w-2xl mx-auto mb-8 animate-in fade-in slide-in-from-bottom duration-1000 delay-400">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-all duration-500"></div>
                <div className="relative flex gap-2 p-2 glass-card glass-card-hover rounded-2xl shadow-xl">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5 transition-colors group-hover:text-blue-600" />
                    <Input
                      placeholder="Enter any current topic (e.g., 'OpenAI news today', 'climate summit 2025')"
                      value={topic}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTopic(e.target.value)}
                      onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSynthesize()}
                      className="pl-12 h-14 text-lg border-0 bg-transparent focus:ring-0 focus:border-0 placeholder:text-slate-400"
                    />
                  </div>
                  <Button
                    onClick={() => handleSynthesize()}
                    disabled={loading}
                    className="h-14 px-8 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl group cta-pulse"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-slow-spin" />
                        Processing...
                      </div>
                    ) : (
                      <>
                        Find News
                        <ChevronRight className="ml-2 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Search Filters Button */}
              <div className="flex items-center justify-center mt-4 text-sm animate-in fade-in duration-1000 delay-500">
                <Button
                  variant="outline"
                  onClick={() => setFiltersModalOpen(true)}
                  className="glass-card glass-card-hover px-4 py-2 flex items-center gap-2 hover:border-blue-300 transition-all duration-300"
                >
                  <Settings className="h-4 w-4" />
                  Search Filters
                  {hasSavedPreferences && (
                    <span className="ml-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                      Saved
                    </span>
                  )}
                </Button>
              </div>
            </div>

            {/* Chat with Glidey Section */}
            <div className="mb-8 animate-in fade-in slide-in-from-bottom duration-1000 delay-600">
              <button
                onClick={() => user ? navigate('/ai-chat') : setAuthModalOpen(true)}
                className="group w-full max-w-2xl mx-auto p-6 glass-card glass-card-hover rounded-2xl shadow-lg transition-all duration-500 hover:scale-[1.02]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="relative animate-glidey-entrance transition-transform duration-300 group-hover:scale-110"
                      style={{
                        padding: '1.25rem'
                      }}
                    >
                      {/* Animated waves underneath surfboard */}
                      <div style={{ position: 'absolute', bottom: '35%', left: '10%', right: '10%', height: '20px', overflow: 'hidden', zIndex: 5 }}>
                        <div className="wave-1" style={{
                          position: 'absolute',
                          width: '200%',
                          height: '100%',
                          background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.3), rgba(147, 197, 253, 0.4), rgba(59, 130, 246, 0.3), transparent)',
                          borderRadius: '50%'
                        }} />
                      </div>
                      <div style={{ position: 'absolute', bottom: '32%', left: '5%', right: '5%', height: '16px', overflow: 'hidden', zIndex: 4 }}>
                        <div className="wave-2" style={{
                          position: 'absolute',
                          width: '200%',
                          height: '100%',
                          background: 'linear-gradient(90deg, transparent, rgba(99, 179, 237, 0.25), rgba(147, 197, 253, 0.35), rgba(99, 179, 237, 0.25), transparent)',
                          borderRadius: '50%'
                        }} />
                      </div>
                      <div style={{ position: 'absolute', bottom: '30%', left: '8%', right: '8%', height: '12px', overflow: 'hidden', zIndex: 3 }}>
                        <div className="wave-3" style={{
                          position: 'absolute',
                          width: '200%',
                          height: '100%',
                          background: 'linear-gradient(90deg, transparent, rgba(147, 197, 253, 0.2), rgba(191, 219, 254, 0.3), rgba(147, 197, 253, 0.2), transparent)',
                          borderRadius: '50%'
                        }} />
                      </div>

                      <img
                        src="/images/glidey-surfing.png"
                        alt="Glidey"
                        className="w-16 h-16 rounded-full"
                        style={{
                          filter: 'brightness(1.15) saturate(1.1) drop-shadow(0 6px 20px rgba(59, 130, 246, 0.25))',
                          display: 'block',
                          position: 'relative',
                          zIndex: 10
                        }}
                      />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors duration-300">
                        Chat with Glidey
                      </h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                    <ChevronRight className="h-6 w-6 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                </div>
              </button>
            </div>

            {/* Explore Topics - Image Cards */}
            <div className="mb-16 animate-in fade-in slide-in-from-bottom duration-1000 delay-700">
              <h2 className="text-center text-2xl font-semibold text-slate-900 mb-6">
                Explore Topics
              </h2>
              <p className="text-center text-slate-600 mb-8 max-w-2xl mx-auto">
                Not sure what to search for? Browse these popular topics to discover news that interests you.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
                {TOPIC_CATEGORIES.map((category, idx) => (
                  <button
                    key={category.slug}
                    onClick={() => navigate(`/discover/${category.slug}`)}
                    className="group relative overflow-hidden rounded-2xl shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl animate-in fade-in slide-in-from-bottom"
                    style={{ animationDelay: `${700 + idx * 100}ms` }}
                  >
                    {/* Background Image */}
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={category.imageUrl}
                        alt={category.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    </div>

                    {/* Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg leading-tight">
                          {category.name}
                        </h3>
                      </div>
                      <p className="text-sm text-white/90 line-clamp-2">
                        {category.description}
                      </p>

                      {/* Hover Arrow */}
                      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                        <ChevronRight className="h-5 w-5" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Footer */}
      <footer className="bg-white py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-100 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="animate-on-scroll opacity-0 translate-y-4 transition-all duration-1000">
              {/* Footer logo */}
              <div className="flex items-center space-x-3 mb-4 group cursor-pointer">
                <img
                  src="/images/newsglide-icon.png"
                  alt="NewsGlide"
                  className="w-7 h-7 transition-transform duration-300 group-hover:scale-110"
                />
                <span className="font-semibold text-slate-900">NewsGlide</span>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">
                Revolutionizing news consumption with AI-powered synthesis and interactive experiences.
              </p>
            </div>

            <div className="animate-on-scroll opacity-0 translate-y-4 transition-all duration-1000 delay-100">
              <h3 className="font-semibold text-slate-900 mb-4 text-sm">Powered By</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="hover:text-slate-900 transition-all duration-300 hover:translate-x-1 inline-block">
                  🌐 Real-time Web Search
                </li>
                <li className="hover:text-slate-900 transition-all duration-300 hover:translate-x-1 inline-block">
                  🤖 Advanced AI Synthesis
                </li>
                <li className="hover:text-slate-900 transition-all duration-300 hover:translate-x-1 inline-block">
                  📊 Multiple News Sources
                </li>
              </ul>
            </div>

            <div className="animate-on-scroll opacity-0 translate-y-4 transition-all duration-1000 delay-200">
              <h3 className="font-semibold text-slate-900 mb-4 text-sm">Trust & Transparency</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="hover:text-slate-900 transition-all duration-300 hover:translate-x-1 inline-block">
                  🔒 Real Sources Only
                </li>
                <li className="hover:text-slate-900 transition-all duration-300 hover:translate-x-1 inline-block">
                  🎯 Unbiased Analysis
                </li>
                <li className="hover:text-slate-900 transition-all duration-300 hover:translate-x-1 inline-block">
                  📈 Current & Accurate
                </li>
              </ul>
            </div>

            <div className="animate-on-scroll opacity-0 translate-y-4 transition-all duration-1000 delay-300">
              <h3 className="font-semibold text-slate-900 mb-4 text-sm">Connect</h3>
              <div className="flex space-x-4">
                <a
                  href="#"
                  className="text-slate-500 hover:text-slate-900 transition-all duration-300 text-sm hover:scale-110"
                >
                  Twitter
                </a>
                <a
                  href="#"
                  className="text-slate-500 hover:text-slate-900 transition-all duration-300 text-sm hover:scale-110"
                >
                  LinkedIn
                </a>
                <a
                  href="#"
                  className="text-slate-500 hover:text-slate-900 transition-all duration-300 text-sm hover:scale-110"
                >
                  GitHub
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-8 flex flex-col sm:flex-row justify-between items-center animate-on-scroll opacity-0 translate-y-4 transition-all duration-1000 delay-400">
            <p className="text-slate-500 text-sm">&copy; 2025 NewsGlide. All rights reserved.</p>
            <p className="text-slate-400 text-xs mt-4 sm:mt-0">Real news, real sources, real analysis.</p>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => {
          setAuthModalOpen(false)
        }}
        defaultTab={'signin'}
      />
      
      {/* Onboarding Survey Modal */}
      <OnboardingSurveyModal
        isOpen={showOnboardingSurvey}
        onClose={() => setShowOnboardingSurvey(false)}
        onComplete={() => {
          setShowOnboardingSurvey(false)
          toast({
            title: 'Welcome to NewsGlide!',
            description: 'Your personalized news experience is ready.',
            variant: 'success',
          })
        }}
      />

      {/* Search Filters Modal */}
      <SearchFiltersModal
        isOpen={filtersModalOpen}
        onClose={() => setFiltersModalOpen(false)}
        onApplyOnce={handleApplyFiltersOnce}
        onSaveAsDefault={handleSaveFiltersAsDefault}
        initialFilters={searchFilters}
        hasSavedPreferences={hasSavedPreferences}
      />
      
      {/* Enhanced Premium Animations CSS */}
      <style>{`
        .animate-in {
          opacity: 1 !important;
          transform: translateY(0) translateX(0) !important;
        }
        
        @keyframes underlineDraw {
          from { width: 0%; }
          to { width: 100%; }
        }
        
        @keyframes morphing1 {
          0%, 100% { 
            transform: translate(0, 0) scale(1) rotate(0deg);
          }
          33% { 
            transform: translate(15px, -15px) scale(1.02) rotate(60deg);
          }
          66% { 
            transform: translate(-10px, 10px) scale(0.98) rotate(120deg);
          }
        }
        
        @keyframes morphing2 {
          0%, 100% { 
            transform: translate(0, 0) scale(1) rotate(0deg);
          }
          25% { 
            transform: translate(-20px, 15px) scale(1.03) rotate(45deg);
          }
          50% { 
            transform: translate(10px, -20px) scale(0.97) rotate(90deg);
          }
          75% { 
            transform: translate(20px, 10px) scale(1.01) rotate(135deg);
          }
        }
        
        @keyframes morphing3 {
          0%, 100% { 
            transform: translate(0, 0) scale(1) rotate(0deg);
          }
          40% { 
            transform: translate(12px, 18px) scale(1.02) rotate(72deg);
          }
          80% { 
            transform: translate(-18px, -12px) scale(0.98) rotate(144deg);
          }
        }
        
        @keyframes breathe1 {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.5; }
        }
        
        @keyframes breathe2 {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.45; }
        }
        
        @keyframes breathe3 {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 0.55; }
        }
        
        .cta-pulse {
          animation: ctaPulse 4s ease-in-out infinite;
        }
        
        @keyframes ctaPulse {
          0%, 100% { 
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          }
          50% { 
            box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.2), 0 4px 6px -2px rgba(59, 130, 246, 0.1);
          }
        }
      `}</style>
    </div>
  )
}

export default Index
