import { useCallback, useEffect, useMemo, useState } from 'react'
import { Sparkles, Compass, TrendingUp, Globe, RefreshCcw, Loader2 } from 'lucide-react'
import { Button } from '@ui/button'
import { fetchTrendingTopics } from '@/services/openaiService'
import { getSearchHistory } from '@/features/search/services/searchHistoryService'
import { userInterestTracker } from '@/services/userInterestTracker'
import {
  buildSuggestions,
  type Suggestion,
  type SuggestionSource,
} from '@/features/personalization/buildSuggestions'

interface SuggestedSearchesProps {
  userId?: string
  onSuggestionClick: (query: string) => void
}

const iconBySource: Record<SuggestionSource, JSX.Element> = {
  search: <Sparkles className="h-4 w-4 text-blue-500" />,
  explore: <Compass className="h-4 w-4 text-emerald-500" />,
  trending: <TrendingUp className="h-4 w-4 text-purple-500" />,
  fallback: <Globe className="h-4 w-4 text-slate-500" />,
}

export const SuggestedSearches = ({ userId, onSuggestionClick }: SuggestedSearchesProps) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [history, trending] = await Promise.all([
        userId ? getSearchHistory(userId, 25) : Promise.resolve([]),
        fetchTrendingTopics(userId),
      ])

      const historyTerms = history.map((item) => item.topic)
      const localTerms = userInterestTracker.getTopSearchTerms(15)
      const exploreTopics = userInterestTracker.getTopExploreTopics(15)

      const combinedTerms = [...historyTerms, ...localTerms]

      const built = buildSuggestions(combinedTerms, exploreTopics, trending, 3)
      setSuggestions(built)
    } catch (err) {
      console.error('Failed to load suggested searches:', err)
      setError('Could not personalize suggestions right now.')
      const fallback = buildSuggestions([], [], [], 3)
      setSuggestions(fallback)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  const headerDescription = useMemo(() => {
    if (loading) return 'Gathering real-time ideas...'
    if (error) return error
    return 'Pick a topic and we will pull the latest coverage for you.'
  }, [loading, error])

  return (
    <div className="max-w-[900px] mx-auto mb-10 animate-in fade-in slide-in-from-bottom duration-700 delay-500">
      <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm px-6 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Suggested Articles Based on Your Interests
            </p>
            <p className="text-sm text-slate-500">{headerDescription}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="self-start sm:self-auto text-slate-600 hover:text-slate-900"
            onClick={load}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {loading
            ? Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-24 rounded-xl bg-slate-100/70 animate-pulse"
                />
              ))
            : suggestions.map((suggestion) => (
                <button
                  key={suggestion.query}
                  type="button"
                  onClick={() => onSuggestionClick(suggestion.query)}
                  className="group flex h-full flex-col items-start gap-3 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-white px-4 py-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg"
                >
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 transition-colors group-hover:bg-blue-50 group-hover:text-blue-700">
                    {iconBySource[suggestion.source]}
                    {suggestion.source === 'search' && 'From your searches'}
                    {suggestion.source === 'explore' && 'From explored topics'}
                    {suggestion.source === 'trending' && 'Trending now'}
                    {suggestion.source === 'fallback' && 'Curated for you'}
                  </span>
                  <span className="text-base font-semibold text-slate-900 leading-tight">
                    {suggestion.query}
                  </span>
                  <span className="text-xs text-slate-500">{suggestion.reason}</span>
                </button>
              ))}
        </div>
      </div>
    </div>
  )
}
