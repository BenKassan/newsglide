import { useState, useEffect, useMemo, useRef } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Sparkles, TrendingUp, ArrowLeft, Copy, Check } from 'lucide-react'
import { Button } from '@ui/button'
import {
  getSubtopics,
  parseBreadcrumbs,
  type HierarchyTopic
} from '@/services/discoverHierarchyService'
import { useAuth } from '@features/auth'
import { TOPIC_CATEGORIES, type TopicCategory } from '@/data/topicCategories'
import { getTopicGuideContent } from '@/data/topicGuides'

interface TopicHierarchyProps {
  currentPath: string
  currentTopic: HierarchyTopic | null
  loading: boolean
  rootCategory?: TopicCategory
}

export function TopicHierarchy({ currentPath, currentTopic, loading: topicLoading, rootCategory }: TopicHierarchyProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [subtopics, setSubtopics] = useState<HierarchyTopic[]>([])
  const [subtopicsLoading, setSubtopicsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'explore' | 'overview'>('explore')
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null)
  const copyTimeoutRef = useRef<number | null>(null)
  const [activeExploreGroupIndex, setActiveExploreGroupIndex] = useState(0)
  const [activeExploreQuestionId, setActiveExploreQuestionId] = useState<string | null>(null)
  const [customSearch, setCustomSearch] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState<string | null>(null)

  const breadcrumbs = parseBreadcrumbs(currentPath)

  // Use rootCategory from props (extracted immediately in parent)
  const matchedCategory = rootCategory

  const primaryBreadcrumb = breadcrumbs[0]
  const guideSlugCandidate = matchedCategory?.slug ?? primaryBreadcrumb?.path ?? currentPath
  const guideDisplayName =
    currentTopic?.name ??
    matchedCategory?.name ??
    breadcrumbs[breadcrumbs.length - 1]?.name ??
    'this topic'

  const guideContent = useMemo(
    () => getTopicGuideContent(guideSlugCandidate, guideDisplayName),
    [guideSlugCandidate, guideDisplayName]
  )
  const exploreFramework = guideContent.exploreFramework
  const currentExploreGroup = useMemo(() => {
    if (!exploreFramework) {
      return undefined
    }
    return exploreFramework.groups[activeExploreGroupIndex]
  }, [exploreFramework, activeExploreGroupIndex])
  const activeExploreQuestion = useMemo(() => {
    if (!currentExploreGroup) {
      return undefined
    }
    if (!activeExploreQuestionId) {
      return currentExploreGroup.questions[0]
    }
    return currentExploreGroup.questions.find(question => question.id === activeExploreQuestionId) ?? currentExploreGroup.questions[0]
  }, [currentExploreGroup, activeExploreQuestionId])
  const dynamicSearchIdeas = useMemo(() => {
    if (!submittedSearch || !exploreFramework) {
      return []
    }
    const allAngles = exploreFramework.groups.flatMap(group =>
      group.questions.flatMap(question => question.angles)
    )
    const uniqueAngles = Array.from(new Set(allAngles))
    return uniqueAngles.slice(0, 4).map(angle => `${submittedSearch} ${angle.toLowerCase()}`)
  }, [submittedSearch, exploreFramework])
  const showSearchView = Boolean(submittedSearch)

  useEffect(() => {
    if (!exploreFramework) {
      setActiveExploreGroupIndex(0)
      setActiveExploreQuestionId(null)
      setSubmittedSearch(null)
      return
    }

    const firstGroup = exploreFramework.groups[0]
    setActiveExploreGroupIndex(0)
    setActiveExploreQuestionId(firstGroup?.questions[0]?.id ?? null)
    setSubmittedSearch(null)
  }, [exploreFramework])

  useEffect(() => {
    // Only load subtopics after topic is loaded
    if (!topicLoading && currentTopic) {
      loadSubtopics()
    }
  }, [currentPath, user?.id, topicLoading, currentTopic])

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }
    }
  }, [])

  const loadSubtopics = async () => {
    try {
      setSubtopicsLoading(true)
      setError(null)

      const topics = await getSubtopics(currentPath, user?.id)
      setSubtopics(topics)

      // If no subtopics found, auto-switch to overview mode
      if (topics.length === 0) {
        setViewMode('overview')
      }
    } catch (err) {
      console.error('Failed to load subtopics:', err)
      setError('Failed to load topics. Please try again.')
    } finally {
      setSubtopicsLoading(false)
    }
  }

  const handleTopicClick = (topic: HierarchyTopic) => {
    navigate(`/discover/${topic.path}`)
  }

  const handleBreadcrumbClick = (path: string) => {
    if (path === currentPath) return
    navigate(`/discover/${path}`)
  }

  const handleOverviewClick = () => {
    setViewMode('overview')
  }

  const handleExploreGroupSelect = (index: number) => {
    setActiveExploreGroupIndex(index)
    const nextGroup = exploreFramework?.groups[index]
    setActiveExploreQuestionId(nextGroup?.questions[0]?.id ?? null)
    setSubmittedSearch(null)
  }

  const handleExploreQuestionSelect = (questionId: string) => {
    setActiveExploreQuestionId(questionId)
    setSubmittedSearch(null)
  }

  const handleExploreSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = customSearch.trim()
    if (!trimmed) {
      return
    }
    setCustomSearch(trimmed)
    setSubmittedSearch(trimmed)
  }

  const handleExploreSearchReset = () => {
    setSubmittedSearch(null)
    setCustomSearch('')
  }

  const handleSearchExampleClick = (example: string) => {
    setCustomSearch(example)
    setSubmittedSearch(example)
  }

  const handlePromptCopy = async (prompt: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      return
    }

    try {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }

      await navigator.clipboard.writeText(prompt)
      setCopiedPrompt(prompt)

      copyTimeoutRef.current = window.setTimeout(() => {
        setCopiedPrompt(null)
      }, 2000)
    } catch (err) {
      console.error('Failed to copy prompt to clipboard:', err)
    }
  }

  const guideSection = (
    <section aria-label="Topic orientation and guidance" className="mb-12">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-blue-100 bg-white/80 p-6 shadow-sm backdrop-blur">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-600">
              <Sparkles className="h-4 w-4" />
              Start Here
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-slate-900">{guideContent.headline}</h2>
            <p className="mt-3 text-slate-600 leading-relaxed">{guideContent.intro}</p>
            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
              <p className="text-sm text-blue-900 leading-relaxed">
                {guideContent.reassurance}
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              {guideContent.quickPrompts.map(prompt => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handlePromptCopy(prompt)}
                  className="group inline-flex max-w-full items-center gap-2 rounded-full border border-blue-200/70 bg-blue-50/70 px-4 py-2 text-left text-sm font-medium text-blue-800 transition-all hover:border-blue-400 hover:bg-blue-100"
                >
                  <span className="block max-w-[18rem] text-left leading-snug sm:max-w-[22rem]">
                    {prompt}
                  </span>
                  {copiedPrompt === prompt ? (
                    <Check className="h-4 w-4 text-blue-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-blue-500 transition-transform group-hover:scale-110" />
                  )}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs uppercase tracking-wide text-blue-500">
              {copiedPrompt
                ? 'Prompt copied! Paste it into Discover or Glidey to explore.'
                : 'Tap any prompt to copy it to your clipboard.'}
            </p>
          </div>

          {exploreFramework && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    Guided explorer
                  </div>
                  <h3 className="mt-3 text-xl font-semibold text-slate-900">{exploreFramework.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {exploreFramework.description}
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleExploreSearchSubmit}
                className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center"
              >
                <label className="sr-only" htmlFor="topic-explorer-search">
                  Refine this topic
                </label>
                <div className="relative flex-1">
                  <input
                    id="topic-explorer-search"
                    type="search"
                    value={customSearch}
                    onChange={event => setCustomSearch(event.target.value)}
                    placeholder={exploreFramework.searchPlaceholder}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="whitespace-nowrap">
                    Refine
                  </Button>
                  {showSearchView && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleExploreSearchReset}
                      className="whitespace-nowrap text-slate-600 hover:text-slate-900"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </form>

              {exploreFramework.searchExamples.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {exploreFramework.searchExamples.map(example => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => handleSearchExampleClick(example)}
                      className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              )}

              {showSearchView && (
                <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-blue-900">
                  <p className="font-medium">
                    Focusing on: <span className="break-words">{submittedSearch}</span>
                  </p>
                  <p className="text-xs uppercase tracking-wide text-blue-600">
                    Adjust the search or pick a question to change the lens.
                  </p>
                </div>
              )}

              <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
                <div className="space-y-4">
                  {exploreFramework.groups.map((group, groupIdx) => {
                    const isActiveGroup = groupIdx === activeExploreGroupIndex
                    return (
                      <div
                        key={group.title}
                        className={`rounded-2xl border p-4 transition-colors ${
                          isActiveGroup ? 'border-blue-300 bg-blue-50/60 shadow-sm' : 'border-slate-200 bg-slate-50/60'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleExploreGroupSelect(groupIdx)}
                          className="flex w-full items-center justify-between gap-3 text-left"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{group.title}</p>
                            <p className="mt-1 text-xs text-slate-600">{group.description}</p>
                          </div>
                          <ChevronRight
                            className={`h-4 w-4 transition-transform ${isActiveGroup ? 'translate-x-1 text-blue-600' : 'text-slate-400'}`}
                          />
                        </button>
                        {isActiveGroup && (
                          <div className="mt-3 space-y-2">
                            {group.questions.map(question => {
                              const isActiveQuestion =
                                !showSearchView && activeExploreQuestion?.id === question.id
                              return (
                                <button
                                  key={question.id}
                                  type="button"
                                  onClick={() => handleExploreQuestionSelect(question.id)}
                                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                                    isActiveQuestion
                                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                                      : 'border-slate-200 bg-white hover:border-blue-400 hover:text-blue-700'
                                  }`}
                                >
                                  {question.question}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6">
                  {showSearchView && submittedSearch ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">
                          Custom search
                        </p>
                        <h4 className="mt-2 text-xl font-semibold text-slate-900 break-words">
                          {submittedSearch}
                        </h4>
                        <p className="mt-2 text-sm text-slate-600">
                          Layer a channel, audience, or proof point onto this query to surface richer coverage.
                        </p>
                      </div>
                      {dynamicSearchIdeas.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Quick refinements
                          </p>
                          {dynamicSearchIdeas.map(idea => (
                            <button
                              key={idea}
                              type="button"
                              onClick={() => handlePromptCopy(idea)}
                              className="flex w-full items-center gap-2 rounded-lg border border-blue-200/70 bg-white px-3 py-2 text-left text-sm font-medium text-blue-700 transition-all hover:border-blue-400 hover:bg-blue-50"
                            >
                              {copiedPrompt === idea ? (
                                <Check className="h-4 w-4 text-blue-600" />
                              ) : (
                                <Copy className="h-4 w-4 text-blue-500" />
                              )}
                              <span className="flex-1 text-left leading-snug">{idea}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="rounded-xl border border-white/80 bg-white/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Angles to explore next
                        </p>
                        <ul className="mt-2 space-y-2 text-sm leading-relaxed text-slate-600">
                          {exploreFramework.groups.map(group => (
                            <li key={group.title}>
                              <span className="font-medium text-slate-900">{group.title}:</span>{' '}
                              {group.description}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : activeExploreQuestion ? (
                    <div className="space-y-5">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">
                          {currentExploreGroup?.title}
                        </p>
                        <h4 className="mt-2 text-xl font-semibold text-slate-900">
                          {activeExploreQuestion.question}
                        </h4>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                          {activeExploreQuestion.explanation}
                        </p>
                      </div>
                      {activeExploreQuestion.angles.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Angles to try
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {activeExploreQuestion.angles.map(angle => (
                              <span
                                key={angle}
                                className="rounded-full border border-blue-200 bg-white/90 px-3 py-1 text-xs font-medium text-blue-700"
                              >
                                {angle}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {activeExploreQuestion.followUps.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Questions to pursue
                          </p>
                          <ul className="mt-2 space-y-2 text-sm leading-relaxed text-slate-600">
                            {activeExploreQuestion.followUps.map(followUp => (
                              <li key={followUp} className="list-disc pl-4">
                                {followUp}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {activeExploreQuestion.proofPoints.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Proof to gather
                          </p>
                          <ul className="mt-2 space-y-2 text-sm leading-relaxed text-slate-600">
                            {activeExploreQuestion.proofPoints.map(point => (
                              <li key={point} className="list-disc pl-4">
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {activeExploreQuestion.suggestedSearches.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Searches to run
                          </p>
                          {activeExploreQuestion.suggestedSearches.map(search => (
                            <button
                              key={search}
                              type="button"
                              onClick={() => handlePromptCopy(search)}
                              className="flex w-full items-center gap-2 rounded-lg border border-blue-200/70 bg-white px-3 py-2 text-left text-sm font-medium text-blue-700 transition-all hover:border-blue-400 hover:bg-blue-50"
                            >
                              {copiedPrompt === search ? (
                                <Check className="h-4 w-4 text-blue-600" />
                              ) : (
                                <Copy className="h-4 w-4 text-blue-500" />
                              )}
                              <span className="flex-1 text-left leading-snug">{search}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-600">
                      Select a focus area on the left to see tailored follow-up questions and search ideas.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-xl font-semibold text-slate-900">Storylines to explore</h3>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Tap prompt to copy
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {guideContent.storylines.map(storyline => (
                <div
                  key={storyline.title}
                  className="flex h-full flex-col rounded-2xl border border-slate-200/80 bg-slate-50/80 p-5"
                >
                  <h4 className="text-lg font-semibold text-slate-900">{storyline.title}</h4>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                    {storyline.description}
                  </p>
                  <button
                    type="button"
                    onClick={() => handlePromptCopy(storyline.prompt)}
                    className="mt-4 inline-flex w-full items-center gap-2 rounded-lg border border-blue-200/70 bg-white/90 px-3 py-2 text-left text-sm font-medium text-blue-700 transition-all hover:border-blue-400 hover:bg-blue-50"
                  >
                    {copiedPrompt === storyline.prompt ? (
                      <Check className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-blue-500" />
                    )}
                    <span className="flex-1 text-left leading-snug">{storyline.prompt}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Who to watch</h3>
            <ul className="mt-4 space-y-3">
              {guideContent.keyPlayers.map(player => (
                <li
                  key={player.name}
                  className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
                >
                  <p className="text-sm font-semibold text-slate-900">{player.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                    {player.role}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {player.whyItMatters}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Signals worth scanning</h3>
            <ul className="mt-4 space-y-3">
              {guideContent.signals.map(signal => (
                <li
                  key={signal.title}
                  className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
                >
                  <p className="text-sm font-semibold text-slate-900">{signal.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{signal.description}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-blue-100 bg-blue-50/60 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-blue-900">How to turn this into a search</h3>
            <ul className="mt-4 space-y-3">
              {guideContent.nextSteps.map(step => (
                <li
                  key={step.title}
                  className="rounded-2xl border border-blue-100 bg-white/90 p-4"
                >
                  <p className="text-sm font-semibold text-blue-900">{step.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-blue-800/80">
                    {step.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )

  if (viewMode === 'overview') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 pt-20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <div className="mb-6 flex items-center gap-2 text-sm">
            <button
              onClick={() => navigate('/discover')}
              className="text-blue-600 hover:text-blue-700 transition-colors"
            >
              Discover
            </button>
            {breadcrumbs.map((crumb, idx) => (
              <div key={crumb.path} className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-slate-400" />
                <button
                  onClick={() => handleBreadcrumbClick(crumb.path)}
                  className={`transition-colors ${
                    idx === breadcrumbs.length - 1
                      ? 'text-slate-900 font-medium'
                      : 'text-blue-600 hover:text-blue-700'
                  }`}
                >
                  {crumb.name}
                </button>
              </div>
            ))}
          </div>

          {/* Overview Content - TODO: Implement with AI summary */}
          <div className="rounded-lg border border-slate-200 bg-white/80 backdrop-blur-sm p-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">{currentTopic.name} Overview</h1>
            <p className="text-slate-600 mb-6">
              Coming soon: AI-generated overview with articles and insights about {currentTopic.name}.
            </p>
            <Button onClick={() => setViewMode('explore')}>
              Explore Subtopics
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Hero Section - Show immediately when we have a matched category */}
      {matchedCategory && (
        <>
          {/* Hero with Background Image */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 h-[50vh] min-h-[400px] pt-20">
            {/* Background Image with Overlay */}
            <div className="absolute inset-0">
              <img
                src={matchedCategory.imageUrl}
                alt={matchedCategory.name}
                className="w-full h-full object-cover opacity-50"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-900/70" />
            </div>

            {/* Hero Content */}
            <div className="relative mx-auto max-w-7xl w-full px-4 py-8 sm:px-6 lg:px-8 h-full flex flex-col justify-center">
              <Button
                onClick={() => navigate('/discover')}
                variant="ghost"
                className="mb-6 text-white/90 hover:text-white hover:bg-white/10 transition-all w-fit"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to All Topics
              </Button>

              <div className="flex items-center gap-4 mb-4">
                <span className="text-6xl drop-shadow-lg">{matchedCategory.icon}</span>
                <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight drop-shadow-lg">
                  {matchedCategory.name}
                </h1>
              </div>
              <p className="text-xl text-white/95 max-w-2xl drop-shadow-md">
                {matchedCategory.description}
              </p>
            </div>
          </div>

          {/* Subtopics Section - Separate from hero with homepage background */}
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
              {/* Breadcrumbs */}
              <div className="mb-8 flex items-center gap-2 text-sm">
                <button
                  onClick={() => navigate('/discover')}
                  className="text-blue-600 hover:text-blue-700 transition-colors font-medium"
                >
                  Discover
                </button>
                {breadcrumbs.map((crumb, idx) => (
                  <div key={crumb.path} className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                    <button
                      onClick={() => handleBreadcrumbClick(crumb.path)}
                      className={`transition-colors ${
                        idx === breadcrumbs.length - 1
                          ? 'text-slate-900 font-semibold'
                          : 'text-blue-600 hover:text-blue-700'
                      }`}
                    >
                      {crumb.name}
                    </button>
                  </div>
                ))}
              </div>

              {guideSection}

              {/* Error State */}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center mb-8">
                  <p className="text-red-800 font-medium">{error}</p>
                  <Button onClick={loadSubtopics} className="mt-4">
                    Try Again
                  </Button>
                </div>
              )}

              {/* Loading State - Skeleton Grid */}
              {subtopicsLoading && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[...Array(6)].map((_, idx) => (
                    <div
                      key={idx}
                      className="animate-pulse rounded-xl bg-white border border-slate-200 shadow-sm p-6"
                    >
                      <div className="h-5 bg-slate-200 rounded w-3/4 mb-3"></div>
                      <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              )}

              {/* Subtopics Grid */}
              {!subtopicsLoading && !error && subtopics.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {subtopics.map((topic, idx) => (
                    <div
                      key={topic.id}
                      className="animate-in fade-in slide-in-from-bottom duration-500"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <button
                        onClick={() => handleTopicClick(topic)}
                        className="group relative w-full rounded-xl bg-gradient-to-br from-white via-white to-slate-50 border border-slate-200/50 shadow-sm hover:shadow-lg p-6 text-left transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
                      >
                        {/* Gradient Accent Border on Hover */}
                        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 pointer-events-none" />

                        {/* Content */}
                        <div className="relative">
                          {/* Topic Name */}
                          <h3 className="text-lg font-semibold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors leading-tight">
                            {topic.name}
                          </h3>

                          {/* Article Count Badge */}
                          {topic.article_count > 0 && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm text-slate-600 bg-slate-100/80 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                              <TrendingUp className="h-3.5 w-3.5" />
                              <span className="font-medium">{topic.article_count} articles</span>
                            </div>
                          )}

                          {/* Hover Arrow */}
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1">
                            <ChevronRight className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>

                        {/* Hover Effect Line */}
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!subtopicsLoading && !error && subtopics.length === 0 && (
                <div className="text-center py-16">
                  <Sparkles className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 mb-4">No subtopics available for this topic yet.</p>
                  <Button onClick={handleOverviewClick}>
                    View Overview Instead
                  </Button>
                </div>
              )}

              {/* Footer Info */}
              {!subtopicsLoading && !error && subtopics.length > 0 && (
                <div className="mt-12 text-center text-sm text-slate-500">
                  <p>
                    Click any topic to explore deeper, or use &quot;Get Overview&quot; to see articles at this level.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Content section for non-category pages */}
      {!matchedCategory && (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 pt-20">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {/* Breadcrumbs */}
            <div className="mb-6 flex items-center gap-2 text-sm">
              <button
                onClick={() => navigate('/discover')}
                className="text-blue-600 hover:text-blue-700 transition-colors"
              >
                Discover
              </button>
              {breadcrumbs.map((crumb, idx) => (
                <div key={crumb.path} className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                  <button
                    onClick={() => handleBreadcrumbClick(crumb.path)}
                    className={`transition-colors ${
                      idx === breadcrumbs.length - 1
                        ? 'text-slate-900 font-medium'
                        : 'text-blue-600 hover:text-blue-700'
                    }`}
                  >
                    {crumb.name}
                  </button>
                </div>
              ))}
            </div>

            {/* Topic Header - Only show if no hero section and topic is loaded */}
            {currentTopic && (
              <div className="mb-8">
                <h1 className="text-4xl font-bold text-slate-900 mb-2">{currentTopic.name}</h1>
                {currentTopic.description && (
                  <p className="text-lg text-slate-600">{currentTopic.description}</p>
                )}
                <div className="mt-4">
                  <Button
                    variant="outline"
                    onClick={handleOverviewClick}
                    className="flex items-center gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Get Overview
                  </Button>
                </div>
              </div>
            )}

            {guideSection}

            {/* Error State */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center mb-8">
                <p className="text-red-800">{error}</p>
                <Button onClick={loadSubtopics} className="mt-4">
                  Try Again
                </Button>
              </div>
            )}

            {/* Loading State - Skeleton Grid */}
            {subtopicsLoading && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(8)].map((_, idx) => (
                  <div
                    key={idx}
                    className="animate-pulse rounded-xl bg-white border border-slate-200/50 shadow-sm p-6"
                  >
                    <div className="h-5 bg-slate-200 rounded w-3/4 mb-3"></div>
                    <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            )}

            {/* Subtopics Grid */}
            {!subtopicsLoading && !error && subtopics.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {subtopics.map((topic, idx) => (
                  <div
                    key={topic.id}
                    className="animate-in fade-in slide-in-from-bottom duration-500"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <button
                      onClick={() => handleTopicClick(topic)}
                      className="group relative w-full rounded-xl bg-gradient-to-br from-white via-white to-slate-50 border border-slate-200/50 shadow-sm hover:shadow-lg p-6 text-left transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
                    >
                      {/* Gradient Accent Border on Hover */}
                      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 pointer-events-none" />

                      {/* Content */}
                      <div className="relative">
                        {/* Topic Name */}
                        <h3 className="text-lg font-semibold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors leading-tight">
                          {topic.name}
                        </h3>

                        {/* Article Count Badge */}
                        {topic.article_count > 0 && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm text-slate-600 bg-slate-100/80 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                            <TrendingUp className="h-3.5 w-3.5" />
                            <span className="font-medium">{topic.article_count} articles</span>
                          </div>
                        )}

                        {/* Hover Arrow */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1">
                          <ChevronRight className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>

                      {/* Hover Effect Line */}
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!subtopicsLoading && !error && subtopics.length === 0 && (
              <div className="text-center py-16">
                <Sparkles className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 mb-4">No subtopics available for this topic yet.</p>
                <Button onClick={handleOverviewClick}>
                  View Overview Instead
                </Button>
              </div>
            )}

            {/* Footer Info */}
            {!subtopicsLoading && !error && subtopics.length > 0 && (
              <div className="mt-12 text-center text-sm text-slate-500">
                <p>
                  Click any topic to explore deeper, or use &quot;Get Overview&quot; to see articles at this level.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
