
import { useCallback } from 'react';

const SOUNDS = {
  click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  correct: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  wrong: 'https://assets.mixkit.co/active_storage/sfx/251/251-preview.mp3',
  success: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  royal: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', // Cinematic majestic swell
};

export function useFeedback() {
  const playSound = useCallback((type: keyof typeof SOUNDS) => {
    try {
      const audio = new Audio(SOUNDS[type]);
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Ignore errors (like user hasn't interacted yet)
      });
    } catch (e) {
      console.error('Audio playback failed', e);
    }
  }, []);

  const vibrate = useCallback((pattern: number | number[] = 50) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);

  const feedback = useCallback((type: keyof typeof SOUNDS) => {
    playSound(type);
    if (type === 'wrong') vibrate([100, 50, 100]);
    else if (type === 'correct') vibrate(50);
    else if (type === 'click') vibrate(10);
    else if (type === 'success') vibrate([50, 20, 50, 20, 50]);
    else if (type === 'royal') vibrate([40, 60, 40]);
  }, [playSound, vibrate]);

  return { playSound, vibrate, feedback };
}
