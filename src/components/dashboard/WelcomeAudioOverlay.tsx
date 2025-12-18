import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipForward, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface WelcomeAudioOverlayProps {
  audioUrl: string;
  artistName: string;
  onComplete: () => void;
}

/**
 * Post-subscription welcome audio overlay
 * Blurs community content, plays artist's welcome message, then fades in
 */
const WelcomeAudioOverlay = ({ audioUrl, artistName, onComplete }: WelcomeAudioOverlayProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Audio starts paused - user must click play manually

  // Update progress
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      setProgress((audio.currentTime / audio.duration) * 100);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      // Audio finished, fade in community
      onComplete();
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [onComplete]);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-xl"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-md mx-4 p-8 rounded-2xl bg-gradient-to-br from-primary/20 to-background border border-primary/30 shadow-[0_0_50px_rgba(168,85,247,0.4)]"
        >
          {/* Header */}
          <div className="text-center mb-8 space-y-3">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/40 to-primary border-2 border-primary/60 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.5)] animate-pulse">
              <Volume2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              {artistName} has a message for you
            </h2>
            <p className="text-sm text-muted-foreground">
              Welcome to the community!
            </p>
          </div>

          {/* Audio Controls */}
          <div className="space-y-6">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-primary/80"
                  style={{ width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatTime(audioRef.current?.currentTime || 0)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Play/Pause Button */}
            <div className="flex items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={togglePlayPause}
                className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-primary/80 hover:scale-110 transition-transform shadow-[0_0_20px_rgba(168,85,247,0.5)]"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6 ml-1" />
                )}
              </Button>
            </div>

            {/* Skip Button */}
            <Button
              variant="outline"
              onClick={handleSkip}
              className="w-full gap-2 hover:bg-primary/10"
            >
              <SkipForward className="w-4 h-4" />
              Skip & Enter Community
            </Button>
          </div>

          {/* Hidden audio element */}
          <audio ref={audioRef} src={audioUrl} preload="auto" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WelcomeAudioOverlay;
