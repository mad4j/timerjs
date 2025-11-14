import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Vibrate, ArrowLeft, ChevronLeft, ChevronsLeft, ChevronRight, ChevronsRight } from 'lucide-react';

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
  const [pomodoroMode, setPomodoroMode] = useState(false);
  const [pomodoroSession, setPomodoroSession] = useState(1);
  const [isBreak, setIsBreak] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [activeButton, setActiveButton] = useState(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
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

  // Button touch handlers to prevent sticky active states on mobile
  const handleButtonTouchStart = (buttonId) => {
    setActiveButton(buttonId);
  };

  const handleButtonTouchEnd = () => {
    // Clear active state after a short delay to allow for visual feedback
    setTimeout(() => {
      setActiveButton(null);
    }, 150);
  };

  const handleButtonTouchCancel = () => {
    setActiveButton(null);
  };

  // Get button classes based on device type and state
  const getButtonClasses = (buttonId, baseClasses, pressedScale = 'scale-90', hoverScale = 'hover:scale-110') => {
    const isPressed = activeButton === buttonId;
    const scaleClass = isPressed ? pressedScale : (!isTouchDevice ? hoverScale : '');
    const hoverClasses = !isTouchDevice ? (isDarkMode ? 'hover:bg-white hover:text-gray-900' : 'hover:bg-black hover:text-white') : '';
    
    return `${baseClasses} ${scaleClass} ${hoverClasses}`;
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

  // Calculate total time in seconds
  const getTotalSeconds = () => {
    return hours * 3600 + minutes * 60 + seconds;
  };

  // Increment/decrement handlers for time controls
  const adjustTime = (unit, amount) => {
    triggerHaptic([10]);
    if (unit === 'hours') {
      setHours(prev => Math.max(0, Math.min(23, prev + amount)));
    } else if (unit === 'minutes') {
      setMinutes(prev => Math.max(0, Math.min(59, prev + amount)));
    } else if (unit === 'seconds') {
      setSeconds(prev => Math.max(0, Math.min(59, prev + amount)));
    }
  };

  // Detect touch device
  useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    
    checkTouchDevice();
    window.addEventListener('resize', checkTouchDevice);
    
    return () => {
      window.removeEventListener('resize', checkTouchDevice);
    };
  }, []);

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
    setHours(0);
    setMinutes(0);
    setSeconds(0);
    endTimeRef.current = null;
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      return timeString.split(':').map((part, index, array) => (
        <span key={index}>
          {part}
          {index < array.length - 1 && <span className="timer-colon">:</span>}
        </span>
      ));
    }
    const timeString = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return timeString.split(':').map((part, index, array) => (
      <span key={index}>
        {part}
        {index < array.length - 1 && <span className="timer-colon">:</span>}
      </span>
    ));
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
            onTouchStart={() => handleButtonTouchStart('notification')}
            onTouchEnd={handleButtonTouchEnd}
            onTouchCancel={handleButtonTouchCancel}
            className={getButtonClasses(
              'notification',
              `w-10 h-10 border transition-all duration-200 flex items-center justify-center rounded-full select-none focus:outline-none ${
                isDarkMode 
                  ? 'border-gray-600 text-white' 
                  : 'border-gray-300 text-black'
              }`,
              'scale-90',
              'hover:scale-110'
            )}
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
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
          <div className="w-full animate-fade-in max-w-2xl">
            <div className="mb-8 flex justify-center">
              <button
                onClick={startPomodoro}
                onTouchStart={() => handleButtonTouchStart('pomodoro')}
                onTouchEnd={handleButtonTouchEnd}
                onTouchCancel={handleButtonTouchCancel}
                className={getButtonClasses(
                  'pomodoro',
                  `px-8 py-4 border-2 transition-all duration-200 rounded-full font-light tracking-wide select-none focus:outline-none ${
                    isDarkMode
                      ? 'border-white text-white'
                      : 'border-black text-black'
                  }`,
                  'scale-95',
                  'hover:scale-105'
                )}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              >
                MODALITÀ POMODORO
              </button>
            </div>
            
            {/* Time Setup Controls */}
            <div className="space-y-6 mb-8">
              {/* Hours */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => adjustTime('hours', -5)}
                  onTouchStart={() => handleButtonTouchStart('hours-minus-5')}
                  onTouchEnd={handleButtonTouchEnd}
                  onTouchCancel={handleButtonTouchCancel}
                  className={getButtonClasses(
                    'hours-minus-5',
                    `w-12 h-12 border-2 transition-all duration-200 flex items-center justify-center rounded-full select-none focus:outline-none ${
                      isDarkMode ? 'border-white text-white' : 'border-black text-black'
                    }`,
                    'scale-90',
                    'hover:scale-110'
                  )}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  aria-label="Diminuisci ore di 5"
                >
                  <ChevronsLeft size={20} />
                </button>
                <button
                  onClick={() => adjustTime('hours', -1)}
                  onTouchStart={() => handleButtonTouchStart('hours-minus-1')}
                  onTouchEnd={handleButtonTouchEnd}
                  onTouchCancel={handleButtonTouchCancel}
                  className={getButtonClasses(
                    'hours-minus-1',
                    `w-12 h-12 border-2 transition-all duration-200 flex items-center justify-center rounded-full select-none focus:outline-none ${
                      isDarkMode ? 'border-white text-white' : 'border-black text-black'
                    }`,
                    'scale-90',
                    'hover:scale-110'
                  )}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  aria-label="Diminuisci ore di 1"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className={`w-32 text-center py-3 px-6 border-2 rounded-lg ${
                  isDarkMode ? 'border-white text-white' : 'border-black text-black'
                }`}>
                  <div className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>ORE</div>
                  <div className="text-2xl font-light timer-display">{hours.toString().padStart(2, '0')}</div>
                </div>
                <button
                  onClick={() => adjustTime('hours', 1)}
                  onTouchStart={() => handleButtonTouchStart('hours-plus-1')}
                  onTouchEnd={handleButtonTouchEnd}
                  onTouchCancel={handleButtonTouchCancel}
                  className={getButtonClasses(
                    'hours-plus-1',
                    `w-12 h-12 border-2 transition-all duration-200 flex items-center justify-center rounded-full select-none focus:outline-none ${
                      isDarkMode ? 'border-white text-white' : 'border-black text-black'
                    }`,
                    'scale-90',
                    'hover:scale-110'
                  )}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  aria-label="Aumenta ore di 1"
                >
                  <ChevronRight size={20} />
                </button>
                <button
                  onClick={() => adjustTime('hours', 5)}
                  onTouchStart={() => handleButtonTouchStart('hours-plus-5')}
                  onTouchEnd={handleButtonTouchEnd}
                  onTouchCancel={handleButtonTouchCancel}
                  className={getButtonClasses(
                    'hours-plus-5',
                    `w-12 h-12 border-2 transition-all duration-200 flex items-center justify-center rounded-full select-none focus:outline-none ${
                      isDarkMode ? 'border-white text-white' : 'border-black text-black'
                    }`,
                    'scale-90',
                    'hover:scale-110'
                  )}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  aria-label="Aumenta ore di 5"
                >
                  <ChevronsRight size={20} />
                </button>
              </div>

              {/* Minutes */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => adjustTime('minutes', -5)}
                  onTouchStart={() => handleButtonTouchStart('minutes-minus-5')}
                  onTouchEnd={handleButtonTouchEnd}
                  onTouchCancel={handleButtonTouchCancel}
                  className={getButtonClasses(
                    'minutes-minus-5',
                    `w-12 h-12 border-2 transition-all duration-200 flex items-center justify-center rounded-full select-none focus:outline-none ${
                      isDarkMode ? 'border-white text-white' : 'border-black text-black'
                    }`,
                    'scale-90',
                    'hover:scale-110'
                  )}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  aria-label="Diminuisci minuti di 5"
                >
                  <ChevronsLeft size={20} />
                </button>
                <button
                  onClick={() => adjustTime('minutes', -1)}
                  onTouchStart={() => handleButtonTouchStart('minutes-minus-1')}
                  onTouchEnd={handleButtonTouchEnd}
                  onTouchCancel={handleButtonTouchCancel}
                  className={getButtonClasses(
                    'minutes-minus-1',
                    `w-12 h-12 border-2 transition-all duration-200 flex items-center justify-center rounded-full select-none focus:outline-none ${
                      isDarkMode ? 'border-white text-white' : 'border-black text-black'
                    }`,
                    'scale-90',
                    'hover:scale-110'
                  )}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  aria-label="Diminuisci minuti di 1"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className={`w-32 text-center py-3 px-6 border-2 rounded-lg ${
                  isDarkMode ? 'border-white text-white' : 'border-black text-black'
                }`}>
                  <div className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>MINUTI</div>
                  <div className="text-2xl font-light timer-display">{minutes.toString().padStart(2, '0')}</div>
                </div>
                <button
                  onClick={() => adjustTime('minutes', 1)}
                  onTouchStart={() => handleButtonTouchStart('minutes-plus-1')}
                  onTouchEnd={handleButtonTouchEnd}
                  onTouchCancel={handleButtonTouchCancel}
                  className={getButtonClasses(
                    'minutes-plus-1',
                    `w-12 h-12 border-2 transition-all duration-200 flex items-center justify-center rounded-full select-none focus:outline-none ${
                      isDarkMode ? 'border-white text-white' : 'border-black text-black'
                    }`,
                    'scale-90',
                    'hover:scale-110'
                  )}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  aria-label="Aumenta minuti di 1"
                >
                  <ChevronRight size={20} />
                </button>
                <button
                  onClick={() => adjustTime('minutes', 5)}
                  onTouchStart={() => handleButtonTouchStart('minutes-plus-5')}
                  onTouchEnd={handleButtonTouchEnd}
                  onTouchCancel={handleButtonTouchCancel}
                  className={getButtonClasses(
                    'minutes-plus-5',
                    `w-12 h-12 border-2 transition-all duration-200 flex items-center justify-center rounded-full select-none focus:outline-none ${
                      isDarkMode ? 'border-white text-white' : 'border-black text-black'
                    }`,
                    'scale-90',
                    'hover:scale-110'
                  )}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  aria-label="Aumenta minuti di 5"
                >
                  <ChevronsRight size={20} />
                </button>
              </div>

              {/* Seconds */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => adjustTime('seconds', -5)}
                  onTouchStart={() => handleButtonTouchStart('seconds-minus-5')}
                  onTouchEnd={handleButtonTouchEnd}
                  onTouchCancel={handleButtonTouchCancel}
                  className={getButtonClasses(
                    'seconds-minus-5',
                    `w-12 h-12 border-2 transition-all duration-200 flex items-center justify-center rounded-full select-none focus:outline-none ${
                      isDarkMode ? 'border-white text-white' : 'border-black text-black'
                    }`,
                    'scale-90',
                    'hover:scale-110'
                  )}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  aria-label="Diminuisci secondi di 5"
                >
                  <ChevronsLeft size={20} />
                </button>
                <button
                  onClick={() => adjustTime('seconds', -1)}
                  onTouchStart={() => handleButtonTouchStart('seconds-minus-1')}
                  onTouchEnd={handleButtonTouchEnd}
                  onTouchCancel={handleButtonTouchCancel}
                  className={getButtonClasses(
                    'seconds-minus-1',
                    `w-12 h-12 border-2 transition-all duration-200 flex items-center justify-center rounded-full select-none focus:outline-none ${
                      isDarkMode ? 'border-white text-white' : 'border-black text-black'
                    }`,
                    'scale-90',
                    'hover:scale-110'
                  )}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  aria-label="Diminuisci secondi di 1"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className={`w-32 text-center py-3 px-6 border-2 rounded-lg ${
                  isDarkMode ? 'border-white text-white' : 'border-black text-black'
                }`}>
                  <div className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>SECONDI</div>
                  <div className="text-2xl font-light timer-display">{seconds.toString().padStart(2, '0')}</div>
                </div>
                <button
                  onClick={() => adjustTime('seconds', 1)}
                  onTouchStart={() => handleButtonTouchStart('seconds-plus-1')}
                  onTouchEnd={handleButtonTouchEnd}
                  onTouchCancel={handleButtonTouchCancel}
                  className={getButtonClasses(
                    'seconds-plus-1',
                    `w-12 h-12 border-2 transition-all duration-200 flex items-center justify-center rounded-full select-none focus:outline-none ${
                      isDarkMode ? 'border-white text-white' : 'border-black text-black'
                    }`,
                    'scale-90',
                    'hover:scale-110'
                  )}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  aria-label="Aumenta secondi di 1"
                >
                  <ChevronRight size={20} />
                </button>
                <button
                  onClick={() => adjustTime('seconds', 5)}
                  onTouchStart={() => handleButtonTouchStart('seconds-plus-5')}
                  onTouchEnd={handleButtonTouchEnd}
                  onTouchCancel={handleButtonTouchCancel}
                  className={getButtonClasses(
                    'seconds-plus-5',
                    `w-12 h-12 border-2 transition-all duration-200 flex items-center justify-center rounded-full select-none focus:outline-none ${
                      isDarkMode ? 'border-white text-white' : 'border-black text-black'
                    }`,
                    'scale-90',
                    'hover:scale-110'
                  )}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  aria-label="Aumenta secondi di 5"
                >
                  <ChevronsRight size={20} />
                </button>
              </div>
            </div>

            {/* Total Time Display and Start Button */}
            <div className="flex flex-col items-center gap-4">
              <div className={`text-sm font-light ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                TEMPO TOTALE
              </div>
              <button
                onClick={() => {
                  const totalTime = getTotalSeconds();
                  if (totalTime > 0) {
                    startTimer(totalTime);
                  }
                }}
                disabled={getTotalSeconds() === 0}
                onTouchStart={() => handleButtonTouchStart('start-total')}
                onTouchEnd={handleButtonTouchEnd}
                onTouchCancel={handleButtonTouchCancel}
                className={getButtonClasses(
                  'start-total',
                  `px-12 py-6 border-2 transition-all duration-200 rounded-2xl text-3xl font-light tracking-wider timer-display select-none focus:outline-none ${
                    getTotalSeconds() === 0
                      ? isDarkMode 
                        ? 'border-gray-700 text-gray-700 cursor-not-allowed' 
                        : 'border-gray-300 text-gray-300 cursor-not-allowed'
                      : isDarkMode
                        ? 'border-white text-white'
                        : 'border-black text-black'
                  }`,
                  'scale-95',
                  getTotalSeconds() === 0 ? '' : 'hover:scale-105'
                )}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              >
                {formatTime(getTotalSeconds())}
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center justify-center animate-fade-in max-w-md">
            {pomodoroMode && (
              <div className="mb-6 text-center">
                <div className={`text-sm font-light mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Sessione {pomodoroSession}
                </div>
                <div className={`text-lg font-light ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {isBreak ? (pomodoroSession % 4 === 0 ? 'Pausa Lunga' : 'Pausa') : 'Lavoro'}
                </div>
              </div>
            )}
            
            <div 
              className="relative cursor-pointer w-64 h-64 mb-12"
              onClick={() => !isFinished && !pomodoroMode && togglePause()}
            >
              <svg className="transform -rotate-90 w-64 h-64">
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  stroke={isDarkMode ? '#374151' : '#f0f0f0'}
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  stroke={isDarkMode ? '#ffffff' : '#000000'}
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 120}`}
                  strokeDashoffset={`${2 * Math.PI * 120 * (1 - smoothProgress / 100)}`}
                  style={{ transition: 'none' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className={`timer-display font-light tracking-wider transition-colors text-5xl ${
                  isFinished 
                    ? 'text-red-500 animate-pulse' 
                    : isDarkMode ? 'text-white' : 'text-black'
                }`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none pt-20">
                <span className={`timer-display text-sm font-light ${
                  isFinished 
                    ? 'text-red-400' 
                    : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {Math.round(smoothProgress)}%
                </span>
              </div>
            </div>

            <div className="flex gap-6 mb-8">
              <button
                onClick={pomodoroMode ? stopPomodoro : goBackToSelection}
                onTouchStart={() => handleButtonTouchStart('back')}
                onTouchEnd={handleButtonTouchEnd}
                onTouchCancel={handleButtonTouchCancel}
                className={getButtonClasses(
                  'back',
                  `w-16 h-16 border-2 transition-all duration-200 flex items-center justify-center rounded-full select-none focus:outline-none ${
                    isDarkMode
                      ? 'border-white text-white'
                      : 'border-black text-black'
                  }`,
                  'scale-90',
                  'hover:scale-110'
                )}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                aria-label="Torna indietro"
              >
                <ArrowLeft size={24} />
              </button>
              {!pomodoroMode && (
                <button
                  onClick={isFinished ? resetTimer : togglePause}
                  onTouchStart={() => handleButtonTouchStart('toggle')}
                  onTouchEnd={handleButtonTouchEnd}
                  onTouchCancel={handleButtonTouchCancel}
                  className={getButtonClasses(
                    'toggle',
                    `w-16 h-16 border-2 transition-all duration-200 flex items-center justify-center rounded-full select-none focus:outline-none ${
                      isDarkMode
                        ? 'border-white text-white'
                        : 'border-black text-black'
                    }`,
                    'scale-90',
                    'hover:scale-110'
                  )}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  aria-label={isFinished ? 'Riavvia' : (isRunning ? 'Pausa' : 'Riprendi')}
                >
                  {isRunning ? <Pause size={24} /> : <Play size={24} />}
                </button>
              )}
              {!pomodoroMode && (
                <button
                  onClick={resetTimer}
                  onTouchStart={() => handleButtonTouchStart('reset')}
                  onTouchEnd={handleButtonTouchEnd}
                  onTouchCancel={handleButtonTouchCancel}
                  className={getButtonClasses(
                    'reset',
                    `w-16 h-16 border-2 transition-all duration-200 flex items-center justify-center rounded-full select-none focus:outline-none ${
                      isDarkMode
                        ? 'border-white text-white'
                        : 'border-black text-black'
                    }`,
                    'scale-90',
                    'hover:scale-110'
                  )}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
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
