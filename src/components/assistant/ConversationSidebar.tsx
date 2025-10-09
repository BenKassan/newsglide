import { Plus, MessageSquare, Trash2, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Conversation } from '@/pages/AIChat';
import { formatDistanceToNow } from 'date-fns';

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  loading: boolean;
  interests?: string[];
  onRemoveInterest?: (interest: string) => void;
  onShowSurvey?: () => void;
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  loading,
  interests = [],
  onRemoveInterest,
  onShowSurvey
}: ConversationSidebarProps) {
  return (
    <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <Button
          onClick={onNewConversation}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Interest Profile Panel */}
      {interests.length > 0 && (
        <div className="p-4 border-b border-slate-200 bg-gradient-to-br from-purple-50 to-blue-50">
          <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <span>🎯</span>
            Your Interests
          </h3>
          <div className="flex flex-wrap gap-2">
            {interests.map((interest) => (
              <Badge
                key={interest}
                variant="secondary"
                className="text-xs bg-white/80 hover:bg-white pr-1 group"
              >
                {interest}
                {onRemoveInterest && (
                  <button
                    onClick={() => onRemoveInterest(interest)}
                    className="ml-1 p-0.5 hover:bg-slate-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Remove ${interest}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-slate-600 mt-2">
            I learn your interests as we chat!
          </p>
        </div>
      )}

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-slate-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">No conversations yet</p>
              <p className="text-xs text-slate-400 mt-1">Start a new chat to begin</p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`group relative p-3 rounded-lg cursor-pointer transition-all ${
                  activeConversationId === conversation.id
                    ? 'bg-slate-100'
                    : 'hover:bg-slate-50'
                }`}
                onClick={() => onSelectConversation(conversation.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-slate-900 truncate">
                      {conversation.title || 'New conversation'}
                    </h3>
                    <p className="text-xs text-slate-500 truncate mt-1">
                      {conversation.preview || 'No messages yet'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {formatDistanceToNow(new Date(conversation.updated_at), { addSuffix: true })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conversation.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Survey Fallback Button */}
      {onShowSurvey && (
        <div className="p-4 border-t border-slate-200">
          <Button
            variant="outline"
            size="sm"
            onClick={onShowSurvey}
            className="w-full text-slate-700"
          >
            <FileText className="w-4 h-4 mr-2" />
            Take Survey
          </Button>
        </div>
      )}
    </div>
  );
}
