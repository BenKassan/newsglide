import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import { Button } from '@ui/button';
import { ScrollArea } from '@ui/scroll-area';
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
  memories = [],
  onAddMemory,
  onUpdateMemory,
  onDeleteMemory,
  memoriesLoading = false
}: ConversationSidebarProps) {
  return (
    <div className="w-72 lg:w-80 bg-white/95 border border-slate-200 flex flex-col h-full rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-slate-200/80">
        <Button
          onClick={onNewConversation}
          className="w-full bg-sky-600 hover:bg-sky-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* User Memories Panel */}
      {onAddMemory && onUpdateMemory && onDeleteMemory && (
        <UserMemories
          memories={memories}
          onAddMemory={onAddMemory}
          onUpdateMemory={onUpdateMemory}
          onDeleteMemory={onDeleteMemory}
          interests={interests}
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
