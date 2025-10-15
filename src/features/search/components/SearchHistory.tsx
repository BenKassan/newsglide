import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@ui/card'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Input } from '@ui/input'
import { useToast } from '@shared/hooks/use-toast'
import { useAuth } from '@features/auth'
import UnifiedNavigation from '@/components/UnifiedNavigation'
import AmbientBackground from '@/components/AmbientBackground'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import {
  getSearchHistory,
  deleteSearchItem,
  clearAllHistory,
  SearchHistoryItem,
} from '../services/searchHistoryService'
import {
  SavedArticle,
  getSavedArticles,
  deleteArticle,
} from '@features/articles'
import {
  History,
  Search,
  Eye,
  Trash2,
  ArrowLeft,
  Calendar,
  Loader2,
  BookmarkIcon,
  Tag,
  Filter,
  SortAsc,
  SortDesc,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@ui/alert-dialog'

const SearchHistory = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [historyItems, setHistoryItems] = useState<SearchHistoryItem[]>([])
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([])
  const [filteredSavedArticles, setFilteredSavedArticles] = useState<SavedArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<SearchHistoryItem | null>(null)
  const [activeTab, setActiveTab] = useState<'history' | 'saved'>('history')

  // Saved articles filters
  const [savedSearchQuery, setSavedSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'topic'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    if (!user) {
      navigate('/')
      return
    }
    loadHistory()
    loadSavedArticles()
  }, [user, navigate])

  useEffect(() => {
    filterAndSortSavedArticles()
  }, [savedArticles, savedSearchQuery, selectedTag, sortBy, sortOrder])

  const loadHistory = async () => {
    if (!user) return

    setLoading(true)
    try {
      const history = await getSearchHistory(user.id)
      setHistoryItems(history)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load search history. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const loadSavedArticles = async () => {
    if (!user) return

    try {
      const articles = await getSavedArticles(user.id)
      setSavedArticles(articles)
      setFilteredSavedArticles(articles)
    } catch (error) {
      console.error('Failed to load saved articles:', error)
    }
  }

  const filterAndSortSavedArticles = () => {
    let filtered = [...savedArticles]

    // Filter by search query
    if (savedSearchQuery.trim()) {
      const query = savedSearchQuery.toLowerCase()
      filtered = filtered.filter(
        (article) =>
          article.headline.toLowerCase().includes(query) ||
          article.topic.toLowerCase().includes(query) ||
          article.notes?.toLowerCase().includes(query) ||
          article.tags?.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    // Filter by tag
    if (selectedTag && selectedTag !== 'all') {
      filtered = filtered.filter((article) => article.tags?.includes(selectedTag))
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: string | Date
      let bValue: string | Date

      switch (sortBy) {
        case 'date':
          aValue = new Date(a.saved_at)
          bValue = new Date(b.saved_at)
          break
        case 'title':
          aValue = a.headline.toLowerCase()
          bValue = b.headline.toLowerCase()
          break
        case 'topic':
          aValue = a.topic.toLowerCase()
          bValue = b.topic.toLowerCase()
          break
        default:
          aValue = new Date(a.saved_at)
          bValue = new Date(b.saved_at)
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    setFilteredSavedArticles(filtered)
  }

  const getAllTags = () => {
    const tagSet = new Set<string>()
    savedArticles.forEach((article) => {
      article.tags?.forEach((tag) => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  }


  const handleDeleteItem = async () => {
    if (!itemToDelete) return

    const success = await deleteSearchItem(itemToDelete.id)
    if (success) {
      setHistoryItems((prev) => prev.filter((item) => item.id !== itemToDelete.id))
      toast({
        title: 'Search Deleted',
        description: 'The search has been removed from your history.',
      })
    } else {
      toast({
        title: 'Error',
        description: 'Failed to delete search. Please try again.',
        variant: 'destructive',
      })
    }
    setItemToDelete(null)
  }

  const handleDeleteSavedArticle = async (article: SavedArticle) => {
    const success = await deleteArticle(article.id)
    if (success) {
      setSavedArticles((prev) => prev.filter((a) => a.id !== article.id))
      toast({
        title: 'Article Deleted',
        description: 'The article has been removed from your saved articles.',
      })
    } else {
      toast({
        title: 'Error',
        description: 'Failed to delete article. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleClearAllHistory = async () => {
    if (!user) return

    const success = await clearAllHistory(user.id)
    if (success) {
      setHistoryItems([])
      toast({
        title: 'History Cleared',
        description: 'All search history has been removed.',
      })
    } else {
      toast({
        title: 'Error',
        description: 'Failed to clear history. Please try again.',
        variant: 'destructive',
      })
    }
    setShowClearConfirm(false)
  }

  const groupHistoryByTime = (items: SearchHistoryItem[]) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thisMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    const groups = {
      today: [] as SearchHistoryItem[],
      yesterday: [] as SearchHistoryItem[],
      thisWeek: [] as SearchHistoryItem[],
      thisMonth: [] as SearchHistoryItem[],
      older: [] as SearchHistoryItem[],
    }

    items.forEach((item) => {
      const itemDate = new Date(item.created_at)

      if (itemDate >= today) {
        groups.today.push(item)
      } else if (itemDate >= yesterday) {
        groups.yesterday.push(item)
      } else if (itemDate >= thisWeek) {
        groups.thisWeek.push(item)
      } else if (itemDate >= thisMonth) {
        groups.thisMonth.push(item)
      } else {
        groups.older.push(item)
      }
    })

    return groups
  }

  const groupedHistory = groupHistoryByTime(historyItems)

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <AmbientBackground />
        <div className="relative z-10">
          <UnifiedNavigation />
          <div className="flex items-center justify-center min-h-[calc(100vh-5rem)] pt-24 pb-12 px-6">
            <div className="glass-card glass-card-hover rounded-2xl px-10 py-8 text-center border border-slate-200/60 shadow-xl">
              <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-sky-500" />
              <p className="text-slate-600 text-lg font-medium">Loading your data...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderHistoryGroup = (title: string, items: SearchHistoryItem[]) => {
    if (items.length === 0) return null

    return (
      <div key={title} className="mb-10">
        <div className="flex items-center gap-2 mb-4 text-slate-700">
          <Calendar className="h-4 w-4 text-sky-500" />
          <h3 className="text-base font-semibold">{title}</h3>
          <span className="text-xs text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">{items.length}</span>
        </div>
        <div className="space-y-4">
          {items.map((item) => (
            <Card
              key={item.id}
              className="glass-card glass-card-hover border border-slate-200/60 shadow-lg hover:shadow-xl"
            >
              <CardContent className="p-5">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-lg text-slate-900 mb-1">{item.topic}</h4>
                    <p className="text-sm text-slate-600 mb-2">{item.news_data.headline}</p>
                    <p className="text-xs text-slate-500">
                      Searched on {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-200/60">
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() =>
                        navigate('/', {
                          state: { newsData: item.news_data, topic: item.topic, historyId: item.id },
                        })
                      }
                      className="h-9 px-4 text-sm font-medium bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-sm hover:shadow-md hover:from-blue-500 hover:to-cyan-400 border-0"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Article
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setItemToDelete(item)}
                      className="h-9 w-9 p-0 ml-auto glass-card border-red-200 text-red-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AmbientBackground />
      <div className="relative z-10">
        <UnifiedNavigation />
        <div className="container mx-auto px-6 pt-24 pb-16 max-w-6xl">
        {/* Header */}
        <div className="mb-10">
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            className="mb-6 glass-card glass-card-hover px-4 py-2 text-slate-700 hover:text-slate-900 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to NewsGlide
          </Button>

          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <img
                src="/lovable-uploads/4aa0d947-eb92-4247-965f-85f5d500d005.png"
                alt="NewsGlide Logo"
                className="h-12 w-12 drop-shadow-lg"
              />
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">
                  Search History & Saved Articles
                </h1>
                <p className="text-slate-600 mt-1">
                  Revisit your past explorations and pick up where you left off.
                </p>
              </div>
            </div>

            {activeTab === 'history' && historyItems.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setShowClearConfirm(true)}
                className="glass-card glass-card-hover border-red-200 text-red-600 hover:text-red-700 hover:border-red-300"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All History
              </Button>
            )}
          </div>
        </div>

        {/* Main Content with Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'history' | 'saved')}>
          <TabsList className="grid w-full grid-cols-2 mb-8 glass-card glass-card-hover border border-slate-200/60 p-1 rounded-xl shadow-lg">
            <TabsTrigger
              value="history"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-md text-slate-600 hover:text-slate-900 transition-all"
            >
              <History className="h-4 w-4 mr-2" />
              Search History ({historyItems.length})
            </TabsTrigger>
            <TabsTrigger
              value="saved"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-md text-slate-600 hover:text-slate-900 transition-all"
            >
              <BookmarkIcon className="h-4 w-4 mr-2" />
              Saved Articles ({savedArticles.length})
            </TabsTrigger>
          </TabsList>

          {/* Search History Tab */}
          <TabsContent value="history">
            {historyItems.length === 0 ? (
              <Card className="glass-card glass-card-hover border border-slate-200/60 shadow-xl">
                <CardContent className="p-12 text-center">
                  <History className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-2xl font-semibold mb-2 text-slate-800">No Search History Yet</h3>
                  <p className="text-slate-600 mb-6">
                    Start exploring topics and your searches will be saved automatically.
                  </p>
                  <Button
                    onClick={() => navigate('/')}
                    className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-md hover:shadow-lg"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Start Searching
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div>
                {renderHistoryGroup('Today', groupedHistory.today)}
                {renderHistoryGroup('Yesterday', groupedHistory.yesterday)}
                {renderHistoryGroup('This Week', groupedHistory.thisWeek)}
                {renderHistoryGroup('This Month', groupedHistory.thisMonth)}
                {renderHistoryGroup('Older', groupedHistory.older)}
              </div>
            )}
          </TabsContent>

          {/* Saved Articles Tab */}
          <TabsContent value="saved">
            {/* Filter Controls */}
            <Card className="glass-card glass-card-hover border border-slate-200/60 shadow-xl mb-6">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search saved articles..."
                      value={savedSearchQuery}
                      onChange={(e) => setSavedSearchQuery(e.target.value)}
                      className="pl-11 glass-card border border-slate-200/60 text-slate-700 placeholder:text-slate-400 focus:border-sky-300 focus:ring-sky-200"
                    />
                  </div>

                  <Select value={selectedTag} onValueChange={setSelectedTag}>
                    <SelectTrigger className="glass-card border border-slate-200/60 text-slate-700">
                      <Tag className="h-4 w-4 mr-2 text-slate-500" />
                      <SelectValue placeholder="Filter by tag" />
                    </SelectTrigger>
                    <SelectContent className="bg-white/90 backdrop-blur-xl border border-slate-200/60">
                      <SelectItem value="all">All tags</SelectItem>
                      {getAllTags().map((tag) => (
                        <SelectItem key={tag} value={tag}>
                          {tag}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex gap-2">
                    <Select
                      value={sortBy}
                      onValueChange={(value: 'date' | 'title' | 'topic') => setSortBy(value)}
                    >
                      <SelectTrigger className="glass-card border border-slate-200/60 text-slate-700">
                        <Filter className="h-4 w-4 mr-2 text-slate-500" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white/90 backdrop-blur-xl border border-slate-200/60">
                        <SelectItem value="date">Date Saved</SelectItem>
                        <SelectItem value="title">Title</SelectItem>
                        <SelectItem value="topic">Topic</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                      className="glass-card glass-card-hover border border-slate-200/60 text-slate-600 hover:text-slate-900"
                    >
                      {sortOrder === 'asc' ? (
                        <SortAsc className="h-4 w-4" />
                      ) : (
                        <SortDesc className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Saved Articles List */}
            {filteredSavedArticles.length === 0 ? (
              <Card className="glass-card glass-card-hover border border-slate-200/60 shadow-xl">
                <CardContent className="p-12 text-center">
                  <BookmarkIcon className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-2xl font-semibold mb-2 text-slate-800">
                    {savedArticles.length === 0
                      ? 'No Saved Articles Yet'
                      : 'No Articles Match Your Filters'}
                  </h3>
                  <p className="text-slate-600 mb-6">
                    {savedArticles.length === 0
                      ? 'Start exploring news and save articles that inspire you.'
                      : 'Try adjusting your search or filter criteria.'}
                  </p>
                  {savedArticles.length === 0 && (
                    <Button
                      onClick={() => navigate('/')}
                      className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-md hover:shadow-lg"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Start Exploring
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredSavedArticles.map((article) => (
                  <Card
                    key={article.id}
                    className="glass-card glass-card-hover border border-slate-200/60 shadow-lg hover:shadow-xl"
                  >
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-xl text-slate-900 mb-1">
                            {article.headline}
                          </h4>
                          <p className="text-sm text-slate-600">Topic: {article.topic}</p>

                          {article.tags && article.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {article.tags.map((tag, i) => (
                                <Badge
                                  key={i}
                                  variant="secondary"
                                  className="text-xs bg-sky-100 text-sky-700 border-sky-200 font-medium"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {article.notes && (
                            <p className="text-sm text-slate-600 bg-white/70 border border-slate-200/60 rounded-lg px-3 py-2">
                              <span className="font-medium text-slate-800">Notes:</span>{' '}
                              {article.notes}
                            </p>
                          )}

                          <p className="text-xs text-slate-500 mt-1">
                            Saved on {new Date(article.saved_at).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 pt-3 border-t border-slate-200/60">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigate('/', {
                                state: {
                                  newsData: article.article_data,
                                  topic: article.topic,
                                  historyId: article.search_history_id,
                                },
                              })
                          }
                      className="h-9 px-4 text-sm font-medium bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-sm hover:shadow-md hover:from-blue-500 hover:to-cyan-400 border-0"
                    >
                            <Eye className="h-4 w-4 mr-2" />
                            View Article
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDeleteSavedArticle(article)}
                            className="h-9 w-9 p-0 ml-auto glass-card border-red-200 text-red-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation */}
        <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
          <AlertDialogContent className="glass-card border border-slate-200/60 shadow-xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Search</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this search from your history? This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteItem} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Clear All Confirmation */}
        <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
          <AlertDialogContent className="glass-card border border-slate-200/60 shadow-xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Clear All History</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to clear all your search history? This will permanently delete
                all {historyItems.length} searches and cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleClearAllHistory}
                className="bg-red-600 hover:bg-red-700"
              >
                Clear All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  </div>
  )
}

export default SearchHistory
