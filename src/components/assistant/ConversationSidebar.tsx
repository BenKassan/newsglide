import { Plus, MessageSquare, Trash2, X } from 'lucide-react';
import { Button } from '@ui/button';
import { ScrollArea } from '@ui/scroll-area';
import { Badge } from '@ui/badge';
import { Conversation } from '@/pages/AIChat';
import { formatDistanceToNow } from 'date-fns';
import { UserMemories, UserMemory } from './UserMemories';

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  loading: boolean;
  interests?: string[];
  onRemoveInterest?: (interest: string) => void;
  memories?: UserMemory[];
  onAddMemory?: (key: string, value: string) => Promise<void>;
  onUpdateMemory?: (id: string, key: string, value: string) => Promise<void>;
  onDeleteMemory?: (id: string) => Promise<void>;
  memoriesLoading?: boolean;
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
  memories = [],
  onAddMemory,
  onUpdateMemory,
  onDeleteMemory,
  memoriesLoading = false
}: ConversationSidebarProps) {
  return (
    <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <Button
          onClick={onNewConversation}
          className="w-full bg-sky-600 hover:bg-sky-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Interest Profile Panel */}
      {interests.length > 0 && (
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <span>🎯</span>
            Your Interests
          </h3>
          <div className="flex flex-wrap gap-2">
            {interests.map((interest) => (
              <Badge
                key={interest}
                variant="secondary"
                className="text-xs bg-white hover:bg-slate-100 pr-1 group border border-slate-200"
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

      {/* User Memories Panel */}
      {onAddMemory && onUpdateMemory && onDeleteMemory && (
        <UserMemories
          memories={memories}
          onAddMemory={onAddMemory}
          onUpdateMemory={onUpdateMemory}
          onDeleteMemory={onDeleteMemory}
          loading={memoriesLoading}
        />
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
    </div>
  );
}
