
import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, Play, Pause, Volume2, Download } from 'lucide-react';
import { generateMorganFreemanSpeech } from '@/services/ttsService';
import { useToast } from "@/hooks/use-toast";

interface VoicePlayerProps {
  text: string;
  articleType: string;
  topic: string;
  onPlay?: () => void;
}

export const VoicePlayer: React.FC<VoicePlayerProps> = ({ text, articleType, topic, onPlay }) => {
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [audioData, setAudioData] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlay = async () => {
    if (audioData && audioRef.current) {
      handlePlayPause();
      return;
    }

    setLoading(true);
    try {
      // Call the onPlay callback if provided
      if (onPlay) {
        onPlay();
      }

      const cleanedText = text
        .replace(/\[.*?\]/g, '')
        .replace(/\n\n+/g, '. ')
        .trim();

      const response = await generateMorganFreemanSpeech(cleanedText);
      setAudioData(response.audio);
      
      const audio = new Audio(`data:audio/mp3;base64,${response.audio}`);
      audioRef.current = audio;
      
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
      });

      audio.addEventListener('timeupdate', () => {
        if (audio.duration) {
          setProgress((audio.currentTime / audio.duration) * 100);
        }
      });

      audio.addEventListener('ended', () => {
        setPlaying(false);
        setProgress(0);
      });

      await audio.play();
      setPlaying(true);

      toast({
        title: "Audio Generated",
        description: "Now playing with Morgan Freeman's voice",
      });

    } catch (error) {
      console.error('TTS error:', error);
      toast({
        title: "Generation Error",
        description: error instanceof Error ? error.message : "Failed to generate speech",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  const handleDownload = () => {
    if (!audioData) return;

    const cleanTopicName = topic.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const filename = `newsglide-${cleanTopicName}-${articleType}-morgan-freeman.mp3`;

    const link = document.createElement('a');
    link.href = `data:audio/mp3;base64,${audioData}`;
    link.download = filename;
    link.click();
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const textLength = text.length;
  const estimatedMinutes = Math.ceil(textLength / 1000);

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-purple-600" />
            Listen with Morgan Freeman
          </span>
          <span className="text-sm font-normal text-gray-600">
            ~{estimatedMinutes} min
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 p-3 bg-white/60 rounded-lg">
            <span className="text-2xl">🎭</span>
            <div className="text-center">
              <p className="font-semibold">Morgan Freeman</p>
              <p className="text-xs text-gray-600">Iconic narrator voice</p>
            </div>
          </div>

          {audioData && duration > 0 && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-gray-600">
                <span>{formatTime((progress / 100) * duration)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handlePlay}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Audio...
                </>
              ) : playing ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  {audioData ? 'Resume' : 'Play with Morgan Freeman'}
                </>
              )}
            </Button>

            {audioData && (
              <Button
                onClick={handleDownload}
                variant="outline"
                size="icon"
                title="Download audio"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>

          {textLength > 5000 && (
            <p className="text-xs text-amber-600 italic text-center">
              ⚠️ Text exceeds 5000 characters. Only first 5000 will be narrated.
            </p>
          )}

          <p className="text-xs text-gray-500 text-center">
            Powered by ElevenLabs AI
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
