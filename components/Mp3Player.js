import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Slider } from './ui/slider';
import { Play, Pause, SkipBack, SkipForward, Volume2, Upload, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Mp3Player = ({ onVisualizerData }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);

  // Initialize audio context for visualizer
  useEffect(() => {
    const initAudioContext = async () => {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
      } catch (error) {
        console.warn('Audio context not supported:', error);
      }
    };

    initAudioContext();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Connect audio element to analyser when track changes
  useEffect(() => {
    if (audioRef.current && audioContextRef.current && analyserRef.current && currentTrack) {
      try {
        const source = audioContextRef.current.createMediaElementSource(audioRef.current);
        source.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
      } catch (error) {
        // Source already connected
      }
    }
  }, [currentTrack]);

  // Visualizer data extraction
  const updateVisualizerData = () => {
    if (analyserRef.current && isPlaying) {
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      if (onVisualizerData) {
        onVisualizerData(dataArray);
      }
    }
    
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(updateVisualizerData);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      updateVisualizerData();
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  }, [isPlaying]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      playNext();
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrack]);

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const audioFiles = files.filter(file => file.type.startsWith('audio/'));
    
    if (audioFiles.length > 0) {
      const newTracks = audioFiles.map((file, index) => ({
        id: Date.now() + index,
        name: file.name.replace(/\.[^/.]+$/, ''),
        url: URL.createObjectURL(file),
        file: file
      }));

      setPlaylist(prev => [...prev, ...newTracks]);
      
      if (!currentTrack && newTracks.length > 0) {
        setCurrentTrack(newTracks[0]);
        setCurrentTrackIndex(playlist.length);
      }
    }
  };

  const togglePlayPause = async () => {
    if (!audioRef.current || !currentTrack) return;

    try {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      if (isPlaying) {
        audioRef.current.pause();
      } else {
        await audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const playNext = () => {
    if (playlist.length === 0) return;
    
    const nextIndex = (currentTrackIndex + 1) % playlist.length;
    setCurrentTrackIndex(nextIndex);
    setCurrentTrack(playlist[nextIndex]);
    setIsPlaying(false);
  };

  const playPrevious = () => {
    if (playlist.length === 0) return;
    
    const prevIndex = currentTrackIndex === 0 ? playlist.length - 1 : currentTrackIndex - 1;
    setCurrentTrackIndex(prevIndex);
    setCurrentTrack(playlist[prevIndex]);
    setIsPlaying(false);
  };

  const handleSeek = (value) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm border-slate-700/50">
      <CardContent className="p-6 space-y-6">
        {/* File Upload */}
        <div className="text-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="audio/*"
            multiple
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload MP3 Files
          </Button>
        </div>

        {/* Track Info */}
        <AnimatePresence mode="wait">
          {currentTrack ? (
            <motion.div
              key={currentTrack.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-2"
            >
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Music className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white truncate">
                {currentTrack.name}
              </h3>
              <p className="text-sm text-slate-400">
                Track {currentTrackIndex + 1} of {playlist.length}
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-slate-400"
            >
              <Music className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No track selected</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress Bar */}
        {currentTrack && (
          <div className="space-y-2">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              onValueChange={handleSeek}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-slate-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center space-x-4">
          <Button
            onClick={playPrevious}
            disabled={playlist.length === 0}
            variant="ghost"
            size="sm"
            className="text-slate-300 hover:text-white disabled:opacity-30"
          >
            <SkipBack className="w-5 h-5" />
          </Button>

          <Button
            onClick={togglePlayPause}
            disabled={!currentTrack}
            size="lg"
            className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-1" />
            )}
          </Button>

          <Button
            onClick={playNext}
            disabled={playlist.length === 0}
            variant="ghost"
            size="sm"
            className="text-slate-300 hover:text-white disabled:opacity-30"
          >
            <SkipForward className="w-5 h-5" />
          </Button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center space-x-3">
          <Volume2 className="w-5 h-5 text-slate-400" />
          <Slider
            value={[volume]}
            max={1}
            step={0.01}
            onValueChange={handleVolumeChange}
            className="flex-1"
          />
          <span className="text-sm text-slate-400 w-12">
            {Math.round(volume * 100)}%
          </span>
        </div>

        {/* Playlist */}
        {playlist.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-300">Playlist</h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {playlist.map((track, index) => (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => {
                    setCurrentTrack(track);
                    setCurrentTrackIndex(index);
                    setIsPlaying(false);
                  }}
                  className={`p-2 rounded cursor-pointer transition-colors ${
                    currentTrackIndex === index
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'
                  }`}
                >
                  <p className="text-sm truncate">{track.name}</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          src={currentTrack?.url}
          preload="metadata"
        />
      </CardContent>
    </Card>
  );
};

export default Mp3Player;