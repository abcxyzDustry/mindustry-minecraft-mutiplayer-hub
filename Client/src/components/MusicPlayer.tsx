import { useState, useEffect, useRef } from 'react';

interface Track {
  name: string;
  file: string;
  artist: string;
}

const tracks: Track[] = [
  { name: 'Faded', file: '/music/Faded.mp3', artist: 'Alan Walker' },
  { name: 'Sing Me to Sleep', file: '/music/Sing Me to Sleep.mp3', artist: 'Alan Walker' },
  { name: 'The Spectre', file: '/music/The Spectre.mp3', artist: 'Alan Walker' },
  { name: 'Headlights', file: '/music/Headlights (Feat. Kiddo).mp3', artist: 'Alan Walker ft. Kiddo' },
  { name: 'Moonlight Sonata 3rd', file: '/music/Beethoven-moonlight-sonata-3rd.mp3', artist: 'Beethoven' },
  { name: 'Cody', file: '/music/Cody.mp3', artist: 'Unknown' },
  { name: 'Invincible', file: '/music/Deaf-kev-invincible.mp3', artist: 'Deaf Kev' },
  { name: 'Different Haven', file: '/music/Different-havean.mp3', artist: 'Different Heaven' },
  { name: 'Different Heaven', file: '/music/Different-heaven.mp3', artist: 'Different Heaven' },
  { name: 'Energy', file: '/music/Energy.mp3', artist: 'Unknown' },
  { name: 'Guren no Yumiya', file: '/music/Guren-no-yumiya.mp3', artist: 'Linked Horizon' },
  { name: 'Quite Like You', file: '/music/Hallmore-quite-like-you.mp3', artist: 'Hallmore' },
  { name: 'Heaven Hardstyle', file: '/music/Heaven-hardstyle.mp3', artist: 'Unknown' },
  { name: 'Horizon', file: '/music/Horizon.mp3', artist: 'Unknown' },
  { name: "Can't Wait", file: '/music/Jim-yosef-cant-wait.mp3', artist: 'Jim Yosef' },
  { name: 'Alibi', file: '/music/Krewella-alibi.mp3', artist: 'Krewella' },
  { name: 'Alive', file: '/music/Krewella-alive.mp3', artist: 'Krewella' },
  { name: 'Light It Up', file: '/music/Light-it-up.mp3', artist: 'Unknown' },
  { name: 'Flares', file: '/music/Niviro-Flares.mp3', artist: 'Niviro' },
  { name: 'Fast Lane', file: '/music/Niviro-pollyanna-fast-lane.mp3', artist: 'Niviro & Pollyanna' },
  { name: 'Pushed Down', file: '/music/Pushed-down.mp3', artist: 'Unknown' },
  { name: 'Rain Man', file: '/music/Rain-man-feat.mp3', artist: 'Rain Man' },
  { name: 'Forever', file: '/music/Vanze-forever.mp3', artist: 'Vanze' },
  { name: 'Where I Want To Be', file: '/music/Where-i-want-to-be.mp3', artist: 'Unknown' },
];

