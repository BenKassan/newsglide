
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card';
import { Button } from '@ui/button';
import { Badge } from '@ui/badge';
import { Input } from '@ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import { 
  getSearchHistory, 
  deleteSearchItem, 
  clearAllHistory,
  SearchHistoryItem 
} from '@/services/searchHistoryService';
import { 
  SavedArticle,
  getSavedArticles,
  deleteArticle,
  updateArticleNotes,
  updateArticleTags
} from '@/services/savedArticlesService';
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
  SortDesc
} from 'lucide-react';
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

const SearchHistory = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [historyItems, setHistoryItems] = useState<SearchHistoryItem[]>([]);
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);
  const [filteredSavedArticles, setFilteredSavedArticles] = useState<SavedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<SearchHistoryItem | null>(null);
  const [activeTab, setActiveTab] = useState<'history' | 'saved'>('history');

  // Saved articles filters
  const [savedSearchQuery, setSavedSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'topic'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    loadHistory();
    loadSavedArticles();
  }, [user, navigate]);

  useEffect(() => {
    filterAndSortSavedArticles();
  }, [savedArticles, savedSearchQuery, selectedTag, sortBy, sortOrder]);

  const loadHistory = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const history = await getSearchHistory(user.id);
      setHistoryItems(history);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load search history. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSavedArticles = async () => {
    if (!user) return;
    
    try {
      const articles = await getSavedArticles(user.id);
      setSavedArticles(articles);
      setFilteredSavedArticles(articles);
    } catch (error) {
      console.error('Failed to load saved articles:', error);
    }
  };

  const filterAndSortSavedArticles = () => {
    let filtered = [...savedArticles];

    // Filter by search query
    if (savedSearchQuery.trim()) {
      const query = savedSearchQuery.toLowerCase();
      filtered = filtered.filter(article => 
        article.headline.toLowerCase().includes(query) ||
        article.topic.toLowerCase().includes(query) ||
        article.notes?.toLowerCase().includes(query) ||
        article.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Filter by tag
    if (selectedTag && selectedTag !== 'all') {
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

    setFilteredSavedArticles(filtered);
  };

  const getAllTags = () => {
    const tagSet = new Set<string>();
    savedArticles.forEach(article => {
      article.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  };

  const handleSearchAgain = (topic: string) => {
    navigate('/', { state: { searchTopic: topic } });
    toast({
      title: "Re-running Search",
      description: `Searching for: ${topic}`,
    });
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;

    const success = await deleteSearchItem(itemToDelete.id);
    if (success) {
      setHistoryItems(prev => prev.filter(item => item.id !== itemToDelete.id));
      toast({
        title: "Search Deleted",
        description: "The search has been removed from your history.",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to delete search. Please try again.",
        variant: "destructive",
      });
    }
    setItemToDelete(null);
  };

  const handleDeleteSavedArticle = async (article: SavedArticle) => {
    const success = await deleteArticle(article.id);
    if (success) {
      setSavedArticles(prev => prev.filter(a => a.id !== article.id));
      toast({
        title: "Article Deleted",
        description: "The article has been removed from your saved articles.",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to delete article. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleClearAllHistory = async () => {
    if (!user) return;

    const success = await clearAllHistory(user.id);
    if (success) {
      setHistoryItems([]);
      toast({
        title: "History Cleared",
        description: "All search history has been removed.",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to clear history. Please try again.",
        variant: "destructive",
      });
    }
    setShowClearConfirm(false);
  };

  const groupHistoryByTime = (items: SearchHistoryItem[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const groups = {
      today: [] as SearchHistoryItem[],
      yesterday: [] as SearchHistoryItem[],
      thisWeek: [] as SearchHistoryItem[],
      thisMonth: [] as SearchHistoryItem[],
      older: [] as SearchHistoryItem[]
    };

    items.forEach(item => {
      const itemDate = new Date(item.created_at);
      
      if (itemDate >= today) {
        groups.today.push(item);
      } else if (itemDate >= yesterday) {
        groups.yesterday.push(item);
      } else if (itemDate >= thisWeek) {
        groups.thisWeek.push(item);
      } else if (itemDate >= thisMonth) {
        groups.thisMonth.push(item);
      } else {
        groups.older.push(item);
      }
    });

    return groups;
  };

  const groupedHistory = groupHistoryByTime(historyItems);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <UnifiedNavigation />
        <div className="pt-20 flex items-center justify-center min-h-[calc(100vh-5rem)]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-400" />
            <p className="text-gray-300">Loading your data...</p>
          </div>
        </div>
      </div>
    );
  }

  const renderHistoryGroup = (title: string, items: SearchHistoryItem[]) => {
    if (items.length === 0) return null;

    return (
      <div key={title} className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-300 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {title}
          <Badge variant="outline" className="border-white/20 text-white">{items.length}</Badge>
        </h3>
        <div className="space-y-4">
          {items.map((item) => (
            <Card
              key={item.id}
              id={`history-${item.id}`}
              className="glass-card border-white/10 transition-all duration-500 hover:bg-white/5"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg mb-1 text-white">{item.topic}</h4>
                    <p className="text-sm text-blue-400 mb-2 line-clamp-1">
                      {item.news_data.headline}
                    </p>
                    <p className="text-xs text-gray-400">
                      Searched on {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSearchAgain(item.topic)}
                      className="glass-card border-white/10 text-white hover:bg-white/10"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Search Again
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/article/${item.id}`, {
                        state: { historyItem: item, from: 'history' }
                      })}
                      className="glass-card border-white/10 text-white hover:bg-white/10"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Results
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setItemToDelete(item)}
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
      </div>
    );
  };

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
                Search History & Saved Articles
              </h1>
            </div>
            
            {activeTab === 'history' && historyItems.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setShowClearConfirm(true)}
                className="glass-card border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All History
              </Button>
            )}
          </div>
        </div>

        {/* Main Content with Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'history' | 'saved')}>
          <TabsList className="grid w-full grid-cols-2 mb-6 glass-card border-white/10">
            <TabsTrigger value="history" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-300">
              <History className="h-4 w-4 mr-2" />
              Search History ({historyItems.length})
            </TabsTrigger>
            <TabsTrigger value="saved" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-300">
              <BookmarkIcon className="h-4 w-4 mr-2" />
              Saved Articles ({savedArticles.length})
            </TabsTrigger>
          </TabsList>

          {/* Search History Tab */}
          <TabsContent value="history">
            {historyItems.length === 0 ? (
              <Card className="glass-card border-white/10">
                <CardContent className="p-12 text-center">
                  <History className="h-16 w-16 mx-auto mb-4 text-gray-500" />
                  <h3 className="text-xl font-semibold mb-2 text-white">
                    No Search History Yet
                  </h3>
                  <p className="text-gray-400 mb-6">
                    Start exploring news topics and your searches will appear here!
                  </p>
                  <Button onClick={() => navigate('/')} className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white">
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
            <Card className="glass-card border-white/10 mb-6">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search saved articles..."
                      value={savedSearchQuery}
                      onChange={(e) => setSavedSearchQuery(e.target.value)}
                      className="pl-10 bg-white/10 border-white/10 text-white placeholder:text-gray-400"
                    />
                  </div>

                  <Select value={selectedTag} onValueChange={setSelectedTag}>
                    <SelectTrigger className="bg-white/10 border-white/10 text-white">
                      <Tag className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by tag" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/10">
                      <SelectItem value="all" className="text-white hover:bg-white/10">All tags</SelectItem>
                      {getAllTags().map(tag => (
                        <SelectItem key={tag} value={tag} className="text-white hover:bg-white/10">{tag}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

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

            {/* Saved Articles List */}
            {filteredSavedArticles.length === 0 ? (
              <Card className="glass-card border-white/10">
                <CardContent className="p-12 text-center">
                  <BookmarkIcon className="h-16 w-16 mx-auto mb-4 text-gray-500" />
                  <h3 className="text-xl font-semibold mb-2 text-white">
                    {savedArticles.length === 0 ? 'No Saved Articles Yet' : 'No Articles Match Your Filters'}
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {savedArticles.length === 0 
                      ? 'Start exploring news and save articles that interest you!'
                      : 'Try adjusting your search or filter criteria.'
                    }
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
              <div className="space-y-4">
                {filteredSavedArticles.map((article) => (
                  <Card
                    key={article.id}
                    id={`saved-${article.id}`}
                    className="transition-all duration-500 border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl"
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
                            onClick={() => navigate(`/article/${article.id}`, {
                              state: { article, from: 'saved' }
                            })}
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

        {/* Delete Confirmation */}
        <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Search</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this search from your history? This action cannot be undone.
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
                Are you sure you want to clear all your search history? This will permanently delete all {historyItems.length} searches and cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearAllHistory} className="bg-red-600 hover:bg-red-700">
                Clear All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default SearchHistory;
