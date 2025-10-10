import React, { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Volume2, Share2, RotateCcw, MessageSquare, Sparkles, X } from 'lucide-react'
import { DebateResponse } from '../services/debateService'
import { DEBATE_PERSONAS } from '../data/debatePersonas'
import { cn } from '@shared/utils/utils'

// Component to render text with footnotes as hyperlinks to sources
const TextWithFootnotes: React.FC<{ text: string; sources?: any[] }> = ({ text, sources }) => {
  // Split text by footnote pattern and create React elements
  const parts = text.split(/(\[\^\d+\])/g)

  return (
    <>
      {parts.map((part, index) => {
        // Check if this part is a footnote
        const footnoteMatch = part.match(/\[\^(\d+)\]/)
        if (footnoteMatch) {
          const footnoteNum = parseInt(footnoteMatch[1]) - 1 // Convert to 0-based index
          const source = sources?.[footnoteNum]

          if (source?.url) {
            // Render as a hyperlink to the source
            return (
              <a
                key={index}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-600 hover:text-teal-800 underline decoration-dotted underline-offset-2 text-xs align-super"
                title={`Source: ${source.outlet || 'Article'}`}
              >
                [{footnoteMatch[1]}]
              </a>
            )
          } else {
            // No URL available or no sources provided, render as plain text in brackets
            return (
              <span key={index} className="text-gray-500 text-xs align-super">
                [{footnoteMatch[1]}]
              </span>
            )
          }
        }
        // Render as regular text
        return <span key={index}>{part}</span>
      })}
    </>
  )
}

interface DebateViewerProps {
  debate: DebateResponse
  participant1Name: string
  participant2Name: string
  onPlayAudio?: () => void
  onRegenerateDebate?: () => void
  onNewDebate?: () => void
  topic: string
}


export const DebateViewer: React.FC<DebateViewerProps> = React.memo(
  ({ debate, participant1Name, participant2Name, onPlayAudio, onRegenerateDebate, onNewDebate, topic }) => {
    // Try to find preset personas, or create minimal persona objects for custom names
    const persona1 = DEBATE_PERSONAS.find((p) => p.name === participant1Name) || {
      id: 'custom1',
      name: participant1Name,
      emoji: '👤'
    }
    const persona2 = DEBATE_PERSONAS.find((p) => p.name === participant2Name) || {
      id: 'custom2',
      name: participant2Name,
      emoji: '👤'
    }
    const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})

    const handleImageError = useCallback((personaId: string) => {
      setImageErrors(prev => ({ ...prev, [personaId]: true }))
    }, [])

    const handleShare = useCallback(() => {
      if (navigator.share) {
        navigator.share({
          title: `AI Debate: ${persona1.name} vs ${persona2.name}`,
          text: `Check out this AI-generated debate about "${topic}" between ${persona1.name} and ${persona2.name}!`,
          url: window.location.href,
        })
      }
    }, [persona1.name, persona2.name, topic])

    return (
      <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-primary" />
              <span>
                {persona1.name} vs {persona2.name}
              </span>
            </div>
            <div className="flex gap-2">
              {onNewDebate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onNewDebate}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  New Debate
                </Button>
              )}
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
              const isPersona1 = exchange.speaker === persona1.name
              const currentPersona = isPersona1 ? persona1 : persona2
              // Use dynamic avatar from debate response, fallback to static persona avatar
              const avatarUrl = isPersona1
                ? (debate.participant1Avatar || currentPersona.avatar)
                : (debate.participant2Avatar || currentPersona.avatar)

              return (
                <div
                  key={index}
                  className={cn('flex gap-3', isPersona1 ? 'flex-row' : 'flex-row-reverse')}
                >
                  {/* Avatar/Face */}
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden',
                      isPersona1 ? 'bg-primary/10' : 'bg-accent/10'
                    )}
                  >
                    {avatarUrl && !imageErrors[currentPersona.id] ? (
                      <img
                        src={avatarUrl}
                        alt={currentPersona.name}
                        className="w-full h-full object-cover"
                        onError={() => handleImageError(currentPersona.id)}
                      />
                    ) : (
                      <span className="text-2xl">{currentPersona.emoji}</span>
                    )}
                  </div>

                  {/* Speech Bubble */}
                  <div className={cn('flex-1 max-w-[85%]', !isPersona1 && 'flex justify-end')}>
                    <div>
                      <div
                        className={cn('flex items-center gap-2 mb-1', !isPersona1 && 'justify-end')}
                      >
                        <span className="font-semibold text-sm">{exchange.speaker}</span>
                      </div>
                      <Card
                        className={cn(
                          'transition-all duration-200',
                          isPersona1
                            ? 'bg-primary/5 border-primary/20'
                            : 'bg-accent/5 border-accent/20'
                        )}
                      >
                        <CardContent className="p-4">
                          <p className="text-sm leading-relaxed">
                            <TextWithFootnotes text={exchange.text} />
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Debate Summary */}
          {debate.summary && (
            <div className="mt-8 p-4 bg-muted rounded-lg border">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Debate Summary
              </h4>
              <p className="text-sm text-foreground leading-relaxed">
                <TextWithFootnotes text={debate.summary} />
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="mt-4 flex justify-center gap-4 text-xs text-muted-foreground">
            <span>{debate.exchanges.length} exchanges</span>
            <span>•</span>
            <span>
              ~
              {useMemo(
                () => debate.exchanges.reduce((acc, ex) => acc + ex.text.split(' ').length, 0),
                [debate.exchanges]
              )}{' '}
              words
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }
)

DebateViewer.displayName = 'DebateViewer'
