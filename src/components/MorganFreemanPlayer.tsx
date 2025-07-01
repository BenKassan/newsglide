import React, { useState, useEffect, useRef } from 'react';
import { generateMorganFreemanSpeech } from '@/services/ttsService';
import { useToast } from "@/hooks/use-toast";
import { NewsData } from '@/services/openaiService';
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface MorganFreemanPlayerProps {
  article: NewsData;
}

export default function MorganFreemanPlayer({ article }: MorganFreemanPlayerProps) {
  const [audioData, setAudioData] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [sourceNode, setSourceNode] = useState<AudioBufferSourceNode | null>(null);
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio context on component mount
    const context = new AudioContext();
    setAudioContext(context);

    return () => {
      // Clean up audio context on component unmount
      context.close();
    };
  }, []);

  useEffect(() => {
    if (audioElement) {
      audioElement.volume = volume;
      audioElement.muted = isMuted;
    }
  }, [volume, isMuted, audioElement]);

  const getCachedAudio = async (text: string, articleType: string): Promise<string | null> => {
    const cacheKey = `tts_${articleType}_${text.substring(0, 50).replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { audio, timestamp } = JSON.parse(cached);
        // Use cache if less than 7 days old
        if (Date.now() - timestamp < 7 * 24 * 60 * 60 * 1000) {
          console.log('Using cached TTS audio');
          return audio;
        }
      }
    } catch (e) {
      console.error('TTS cache read error:', e);
    }
    return null;
  };

  const setCachedAudio = (text: string, articleType: string, audio: string) => {
    const cacheKey = `tts_${articleType}_${text.substring(0, 50).replace(/[^a-zA-Z0-9]/g, '_')}`;
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        audio,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error('TTS cache write error:', e);
    }
  };

  const generateAudio = async (text: string, articleType: string) => {
    setLoading(true);
    setError(null);

    try {
      // Check cache first
      const cachedAudio = await getCachedAudio(text, articleType);
      if (cachedAudio) {
        setAudioData(cachedAudio);
        const audio = new Audio(`data:audio/mp3;base64,${cachedAudio}`);
        setAudioElement(audio);
        setLoading(false);
        return;
      }

      // Clean and limit text for TTS
      const cleanedText = text
        .replace(/\*\*/g, '')
        .replace(/[^\w\s.,!?-]/g, '')
        .substring(0, 2000); // Limit to 2000 chars for cost control

      console.log('Generating TTS for:', articleType);
      
      const response = await generateMorganFreemanSpeech(cleanedText);
      
      if (response.audio) {
        setAudioData(response.audio);
        setCachedAudio(text, articleType, response.audio); // Cache the result
        
        const audio = new Audio(`data:audio/${response.format || 'mp3'};base64,${response.audio}`);
        setAudioElement(audio);
        
        toast({
          title: "Audio ready!",
          description: "Click play to listen to the AI narration.",
        });
      }
    } catch (error) {
      console.error('TTS generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate audio';
      setError(errorMessage);
      toast({
        title: "Audio generation failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = () => {
    if (!audioElement) {
      generateAudio(article.summary, 'summary');
      setIsPlaying(true);
      return;
    }

    if (isPlaying) {
      audioElement.pause();
    } else {
      audioElement.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(event.target.value);
    setVolume(newVolume);
  };

  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      <div className="w-full flex items-center justify-center space-x-4">
        <Button
          onClick={handlePlayPause}
          disabled={loading}
          className="px-5 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : isPlaying ? (
            <><Pause className="h-4 w-4 mr-2" /> Pause</>
          ) : (
            <><Play className="h-4 w-4 mr-2" /> Play Summary</>
          )}
        </Button>
      </div>

      {/* Volume Controls */}
      <div className="w-full flex items-center justify-center space-x-4">
        <button onClick={toggleMute} className="focus:outline-none">
          {isMuted ? <VolumeX className="h-5 w-5 text-gray-600" /> : <Volume2 className="h-5 w-5 text-gray-600" />}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          className="w-32 md:w-48"
        />
      </div>

      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
