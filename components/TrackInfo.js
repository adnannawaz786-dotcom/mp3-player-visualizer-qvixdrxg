import React from 'react';
import { motion } from 'framer-motion';
import { Music, Clock, User } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

const TrackInfo = ({ 
  currentTrack, 
  duration, 
  currentTime, 
  isPlaying 
}) => {
  // Format time from seconds to MM:SS
  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Extract metadata from file or use defaults
  const getTrackMetadata = (track) => {
    if (!track) {
      return {
        title: 'No track selected',
        artist: 'Unknown Artist',
        album: 'Unknown Album',
        genre: 'Unknown'
      };
    }

    // If track has metadata properties, use them
    if (typeof track === 'object' && track.title) {
      return {
        title: track.title,
        artist: track.artist || 'Unknown Artist',
        album: track.album || 'Unknown Album',
        genre: track.genre || 'Unknown'
      };
    }

    // If it's a File object, extract from name
    if (track.name) {
      const fileName = track.name.replace(/\.[^/.]+$/, ''); // Remove extension
      return {
        title: fileName,
        artist: 'Unknown Artist',
        album: 'Unknown Album',
        genre: 'Audio'
      };
    }

    // Fallback
    return {
      title: 'Unknown Track',
      artist: 'Unknown Artist',
      album: 'Unknown Album',
      genre: 'Audio'
    };
  };

  const metadata = getTrackMetadata(currentTrack);

  return (
    <Card className="w-full bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-lg border-slate-700/50 shadow-2xl">
      <div className="p-6">
        {/* Track Title and Artist */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <motion.h2 
                className="text-2xl font-bold text-white truncate mb-1"
                animate={isPlaying ? { scale: [1, 1.02, 1] } : {}}
                transition={{ duration: 2, repeat: isPlaying ? Infinity : 0 }}
              >
                {metadata.title}
              </motion.h2>
              <div className="flex items-center text-slate-300 mb-2">
                <User className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">{metadata.artist}</span>
              </div>
            </div>
            
            {/* Playing indicator */}
            {isPlaying && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center ml-4"
              >
                <div className="flex space-x-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-blue-500 rounded-full"
                      animate={{
                        height: [4, 16, 4],
                      }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Album and Genre */}
          <div className="flex items-center text-slate-400 text-sm mb-3">
            <Music className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate mr-4">{metadata.album}</span>
            <Badge variant="secondary" className="bg-slate-700/50 text-slate-300 border-slate-600">
              {metadata.genre}
            </Badge>
          </div>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-4"
        >
          <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              <span>{formatTime(currentTime)}</span>
            </div>
            <span>{formatTime(duration)}</span>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
              initial={{ width: '0%' }}
              animate={{ 
                width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' 
              }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </motion.div>

        {/* File Info */}
        {currentTrack && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xs text-slate-500 border-t border-slate-700/50 pt-3"
          >
            <div className="flex justify-between items-center">
              <span>
                {currentTrack.size ? `${(currentTrack.size / 1024 / 1024).toFixed(1)} MB` : 'Size unknown'}
              </span>
              <span>
                {currentTrack.type || 'audio/mpeg'}
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </Card>
  );
};

export default TrackInfo;