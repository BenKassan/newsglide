import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  const navigate = useNavigate();
  const { toast } = useToast();

  // Sync local messages with props when conversation changes
  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

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
            <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-4 rounded-2xl mb-6">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Your AI News Discovery Assistant
            </h2>
            <p className="text-slate-600 max-w-md mb-8">
              Tell me what interests you, and I'll help you discover personalized news topics and articles.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mb-6">
              {[
                "I'm interested in AI and technology 🖥️",
                "Tell me about climate change news 🌍",
                "I work in healthcare 🏥",
                "Surprise me with interesting topics! ✨",
              ].map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setInput(suggestion)}
                  className="p-3 text-left text-sm bg-white border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
            {onShowSurvey && (
              <div className="mt-4">
                <p className="text-sm text-slate-600 mb-2">Not sure what to say?</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onShowSurvey}
                  className="text-slate-700"
                >
                  📋 Take a quick survey instead
                </Button>
              </div>
            )}
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
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-900'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.id === 'streaming' && (
                        <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1"></span>
                      )}
                    </div>
                  </div>

                  {/* Inline Recommendations */}
                  {showRecommendations && (
                    <div className="mt-3 ml-0 max-w-[80%]">
                      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4">
                        <p className="text-xs font-semibold text-slate-700 mb-3">
                          📰 Recommended topics for you:
                        </p>
                        <div className="space-y-2">
                          {latestRecommendations.topics.map((topic, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleRecommendationClick(topic)}
                              className="w-full flex items-center justify-between p-3 bg-white/60 hover:bg-white rounded-lg transition-all group text-left"
                            >
                              <span className="text-sm font-medium text-slate-900">{topic}</span>
                              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
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
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
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
