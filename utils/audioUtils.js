// Audio utility functions for file handling and metadata
export const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const validateAudioFile = (file) => {
  const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac'];
  const maxSize = 100 * 1024 * 1024; // 100MB
  
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }
  
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Please select an audio file.' };
  }
  
  if (file.size > maxSize) {
    return { valid: false, error: 'File too large. Maximum size is 100MB.' };
  }
  
  return { valid: true };
};

export const extractMetadata = async (file) => {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    
    audio.addEventListener('loadedmetadata', () => {
      const metadata = {
        duration: audio.duration,
        title: file.name.replace(/\.[^/.]+$/, ''),
        filename: file.name,
        size: file.size,
        type: file.type,
        url: url
      };
      
      resolve(metadata);
    });
    
    audio.addEventListener('error', () => {
      resolve({
        title: file.name.replace(/\.[^/.]+$/, ''),
        filename: file.name,
        size: file.size,
        type: file.type,
        duration: 0,
        url: url
      });
    });
    
    audio.src = url;
  });
};

export const createAudioContext = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    return new AudioContext();
  } catch (error) {
    console.error('Web Audio API not supported:', error);
    return null;
  }
};

export const setupAudioAnalyzer = (audioContext, audioElement) => {
  if (!audioContext || !audioElement) return null;
  
  try {
    const source = audioContext.createMediaElementSource(audioElement);
    const analyzer = audioContext.createAnalyser();
    
    analyzer.fftSize = 256;
    analyzer.smoothingTimeConstant = 0.8;
    
    source.connect(analyzer);
    analyzer.connect(audioContext.destination);
    
    return analyzer;
  } catch (error) {
    console.error('Error setting up audio analyzer:', error);
    return null;
  }
};

export const getFrequencyData = (analyzer) => {
  if (!analyzer) return new Uint8Array(0);
  
  const bufferLength = analyzer.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyzer.getByteFrequencyData(dataArray);
  
  return dataArray;
};

export const normalizeFrequencyData = (dataArray, barCount = 64) => {
  if (!dataArray || dataArray.length === 0) {
    return new Array(barCount).fill(0);
  }
  
  const normalized = [];
  const chunkSize = Math.floor(dataArray.length / barCount);
  
  for (let i = 0; i < barCount; i++) {
    let sum = 0;
    const start = i * chunkSize;
    const end = start + chunkSize;
    
    for (let j = start; j < end && j < dataArray.length; j++) {
      sum += dataArray[j];
    }
    
    const average = sum / chunkSize;
    normalized.push(average / 255); // Normalize to 0-1
  }
  
  return normalized;
};

export const saveToLocalStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error saving to localStorage:', error);
    return false;
  }
};

export const loadFromLocalStorage = (key, defaultValue = null) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return defaultValue;
  }
};

export const clearAudioCache = () => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('audio_') || key.startsWith('player_')) {
        localStorage.removeItem(key);
      }
    });
    return true;
  } catch (error) {
    console.error('Error clearing audio cache:', error);
    return false;
  }
};

export const generateVisualizerColors = (count = 64) => {
  const colors = [];
  const hueStep = 360 / count;
  
  for (let i = 0; i < count; i++) {
    const hue = (i * hueStep) % 360;
    colors.push(`hsl(${hue}, 70%, 60%)`);
  }
  
  return colors;
};

export const smoothArray = (array, smoothingFactor = 0.3) => {
  if (!array || array.length === 0) return array;
  
  const smoothed = [array[0]];
  
  for (let i = 1; i < array.length; i++) {
    smoothed[i] = smoothed[i - 1] * smoothingFactor + array[i] * (1 - smoothingFactor);
  }
  
  return smoothed;
};