export default function MusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [volume, setVolume] = useState(0.3);
  const [isExpanded, setIsExpanded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  const currentTrack = tracks[currentTrackIndex];

  useEffect(() => {
    const handleFirstInteraction = () => {
      setHasUserInteracted(true);
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (audioRef.current && hasUserInteracted) {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.log('Autoplay prevented:', err);
        setIsPlaying(false);
      });
    }
  }, [hasUserInteracted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      setProgress(audio.currentTime);
      setDuration(audio.duration || 0);
    };

    const handleEnded = () => {
      nextTrack();
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateProgress);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateProgress);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrackIndex]);

  const togglePlay = async () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (err) {
          console.log('Play failed:', err);
          setIsPlaying(false);
        }
      }
    }
  };

  const nextTrack = async () => {
    const newIndex = (currentTrackIndex + 1) % tracks.length;
    setCurrentTrackIndex(newIndex);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
    setTimeout(async () => {
      if (audioRef.current) {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (err) {
          console.log('Play failed:', err);
          setIsPlaying(false);
        }
      }
    }, 100);
  };

  const prevTrack = async () => {
    const newIndex = currentTrackIndex === 0 ? tracks.length - 1 : currentTrackIndex - 1;
    setCurrentTrackIndex(newIndex);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
    setTimeout(async () => {
      if (audioRef.current) {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (err) {
          console.log('Play failed:', err);
          setIsPlaying(false);
        }
      }
    }, 100);
  };

  const selectTrack = async (index: number) => {
    setCurrentTrackIndex(index);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
    setTimeout(async () => {
      if (audioRef.current) {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (err) {
          console.log('Play failed:', err);
          setIsPlaying(false);
        }
      }
    }, 100);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current && duration) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      audioRef.current.currentTime = percentage * duration;
    }
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <audio ref={audioRef} src={currentTrack.file} preload="auto" loop={isLooping} />
      
      <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${
        isExpanded ? 'w-80' : 'w-auto'
      }`}>
        {isExpanded ? (
          <div className="bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl rounded-2xl p-4 border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-minecraft-green to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">🎵</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{currentTrack.name}</p>
                  <p className="text-white/60 text-sm truncate">{currentTrack.artist}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsExpanded(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            <div 
              className="h-1.5 bg-white/10 rounded-full mb-3 cursor-pointer group"
              onClick={handleProgressClick}
            >
              <div 
                className="h-full bg-gradient-to-r from-minecraft-green to-emerald-500 rounded-full relative group-hover:h-2 transition-all"
                style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
              </div>
            </div>

            <div className="flex justify-between text-xs text-white/50 mb-4">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>

            <div className="flex items-center justify-center gap-4 mb-4">
              <button 
                onClick={prevTrack}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                </svg>
              </button>
              
              <button 
                onClick={togglePlay}
                className="p-4 bg-gradient-to-r from-minecraft-green to-emerald-600 rounded-full shadow-lg hover:scale-105 transition-transform"
              >
                {isPlaying ? (
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>
              
              <button 
                onClick={nextTrack}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setIsLooping(!isLooping)}
                className={`p-2 rounded-lg transition-colors ${
                  isLooping ? 'bg-minecraft-green/20 text-minecraft-green' : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
                title={isLooping ? 'Tắt lặp lại' : 'Bật lặp lại'}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
                </svg>
              </button>
              <svg className="w-4 h-4 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
              </svg>
              <input 
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="flex-1 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-minecraft-green"
              />
            </div>

            <div className="space-y-1 max-h-40 overflow-y-auto">
              {tracks.map((track, index) => (
                <button
                  key={index}
                  onClick={() => selectTrack(index)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                    index === currentTrackIndex 
                      ? 'bg-minecraft-green/20 text-minecraft-green' 
                      : 'hover:bg-white/5 text-white/70'
                  }`}
                >
                  <span className="text-lg">
                    {index === currentTrackIndex && isPlaying ? '🎵' : '🎶'}
                  </span>
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{track.name}</p>
                    <p className="text-xs opacity-60 truncate">{track.artist}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-3 bg-gradient-to-r from-gray-900/95 to-gray-800/95 backdrop-blur-xl rounded-full px-4 py-3 border border-white/10 shadow-xl hover:scale-105 transition-transform group cursor-pointer"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setIsExpanded(true)}
          >
            <div className={`w-10 h-10 bg-gradient-to-br from-minecraft-green to-emerald-600 rounded-full flex items-center justify-center shadow-lg ${isPlaying ? 'animate-pulse' : ''}`}>
              <span className="text-lg">🎵</span>
            </div>
            <div className="text-left pr-2">
              <p className="text-white text-sm font-medium truncate max-w-32">{currentTrack.name}</p>
              <p className="text-white/50 text-xs">{isPlaying ? 'Đang phát' : 'Đã tạm dừng'}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              {isPlaying ? (
                <svg className="w-5 h-5 text-minecraft-green" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5 text-minecraft-green" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
