import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Slider } from '../components/ui/slider';
import { Play, Pause, SkipBack, SkipForward, Volume2, Upload, Music } from 'lucide-react';

export default function MP3Player() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState([0.7]);
  const [audioFile, setAudioFile] = useState(null);
  const [audioFileName, setAudioFileName] = useState('');
  const [visualizerData, setVisualizerData] = useState(new Array(32).fill(0));

  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyzerRef = useRef(null);
  const sourceRef = useRef(null);
  const animationRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', () => setIsPlaying(false));

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', () => setIsPlaying(false));
    };
  }, [audioFile]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume[0];
    }
  }, [volume]);

  const setupAudioContext = async () => {
    if (!audioContextRef.current && audioRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyzerRef.current = audioContextRef.current.createAnalyser();
        analyzerRef.current.fftSize = 64;
        
        if (!sourceRef.current) {
          sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
          sourceRef.current.connect(analyzerRef.current);
          analyzerRef.current.connect(audioContextRef.current.destination);
        }
      } catch (error) {
        console.error('Error setting up audio context:', error);
      }
    }
  };

  const startVisualizer = () => {
    if (!analyzerRef.current) return;

    const bufferLength = analyzerRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const animate = () => {
      if (!isPlaying) return;

      analyzerRef.current.getByteFrequencyData(dataArray);
      const normalizedData = Array.from(dataArray).map(value => value / 255);
      setVisualizerData(normalizedData);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('audio/')) {
      const url = URL.createObjectURL(file);
      setAudioFile(url);
      setAudioFileName(file.name);
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const togglePlay = async () => {
    if (!audioFile || !audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    } else {
      await setupAudioContext();
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      audioRef.current.play();
      setIsPlaying(true);
      startVisualizer();
    }
  };

  const handleSeek = (value) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 10, duration);
    }
  };

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 10, 0);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            MP3 Player
          </h1>
          <p className="text-gray-300 text-lg">Upload and play your favorite music with live visualization</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Player Controls */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <Card className="p-8 bg-white/10 backdrop-blur-lg border-white/20 text-white">
              <div className="space-y-6">
                {/* File Upload */}
                <div className="text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    size="lg"
                    className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20"
                  >
                    <Upload className="mr-2 h-5 w-5" />
                    Upload MP3 File
                  </Button>
                </div>

                {/* Current Track */}
                {audioFileName && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center p-4 bg-white/5 rounded-lg border border-white/10"
                  >
                    <Music className="mx-auto h-8 w-8 mb-2 text-purple-400" />
                    <p className="font-medium truncate">{audioFileName}</p>
                  </motion.div>
                )}

                {/* Progress Bar */}
                {audioFile && (
                  <div className="space-y-2">
                    <Slider
                      value={[currentTime]}
                      max={duration || 100}
                      step={1}
                      onValueChange={handleSeek}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-300">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                )}

                {/* Control Buttons */}
                <div className="flex items-center justify-center space-x-4">
                  <Button
                    onClick={skipBackward}
                    disabled={!audioFile}
                    size="lg"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                  >
                    <SkipBack className="h-6 w-6" />
                  </Button>
                  
                  <Button
                    onClick={togglePlay}
                    disabled={!audioFile}
                    size="lg"
                    className="bg-purple-600 hover:bg-purple-700 text-white w-16 h-16 rounded-full"
                  >
                    {isPlaying ? (
                      <Pause className="h-8 w-8" />
                    ) : (
                      <Play className="h-8 w-8 ml-1" />
                    )}
                  </Button>
                  
                  <Button
                    onClick={skipForward}
                    disabled={!audioFile}
                    size="lg"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                  >
                    <SkipForward className="h-6 w-6" />
                  </Button>
                </div>

                {/* Volume Control */}
                <div className="flex items-center space-x-3">
                  <Volume2 className="h-5 w-5 text-gray-300" />
                  <Slider
                    value={volume}
                    max={1}
                    step={0.01}
                    onValueChange={setVolume}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-300 w-12">
                    {Math.round(volume[0] * 100)}%
                  </span>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Visualizer */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <Card className="p-8 bg-white/10 backdrop-blur-lg border-white/20 h-full">
              <h3 className="text-white text-xl font-semibold mb-6 text-center">Audio Visualizer</h3>
              <div className="flex items-end justify-center space-x-1 h-64">
                {visualizerData.map((value, index) => (
                  <motion.div
                    key={index}
                    className="bg-gradient-to-t from-purple-500 to-pink-500 rounded-t-lg"
                    style={{
                      width: '8px',
                      height: `${Math.max(value * 200, 4)}px`,
                    }}
                    animate={{
                      height: `${Math.max(value * 200, 4)}px`,
                    }}
                    transition={{
                      duration: 0.1,
                      ease: 'easeOut',
                    }}
                  />
                ))}
              </div>
              <div className="mt-4 text-center">
                <p className="text-gray-300 text-sm">
                  {isPlaying ? 'Playing...' : audioFile ? 'Paused' : 'Upload a file to see visualization'}
                </p>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Hidden audio element */}
        {audioFile && (
          <audio
            ref={audioRef}
            src={audioFile}
            preload="metadata"
          />
        )}
      </div>
    </div>
  );
}