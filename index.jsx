import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Vibrate, ArrowLeft } from 'lucide-react';

export default function TimerPWA() {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [initialTime, setInitialTime] = useState(0);
  const [notificationMode, setNotificationMode] = useState('sound');
  const [isFinished, setIsFinished] = useState(false);
  const [smoothProgress, setSmoothProgress] = useState(0);
  const [pausedTimeLeft, setPausedTimeLeft] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isLandscape, setIsLandscape] = useState(false);
  const [pomodoroMode, setPomodoroMode] = useState(false);
  const [pomodoroSession, setPomodoroSession] = useState(1);
  const [isBreak, setIsBreak] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const endTimeRef = useRef(null);
  const intervalRef = useRef(null);
  const animationRef = useRef(null);
  const wakeLockRef = useRef(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  // Haptic feedback helper
  const triggerHaptic = (pattern = [10]) => {
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch (error) {
      console.error('Errore haptic feedback:', error);
    }
  };

  // Swipe gesture handlers
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isRightSwipe && initialTime > 0) {
      // Swipe right: go back
      triggerHaptic([20]);
      if (pomodoroMode) {
        stopPomodoro();
      } else {
        goBackToSelection();
      }
    }
  };

  const onTouchStartVertical = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientY);
  };

  const onTouchMoveVertical = (e) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const onTouchEndVertical = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isDownSwipe = distance < -minSwipeDistance;
    
    if (isDownSwipe && initialTime > 0 && !pomodoroMode) {
      // Swipe down: reset
      triggerHaptic([20]);
      resetTimer();
    }
  };

  const timerPresets = [
    { label: '10s', seconds: 10 },
    { label: '15s', seconds: 15 },
    { label: '30s', seconds: 30 },
    { label: '60s', seconds: 60 },
    { label: '5m', seconds: 300 },
    { label: '10m', seconds: 600 },
    { label: '15m', seconds: 900 },
    { label: '20m', seconds: 1200 },
    { label: '30m', seconds: 1800 },
    { label: '60m', seconds: 3600 },
    { label: '90m', seconds: 5400 },
    { label: '2h', seconds: 7200 }
  ];

  // Detect online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Detect orientation
  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Detect system dark mode preference
  useEffect(() => {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeQuery.matches);

    const handleChange = (e) => {
      setIsDarkMode(e.matches);
    };

    darkModeQuery.addEventListener('change', handleChange);
    return () => darkModeQuery.removeEventListener('change', handleChange);
  }, []);

  // Keep screen awake when timer is running
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && isRunning && !isFinished) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
        console.error('Errore Wake Lock:', err);
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
        } catch (err) {
          console.error('Errore rilascio Wake Lock:', err);
        }
      }
    };

    if (isRunning && !isFinished) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRunning && !isFinished) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      releaseWakeLock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isRunning, isFinished]);

  // Background timer using timestamp comparison
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));
        
        setTimeLeft(remaining);
        
        if (remaining <= 0) {
          setIsRunning(false);
          setIsFinished(true);
          setSmoothProgress(100);
          
          if (notificationMode === 'sound') {
            playSound();
          } else if (notificationMode === 'vibrate') {
            triggerVibration();
          }
          
          // Check if in Pomodoro mode
          if (pomodoroMode) {
            if (isBreak) {
              setIsBreak(false);
              setPomodoroSession(prev => prev + 1);
              setTimeout(() => {
                startTimer(25 * 60);
              }, 2000);
            } else {
              setIsBreak(true);
              const breakTime = pomodoroSession % 4 === 0 ? 15 * 60 : 5 * 60;
              setTimeout(() => {
                startTimer(breakTime);
              }, 2000);
            }
          }
          
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
          }
        }
      }, 1000);

      const animate = () => {
        if (endTimeRef.current) {
          const now = Date.now();
          const totalDuration = initialTime * 1000;
          const timeRemaining = Math.max(0, endTimeRef.current - now);
          const elapsed = totalDuration - timeRemaining;
          const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
          setSmoothProgress(progress);
          
          if (isRunning) {
            animationRef.current = requestAnimationFrame(animate);
          }
        }
      };
      
      if (isRunning) {
        animationRef.current = requestAnimationFrame(animate);
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, notificationMode, initialTime, pomodoroMode, isBreak, pomodoroSession]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (initialTime > 0) {
        switch(e.key.toLowerCase()) {
          case ' ':
          case 'p':
            e.preventDefault();
            if (!isFinished && !pomodoroMode) {
              togglePause();
            }
            break;
          case 'r':
            e.preventDefault();
            if (!pomodoroMode) {
              resetTimer();
            }
            break;
          case 'escape':
          case 'backspace':
            e.preventDefault();
            if (pomodoroMode) {
              stopPomodoro();
            } else {
              goBackToSelection();
            }
            break;
          case 'm':
          case 'n':
            e.preventDefault();
            cycleNotificationMode();
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [initialTime, isFinished, isRunning, pomodoroMode]);

  const playSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 1);
    } catch (error) {
      console.error('Errore nella riproduzione audio:', error);
    }
  };

  const triggerVibration = () => {
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    } catch (error) {
      console.error('Errore nella vibrazione:', error);
    }
  };

  const cycleNotificationMode = () => {
    triggerHaptic([10]);
    const modes = ['sound', 'vibrate', 'none'];
    const currentIndex = modes.indexOf(notificationMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setNotificationMode(modes[nextIndex]);
  };

  const getNotificationIcon = () => {
    switch(notificationMode) {
      case 'sound':
        return <Volume2 size={20} />;
      case 'vibrate':
        return <Vibrate size={20} />;
      case 'none':
        return <VolumeX size={20} />;
      default:
        return <Volume2 size={20} />;
    }
  };

  const startTimer = (seconds) => {
    triggerHaptic([15]);
    const now = Date.now();
    endTimeRef.current = now + (seconds * 1000);
    setTimeLeft(seconds);
    setInitialTime(seconds);
    setPausedTimeLeft(seconds);
    setSmoothProgress(0);
    setIsRunning(true);
    setIsFinished(false);
  };

  const startPomodoro = () => {
    triggerHaptic([15]);
    setPomodoroMode(true);
    setPomodoroSession(1);
    setIsBreak(false);
    startTimer(25 * 60);
  };

  const stopPomodoro = () => {
    triggerHaptic([15]);
    setPomodoroMode(false);
    setPomodoroSession(1);
    setIsBreak(false);
    goBackToSelection();
  };

  const togglePause = () => {
    triggerHaptic([15]);
    if (isRunning) {
      const now = Date.now();
      const remaining = Math.max(0, (endTimeRef.current - now) / 1000);
      setPausedTimeLeft(remaining);
      setTimeLeft(Math.ceil(remaining));
      setIsRunning(false);
    } else {
      const now = Date.now();
      endTimeRef.current = now + (pausedTimeLeft * 1000);
      setIsRunning(true);
    }
  };

  const resetTimer = () => {
    triggerHaptic([15]);
    const now = Date.now();
    endTimeRef.current = now + (initialTime * 1000);
    setTimeLeft(initialTime);
    setPausedTimeLeft(initialTime);
    setSmoothProgress(0);
    setIsRunning(true);
    setIsFinished(false);
  };

  const goBackToSelection = () => {
    triggerHaptic([15]);
    setTimeLeft(0);
    setIsRunning(false);
    setInitialTime(0);
    setIsFinished(false);
    setSmoothProgress(0);
    setPausedTimeLeft(0);
    setPomodoroMode(false);
    setPomodoroSession(1);
    setIsBreak(false);
    endTimeRef.current = null;
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Header */}
      <header className={`py-4 px-6 flex justify-between items-center ${isDarkMode ? 'border-b border-gray-700' : 'border-b border-gray-200'}`}>
        <h1 className={`text-2xl font-light tracking-wide ${isDarkMode ? 'text-white' : 'text-black'}`}>TIMER</h1>
        <div className="flex items-center gap-3">
          {!isOnline && (
            <span className={`text-xs font-light px-2 py-1 rounded ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
              Offline
            </span>
          )}
          <button
            onClick={cycleNotificationMode}
            className={`w-10 h-10 border transition-all duration-200 flex items-center justify-center rounded-full active:scale-90 hover:scale-110 ${
              isDarkMode 
                ? 'border-gray-600 hover:border-gray-400 text-white' 
                : 'border-gray-300 hover:border-black text-black'
            }`}
            aria-label="Cambia notifica"
          >
            {getNotificationIcon()}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main 
        className="flex-1 flex flex-col items-center justify-center p-6"
        onTouchStart={initialTime > 0 ? (e) => { onTouchStart(e); onTouchStartVertical(e); } : undefined}
        onTouchMove={initialTime > 0 ? (e) => { onTouchMove(e); onTouchMoveVertical(e); } : undefined}
        onTouchEnd={initialTime > 0 ? () => { onTouchEnd(); onTouchEndVertical(); } : undefined}
      >
        {initialTime === 0 ? (
          <div className={`w-full animate-fade-in ${isLandscape ? 'max-w-5xl' : 'max-w-2xl'}`}>
            <div className="mb-8 flex justify-center">
              <button
                onClick={startPomodoro}
                className={`px-8 py-4 border-2 transition-all duration-200 rounded-full active:scale-95 hover:scale-105 font-light tracking-wide ${
                  isDarkMode
                    ? 'border-white text-white hover:bg-white hover:text-gray-900'
                    : 'border-black text-black hover:bg-black hover:text-white'
                }`}
              >
                MODALITÀ POMODORO
              </button>
            </div>
            
            <div className={`grid gap-4 ${isLandscape ? 'grid-cols-6' : 'grid-cols-3'}`}>
              {timerPresets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => startTimer(preset.seconds)}
                  className={`aspect-square border-2 transition-all duration-200 flex items-center justify-center text-xl font-light tracking-wide rounded-2xl active:scale-95 hover:scale-105 ${
                    isDarkMode
                      ? 'border-white text-white hover:bg-white hover:text-gray-900'
                      : 'border-black text-black hover:bg-black hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={`w-full flex items-center justify-center animate-fade-in ${
            isLandscape ? 'flex-row gap-16 max-w-6xl' : 'flex-col max-w-md'
          }`}>
            {pomodoroMode && (
              <div className={`${isLandscape ? 'order-first' : 'mb-6'} text-center`}>
                <div className={`text-sm font-light mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Sessione {pomodoroSession}
                </div>
                <div className={`text-lg font-light ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {isBreak ? (pomodoroSession % 4 === 0 ? 'Pausa Lunga' : 'Pausa') : 'Lavoro'}
                </div>
              </div>
            )}
            
            <div 
              className={`relative cursor-pointer ${isLandscape ? 'w-56 h-56' : 'w-64 h-64 mb-12'}`}
              onClick={() => !isFinished && !pomodoroMode && togglePause()}
            >
              <svg className={`transform -rotate-90 ${isLandscape ? 'w-56 h-56' : 'w-64 h-64'}`}>
                <circle
                  cx={isLandscape ? "112" : "128"}
                  cy={isLandscape ? "112" : "128"}
                  r={isLandscape ? "100" : "120"}
                  stroke={isDarkMode ? '#374151' : '#f0f0f0'}
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx={isLandscape ? "112" : "128"}
                  cy={isLandscape ? "112" : "128"}
                  r={isLandscape ? "100" : "120"}
                  stroke={isDarkMode ? '#ffffff' : '#000000'}
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * (isLandscape ? 100 : 120)}`}
                  strokeDashoffset={`${2 * Math.PI * (isLandscape ? 100 : 120) * (1 - smoothProgress / 100)}`}
                  style={{ transition: 'none' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className={`font-light tracking-wider transition-colors ${
                  isLandscape ? 'text-4xl' : 'text-5xl'
                } ${
                  isFinished 
                    ? 'text-red-500 animate-pulse' 
                    : isDarkMode ? 'text-white' : 'text-black'
                }`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${
                isLandscape ? 'pt-16' : 'pt-20'
              }`}>
                <span className={`text-sm font-light ${
                  isFinished 
                    ? 'text-red-400' 
                    : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {Math.round(smoothProgress)}%
                </span>
              </div>
            </div>

            <div className={`flex gap-6 ${isLandscape ? 'flex-col' : 'mb-8'}`}>
              <button
                onClick={pomodoroMode ? stopPomodoro : goBackToSelection}
                className={`w-16 h-16 border-2 transition-all duration-200 flex items-center justify-center rounded-full active:scale-90 hover:scale-110 ${
                  isDarkMode
                    ? 'border-white text-white hover:bg-white hover:text-gray-900'
                    : 'border-black text-black hover:bg-black hover:text-white'
                }`}
                aria-label="Torna indietro"
              >
                <ArrowLeft size={24} />
              </button>
              {!isFinished && !pomodoroMode && (
                <button
                  onClick={togglePause}
                  className={`w-16 h-16 border-2 transition-all duration-200 flex items-center justify-center rounded-full active:scale-90 hover:scale-110 ${
                    isDarkMode
                      ? 'border-white text-white hover:bg-white hover:text-gray-900'
                      : 'border-black text-black hover:bg-black hover:text-white'
                  }`}
                  aria-label={isRunning ? 'Pausa' : 'Riprendi'}
                >
                  {isRunning ? <Pause size={24} /> : <Play size={24} />}
                </button>
              )}
              {!pomodoroMode && (
                <button
                  onClick={resetTimer}
                  className={`w-16 h-16 border-2 transition-all duration-200 flex items-center justify-center rounded-full active:scale-90 hover:scale-110 ${
                    isDarkMode
                      ? 'border-white text-white hover:bg-white hover:text-gray-900'
                      : 'border-black text-black hover:bg-black hover:text-white'
                  }`}
                  aria-label="Reset"
                >
                  <RotateCcw size={24} />
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={`py-4 px-6 text-center ${isDarkMode ? 'border-t border-gray-700' : 'border-t border-gray-200'}`}>
        <p className={`text-xs font-light tracking-wide ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          Progressive Web App • Supporto Offline • Wake Lock
        </p>
        {initialTime > 0 && (
          <p className={`text-xs font-light mt-1 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`}>
            Shortcuts: Spazio/P = Pausa • R = Reset • ESC = Indietro • Swipe → = Indietro • Swipe ↓ = Reset
          </p>
        )}
      </footer>
    </div>
  );
}
