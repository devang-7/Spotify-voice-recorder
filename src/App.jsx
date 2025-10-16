import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Heart, SkipBack, SkipForward, Volume2, Upload, X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function SpotifyVoiceRecorder() {
  const [recordings, setRecordings] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [currentLabel, setCurrentLabel] = useState('');
  const [playingId, setPlayingId] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [albumArt, setAlbumArt] = useState(null);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRefs = useRef({});
  const fileInputRef = useRef(null);

  const currentRecording = recordings.find(r => r.id === playingId);

  useEffect(() => {
    const cleanup = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      const currentAudioRefs = audioRefs.current;
      Object.values(currentAudioRefs).forEach(audio => {
        if (audio) audio.pause();
      });
    };
    return cleanup;
  }, []);

  useEffect(() => {
    const audio = audioRefs.current[playingId];
    if (audio) {
      const updateTime = () => setCurrentTime(audio.currentTime);
      const updateDuration = () => setDuration(audio.duration);
      
      audio.addEventListener('timeupdate', updateTime);
      audio.addEventListener('loadedmetadata', updateDuration);
      
      return () => {
        audio.removeEventListener('timeupdate', updateTime);
        audio.removeEventListener('loadedmetadata', updateDuration);
      };
    }
  }, [playingId]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAlbumArt(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const newRecording = {
          id: Date.now(),
          url: audioUrl,
          blob: audioBlob,
          label: currentLabel || 'Untitled Recording',
          timestamp: new Date().toLocaleString(),
          duration: recordingTime,
          albumArt: albumArt
        };
        setRecordings(prev => [newRecording, ...prev]);
        setCurrentLabel('');
        setRecordingTime(0);
        setShowRecordModal(false);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Please allow microphone access 💕', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const togglePlayback = async (id, url) => {
    const audio = audioRefs.current[id];
    
    if (playingId === id && audio && !audio.paused) {
      audio.pause();
      setPlayingId(null);
    } else {
      Object.values(audioRefs.current).forEach(a => {
        if (a) a.pause();
      });
      
      if (!audio) {
        const newAudio = new Audio(url);
        audioRefs.current[id] = newAudio;
        newAudio.onended = () => {
          setPlayingId(null);
          setCurrentTime(0);
        };
        newAudio.onerror = (e) => {
          console.error('Audio playback error:', e);
          setPlayingId(null);
        };
        try {
          await newAudio.play();
          setPlayingId(id);
        } catch (err) {
          console.error('Play error:', err);
        }
      } else {
        try {
          await audio.play();
          setPlayingId(id);
        } catch (err) {
          console.error('Play error:', err);
        }
      }
    }
  };

  const skipToNext = () => {
    const currentIndex = recordings.findIndex(r => r.id === playingId);
    if (currentIndex < recordings.length - 1) {
      togglePlayback(recordings[currentIndex + 1].id, recordings[currentIndex + 1].url);
    }
  };

  const skipToPrevious = () => {
    const currentIndex = recordings.findIndex(r => r.id === playingId);
    if (currentIndex > 0) {
      togglePlayback(recordings[currentIndex - 1].id, recordings[currentIndex - 1].url);
    }
  };

  const handleSeek = (e) => {
    const audio = audioRefs.current[playingId];
    if (audio) {
      const seekTime = (e.target.value / 100) * duration;
      audio.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const deleteRecording = (id) => {
    const audio = audioRefs.current[id];
    if (audio) {
      audio.pause();
      delete audioRefs.current[id];
    }
    setRecordings(prev => prev.filter(r => r.id !== id));
    if (playingId === id) {
      setPlayingId(null);
      setCurrentTime(0);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-black to-black text-white">
      {/* Main Content */}
      <div className="flex flex-col h-screen">
        {/* Top Section - Now Playing */}
        <div className={`flex-1 overflow-y-auto p-8 transition-all duration-300 ${isSidebarOpen ? 'mr-80' : ''}`}>
          {currentRecording ? (
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col items-center">
                {/* Album Art */}
                <div className="w-80 h-80 mb-8 rounded-lg shadow-2xl overflow-hidden bg-gradient-to-br from-pink-500 to-purple-600">
                  {currentRecording.albumArt ? (
                    <img src={currentRecording.albumArt} alt="Album Art" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Heart size={120} className="text-white/30" />
                    </div>
                  )}
                </div>
                
                {/* Track Info */}
                <div className="text-center mb-8 w-full">
                  <h1 className="text-4xl font-bold mb-2">{currentRecording.label}</h1>
                  <p className="text-gray-400">Voice Recording</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto text-center py-20">
              <Heart size={80} className="mx-auto mb-6 text-pink-500" />
              <h1 className="text-4xl font-bold mb-4">Our Voice Memories 💕</h1>
              <p className="text-gray-400 mb-8">Record and play back your favorite moments</p>
              <button
                onClick={() => setShowRecordModal(true)}
                className="bg-pink-500 hover:bg-pink-600 text-white px-8 py-3 rounded-full font-semibold transition-all"
              >
                Create New Recording
              </button>
            </div>
          )}
        </div>

        {/* Bottom Player Controls */}
        <div className={`bg-gradient-to-b from-black to-gray-900 border-t border-gray-800 p-6 transition-all duration-300 ${isSidebarOpen ? 'mr-80' : ''}`}>
          <div className="max-w-screen-xl mx-auto">
            {/* Progress Bar */}
            <div className="mb-4">
              <input
                type="range"
                min="0"
                max="100"
                value={duration ? (currentTime / duration) * 100 : 0}
                onChange={handleSeek}
                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #ec4899 0%, #ec4899 ${duration ? (currentTime / duration) * 100 : 0}%, #374151 ${duration ? (currentTime / duration) * 100 : 0}%, #374151 100%)`
                }}
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                {currentRecording && (
                  <>
                    <div className="w-14 h-14 rounded overflow-hidden bg-gradient-to-br from-pink-500 to-purple-600">
                      {currentRecording.albumArt ? (
                        <img src={currentRecording.albumArt} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Heart size={24} className="text-white/50" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{currentRecording.label}</p>
                      <p className="text-xs text-gray-400">Voice Recording</p>
                    </div>
                  </>
                )}
              </div>

              {/* Center Controls */}
              <div className="flex items-center gap-6">
                <button
                  onClick={skipToPrevious}
                  disabled={!playingId || recordings.findIndex(r => r.id === playingId) === 0}
                  className="text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <SkipBack size={28} />
                </button>
                
                <button
                  onClick={() => currentRecording && togglePlayback(currentRecording.id, currentRecording.url)}
                  disabled={!currentRecording}
                  className="w-14 h-14 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {playingId && audioRefs.current[playingId] && !audioRefs.current[playingId].paused ? (
                    <Pause size={24} className="text-black" fill="black" />
                  ) : (
                    <Play size={24} className="text-black ml-1" fill="black" />
                  )}
                </button>

                <button
                  onClick={skipToNext}
                  disabled={!playingId || recordings.findIndex(r => r.id === playingId) === recordings.length - 1}
                  className="text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <SkipForward size={28} />
                </button>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-4 flex-1 justify-end">
                <Volume2 size={20} className="text-gray-400" />
                <button
                  onClick={() => setShowRecordModal(true)}
                  className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2"
                >
                  <Mic size={16} />
                  Record
                </button>
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-lg transition-all flex items-center gap-2"
                >
                  {isSidebarOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                  <span className="text-sm">{isSidebarOpen ? 'Hide' : 'Show'} Recordings</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Expandable Sidebar - Recording List */}
        <div className={`fixed right-0 top-0 bottom-0 bg-black border-l border-gray-800 overflow-y-auto p-6 transition-all duration-300 z-40 ${
          isSidebarOpen ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden'
        }`}>
          <div className={`${isSidebarOpen ? 'block' : 'hidden'}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Your Recordings</h2>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-2">
              {recordings.map((recording) => (
                <div
                  key={recording.id}
                  onClick={() => togglePlayback(recording.id, recording.url)}
                  className={`p-3 rounded-lg cursor-pointer transition-all group ${
                    playingId === recording.id ? 'bg-pink-900/30' : 'hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded overflow-hidden bg-gradient-to-br from-pink-500 to-purple-600 flex-shrink-0">
                      {recording.albumArt ? (
                        <img src={recording.albumArt} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Heart size={20} className="text-white/50" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{recording.label}</p>
                      <p className="text-xs text-gray-400">{formatTime(recording.duration)}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRecording(recording.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {recordings.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No recordings yet</p>
                  <p className="text-sm mt-2">Click "Record" to create your first one!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Toggle Button when collapsed */}
        {!isSidebarOpen && recordings.length > 0 && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="fixed right-4 top-4 bg-pink-500 hover:bg-pink-600 text-white p-3 rounded-full shadow-lg z-30 transition-all"
            title="Show recordings"
          >
            <ChevronLeft size={20} />
          </button>
        )}
      </div>

      {/* Recording Modal */}
      {showRecordModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
          <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">New Recording</h2>
              <button
                onClick={() => {
                  setShowRecordModal(false);
                  if (isRecording) stopRecording();
                }}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Album Art Upload */}
              <div>
                <label className="block text-sm font-medium mb-2">Album Art (Optional)</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-40 border-2 border-dashed border-gray-700 rounded-lg flex items-center justify-center cursor-pointer hover:border-pink-500 transition-all overflow-hidden"
                >
                  {albumArt ? (
                    <img src={albumArt} alt="Album Art" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <Upload size={32} className="mx-auto mb-2 text-gray-500" />
                      <p className="text-sm text-gray-400">Click to upload image</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              {/* Label Input */}
              <div>
                <label className="block text-sm font-medium mb-2">Recording Title</label>
                <input
                  type="text"
                  placeholder="e.g., 'I don't like ittt 😊'"
                  value={currentLabel}
                  onChange={(e) => setCurrentLabel(e.target.value)}
                  disabled={isRecording}
                  className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-pink-500 focus:outline-none text-white"
                />
              </div>

              {/* Recording Status */}
              {isRecording && (
                <div className="text-center py-4">
                  <div className="inline-flex items-center gap-2 bg-red-900/30 text-red-400 px-6 py-3 rounded-full">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
                    <span className="font-semibold">Recording: {formatTime(recordingTime)}</span>
                  </div>
                </div>
              )}

              {/* Record Button */}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-full py-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-3 ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-pink-500 hover:bg-pink-600'
                }`}
              >
                {isRecording ? (
                  <>
                    <Square size={20} fill="white" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic size={20} />
                    Start Recording
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}