import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * The current time, refreshed on an interval while `enabled`, and straight
 * away whenever the app returns to the foreground. Only used for display:
 * the timer itself is computed from timestamps, so a late refresh can't drift.
 */
export function useNow(enabled: boolean, intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') tick();
    });
    if (!enabled) return () => sub.remove();
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, intervalMs);
    return () => {
      clearTimeout(first);
      clearInterval(id);
      sub.remove();
    };
  }, [enabled, intervalMs]);
  return now;
}
