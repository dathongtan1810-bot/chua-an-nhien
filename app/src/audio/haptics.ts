/**
 * Gentle haptic feedback. Uses Capacitor Haptics when running natively
 * (detected at runtime, no @capacitor import), otherwise navigator.vibrate.
 * Never throws.
 */

let enabled = true;

export function setHapticsEnabled(b: boolean): void {
  enabled = !!b;
}

export function isHapticsEnabled(): boolean {
  return enabled;
}

interface CapHaptics {
  vibrate?: (opts: { duration: number }) => Promise<void> | void;
  impact?: (opts: { style: string }) => Promise<void> | void;
}

function capacitorHaptics(): CapHaptics | null {
  try {
    if (typeof window === 'undefined') return null;
    const h = (window as any).Capacitor?.Plugins?.Haptics as CapHaptics | undefined;
    return h ?? null;
  } catch {
    return null;
  }
}

function swallow(p: unknown): void {
  if (p && typeof (p as Promise<void>).catch === 'function') {
    (p as Promise<void>).catch(() => undefined);
  }
}

export function vibrate(pattern: number | number[]): void {
  if (!enabled) return;
  try {
    const arr = (Array.isArray(pattern) ? pattern : [pattern])
      .map((v) => (Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0));
    if (!arr.length || arr.every((v) => v === 0)) return;

    const cap = capacitorHaptics();
    if (cap) {
      if (arr.length === 1 && arr[0] <= 20 && typeof cap.impact === 'function') {
        swallow(cap.impact({ style: 'LIGHT' }));
        return;
      }
      if (typeof cap.vibrate === 'function') {
        // Play "on" segments of the pattern; offsets follow the "off" gaps.
        let offset = 0;
        for (let i = 0; i < arr.length; i++) {
          const d = arr[i];
          if (i % 2 === 0 && d > 0) {
            const run = (): void => {
              try {
                swallow(cap.vibrate!({ duration: d }));
              } catch {
                /* ignore */
              }
            };
            if (offset === 0) run();
            else setTimeout(run, offset);
          }
          offset += d;
        }
        return;
      }
    }

    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(arr.length === 1 ? arr[0] : arr);
    }
  } catch {
    /* never throw */
  }
}
