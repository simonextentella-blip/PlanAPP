/**
 * Notifiche dei sopralluoghi. Per ora funzionano solo nell'app web installata (PWA):
 * qui, nell'app nativa, non si fa nulla. Vedi push.web.ts.
 */
export type PushState = 'unsupported' | 'install' | 'denied' | 'off' | 'on';

export async function pushState(): Promise<PushState> {
  return 'unsupported';
}
export async function enablePush(_email: string, _userName: string): Promise<string | null> {
  return 'Le notifiche per ora funzionano solo nell’app web installata.';
}
export async function disablePush(): Promise<void> {}
export async function testPush(): Promise<string | null> {
  return null;
}
export async function refreshPush(_email: string, _userName: string): Promise<void> {}
