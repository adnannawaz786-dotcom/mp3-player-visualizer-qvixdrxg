import React, { useRef, useEffect, useState, useCallback } from 'react';

const AudioVisualizer = ({ audioElement, isPlaying }) => {
  const canvasRef = useRef(null);
  const animationIdRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const dataArrayRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const initializeAudioContext = useCallback(async () => {
    if (!audioElement || isInitialized) return;

    try {
      // Create audio context
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      
      // Create analyser node
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      // Create source from audio element
      sourceRef.current = audioContextRef.current.createMediaElementSource(audioElement);
      
      // Connect nodes
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
      
      // Create data array
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing audio context:', error);
    }
  }, [audioElement, isInitialized]);

  const draw = useCallback(() => {
    if (!canvasRef.current || !analyserRef.current || !dataArrayRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Get frequency data
    analyserRef.current.getByteFrequencyData(dataArrayRef.current);

    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(139, 69, 19, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw frequency bars
    const barWidth = width / dataArrayRef.current.length * 2.5;
    let x = 0;

    for (let i = 0; i < dataArrayRef.current.length; i++) {
      const barHeight = (dataArrayRef.current[i] / 255) * height * 0.8;
      
      // Create gradient for bars
      const barGradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
      barGradient.addColorStop(0, `hsl(${i * 2}, 70%, 60%)`);
      barGradient.addColorStop(1, `hsl(${i * 2}, 50%, 40%)`);
      
      ctx.fillStyle = barGradient;
      ctx.fillRect(x, height - barHeight, barWidth, barHeight);
      
      // Add glow effect
      ctx.shadowColor = `hsl(${i * 2}, 70%, 60%)`;
      ctx.shadowBlur = 10;
      ctx.fillRect(x, height - barHeight, barWidth, barHeight);
      ctx.shadowBlur = 0;
      
      x += barWidth + 1;
    }

    // Draw waveform overlay
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    
    const sliceWidth = width / dataArrayRef.current.length;
    x = 0;
    
    for (let i = 0; i < dataArrayRef.current.length; i++) {
      const v = dataArrayRef.current[i] / 128.0;
      const y = v * height / 2;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      x += sliceWidth;
    }
    
    ctx.stroke();

    // Continue animation if playing
    if (isPlaying) {
      animationIdRef.current = requestAnimationFrame(draw);
    }
  }, [isPlaying]);

  // Initialize audio context when audio element changes
  useEffect(() => {
    if (audioElement && !isInitialized) {
      initializeAudioContext();
    }
  }, [audioElement, initializeAudioContext, isInitialized]);

  // Handle play/pause
  useEffect(() => {
    if (!isInitialized || !audioContextRef.current) return;

    if (isPlaying) {
      // Resume audio context if suspended
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      draw();
    } else {
      // Cancel animation
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    }

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [isPlaying, isInitialized, draw]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        canvas.getContext('2d').scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className="relative w-full h-48 bg-gradient-to-br from-gray-900 to-black rounded-lg overflow-hidden border border-gray-700">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-gray-400 text-sm">
            Play audio to see visualizer
          </div>
        </div>
      )}
      {isInitialized && !isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="text-white text-sm opacity-75">
            Audio paused
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioVisualizer;