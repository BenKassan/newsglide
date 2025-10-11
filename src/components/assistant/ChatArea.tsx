import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, ChevronRight } from 'lucide-react';
import { Button } from '@ui/button';
import { Textarea } from '@ui/textarea';
import { ScrollArea } from '@ui/scroll-area';
import { Message } from '@/pages/AIChat';
import { Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@shared/hooks/use-toast';

interface ExtractedInterests {
  topics: string[];
  categories: string[];
  confidence: number;
}

interface Recommendations {
  topics: string[];
  show: boolean;
}

interface ChatAreaProps {
  conversationId: string | null;
  messages: Message[];
  onMessageSent: (newConversationId?: string, interests?: ExtractedInterests) => void;
  session: Session | null;
  onShowSurvey?: () => void;
}

export function ChatArea({ conversationId, messages, onMessageSent, session, onShowSurvey }: ChatAreaProps) {
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [latestRecommendations, setLatestRecommendations] = useState<Recommendations | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastSyncedConversationId = useRef<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Sync local messages with props only when conversation changes
  // This prevents race condition where parent loads stale data before DB write completes
  useEffect(() => {
    // Only sync if conversation changed (not just messages updated)
    if (conversationId !== lastSyncedConversationId.current) {
      setLocalMessages(messages);
      lastSyncedConversationId.current = conversationId;
    }
  }, [messages, conversationId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [localMessages, streamingMessage]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const messageText = input.trim();

    // Add user message to local state immediately
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: messageText,
      created_at: new Date().toISOString(),
    };
    setLocalMessages(prev => [...prev, userMessage]);

    setInput('');
    setIsStreaming(true);
    setStreamingMessage('');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-message`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: messageText,
            conversationId: conversationId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No reader available');

      let newConversationId: string | undefined;
      let extractedInterests: ExtractedInterests | undefined;
      let recommendations: Recommendations | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'chunk') {
                setStreamingMessage(prev => prev + data.text);
              } else if (data.type === 'done') {
                newConversationId = data.conversationId;
                extractedInterests = data.extractedInterests;
                recommendations = data.recommendations;

                // Store recommendations for display
                if (recommendations) {
                  setLatestRecommendations(recommendations);
                }

                // Show toast if new interests were detected
                if (extractedInterests && extractedInterests.topics && extractedInterests.topics.length > 0) {
                  toast({
                    title: "🎯 Learning your interests",
                    description: `Discovered: ${extractedInterests.topics.slice(0, 3).join(', ')}`,
                    duration: 3000,
                  });
                }
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      // Capture the final message content BEFORE clearing state
      // This prevents the message from disappearing due to state clearing
      const finalMessageContent = streamingMessage;

      // Add completed assistant message to local state BEFORE clearing streaming
      // This prevents race condition where parent loads stale DB data
      const assistantMessage: Message = {
        id: `temp-assistant-${Date.now()}`,
        role: 'assistant',
        content: finalMessageContent, // Use captured value, not state reference
        created_at: new Date().toISOString(),
      };
      setLocalMessages(prev => [...prev, assistantMessage]);

      // Reset streaming state
      setIsStreaming(false);
      setStreamingMessage('');

      // Notify parent with interests
      onMessageSent(newConversationId, extractedInterests);

    } catch (error) {
      console.error('Error sending message:', error);
      setIsStreaming(false);
      setStreamingMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRecommendationClick = (topic: string) => {
    // Navigate to home page with pre-filled search
    navigate('/', { state: { searchTopic: topic, autoSearch: true } });
  };

  // Display messages (combine local messages + streaming)
  const displayMessages = [...localMessages];
  if (isStreaming && streamingMessage) {
    displayMessages.push({
      id: 'streaming',
      role: 'assistant',
      content: streamingMessage,
      created_at: new Date().toISOString(),
    });
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50">
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-6" ref={scrollRef}>
        {displayMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div
              className="relative mb-6 animate-glidey-entrance"
              style={{
                padding: '2.5rem'
              }}
            >
              {/* Animated waves underneath surfboard */}
              <div style={{ position: 'absolute', bottom: '35%', left: '10%', right: '10%', height: '30px', overflow: 'hidden', zIndex: 5 }}>
                <div className="wave-1" style={{
                  position: 'absolute',
                  width: '200%',
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.3), rgba(147, 197, 253, 0.4), rgba(59, 130, 246, 0.3), transparent)',
                  borderRadius: '50%'
                }} />
              </div>
              <div style={{ position: 'absolute', bottom: '32%', left: '5%', right: '5%', height: '25px', overflow: 'hidden', zIndex: 4 }}>
                <div className="wave-2" style={{
                  position: 'absolute',
                  width: '200%',
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(99, 179, 237, 0.25), rgba(147, 197, 253, 0.35), rgba(99, 179, 237, 0.25), transparent)',
                  borderRadius: '50%'
                }} />
              </div>
              <div style={{ position: 'absolute', bottom: '30%', left: '8%', right: '8%', height: '20px', overflow: 'hidden', zIndex: 3 }}>
                <div className="wave-3" style={{
                  position: 'absolute',
                  width: '200%',
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(147, 197, 253, 0.2), rgba(191, 219, 254, 0.3), rgba(147, 197, 253, 0.2), transparent)',
                  borderRadius: '50%'
                }} />
              </div>

              <img
                src="/images/glidey-surfing.png"
                alt="Glidey"
                className="w-32 h-32 rounded-full"
                style={{
                  filter: 'brightness(1.15) saturate(1.1) drop-shadow(0 8px 24px rgba(59, 130, 246, 0.25))',
                  display: 'block',
                  position: 'relative',
                  zIndex: 10
                }}
              />
            </div>
            <h2 className="text-3xl font-light text-slate-700 tracking-wide">
              What's on Your Mind?
            </h2>
          </div>
        ) : (
          <div className="space-y-6 max-w-3xl mx-auto">
            {displayMessages.map((message, index) => {
              // Check if this is the last assistant message and we have recommendations to show
              const isLastAssistant = message.role === 'assistant' && index === displayMessages.length - 1;
              const showRecommendations = isLastAssistant && latestRecommendations && latestRecommendations.show && latestRecommendations.topics.length > 0;

              return (
                <div key={message.id}>
                  <div
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 transition-all duration-200 ${
                        message.role === 'user'
                          ? 'bg-sky-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-900'
                      } ${message.id === 'streaming' ? 'animate-fadeIn' : ''}`}
                      style={{
                        animation: message.id === 'streaming' ? 'fadeIn 0.3s ease-out' : undefined
                      }}
                    >
                      <div className="relative">
                        <p className={`text-sm whitespace-pre-wrap text-left ${message.id === 'streaming' ? 'streaming-text' : ''}`}>
                          {message.content}
                        </p>
                        {message.id === 'streaming' && (
                          <span className="inline-flex items-center ml-1">
                            <span className="typing-indicator">
                              <span className="typing-dot"></span>
                              <span className="typing-dot"></span>
                              <span className="typing-dot"></span>
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Inline Recommendations */}
                  {showRecommendations && (
                    <div className="mt-3 ml-0 max-w-[80%]">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <p className="text-xs font-semibold text-slate-700 mb-3">
                          📰 Recommended topics for you:
                        </p>
                        <div className="space-y-2">
                          {latestRecommendations.topics.map((topic, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleRecommendationClick(topic)}
                              className="w-full flex items-center justify-between p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all group text-left"
                            >
                              <span className="text-sm font-medium text-slate-900">{topic}</span>
                              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-1 transition-all" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-slate-200 bg-white p-4">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about the news..."
            className="flex-1 min-h-[44px] max-h-32 resize-none"
            disabled={isStreaming}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="bg-sky-600 hover:bg-sky-700 text-white"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-slate-500 text-center mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
