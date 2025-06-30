
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2 } from "lucide-react";
import { generateMorganFreemanSpeech } from "@/services/ttsService";

interface VoicePlayerProps {
  text: string;
  disabled?: boolean;
}

export const VoicePlayer: React.FC<VoicePlayerProps> = ({ text, disabled = false }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const handlePlay = async () => {
    if (isPlaying && audio) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await generateMorganFreemanSpeech(text);
      
      if (audio) {
        audio.pause();
      }

      const newAudio = new Audio(`data:audio/mp3;base64,${response.audio}`);
      setAudio(newAudio);
      
      newAudio.onended = () => {
        setIsPlaying(false);
      };
      
      await newAudio.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing audio:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePlay}
      disabled={disabled || isLoading}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
    >
      <Volume2 className="h-4 w-4" />
      {isLoading ? (
        "Loading..."
      ) : isPlaying ? (
        <>
          <Pause className="h-4 w-4" />
          Pause
        </>
      ) : (
        <>
          <Play className="h-4 w-4" />
          Listen
        </>
      )}
    </Button>
  );
};
