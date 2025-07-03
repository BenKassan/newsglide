import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DEBATE_PERSONAS } from '@/data/debatePersonas';
import { Sparkles, Users, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DebateSelectorProps {
  onStartDebate: (participant1Id: string, participant2Id: string) => void;
  isGenerating: boolean;
  onCancel?: () => void;
}

export const DebateSelector: React.FC<DebateSelectorProps> = ({ 
  onStartDebate, 
  isGenerating,
  onCancel
}) => {
  const [selected, setSelected] = useState<[string | null, string | null]>([null, null]);
  const [hoveredPersona, setHoveredPersona] = useState<string | null>(null);

  const handlePersonaClick = (personaId: string) => {
    if (isGenerating) return;
    
    if (selected[0] === null) {
      setSelected([personaId, null]);
    } else if (selected[1] === null && selected[0] !== personaId) {
      setSelected([selected[0], personaId]);
    } else {
      // Reset and start over with this persona
      setSelected([personaId, null]);
    }
  };

  const canStartDebate = selected[0] && selected[1];
  const selectedPersona1 = DEBATE_PERSONAS.find(p => p.id === selected[0]);
  const selectedPersona2 = DEBATE_PERSONAS.find(p => p.id === selected[1]);

  return (
    <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Debate Generator
            <Badge variant="default" className="ml-2 bg-gradient-to-r from-accent to-primary text-primary-foreground">
              Pro
            </Badge>
          </div>
          {isGenerating && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-xs"
            >
              Cancel
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-6">
          Select two figures to generate an AI debate about this news topic. They'll discuss and debate based on their real-world perspectives.
        </p>
        
        {/* Selected Display */}
        {(selectedPersona1 || selectedPersona2) && (
          <div className="mb-6 p-4 bg-gradient-to-r from-accent/10 to-primary/10 rounded-lg">
            <div className="flex items-center justify-center gap-3">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Participant 1</div>
                <div className="font-semibold text-sm">
                  {selectedPersona1?.name || '?'}
                </div>
              </div>
              <Users className="h-5 w-5 text-primary" />
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Participant 2</div>
                <div className="font-semibold text-sm">
                  {selectedPersona2?.name || '?'}
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {DEBATE_PERSONAS.map((persona) => {
            const isSelected = selected.includes(persona.id);
            const selectionNumber = selected[0] === persona.id ? 1 : selected[1] === persona.id ? 2 : null;
            const isHovered = hoveredPersona === persona.id;
            
            return (
              <button
                key={persona.id}
                onClick={() => handlePersonaClick(persona.id)}
                onMouseEnter={() => setHoveredPersona(persona.id)}
                onMouseLeave={() => setHoveredPersona(null)}
                disabled={isGenerating}
                className={cn(
                  "relative p-4 rounded-lg border-2 transition-all duration-200 transform",
                  isSelected 
                    ? "border-primary bg-primary/5 shadow-lg scale-105" 
                    : "border-border hover:border-primary/50 bg-card hover:shadow-md",
                  isGenerating && "opacity-50 cursor-not-allowed",
                  isHovered && !isSelected && "scale-105"
                )}
              >
                {selectionNumber && (
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold shadow-md">
                    {selectionNumber}
                  </span>
                )}
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
            );
          })}
        </div>

        <Button
          onClick={() => onStartDebate(selected[0]!, selected[1]!)}
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
  );
};