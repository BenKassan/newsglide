
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Badge } from '@ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ArticleViewer } from '@/features/articles';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { 
  getSavedArticles, 
  deleteArticle, 
  SavedArticle 
} from '@/services/savedArticlesService';
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
  Loader2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@ui/alert-dialog';

const SavedArticles = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [articles, setArticles] = useState<SavedArticle[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<SavedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'topic'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedArticle, setSelectedArticle] = useState<SavedArticle | null>(null);
  const [articleToDelete, setArticleToDelete] = useState<SavedArticle | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    loadArticles();
  }, [user, navigate]);

  useEffect(() => {
    filterAndSortArticles();
  }, [articles, searchQuery, selectedTag, sortBy, sortOrder]);

  const loadArticles = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const savedArticles = await getSavedArticles(user.id);
      setArticles(savedArticles);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load saved articles. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortArticles = () => {
    let filtered = [...articles];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(article => 
        article.headline.toLowerCase().includes(query) ||
        article.topic.toLowerCase().includes(query) ||
        article.notes?.toLowerCase().includes(query) ||
        article.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Filter by tag
    if (selectedTag) {
      filtered = filtered.filter(article => 
        article.tags?.includes(selectedTag)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: string | Date;
      let bValue: string | Date;

      switch (sortBy) {
        case 'date':
          aValue = new Date(a.saved_at);
          bValue = new Date(b.saved_at);
          break;
        case 'title':
          aValue = a.headline.toLowerCase();
          bValue = b.headline.toLowerCase();
          break;
        case 'topic':
          aValue = a.topic.toLowerCase();
          bValue = b.topic.toLowerCase();
          break;
        default:
          aValue = new Date(a.saved_at);
          bValue = new Date(b.saved_at);
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredArticles(filtered);
  };

  const handleDeleteArticle = async () => {
    if (!articleToDelete) return;

    const success = await deleteArticle(articleToDelete.id);
    if (success) {
      setArticles(prev => prev.filter(a => a.id !== articleToDelete.id));
      toast({
        title: "Article Deleted",
        description: "The article has been removed from your saved articles.",
      });
      
      // Close modal if deleted article was being viewed
      if (selectedArticle?.id === articleToDelete.id) {
        setSelectedArticle(null);
      }
    } else {
      toast({
        title: "Error",
        description: "Failed to delete article. Please try again.",
        variant: "destructive",
      });
    }
    setArticleToDelete(null);
  };

  const getAllTags = () => {
    const tagSet = new Set<string>();
    articles.forEach(article => {
      article.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  };

  const handleUpdateNotes = (articleId: string, notes: string) => {
    setArticles(prev => prev.map(article => 
      article.id === articleId ? { ...article, notes } : article
    ));
  };

  const handleUpdateTags = (articleId: string, tags: string[]) => {
    setArticles(prev => prev.map(article => 
      article.id === articleId ? { ...article, tags } : article
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <UnifiedNavigation />
        <div className="pt-20 flex items-center justify-center min-h-[calc(100vh-5rem)]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-400" />
            <p className="text-gray-300">Loading your saved articles...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      <UnifiedNavigation />
      <div className="container mx-auto px-6 pt-24 pb-12 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <Button onClick={() => navigate('/')} variant="ghost" className="mb-4 text-white hover:text-gray-200">
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
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Saved Articles
              </h1>
              <Badge variant="outline" className="ml-2 border-white/20 text-white">
                {filteredArticles.length} {filteredArticles.length === 1 ? 'article' : 'articles'}
              </Badge>
            </div>
          </div>

          {/* Filters and Search */}
          <Card className="glass-card border-white/10">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div className="md:col-span-2 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search articles, topics, notes, or tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/10 border-white/10 text-white placeholder:text-gray-400"
                  />
                </div>

                {/* Tag Filter */}
                <Select value={selectedTag} onValueChange={setSelectedTag}>
                  <SelectTrigger className="bg-white/10 border-white/10 text-white">
                    <Tag className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by tag" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/10">
                    <SelectItem value="" className="text-white hover:bg-white/10">All tags</SelectItem>
                    {getAllTags().map(tag => (
                      <SelectItem key={tag} value={tag} className="text-white hover:bg-white/10">{tag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Sort */}
                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={(value: 'date' | 'title' | 'topic') => setSortBy(value)}>
                    <SelectTrigger className="bg-white/10 border-white/10 text-white">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/10">
                      <SelectItem value="date" className="text-white hover:bg-white/10">Date Saved</SelectItem>
                      <SelectItem value="title" className="text-white hover:bg-white/10">Title</SelectItem>
                      <SelectItem value="topic" className="text-white hover:bg-white/10">Topic</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="glass-card border-white/10 text-white hover:bg-white/10"
                  >
                    {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Articles Grid */}
        {filteredArticles.length === 0 ? (
          <Card className="glass-card border-white/10">
            <CardContent className="p-12 text-center">
              <BookmarkIcon className="h-16 w-16 mx-auto mb-4 text-gray-500" />
              <h3 className="text-xl font-semibold mb-2 text-white">
                {articles.length === 0 ? 'No Saved Articles Yet' : 'No Articles Match Your Filters'}
              </h3>
              <p className="text-gray-400 mb-6">
                {articles.length === 0 
                  ? 'Start exploring news and save articles that interest you!'
                  : 'Try adjusting your search or filter criteria.'
                }
              </p>
              {articles.length === 0 && (
                <Button onClick={() => navigate('/')} className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white">
                  Explore News
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {filteredArticles.map((article) => (
              <Card key={article.id} className="glass-card border-white/10 hover:bg-white/5 transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2 line-clamp-2 text-white">
                        {article.headline}
                      </h3>
                      <p className="text-sm text-blue-400 font-medium mb-2">
                        Topic: {article.topic}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
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
                          <Badge key={i} variant="secondary" className="text-xs bg-white/10 text-gray-300 border-white/10">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Notes Preview */}
                    {article.notes && (
                      <div className="bg-white/5 rounded p-3">
                        <p className="text-sm text-gray-300 line-clamp-2">
                          <span className="font-medium text-white">Your notes:</span> {article.notes}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setSelectedArticle(article)}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Article
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setArticleToDelete(article)}
                        className="glass-card border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
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
                Are you sure you want to delete "{articleToDelete?.headline}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteArticle} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default SavedArticles;
