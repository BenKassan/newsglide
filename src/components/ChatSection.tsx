
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { NewsData, askQuestion } from '@/services/openaiService';

interface ChatSectionProps {
  newsData: NewsData;
  onQuestionClick: (question: string) => Promise<void>;
}

export const ChatSection: React.FC<ChatSectionProps> = ({
  newsData,
  onQuestionClick
}) => {
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [chatVisible, setChatVisible] = useState(true);
  const [chatBoxHeight, setChatBoxHeight] = useState(250);
  const [chatBoxWidth, setChatBoxWidth] = useState<string | number>('100%');
  const [isResizing, setIsResizing] = useState(false);

  const getChatPersonalization = () => {
    if (!newsData) return { title: 'Ask Questions', subtitle: 'Have questions?' };
    
    const shortTopic = newsData.topic.length > 40 
      ? newsData.topic.substring(0, 40) + '...' 
      : newsData.topic;
    
    const subtitles = [
      `Curious about ${newsData.topic}? I'm here to help you understand.`,
      `Let's explore ${newsData.topic} together. What would you like to know?`,
      `I can help clarify any aspects of ${newsData.topic}. Just ask!`,
      `Dive deeper into ${newsData.topic} - I'm here to answer your questions.`
    ];
    
    const subtitleIndex = newsData.topic.length % subtitles.length;
    
    return {
      title: `Ask About ${shortTopic}`,
      subtitle: subtitles[subtitleIndex]
    };
  };

  const handleQuestionClick = async (question: string) => {
    setChatMessages([{ role: 'user', content: question }]);
    setChatLoading(true);
    setChatError('');
    
    const chatSection = document.getElementById('news-chat-section');
    if (chatSection) {
      chatSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    try {
      const response = await askQuestion({
        question,
        topic: newsData?.topic || '',
        context: {
          headline: newsData?.headline || '',
          summaryPoints: newsData?.summaryPoints || [],
          sources: newsData?.sources.map(s => ({
            outlet: s.outlet,
            headline: s.headline,
            url: s.url
          })) || []
        }
      });

      setChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Chat error:', error);
      setChatError('Failed to get response. Please try again.');
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);
    setChatError('');

    try {
      const response = await askQuestion({
        question: userMessage,
        topic: newsData?.topic || '',
        context: {
          headline: newsData?.headline || '',
          summaryPoints: newsData?.summaryPoints || [],
          sources: newsData?.sources.map(s => ({
            outlet: s.outlet,
            headline: s.headline,
            url: s.url
          })) || [],
          previousMessages: chatMessages
        }
      });

      setChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Chat error:', error);
      setChatError('Failed to get response. Please try again.');
    } finally {
      setChatLoading(false);
    }
  };

  const handleClearChat = () => {
    setChatMessages([]);
    setChatInput('');
    setChatError('');
  };

  return (
    <div 
      id="news-chat-section" 
      className={`relative transition-all duration-300 ${chatVisible ? '' : 'h-auto'}`}
      style={{ 
        width: typeof chatBoxWidth === 'string' ? chatBoxWidth : `${chatBoxWidth}px`,
        maxWidth: '100%',
        margin: '0 auto'
      }}
    >
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-blue-50">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-purple-500" />
              <span className="text-lg">{getChatPersonalization().title}</span>
            </div>
            <div className="flex items-center gap-2">
              {chatMessages.length > 0 && chatVisible && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearChat}
                  className="text-xs"
                >
                  Clear
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setChatVisible(!chatVisible)}
                className="p-1"
              >
                {chatVisible ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        
        {chatVisible && (
          <CardContent 
            className="pt-4 transition-all duration-300"
            style={{ height: `${chatBoxHeight}px` }}
          >
            {/* Welcome message when chat is empty */}
            {chatMessages.length === 0 && (
              <div className="text-center py-6">
                <MessageCircle className="h-10 w-10 mx-auto mb-3 text-purple-400/50" />
                <p className="text-sm text-gray-700 mb-3 font-medium">
                  {getChatPersonalization().subtitle}
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuestionClick("What are the key takeaways?")}
                    className="text-xs hover:bg-purple-50"
                  >
                    Key takeaways? 🎯
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuestionClick("What's the broader context?")}
                    className="text-xs hover:bg-purple-50"
                  >
                    Broader context? 🌍
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuestionClick("What happens next?")}
                    className="text-xs hover:bg-purple-50"
                  >
                    What's next? 🔮
                  </Button>
                </div>
              </div>
            )}

            {/* Chat Messages */}
            {chatMessages.length > 0 && (
              <ScrollArea className="h-[calc(100%-80px)] w-full pr-4 mb-4">
                <div className="space-y-3">
                  {chatMessages.map((message, idx) => (
                    <div
                      key={idx}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} chat-message`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg p-3 text-sm ${
                          message.role === 'user'
                            ? 'bg-purple-100 text-purple-900'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      </div>
                    </div>
                  ))}
                  
                  {chatLoading && (
                    <div className="flex justify-start chat-message">
                      <div className="bg-gray-100 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin text-gray-600" />
                          <span className="text-xs text-gray-600">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {chatError && (
                    <div className="text-center">
                      <p className="text-xs text-red-600">{chatError}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}

            {/* Input Area */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-sm border-t">
              <div className="flex gap-2">
                <Textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={`Ask about ${newsData?.topic || 'this news'}...`}
                  className="resize-none min-h-[40px] text-sm"
                  rows={1}
                  disabled={chatLoading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim() || chatLoading}
                  size="sm"
                  className="px-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <Send className="h-3 w-3" />
                </Button>
              </div>
              
              <p className="text-xs text-gray-500 mt-1">
                Enter to send • Shift+Enter for new line
              </p>
            </div>

            {/* Resize Handles */}
            <div
              className={`absolute bottom-0 left-0 right-0 h-1 bg-gray-300 cursor-ns-resize hover:bg-purple-400 transition-colors ${isResizing ? 'bg-purple-400' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizing(true);
                const startY = e.clientY;
                const startHeight = chatBoxHeight;
                
                const handleMouseMove = (e: MouseEvent) => {
                  const diff = e.clientY - startY;
                  const newHeight = Math.min(500, Math.max(200, startHeight + diff));
                  setChatBoxHeight(newHeight);
                };
                
                const handleMouseUp = () => {
                  setIsResizing(false);
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            />

            <div
              className={`absolute top-0 right-0 bottom-0 w-1 bg-gray-300 cursor-ew-resize hover:bg-purple-400 transition-colors ${isResizing ? 'bg-purple-400' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizing(true);
                const startX = e.clientX;
                const startWidth = typeof chatBoxWidth === 'string' 
                  ? e.currentTarget.parentElement?.offsetWidth || 800 
                  : chatBoxWidth;
                
                const handleMouseMove = (e: MouseEvent) => {
                  const diff = e.clientX - startX;
                  const newWidth = Math.min(1200, Math.max(400, startWidth + diff));
                  setChatBoxWidth(newWidth);
                };
                
                const handleMouseUp = () => {
                  setIsResizing(false);
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            />

            <div
              className={`absolute bottom-0 right-0 w-4 h-4 bg-gray-400 cursor-nwse-resize hover:bg-purple-500 transition-colors ${isResizing ? 'bg-purple-500' : ''}`}
              style={{ borderRadius: '0 0 0 100%' }}
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizing(true);
                const startX = e.clientX;
                const startY = e.clientY;
                const startHeight = chatBoxHeight;
                const startWidth = typeof chatBoxWidth === 'string' 
                  ? e.currentTarget.parentElement?.offsetWidth || 800 
                  : chatBoxWidth;
                
                const handleMouseMove = (e: MouseEvent) => {
                  const diffX = e.clientX - startX;
                  const diffY = e.clientY - startY;
                  const newHeight = Math.min(500, Math.max(200, startHeight + diffY));
                  const newWidth = Math.min(1200, Math.max(400, startWidth + diffX));
                  setChatBoxHeight(newHeight);
                  setChatBoxWidth(newWidth);
                };
                
                const handleMouseUp = () => {
                  setIsResizing(false);
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            />
          </CardContent>
        )}
      </Card>
    </div>
  );
};
