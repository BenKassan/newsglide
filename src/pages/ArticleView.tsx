import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@ui/card';
import { Button } from '@ui/button';
import { Badge } from '@ui/badge';
import { ArrowLeft, Calendar, Hash, BookmarkIcon, History } from 'lucide-react';
import { ArticleViewer } from '@/features/articles';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { SavedArticle } from '@/services/savedArticlesService';
import { SearchHistoryItem } from '@/services/searchHistoryService';

interface LocationState {
  article?: SavedArticle;
  historyItem?: SearchHistoryItem;
  from?: 'history' | 'saved';
}

const ArticleView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  // Extract article data from either saved article or history item
  const article = React.useMemo(() => {
    if (state?.article) {
      return state.article;
    } else if (state?.historyItem) {
      // Convert history item to article format
      return {
        id: state.historyItem.id,
        user_id: state.historyItem.user_id,
        headline: state.historyItem.news_data.headline,
        topic: state.historyItem.topic,
        article_data: state.historyItem.news_data,
        notes: '',
        tags: [],
        saved_at: state.historyItem.created_at
      } as SavedArticle;
    }
    return null;
  }, [state]);

  // Redirect if no article data
  useEffect(() => {
    if (!article) {
      navigate('/search-history');
    }
  }, [article, navigate]);

  if (!article) {
    return null;
  }

  const handleBack = () => {
    if (state?.from === 'saved' || state?.from === 'history') {
      navigate('/search-history', { state: { activeTab: state.from } });
    } else {
      navigate('/search-history');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      <UnifiedNavigation />

      <div className="container mx-auto px-6 pt-24 pb-12 max-w-7xl">
        {/* Navigation Header */}
        <div className="mb-6">
          <Button
            onClick={handleBack}
            variant="ghost"
            className="mb-4 text-white hover:text-gray-200 hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {state?.from === 'saved' ? 'Saved Articles' : 'Search History'}
          </Button>
        </div>

        {/* Article Header Card */}
        <Card className="glass-card border-white/10 mb-6">
          <CardHeader className="pb-4">
            <div className="space-y-4">
              {/* Article Type Badge */}
              <div className="flex items-center gap-2">
                {state?.from === 'saved' ? (
                  <Badge variant="outline" className="border-blue-400/50 text-blue-400">
                    <BookmarkIcon className="h-3 w-3 mr-1" />
                    Saved Article
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-purple-400/50 text-purple-400">
                    <History className="h-3 w-3 mr-1" />
                    Search Result
                  </Badge>
                )}
                <Badge variant="outline" className="border-white/20 text-white">
                  <Hash className="h-3 w-3 mr-1" />
                  {article.topic}
                </Badge>
              </div>

              {/* Headline */}
              <h1 className="text-3xl font-bold text-white">
                {article.headline}
              </h1>

              {/* Date and metadata */}
              <div className="flex items-center gap-4 text-sm text-gray-300">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(article.saved_at)}
                </div>
              </div>

              {/* Tags if available */}
              {article.tags && article.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {article.tags.map((tag, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="bg-white/10 text-white border-white/20"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Main Article Content */}
        <Card className="glass-card border-white/10">
          <CardContent className="p-6">
            <ArticleViewer
              article={article}
              showEditableFields={state?.from === 'saved'}
              historyId={state?.from === 'history' ? state.historyItem?.id : undefined}
              onUpdateNotes={state?.from === 'saved' ? (notes) => {
                // Note: In a real implementation, you'd update the article in the backend
                // and potentially update local state
                console.log('Update notes:', notes);
              } : undefined}
              onUpdateTags={state?.from === 'saved' ? (tags) => {
                // Note: In a real implementation, you'd update the article in the backend
                // and potentially update local state
                console.log('Update tags:', tags);
              } : undefined}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ArticleView;
