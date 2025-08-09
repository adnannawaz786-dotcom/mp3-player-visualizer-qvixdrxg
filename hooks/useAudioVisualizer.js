import { useState, useEffect, useRef, useCallback } from 'react';

export const useAudioVisualizer = (audioElement) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [frequencyData, setFrequencyData] = useState(new Uint8Array(128));
  const [waveformData, setWaveformData] = useState(new Uint8Array(128));
  const audioContextRef = useRef(null);
  const analyzerRef = useRef(null);
  const sourceRef = useRef(null);
  const animationFrameRef = useRef(null);

  const initializeAudioContext = useCallback(async () => {
    if (!audioElement || audioContextRef.current) return;

    try {
      // Create audio context
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      
      // Create analyzer node
      analyzerRef.current = audioContextRef.current.createAnalyser();
      analyzerRef.current.fftSize = 256;
      analyzerRef.current.smoothingTimeConstant = 0.8;
      
      // Create source from audio element
      sourceRef.current = audioContextRef.current.createMediaElementSource(audioElement);
      
      // Connect nodes
      sourceRef.current.connect(analyzerRef.current);
      analyzerRef.current.connect(audioContextRef.current.destination);
      
      setIsAnalyzing(true);
    } catch (error) {
      console.error('Error initializing audio context:', error);
    }
  }, [audioElement]);

  const startVisualization = useCallback(() => {
    if (!analyzerRef.current || !isAnalyzing) return;

    const bufferLength = analyzerRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const waveformArray = new Uint8Array(bufferLength);

    const updateVisualization = () => {
      if (!analyzerRef.current) return;

      // Get frequency data
      analyzerRef.current.getByteFrequencyData(dataArray);
      setFrequencyData(new Uint8Array(dataArray));

      // Get waveform data
      analyzerRef.current.getByteTimeDomainData(waveformArray);
      setWaveformData(new Uint8Array(waveformArray));

      animationFrameRef.current = requestAnimationFrame(updateVisualization);
    };

    updateVisualization();
  }, [isAnalyzing]);

  const stopVisualization = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    stopVisualization();
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    
    audioContextRef.current = null;
    analyzerRef.current = null;
    sourceRef.current = null;
    setIsAnalyzing(false);
  }, [stopVisualization]);

  const resumeAudioContext = useCallback(async () => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
      } catch (error) {
        console.error('Error resuming audio context:', error);
      }
    }
  }, []);

  // Get visualization data in different formats
  const getBarData = useCallback((barCount = 32) => {
    if (!frequencyData.length) return new Array(barCount).fill(0);
    
    const dataPoints = Math.floor(frequencyData.length / barCount);
    const bars = [];
    
    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      const start = i * dataPoints;
      const end = start + dataPoints;
      
      for (let j = start; j < end && j < frequencyData.length; j++) {
        sum += frequencyData[j];
      }
      
      bars.push(sum / dataPoints);
    }
    
    return bars;
  }, [frequencyData]);

  const getCircularData = useCallback((points = 64) => {
    if (!frequencyData.length) return new Array(points).fill(0);
    
    const dataPoints = Math.floor(frequencyData.length / points);
    const circular = [];
    
    for (let i = 0; i < points; i++) {
      let sum = 0;
      const start = i * dataPoints;
      const end = start + dataPoints;
      
      for (let j = start; j < end && j < frequencyData.length; j++) {
        sum += frequencyData[j];
      }
      
      const amplitude = sum / dataPoints;
      const angle = (i / points) * Math.PI * 2;
      
      circular.push({
        x: Math.cos(angle) * amplitude,
        y: Math.sin(angle) * amplitude,
        amplitude,
        angle
      });
    }
    
    return circular;
  }, [frequencyData]);

  const getWaveformPoints = useCallback((points = 128) => {
    if (!waveformData.length) return new Array(points).fill(128);
    
    const step = Math.floor(waveformData.length / points);
    const wavePoints = [];
    
    for (let i = 0; i < points; i++) {
      const index = i * step;
      wavePoints.push(waveformData[index] || 128);
    }
    
    return wavePoints;
  }, [waveformData]);

  const getAverageFrequency = useCallback(() => {
    if (!frequencyData.length) return 0;
    
    const sum = frequencyData.reduce((acc, val) => acc + val, 0);
    return sum / frequencyData.length;
  }, [frequencyData]);

  const getBassLevel = useCallback(() => {
    if (!frequencyData.length) return 0;
    
    // Bass frequencies are typically in the first 10% of the frequency spectrum
    const bassRange = Math.floor(frequencyData.length * 0.1);
    let sum = 0;
    
    for (let i = 0; i < bassRange; i++) {
      sum += frequencyData[i];
    }
    
    return sum / bassRange;
  }, [frequencyData]);

  const getTrebleLevel = useCallback(() => {
    if (!frequencyData.length) return 0;
    
    // Treble frequencies are typically in the last 30% of the frequency spectrum
    const trebleStart = Math.floor(frequencyData.length * 0.7);
    let sum = 0;
    let count = 0;
    
    for (let i = trebleStart; i < frequencyData.length; i++) {
      sum += frequencyData[i];
      count++;
    }
    
    return count > 0 ? sum / count : 0;
  }, [frequencyData]);

  // Initialize when audio element changes
  useEffect(() => {
    if (audioElement) {
      initializeAudioContext();
    }
    
    return cleanup;
  }, [audioElement, initializeAudioContext, cleanup]);

  // Start/stop visualization based on audio playback
  useEffect(() => {
    if (!audioElement) return;

    const handlePlay = () => {
      resumeAudioContext();
      startVisualization();
    };

    const handlePause = () => {
      stopVisualization();
    };

    audioElement.addEventListener('play', handlePlay);
    audioElement.addEventListener('pause', handlePause);
    audioElement.addEventListener('ended', handlePause);

    return () => {
      audioElement.removeEventListener('play', handlePlay);
      audioElement.removeEventListener('pause', handlePause);
      audioElement.removeEventListener('ended', handlePause);
    };
  }, [audioElement, startVisualization, stopVisualization, resumeAudioContext]);

  return {
    isAnalyzing,
    frequencyData,
    waveformData,
    getBarData,
    getCircularData,
    getWaveformPoints,
    getAverageFrequency,
    getBassLevel,
    getTrebleLevel,
    cleanup
  };
};