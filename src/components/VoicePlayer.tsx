
import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, Play, Pause, Volume2, Download, AlertCircle } from 'lucide-react';
import { VOICE_OPTIONS } from '@/config/voices';
import { useToast } from "@/hooks/use-toast";

interface VoicePlayerProps {
  text: string;
  articleType: 'base' | 'eli5' | 'phd';
  topic: string;
}

export const VoicePlayer: React.FC<VoicePlayerProps> = ({ text, articleType, topic }) => {
  const [selectedVoice, setSelectedVoice] = useState(VOICE_OPTIONS[0].id);
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

  const generateSpeech = async (text: string, voiceId: string) => {
    const response = await fetch('/api/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text.substring(0, 5000), // Limit to 5000 characters
        voiceId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate speech');
    }

    const data = await response.json();
    return { audio: data.audio };
  };

  const handleGenerateAudio = async () => {
    if (audioData && audioRef.current) {
      // If audio already generated, just play/pause
      handlePlayPause();
      return;
    }

    setLoading(true);
    try {
      // Clean the text for better speech
      const cleanedText = text
        .replace(/\[.*?\]/g, '') // Remove citation markers
        .replace(/\n\n+/g, '. ') // Replace multiple newlines with periods
        .trim();

      const response = await generateSpeech(cleanedText, selectedVoice);

      setAudioData(response.audio);
      
      // Create and play audio
      const audio = new Audio(`data:audio/mp3;base64,${response.audio}`);
      audioRef.current = audio;
      
      // Set up event listeners
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

      audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        toast({
          title: "Playback Error",
          description: "Failed to play audio. Please try again.",
          variant: "destructive"
        });
        setPlaying(false);
      });

      // Start playing
      await audio.play();
      setPlaying(true);

      toast({
        title: "Audio Generated",
        description: `Now playing with ${VOICE_OPTIONS.find(v => v.id === selectedVoice)?.name || 'selected'} voice`,
      });

    } catch (error) {
      console.error('TTS generation error:', error);
      toast({
        title: "Generation Error",
        description: error instanceof Error ? error.message : "Failed to generate speech. Please try again.",
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

  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoice(voiceId);
    // Reset audio when voice changes
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setAudioData(null);
    setPlaying(false);
    setProgress(0);
  };

  const handleDownload = () => {
    if (!audioData) return;

    const selectedVoiceName = VOICE_OPTIONS.find(v => v.id === selectedVoice)?.name || 'narrator';
    const cleanTopicName = topic.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const filename = `newsglide-${cleanTopicName}-${articleType}-${selectedVoiceName}.mp3`;

    const link = document.createElement('a');
    link.href = `data:audio/mp3;base64,${audioData}`;
    link.download = filename;
    link.click();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const textLength = text.length;
  const estimatedDuration = Math.ceil(textLength / 1000); // Rough estimate: 1000 chars = 1 minute

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-purple-600" />
            Listen to this Article
          </span>
          <span className="text-sm font-normal text-gray-600">
            ~{estimatedDuration} min read
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Voice Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Choose a Voice</label>
            <Select value={selectedVoice} onValueChange={handleVoiceChange}>
              <SelectTrigger className="w-full bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VOICE_OPTIONS.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id}>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{voice.avatar}</span>
                      <div>
                        <div className="font-medium">{voice.name}</div>
                        <div className="text-xs text-gray-500">{voice.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Audio Progress */}
          {audioData && duration > 0 && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-gray-600">
                <span>{formatTime((progress / 100) * duration)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-2">
            <Button
              onClick={handleGenerateAudio}
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
                  {audioData ? 'Resume' : 'Generate & Play'}
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

          {/* Warnings/Info */}
          {textLength > 5000 && (
            <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>
                Text exceeds 5000 characters ({textLength} chars). Only the first 5000 characters will be narrated.
              </span>
            </div>
          )}

          <p className="text-xs text-gray-500 text-center">
            Powered by ElevenLabs AI • {articleType === 'eli5' ? 'Simple' : articleType === 'phd' ? 'Academic' : 'Standard'} version
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
