
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ArticleViewer } from '@/components/ArticleViewer';
import { 
  getSearchHistory, 
  deleteSearchItem, 
  clearAllHistory,
  SearchHistoryItem 
} from '@/services/searchHistoryService';
import { 
  History, 
  Search, 
  Eye, 
  Trash2, 
  ArrowLeft,
  RefreshCw,
  Calendar,
  Loader2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const SearchHistory = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [historyItems, setHistoryItems] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<SearchHistoryItem | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<SearchHistoryItem | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    loadHistory();
  }, [user, navigate]);

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
      
      // Close modal if deleted item was being viewed
      if (selectedItem?.id === itemToDelete.id) {
        setSelectedItem(null);
      }
    } else {
      toast({
        title: "Error",
        description: "Failed to delete search. Please try again.",
        variant: "destructive",
      });
    }
    setItemToDelete(null);
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading your search history...</p>
        </div>
      </div>
    );
  }

  const renderHistoryGroup = (title: string, items: SearchHistoryItem[]) => {
    if (items.length === 0) return null;

    return (
      <div key={title} className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-700 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {title}
          <Badge variant="outline">{items.length}</Badge>
        </h3>
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedItem(item)}
                    >
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
    );
  };

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
                Search History
              </h1>
              <Badge variant="outline" className="ml-2">
                {historyItems.length} {historyItems.length === 1 ? 'search' : 'searches'}
              </Badge>
            </div>
            
            {historyItems.length > 0 && (
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

        {/* History Content */}
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

        {/* Results Viewer Modal */}
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Search Results</DialogTitle>
            </DialogHeader>
            {selectedItem && (
              <ArticleViewer
                article={{
                  id: selectedItem.id,
                  user_id: selectedItem.user_id,
                  headline: selectedItem.news_data.headline,
                  topic: selectedItem.topic,
                  article_data: selectedItem.news_data,
                  notes: '',
                  tags: [],
                  saved_at: selectedItem.created_at
                }}
                showEditableFields={false}
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
