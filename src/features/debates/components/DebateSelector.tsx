import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Input } from '@ui/input'
import { Label } from '@ui/label'
import { DEBATE_PERSONAS } from '../data/debatePersonas'
import { Sparkles, Users, Loader2 } from 'lucide-react'
import { cn } from '@shared/utils/utils'

interface DebateSelectorProps {
  onStartDebate: (participant1Name: string, participant2Name: string) => void
  isGenerating: boolean
  onCancel?: () => void
}

export const DebateSelector: React.FC<DebateSelectorProps> = ({
  onStartDebate,
  isGenerating,
  onCancel,
}) => {
  const [participant1Name, setParticipant1Name] = useState('')
  const [participant2Name, setParticipant2Name] = useState('')
  const [hoveredPersona, setHoveredPersona] = useState<string | null>(null)

  const handlePersonaClick = (personaName: string) => {
    if (isGenerating) return

    // Auto-fill the first empty input, or the first one if both are filled
    if (!participant1Name) {
      setParticipant1Name(personaName)
    } else if (!participant2Name && participant1Name !== personaName) {
      setParticipant2Name(personaName)
    } else {
      // Reset and start over
      setParticipant1Name(personaName)
      setParticipant2Name('')
    }
  }

  const canStartDebate = participant1Name.trim() && participant2Name.trim() && participant1Name.trim() !== participant2Name.trim()

  return (
    <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Debate Generator
            <Badge
              variant="default"
              className="ml-2 bg-gradient-to-r from-accent to-primary text-primary-foreground"
            >
              Pro
            </Badge>
          </div>
          {isGenerating && (
            <Button variant="ghost" size="sm" onClick={onCancel} className="text-xs">
              Cancel
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-6">
          Enter names of any two people to generate an AI debate, or choose from our quick select options below.
        </p>

        {/* Custom Name Inputs */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="participant1">Participant 1</Label>
              <Input
                id="participant1"
                placeholder="e.g., Albert Einstein"
                value={participant1Name}
                onChange={(e) => setParticipant1Name(e.target.value)}
                disabled={isGenerating}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="participant2">Participant 2</Label>
              <Input
                id="participant2"
                placeholder="e.g., Marie Curie"
                value={participant2Name}
                onChange={(e) => setParticipant2Name(e.target.value)}
                disabled={isGenerating}
                className="bg-background"
              />
            </div>
          </div>

          {/* Selected Display */}
          {(participant1Name || participant2Name) && (
            <div className="p-4 bg-gradient-to-r from-accent/10 to-primary/10 rounded-lg">
              <div className="flex items-center justify-center gap-3">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">Participant 1</div>
                  <div className="font-semibold text-sm">{participant1Name || '?'}</div>
                </div>
                <Users className="h-5 w-5 text-primary" />
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">Participant 2</div>
                  <div className="font-semibold text-sm">{participant2Name || '?'}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Select Label */}
        <div className="mb-3">
          <h4 className="text-sm font-semibold text-foreground">Quick Select</h4>
          <p className="text-xs text-muted-foreground">Click to auto-fill names</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {DEBATE_PERSONAS.map((persona) => {
            const isSelected = participant1Name === persona.name || participant2Name === persona.name
            const isHovered = hoveredPersona === persona.id

            return (
              <button
                key={persona.id}
                onClick={() => handlePersonaClick(persona.name)}
                onMouseEnter={() => setHoveredPersona(persona.id)}
                onMouseLeave={() => setHoveredPersona(null)}
                disabled={isGenerating}
                className={cn(
                  'relative p-4 rounded-lg border-2 transition-all duration-200 transform',
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-lg'
                    : 'border-border hover:border-primary/50 bg-card hover:shadow-md',
                  isGenerating && 'opacity-50 cursor-not-allowed',
                  isHovered && !isSelected && 'scale-105'
                )}
              >
                <div className="text-sm font-semibold mb-1">{persona.name}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">{persona.title}</div>

                {/* Hover tooltip */}
                {isHovered && (
                  <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-2 bg-white text-gray-900 text-xs rounded-lg shadow-lg max-w-xs pointer-events-none border">
                    <div className="font-semibold mb-1">{persona.name}</div>
                    <div className="text-gray-600">
                      {persona.traits.positions.slice(0, 2).join(', ')}
                    </div>
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                      <div className="border-4 border-transparent border-t-white"></div>
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <Button
          onClick={() => onStartDebate(participant1Name.trim(), participant2Name.trim())}
          disabled={!canStartDebate || isGenerating}
          className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Debate...
            </>
          ) : (
            'Generate AI Debate'
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center mt-3">
          Debates typically take 10-15 seconds to generate
        </p>
      </CardContent>
    </Card>
  )
}
