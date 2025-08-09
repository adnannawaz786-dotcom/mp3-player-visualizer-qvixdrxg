import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Slider } from './ui/slider';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PlaybackControls = ({ 
  audioRef, 
  currentTrack, 
  isPlaying, 
  setIsPlaying,
  currentTime,
  duration,
  volume,
  setVolume,
  onTrackChange,
  playlist = [],
  currentTrackIndex = 0
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState('none'); // 'none', 'one', 'all'
  const [isDragging, setIsDragging] = useState(false);
  const progressRef = useRef(null);

  // Format time display
  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle play/pause
  const togglePlayPause = () => {
    if (!audioRef.current || !currentTrack) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Handle progress bar click
  const handleProgressClick = (e) => {
    if (!audioRef.current || !duration) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    
    audioRef.current.currentTime = newTime;
  };

  // Handle volume change
  const handleVolumeChange = (newVolume) => {
    const volumeValue = newVolume[0] / 100;
    setVolume(volumeValue);
    if (audioRef.current) {
      audioRef.current.volume = volumeValue;
    }
    if (volumeValue > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (!audioRef.current) return;
    
    if (isMuted) {
      audioRef.current.volume = volume;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  // Handle next track
  const handleNextTrack = () => {
    if (playlist.length === 0) return;
    
    let nextIndex;
    if (isShuffled) {
      nextIndex = Math.floor(Math.random() * playlist.length);
    } else {
      nextIndex = (currentTrackIndex + 1) % playlist.length;
    }
    
    onTrackChange(nextIndex);
  };

  // Handle previous track
  const handlePrevTrack = () => {
    if (playlist.length === 0) return;
    
    let prevIndex;
    if (isShuffled) {
      prevIndex = Math.floor(Math.random() * playlist.length);
    } else {
      prevIndex = currentTrackIndex === 0 ? playlist.length - 1 : currentTrackIndex - 1;
    }
    
    onTrackChange(prevIndex);
  };

  // Handle repeat mode toggle
  const toggleRepeatMode = () => {
    const modes = ['none', 'one', 'all'];
    const currentIndex = modes.indexOf(repeatMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setRepeatMode(modes[nextIndex]);
  };

  // Handle track end
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play();
      } else if (repeatMode === 'all' || currentTrackIndex < playlist.length - 1) {
        handleNextTrack();
      } else {
        setIsPlaying(false);
      }
    };

    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, [repeatMode, currentTrackIndex, playlist.length]);

  const progressPercentage = duration ? (currentTime / duration) * 100 : 0;

  return (
    <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20 shadow-xl">
      <div className="space-y-6">
        {/* Track Info */}
        <AnimatePresence mode="wait">
          {currentTrack && (
            <motion.div
              key={currentTrack.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="text-center space-y-2"
            >
              <h3 className="text-xl font-semibold text-white truncate">
                {currentTrack.name.replace(/\.[^/.]+$/, '')}
              </h3>
              <p className="text-white/70 text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div
            ref={progressRef}
            className="relative h-2 bg-white/20 rounded-full cursor-pointer group"
            onClick={handleProgressClick}
          >
            <motion.div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"
              style={{ width: `${progressPercentage}%` }}
              transition={{ duration: isDragging ? 0 : 0.1 }}
            />
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `${progressPercentage}%`, marginLeft: '-8px' }}
            />
          </div>
        </div>

        {/* Main Controls */}
        <div className="flex items-center justify-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleRepeatMode}
            className={`text-white hover:bg-white/20 ${
              repeatMode !== 'none' ? 'text-purple-300' : 'text-white/70'
            }`}
          >
            <Repeat className="w-4 h-4" />
            {repeatMode === 'one' && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-purple-400 rounded-full" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevTrack}
            disabled={playlist.length === 0}
            className="text-white hover:bg-white/20 disabled:opacity-50"
          >
            <SkipBack className="w-5 h-5" />
          </Button>

          <motion.div whileTap={{ scale: 0.95 }}>
            <Button
              onClick={togglePlayPause}
              disabled={!currentTrack}
              className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white ml-1" />
              )}
            </Button>
          </motion.div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextTrack}
            disabled={playlist.length === 0}
            className="text-white hover:bg-white/20 disabled:opacity-50"
          >
            <SkipForward className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsShuffled(!isShuffled)}
            className={`text-white hover:bg-white/20 ${
              isShuffled ? 'text-purple-300' : 'text-white/70'
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </Button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMute}
            className="text-white hover:bg-white/20"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </Button>
          
          <div className="flex-1 max-w-24">
            <Slider
              value={[isMuted ? 0 : volume * 100]}
              onValueChange={handleVolumeChange}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
          
          <span className="text-white/70 text-xs min-w-8">
            {Math.round(isMuted ? 0 : volume * 100)}%
          </span>
        </div>
      </div>
    </Card>
  );
};

export default PlaybackControls;