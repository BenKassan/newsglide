import { useState, useEffect } from 'react';
import { useAuth } from '@features/auth';
import { ConversationSidebar } from '@/components/assistant/ConversationSidebar';
import { ChatArea } from '@/components/assistant/ChatArea';
import { useNavigate } from 'react-router-dom';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import AmbientBackground from '@/components/AmbientBackground';
import { OnboardingSurveyModal } from '@/components/OnboardingSurveyModal';
import { personalizationService } from '@/services/personalizationService';
import { useToast } from '@shared/hooks/use-toast';
import { UserMemory } from '@/components/assistant/UserMemories';
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

export interface Conversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  preview?: string;
  messageCount?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

const AIChat = () => {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messageCache, setMessageCache] = useState<Map<string, Message[]>>(new Map());
  const [interests, setInterests] = useState<string[]>([]);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<{ id: string; title: string } | null>(null);
  const [memories, setMemories] = useState<UserMemory[]>([]);
  const [memoriesLoading, setMemoriesLoading] = useState(false);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Load conversations, interests, and memories on mount
  useEffect(() => {
    if (user) {
      loadConversations();
      loadInterests();
      loadMemories();
    }
  }, [user]);

  const loadInterests = async () => {
    if (!user) return;
    try {
      const topInterests = await personalizationService.getTopInterests(user.id, 8);
      setInterests(topInterests);
    } catch (error) {
      console.error('Error loading interests:', error);
    }
  };

  const loadMemories = async () => {
    if (!user) return;
    setMemoriesLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-memories`,
        {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to load memories');

      const data = await response.json();
      setMemories(data.memories || []);
    } catch (error) {
      console.error('Error loading memories:', error);
    } finally {
      setMemoriesLoading(false);
    }
  };

  const handleAddMemory = async (text: string) => {
    try {
      // Extract a key from the first few words of the text
      const words = text.trim().split(/\s+/);
      const key = words.slice(0, 3).join(' ').substring(0, 50) || 'Memory';

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-memories`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ memory_key: key, memory_value: text }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to add memory');
      }

      const data = await response.json();
      setMemories(prev => [data.memory, ...prev]);

      toast({
        title: "Memory saved",
        description: "Glidey will remember this across all conversations",
        duration: 2000,
      });
    } catch (error) {
      console.error('Error adding memory:', error);
      toast({
        title: "Failed to save memory",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
        duration: 3000,
      });
      throw error;
    }
  };

  const handleUpdateMemory = async (id: string, text: string) => {
    try {
      // Extract a key from the first few words of the text
      const words = text.trim().split(/\s+/);
      const key = words.slice(0, 3).join(' ').substring(0, 50) || 'Memory';

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-memories?id=${id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ memory_key: key, memory_value: text }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update memory');
      }

      const data = await response.json();
      setMemories(prev => prev.map(m => m.id === id ? data.memory : m));

      toast({
        title: "Memory updated",
        description: "Your changes have been saved",
        duration: 2000,
      });
    } catch (error) {
      console.error('Error updating memory:', error);
      toast({
        title: "Failed to update memory",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
        duration: 3000,
      });
      throw error;
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-memories?id=${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete memory');
      }

      setMemories(prev => prev.filter(m => m.id !== id));

      toast({
        title: "Memory deleted",
        description: "This information has been removed",
        duration: 2000,
      });
    } catch (error) {
      console.error('Error deleting memory:', error);
      toast({
        title: "Failed to delete memory",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Load messages when conversation changes
  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId]);

  const loadConversations = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-conversations?includeMessages=true`,
        {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to load conversations');

      const data = await response.json();
      const conversationsData = data.conversations || [];
      setConversations(conversationsData);

      // Populate message cache with fetched messages
      const newCache = new Map<string, Message[]>();
      conversationsData.forEach((conv: any) => {
        if (conv.messages && Array.isArray(conv.messages)) {
          newCache.set(conv.id, conv.messages);
        }
      });
      setMessageCache(newCache);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    setIsLoadingMessages(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-conversations?id=${conversationId}`,
        {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to load messages');

      const data = await response.json();
      const loadedMessages = data.messages || [];
      setMessages(loadedMessages);

      // Update cache with fresh messages
      setMessageCache(prev => {
        const newCache = new Map(prev);
        newCache.set(conversationId, loadedMessages);
        return newCache;
      });

      return loadedMessages;
    } catch (error) {
      console.error('Error loading messages:', error);
      return [];
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    setIsLoadingMessages(false); // No loading state for new conversations
  };

  const handleSelectConversation = (conversationId: string) => {
    if (conversationId === activeConversationId) return;

    // Check cache first for instant display
    const cachedMessages = messageCache.get(conversationId);
    if (cachedMessages) {
      // Instant display from cache - zero delay!
      setIsLoadingMessages(false);
      setMessages(cachedMessages);
      setActiveConversationId(conversationId);
    } else {
      // Cache miss - show loading skeleton immediately while we fetch
      setIsLoadingMessages(true);
      setMessages([]);
      setActiveConversationId(conversationId);
      // loadMessages will be called by useEffect
    }
  };

  const initiateDelete = (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setConversationToDelete({
        id: conversation.id,
        title: conversation.title || 'this conversation'
      });
    }
  };

  const confirmDelete = async () => {
    if (!conversationToDelete) return;

    const conversationId = conversationToDelete.id;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-conversations?id=${conversationId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete conversation');
      }

      // Update UI state
      setConversations(prev => prev.filter(c => c.id !== conversationId));

      // Remove from cache
      setMessageCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(conversationId);
        return newCache;
      });

      if (activeConversationId === conversationId) {
        setActiveConversationId(null);
        setMessages([]);
      }

      // Show success notification
      toast({
        title: "Chat deleted",
        description: "Your conversation and all messages have been permanently deleted.",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);

      // Show error notification
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Could not delete conversation. Please try again.",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      // Close dialog
      setConversationToDelete(null);
    }
  };

  const handleMessageSent = (newConversationId?: string, extractedInterests?: any) => {
    // Reload conversations to get updated list and refresh cache
    loadConversations();

    // If this was a new conversation, set it as active
    if (newConversationId && !activeConversationId) {
      setActiveConversationId(newConversationId);
    }

    // Reload interests if new ones were extracted
    if (extractedInterests && extractedInterests.topics && extractedInterests.topics.length > 0) {
      loadInterests();
    }
  };

  const handleSurveyComplete = async () => {
    setShowSurveyModal(false);
    // Reload interests after survey completion
    loadInterests();
    toast({
      title: "Survey completed!",
      description: "Your interests have been updated",
      duration: 3000,
    });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AmbientBackground variant="glidey" />
      <div className="relative z-10">
        <UnifiedNavigation />
        <div className="flex items-stretch min-h-[calc(100vh-5rem)] w-full gap-6 px-4 sm:px-6 lg:px-10 pt-20 lg:pt-24 pb-12 lg:pb-16 lg:h-[calc(100vh-5rem)] lg:max-h-[calc(100vh-5rem)] lg:overflow-hidden">
        {/* Sidebar */}
        <ConversationSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={initiateDelete}
          loading={loading}
          interests={interests}
          onShowSurvey={() => setShowSurveyModal(true)}
          memories={memories}
          onAddMemory={handleAddMemory}
          onUpdateMemory={handleUpdateMemory}
          onDeleteMemory={handleDeleteMemory}
          memoriesLoading={memoriesLoading}
        />

        {/* Main Chat Area */}
        <ChatArea
          conversationId={activeConversationId}
          messages={messages}
          isLoadingMessages={isLoadingMessages}
          onMessageSent={handleMessageSent}
          session={session}
          onShowSurvey={() => setShowSurveyModal(true)}
        />
        </div>

        {/* Survey Modal */}
        <OnboardingSurveyModal
          isOpen={showSurveyModal}
          onClose={() => setShowSurveyModal(false)}
          onComplete={handleSurveyComplete}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={conversationToDelete !== null}
          onOpenChange={(open) => !open && setConversationToDelete(null)}
        >
          <AlertDialogContent className="glass-card border border-slate-200/60 shadow-xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold text-slate-900">
                Delete conversation?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-700 text-base">
                Are you sure you want to delete <span className="font-semibold">"{conversationToDelete?.title}"</span>?
                This will permanently delete all messages in this conversation and remove them from the AI's memory.
                <span className="block mt-2 font-semibold text-red-600">This action cannot be undone.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="glass-card glass-card-hover border border-slate-200/60 text-slate-700">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600 text-white font-semibold shadow-md hover:shadow-lg"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default AIChat;
