// Tiny event bus for boot-stage instrumentation.
// Call setBootStage() anywhere; IosDebugOverlay listens and displays it.
// Also always console.logs so Xcode's device console captures it.

export type BootStage =
  | 'booting'
  | 'clerk-init'
  | 'clerk-loaded'
  | 'signed-out'
  | 'getting-token'
  | 'token-ok'
  | 'token-fail'
  | 'syncing'
  | 'sync-ok'
  | 'sync-fail'
  | 'loading-user'
  | 'ready'
  | 'timeout'
  | 'failed';

const listeners: Array<(stage: string, detail?: string) => void> = [];

export function onBootStage(cb: (stage: string, detail?: string) => void) {
  listeners.push(cb);
  return () => {
    const i = listeners.indexOf(cb);
    if (i >= 0) listeners.splice(i, 1);
  };
}

export function setBootStage(stage: BootStage | string, detail?: string) {
  const ts = new Date().toISOString().slice(11, 23);
  const msg = detail ? `[Boot ${ts}] ${stage}: ${detail}` : `[Boot ${ts}] ${stage}`;
  console.log(msg);
  listeners.forEach(cb => cb(stage, detail));
}
