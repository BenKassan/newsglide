
import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, Download, Volume2, RotateCcw, Loader2 } from 'lucide-react';
import { generateMorganFreemanSpeech } from '@/services/ttsService';

interface VoicePlayerProps {
  text: string;
  articleType: 'base' | 'eli5' | 'phd';
  topic: string;
}

export const VoicePlayer: React.FC<VoicePlayerProps> = ({ text, articleType, topic }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const getArticleTypeLabel = () => {
    switch (articleType) {
      case 'eli5': return '🧒 ELI5 Version';
      case 'phd': return '🔬 PhD Analysis';
      default: return '📰 Essential Version';
    }
  };

  const generateAudio = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await generateMorganFreemanSpeech(text.trim().substring(0, 5000));
      
      // Create audio from base64
      const audio = new Audio(`data:audio/mp3;base64,${response.audio}`);
      audioRef.current = audio;

      // Store the data URL for download
      setAudioUrl(`data:audio/mp3;base64,${response.audio}`);

      // Set up audio event listeners
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
      });

      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime);
      });

      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });

      audio.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        setError('Failed to load audio');
        setIsPlaying(false);
      });

    } catch (error) {
      console.error('TTS Error:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate audio');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayPause = async () => {
    if (!audioRef.current && !isLoading) {
      await generateAudio();
      return;
    }
    
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (error) {
          console.error('Play error:', error);
          setError('Failed to play audio');
        }
      }
    }
  };

  const downloadAudio = () => {
    if (audioUrl) {
      const link = document.createElement('a');
      link.href = audioUrl;
      link.download = `newsglide-voice-${Date.now()}.mp3`;
      link.click();
    }
  };

  const restartAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-blue-600" />
            <span>Listen to Article</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {getArticleTypeLabel()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        
        <div className="flex items-center gap-4">
          <Button
            onClick={togglePlayPause}
            disabled={isLoading}
            className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>
          
          <div className="flex-1">
            <Progress value={progressPercentage} className="h-2" />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
          
          <Button
            onClick={restartAudio}
            variant="outline"
            size="sm"
            disabled={!audioRef.current}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          
          <Button
            onClick={downloadAudio}
            variant="outline"
            size="sm"
            disabled={!audioUrl}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="text-center">
          <p className="text-sm text-gray-600">
            🎙️ <strong>Morgan Freeman Voice</strong> • {Math.ceil(text.length / 5)} words • ~{Math.ceil(text.length / 150)} min listen
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Audio is generated from the {getArticleTypeLabel().toLowerCase()} content
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
