import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Input } from '@ui/input'
import { useToast } from '@shared/hooks/use-toast'
import { useAuth } from '@features/auth'
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
  RefreshCw,
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

  const handleSearchAgain = (topic: string) => {
    navigate('/', { state: { searchTopic: topic } })
    toast({
      title: 'Re-running Search',
      description: `Searching for: ${topic}`,
    })
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
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-stone-600" />
          <p className="text-stone-600">Loading your data...</p>
        </div>
      </div>
    )
  }

  const renderHistoryGroup = (title: string, items: SearchHistoryItem[]) => {
    if (items.length === 0) return null

    return (
      <div key={title} className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-4 w-4 text-stone-500" />
          <h3 className="text-sm font-medium text-stone-700">{title}</h3>
          <span className="text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        </div>
        <div className="space-y-3">
          {items.map((item) => (
            <Card
              key={item.id}
              className="border border-stone-200 bg-white hover:border-stone-300 transition-colors"
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-lg text-stone-900 mb-1">{item.topic}</h4>
                    <p className="text-sm text-stone-600 mb-2">{item.news_data.headline}</p>
                    <p className="text-xs text-stone-500">
                      Searched on {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSearchAgain(item.topic)}
                      className="h-8 px-3 text-xs font-medium border-stone-300 text-stone-700 hover:bg-stone-50"
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      Search Again
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/', { state: { newsData: item.news_data, topic: item.topic } })}
                      className="h-8 px-3 text-xs font-medium border-stone-300 text-stone-700 hover:bg-stone-50"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      View Results
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setItemToDelete(item)}
                      className="h-8 w-8 p-0 ml-auto border-stone-300 text-stone-400 hover:text-red-600 hover:border-red-300 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-neutral-100">
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            className="mb-6 text-stone-700 hover:text-stone-900 hover:bg-stone-200/50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to NewsGlide
          </Button>

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <img
                src="/lovable-uploads/4aa0d947-eb92-4247-965f-85f5d500d005.png"
                alt="NewsGlide Logo"
                className="h-10 w-10"
              />
              <h1 className="text-3xl font-semibold text-stone-800 tracking-tight">
                Search History & Saved Articles
              </h1>
            </div>

            {activeTab === 'history' && historyItems.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setShowClearConfirm(true)}
                className="border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300 transition-colors"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All History
              </Button>
            )}
          </div>
        </div>

        {/* Main Content with Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'history' | 'saved')}
        >
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-white border border-stone-200 p-1 rounded-lg shadow-sm">
            <TabsTrigger
              value="history"
              className="data-[state=active]:bg-stone-100 data-[state=active]:text-stone-900 data-[state=active]:shadow-sm text-stone-600 hover:text-stone-900 transition-all"
            >
              <History className="h-4 w-4 mr-2" />
              Search History ({historyItems.length})
            </TabsTrigger>
            <TabsTrigger
              value="saved"
              className="data-[state=active]:bg-stone-100 data-[state=active]:text-stone-900 data-[state=active]:shadow-sm text-stone-600 hover:text-stone-900 transition-all"
            >
              <BookmarkIcon className="h-4 w-4 mr-2" />
              Saved Articles ({savedArticles.length})
            </TabsTrigger>
          </TabsList>

          {/* Search History Tab */}
          <TabsContent value="history">
            {historyItems.length === 0 ? (
              <Card className="border border-stone-200 shadow-sm bg-white">
                <CardContent className="p-12 text-center">
                  <History className="h-16 w-16 mx-auto mb-4 text-stone-300" />
                  <h3 className="text-xl font-semibold mb-2 text-stone-700">
                    No Search History Yet
                  </h3>
                  <p className="text-stone-500 mb-6">
                    Start exploring news topics and your searches will appear here!
                  </p>
                  <Button
                    onClick={() => navigate('/')}
                    className="bg-stone-800 hover:bg-stone-900 text-white shadow-sm transition-colors"
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
            <Card className="border border-stone-200 shadow-sm bg-white mb-6">
              <CardContent className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <Input
                      placeholder="Search saved articles..."
                      value={savedSearchQuery}
                      onChange={(e) => setSavedSearchQuery(e.target.value)}
                      className="pl-10 border-stone-300 focus:border-stone-400 focus:ring-stone-400"
                    />
                  </div>

                  <Select value={selectedTag} onValueChange={setSelectedTag}>
                    <SelectTrigger className="border-stone-300 focus:border-stone-400 focus:ring-stone-400">
                      <Tag className="h-4 w-4 mr-2 text-stone-500" />
                      <SelectValue placeholder="Filter by tag" />
                    </SelectTrigger>
                    <SelectContent className="border-stone-200">
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
                      <SelectTrigger className="border-stone-300 focus:border-stone-400 focus:ring-stone-400">
                        <Filter className="h-4 w-4 mr-2 text-stone-500" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-stone-200">
                        <SelectItem value="date">Date Saved</SelectItem>
                        <SelectItem value="title">Title</SelectItem>
                        <SelectItem value="topic">Topic</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                      className="border-stone-300 hover:bg-stone-50 hover:border-stone-400"
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
              <Card className="border border-stone-200 shadow-sm bg-white">
                <CardContent className="p-12 text-center">
                  <BookmarkIcon className="h-16 w-16 mx-auto mb-4 text-stone-300" />
                  <h3 className="text-xl font-semibold mb-2 text-stone-700">
                    {savedArticles.length === 0
                      ? 'No Saved Articles Yet'
                      : 'No Articles Match Your Filters'}
                  </h3>
                  <p className="text-stone-500 mb-6">
                    {savedArticles.length === 0
                      ? 'Start exploring news and save articles that interest you!'
                      : 'Try adjusting your search or filter criteria.'}
                  </p>
                  {savedArticles.length === 0 && (
                    <Button
                      onClick={() => navigate('/')}
                      className="bg-stone-800 hover:bg-stone-900 text-white shadow-sm transition-colors"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Start Exploring
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredSavedArticles.map((article) => (
                  <Card
                    key={article.id}
                    className="border border-stone-200 bg-white hover:border-stone-300 transition-colors"
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold text-lg text-stone-900 mb-1">
                            {article.headline}
                          </h4>
                          <p className="text-sm text-stone-600 mb-2">Topic: {article.topic}</p>

                          {article.tags && article.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {article.tags.map((tag, i) => (
                                <Badge
                                  key={i}
                                  variant="secondary"
                                  className="text-xs bg-stone-100 text-stone-700 border-stone-200 font-normal"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {article.notes && (
                            <p className="text-sm text-stone-600 mb-2 bg-stone-50 rounded px-3 py-2 border border-stone-200">
                              <span className="font-medium text-stone-800">Notes:</span>{' '}
                              {article.notes}
                            </p>
                          )}

                          <p className="text-xs text-stone-500">
                            Saved on {new Date(article.saved_at).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/', { state: { newsData: article.article_data, topic: article.topic } })}
                            className="h-8 px-3 text-xs font-medium border-stone-300 text-stone-700 hover:bg-stone-50"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1.5" />
                            View Article
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteSavedArticle(article)}
                            className="h-8 w-8 p-0 ml-auto border-stone-300 text-stone-400 hover:text-red-600 hover:border-red-300 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
          <AlertDialogContent>
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
          <AlertDialogContent>
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
  )
}

export default SearchHistory
