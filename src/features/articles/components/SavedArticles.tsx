import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Badge } from '@ui/badge'
import { useToast } from '@shared/hooks/use-toast'
import { useAuth } from '@features/auth'
import { ArticleViewer } from './ArticleViewer'
import { getSavedArticles, deleteArticle, SavedArticle } from '../services/savedArticlesService'
import {
  BookmarkIcon,
  Search,
  Calendar,
  Tag,
  Trash2,
  Eye,
  Filter,
  SortAsc,
  SortDesc,
  ArrowLeft,
  Loader2,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
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

const SavedArticles: React.FC = React.memo(() => {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [articles, setArticles] = useState<SavedArticle[]>([])
  const [filteredArticles, setFilteredArticles] = useState<SavedArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string>('')
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'topic'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedArticle, setSelectedArticle] = useState<SavedArticle | null>(null)
  const [articleToDelete, setArticleToDelete] = useState<SavedArticle | null>(null)

  useEffect(() => {
    if (!user) {
      navigate('/')
      return
    }
    loadArticles()
  }, [user, navigate])

  useEffect(() => {
    filterAndSortArticles()
  }, [articles, searchQuery, selectedTag, sortBy, sortOrder])

  const loadArticles = async () => {
    if (!user) return

    setLoading(true)
    try {
      const savedArticles = await getSavedArticles(user.id)
      setArticles(savedArticles)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load saved articles. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortArticles = useCallback(() => {
    let filtered = [...articles]

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (article) =>
          article.headline.toLowerCase().includes(query) ||
          article.topic.toLowerCase().includes(query) ||
          article.notes?.toLowerCase().includes(query) ||
          article.tags?.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    // Filter by tag
    if (selectedTag) {
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

    setFilteredArticles(filtered)
  }, [articles, searchQuery, selectedTag, sortBy, sortOrder])

  const handleDeleteArticle = useCallback(async () => {
    if (!articleToDelete) return

    const success = await deleteArticle(articleToDelete.id)
    if (success) {
      setArticles((prev) => prev.filter((a) => a.id !== articleToDelete.id))
      toast({
        title: 'Article Deleted',
        description: 'The article has been removed from your saved articles.',
      })

      // Close modal if deleted article was being viewed
      if (selectedArticle?.id === articleToDelete.id) {
        setSelectedArticle(null)
      }
    } else {
      toast({
        title: 'Error',
        description: 'Failed to delete article. Please try again.',
        variant: 'destructive',
      })
    }
    setArticleToDelete(null)
  }, [articleToDelete, selectedArticle, toast])

  const getAllTags = useMemo(() => {
    const tagSet = new Set<string>()
    articles.forEach((article) => {
      article.tags?.forEach((tag) => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  }, [articles])

  const handleUpdateNotes = useCallback((articleId: string, notes: string) => {
    setArticles((prev) =>
      prev.map((article) => (article.id === articleId ? { ...article, notes } : article))
    )
  }, [])

  const handleUpdateTags = useCallback((articleId: string, tags: string[]) => {
    setArticles((prev) =>
      prev.map((article) => (article.id === articleId ? { ...article, tags } : article))
    )
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading your saved articles...</p>
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
                Saved Articles
              </h1>
              <Badge variant="outline" className="ml-2">
                {filteredArticles.length} {filteredArticles.length === 1 ? 'article' : 'articles'}
              </Badge>
            </div>
          </div>

          {/* Filters and Search */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div className="md:col-span-2 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search articles, topics, notes, or tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Tag Filter */}
                <Select value={selectedTag} onValueChange={setSelectedTag}>
                  <SelectTrigger>
                    <Tag className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All tags</SelectItem>
                    {getAllTags.map((tag) => (
                      <SelectItem key={tag} value={tag}>
                        {tag}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Sort */}
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
        </div>

        {/* Articles Grid */}
        {filteredArticles.length === 0 ? (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <BookmarkIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold mb-2 text-gray-600">
                {articles.length === 0 ? 'No Saved Articles Yet' : 'No Articles Match Your Filters'}
              </h3>
              <p className="text-gray-500 mb-6">
                {articles.length === 0
                  ? 'Start exploring news and save articles that interest you!'
                  : 'Try adjusting your search or filter criteria.'}
              </p>
              {articles.length === 0 && <Button onClick={() => navigate('/')}>Explore News</Button>}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {filteredArticles.map((article) => (
              <Card
                key={article.id}
                className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300"
              >
                <CardHeader>
                  <CardTitle className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2 line-clamp-2">
                        {article.headline}
                      </h3>
                      <p className="text-sm text-blue-600 font-medium mb-2">
                        Topic: {article.topic}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Saved {new Date(article.saved_at).toLocaleDateString()}
                        </span>
                        {article.tags && article.tags.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {article.tags.length} tags
                          </span>
                        )}
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Tags */}
                    {article.tags && article.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {article.tags.map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Notes Preview */}
                    {article.notes && (
                      <div className="bg-gray-50 rounded p-3">
                        <p className="text-sm text-gray-600 line-clamp-2">
                          <span className="font-medium">Your notes:</span> {article.notes}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button onClick={() => setSelectedArticle(article)} className="flex-1">
                        <Eye className="h-4 w-4 mr-2" />
                        View Article
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setArticleToDelete(article)}
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

        {/* Article Viewer Modal */}
        <Dialog open={!!selectedArticle} onOpenChange={() => setSelectedArticle(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Saved Article</DialogTitle>
            </DialogHeader>
            {selectedArticle && (
              <ArticleViewer
                article={selectedArticle}
                onUpdateNotes={(notes) => handleUpdateNotes(selectedArticle.id, notes)}
                onUpdateTags={(tags) => handleUpdateTags(selectedArticle.id, tags)}
                showEditableFields={true}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!articleToDelete} onOpenChange={() => setArticleToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Saved Article</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{articleToDelete?.headline}"? This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteArticle}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
})

export default SavedArticles
