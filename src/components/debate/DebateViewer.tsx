import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Volume2, Share2, RotateCcw, MessageSquare, Sparkles } from 'lucide-react';
import { DebateResponse } from '@/services/debateService';
import { DEBATE_PERSONAS } from '@/data/debatePersonas';
import { cn } from '@/lib/utils';

interface DebateViewerProps {
  debate: DebateResponse;
  participant1Id: string;
  participant2Id: string;
  onPlayAudio?: () => void;
  onRegenerateDebate?: () => void;
  topic: string;
}

export const DebateViewer: React.FC<DebateViewerProps> = ({
  debate,
  participant1Id,
  participant2Id,
  onPlayAudio,
  onRegenerateDebate,
  topic
}) => {
  
  
  const persona1 = DEBATE_PERSONAS.find(p => p.id === participant1Id)!;
  const persona2 = DEBATE_PERSONAS.find(p => p.id === participant2Id)!;

  const getToneColor = (tone: string) => {
    switch (tone) {
      case 'aggressive': return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950';
      case 'calm': return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950';
      case 'analytical': return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950';
      case 'passionate': return 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getToneEmoji = (tone: string) => {
    switch (tone) {
      case 'aggressive': return '🔥';
      case 'calm': return '😌';
      case 'analytical': return '🤔';
      case 'passionate': return '💪';
      default: return '💬';
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `AI Debate: ${persona1.name} vs ${persona2.name}`,
        text: `Check out this AI-generated debate about "${topic}" between ${persona1.name} and ${persona2.name}!`,
        url: window.location.href
      });
    }
  };

  return (
    <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-primary" />
            <span>{persona1.name} vs {persona2.name}</span>
          </div>
          <div className="flex gap-2">
            {onRegenerateDebate && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRegenerateDebate}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Regenerate
              </Button>
            )}
            {navigator.share && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="flex items-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            )}
            {onPlayAudio && (
              <Button
                variant="outline"
                size="sm"
                onClick={onPlayAudio}
                disabled
                className="flex items-center gap-2"
              >
                <Volume2 className="h-4 w-4" />
                Audio Coming Soon
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {/* Topic Context */}
        <div className="mb-6 p-4 bg-gradient-to-r from-accent/10 to-primary/10 rounded-lg">
          <div className="text-sm font-medium text-muted-foreground mb-1">Debating about:</div>
          <div className="text-lg font-semibold text-foreground">{topic}</div>
        </div>

        {/* Debate Exchanges */}
        <div className="space-y-4">
          {debate.exchanges.map((exchange, index) => {
            const isPersona1 = exchange.speaker === persona1.name;
            const currentPersona = isPersona1 ? persona1 : persona2;
            
            return (
              <div
                key={index}
                className={cn(
                  "flex gap-3",
                  isPersona1 ? "flex-row" : "flex-row-reverse"
                )}
              >
                {/* Avatar/Initial */}
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold text-primary-foreground flex-shrink-0",
                  isPersona1 ? "bg-primary" : "bg-accent"
                )}>
                  {currentPersona.name.split(' ').map(n => n[0]).join('')}
                </div>

                {/* Speech Bubble */}
                <div className={cn(
                  "flex-1 max-w-[85%]",
                  !isPersona1 && "flex justify-end"
                )}>
                  <div>
                    <div className={cn(
                      "flex items-center gap-2 mb-1",
                      !isPersona1 && "justify-end"
                    )}>
                      <span className="font-semibold text-sm">{exchange.speaker}</span>
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", getToneColor(exchange.tone))}
                      >
                        {getToneEmoji(exchange.tone)} {exchange.tone}
                      </Badge>
                    </div>
                    <Card 
                      className={cn(
                        "transition-all duration-200",
                        isPersona1 
                          ? "bg-primary/5 border-primary/20" 
                          : "bg-accent/5 border-accent/20"
                      )}
                    >
                      <CardContent className="p-4">
                        <p className="text-sm leading-relaxed">
                          {exchange.text}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Debate Summary */}
        {debate.summary && (
          <div className="mt-8 p-4 bg-muted rounded-lg border">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Debate Summary
            </h4>
            <p className="text-sm text-foreground leading-relaxed">{debate.summary}</p>
          </div>
        )}

        {/* Stats */}
        <div className="mt-4 flex justify-center gap-4 text-xs text-muted-foreground">
          <span>{debate.exchanges.length} exchanges</span>
          <span>•</span>
          <span>~{debate.exchanges.reduce((acc, ex) => acc + ex.text.split(' ').length, 0)} words</span>
        </div>
      </CardContent>
    </Card>
  );
};