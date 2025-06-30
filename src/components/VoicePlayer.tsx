
import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Volume2, Download, Loader2 } from 'lucide-react';
import { generateMorganFreemanSpeech } from '@/services/ttsService';
import { useToast } from "@/hooks/use-toast";

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
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  const handleGenerateAudio = async () => {
    if (audioUrl) {
      handlePlayPause();
      return;
    }

    setIsLoading(true);
    try {
      const response = await generateMorganFreemanSpeech(text);
      
      // Convert base64 to blob URL
      const audioBlob = new Blob(
        [Uint8Array.from(atob(response.audio), c => c.charCodeAt(0))],
        { type: 'audio/mpeg' }
      );
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      
      toast({
        title: "Audio Ready",
        description: "Morgan Freeman voice has been generated successfully!",
      });
    } catch (error) {
      console.error('TTS Error:', error);
      toast({
        title: "Audio Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate audio",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `newsglide-${topic.replace(/\s+/g, '-')}-${articleType}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getReadingLevelEmoji = () => {
    switch (articleType) {
      case 'eli5': return '🧒';
      case 'phd': return '🔬';
      default: return '📰';
    }
  };

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-purple-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3">
          <Volume2 className="h-5 w-5 text-blue-600" />
          <span>Listen with Morgan Freeman's Voice</span>
          <Badge variant="secondary" className="flex items-center gap-1">
            {getReadingLevelEmoji()} {articleType.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Button
            onClick={handleGenerateAudio}
            disabled={isLoading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : isPlaying ? (
              <Pause className="h-4 w-4 mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isLoading ? 'Generating...' : isPlaying ? 'Pause' : audioUrl ? 'Play' : 'Generate Audio'}
          </Button>

          {audioUrl && (
            <>
              <div className="flex-1 flex items-center gap-2 text-sm text-gray-600">
                <span>{formatTime(currentTime)}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  />
                </div>
                <span>{formatTime(duration)}</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="ml-2"
              >
                <Download className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            preload="metadata"
            className="hidden"
          />
        )}

        <p className="text-xs text-gray-500 mt-3">
          🎭 Powered by ElevenLabs AI • High-quality voice synthesis
        </p>
      </CardContent>
    </Card>
  );
};
