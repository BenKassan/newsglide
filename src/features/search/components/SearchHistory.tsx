import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Input } from '@ui/input'
import { useToast } from '@shared/hooks/use-toast'
import { useAuth } from '@features/auth'
import { ArticleViewer } from '@features/articles'
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
  updateArticleNotes,
  updateArticleTags,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@ui/dialog'
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

type SelectedItem = SearchHistoryItem | SavedArticle | null

const SearchHistory = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [historyItems, setHistoryItems] = useState<SearchHistoryItem[]>([])
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([])
  const [filteredSavedArticles, setFilteredSavedArticles] = useState<SavedArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null)
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

      if (selectedItem?.id === itemToDelete.id) {
        setSelectedItem(null)
      }
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

      if (selectedItem?.id === article.id) {
        setSelectedItem(null)
      }
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading your data...</p>
        </div>
      </div>
    )
  }

  const renderHistoryGroup = (title: string, items: SearchHistoryItem[]) => {
    if (items.length === 0) return null

    return (
      <div key={title} className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-700 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {title}
          <Badge variant="outline">{items.length}</Badge>
        </h3>
        <div className="space-y-4">
          {items.map((item) => (
            <Card
              key={item.id}
              className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg mb-1">{item.topic}</h4>
                    <p className="text-sm text-blue-600 mb-2 line-clamp-1">
                      {item.news_data.headline}
                    </p>
                    <p className="text-xs text-gray-500">
                      Searched on {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSearchAgain(item.topic)}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Search Again
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setSelectedItem(item)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Results
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setItemToDelete(item)}
                      className="text-red-600 hover:text-red-700"
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <Button onClick={() => navigate('/')} variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to NewsGlide
          </Button>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <img
                src="/lovable-uploads/4aa0d947-eb92-4247-965f-85f5d500d005.png"
                alt="NewsGlide Logo"
                className="h-8 w-8"
              />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Search History & Saved Articles
              </h1>
            </div>

            {activeTab === 'history' && historyItems.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setShowClearConfirm(true)}
                className="text-red-600 hover:text-red-700"
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
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              Search History ({historyItems.length})
            </TabsTrigger>
            <TabsTrigger value="saved">
              <BookmarkIcon className="h-4 w-4 mr-2" />
              Saved Articles ({savedArticles.length})
            </TabsTrigger>
          </TabsList>

          {/* Search History Tab */}
          <TabsContent value="history">
            {historyItems.length === 0 ? (
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardContent className="p-12 text-center">
                  <History className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-xl font-semibold mb-2 text-gray-600">
                    No Search History Yet
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Start exploring news topics and your searches will appear here!
                  </p>
                  <Button onClick={() => navigate('/')}>
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
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm mb-6">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search saved articles..."
                      value={savedSearchQuery}
                      onChange={(e) => setSavedSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <Select value={selectedTag} onValueChange={setSelectedTag}>
                    <SelectTrigger>
                      <Tag className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by tag" />
                    </SelectTrigger>
                    <SelectContent>
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
                      <SelectTrigger>
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date Saved</SelectItem>
                        <SelectItem value="title">Title</SelectItem>
                        <SelectItem value="topic">Topic</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
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
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardContent className="p-12 text-center">
                  <BookmarkIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-xl font-semibold mb-2 text-gray-600">
                    {savedArticles.length === 0
                      ? 'No Saved Articles Yet'
                      : 'No Articles Match Your Filters'}
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {savedArticles.length === 0
                      ? 'Start exploring news and save articles that interest you!'
                      : 'Try adjusting your search or filter criteria.'}
                  </p>
                  {savedArticles.length === 0 && (
                    <Button onClick={() => navigate('/')}>
                      <Search className="h-4 w-4 mr-2" />
                      Start Exploring
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {filteredSavedArticles.map((article) => (
                  <Card
                    key={article.id}
                    className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg mb-1">{article.headline}</h4>
                          <p className="text-sm text-blue-600 mb-2">Topic: {article.topic}</p>

                          {article.tags && article.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {article.tags.map((tag, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {article.notes && (
                            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                              <span className="font-medium">Notes:</span> {article.notes}
                            </p>
                          )}

                          <p className="text-xs text-gray-500">
                            Saved on {new Date(article.saved_at).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedItem(article)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteSavedArticle(article)}
                            className="text-red-600 hover:text-red-700"
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

        {/* Results Viewer Modal */}
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedItem && 'article_data' in selectedItem
                  ? 'Saved Article'
                  : 'Search Results'}
              </DialogTitle>
            </DialogHeader>
            {selectedItem && (
              <ArticleViewer
                article={
                  'article_data' in selectedItem
                    ? (selectedItem as SavedArticle)
                    : {
                        id: selectedItem.id,
                        user_id: selectedItem.user_id,
                        headline: selectedItem.news_data.headline,
                        topic: selectedItem.topic,
                        article_data: selectedItem.news_data,
                        notes: '',
                        tags: [],
                        saved_at: selectedItem.created_at,
                      }
                }
                showEditableFields={'article_data' in selectedItem}
                onUpdateNotes={(notes) => {
                  if ('article_data' in selectedItem) {
                    updateArticleNotes(selectedItem.id, notes)
                    setSavedArticles((prev) =>
                      prev.map((a) => (a.id === selectedItem.id ? { ...a, notes } : a))
                    )
                  }
                }}
                onUpdateTags={(tags) => {
                  if ('article_data' in selectedItem) {
                    updateArticleTags(selectedItem.id, tags)
                    setSavedArticles((prev) =>
                      prev.map((a) => (a.id === selectedItem.id ? { ...a, tags } : a))
                    )
                  }
                }}
              />
            )}
          </DialogContent>
        </Dialog>

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
