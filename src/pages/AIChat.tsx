import { useState, useEffect } from 'react';
import { useAuth } from '@features/auth';
import { ConversationSidebar } from '@/components/assistant/ConversationSidebar';
import { ChatArea } from '@/components/assistant/ChatArea';
import { useNavigate } from 'react-router-dom';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { OnboardingSurveyModal } from '@/components/OnboardingSurveyModal';
import { personalizationService } from '@/services/personalizationService';
import { useToast } from '@shared/hooks/use-toast';

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
  const [interests, setInterests] = useState<string[]>([]);
  const [showSurveyModal, setShowSurveyModal] = useState(false);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Load conversations and interests on mount
  useEffect(() => {
    if (user) {
      loadConversations();
      loadInterests();
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
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-conversations`,
        {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to load conversations');

      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
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
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
  };

  const handleSelectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
  };

  const handleDeleteConversation = async (conversationId: string) => {
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

      if (!response.ok) throw new Error('Failed to delete conversation');

      setConversations(prev => prev.filter(c => c.id !== conversationId));
      if (activeConversationId === conversationId) {
        setActiveConversationId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const handleMessageSent = (newConversationId?: string, extractedInterests?: any) => {
    // Reload conversations to get updated list
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

  const handleRemoveInterest = async (interest: string) => {
    if (!user) return;
    try {
      await personalizationService.removeInterest(user.id, interest, 'topic');
      loadInterests();
      toast({
        title: "Interest removed",
        description: `"${interest}" has been removed from your profile`,
        duration: 2000,
      });
    } catch (error) {
      console.error('Error removing interest:', error);
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
    <>
      <UnifiedNavigation />
      <div className="flex h-screen bg-slate-50 pt-20">
        {/* Sidebar */}
        <ConversationSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
          loading={loading}
          interests={interests}
          onRemoveInterest={handleRemoveInterest}
          onShowSurvey={() => setShowSurveyModal(true)}
        />

        {/* Main Chat Area */}
        <ChatArea
          conversationId={activeConversationId}
          messages={messages}
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
    </>
  );
};

export default AIChat;
