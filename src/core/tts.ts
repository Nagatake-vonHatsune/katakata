// Device text-to-speech (spec 7, 11.1). Malay voices vary by phone, so we look
// for ms-*, fall back to Indonesian (close, but not the same accent), and use
// recorded clips in public/audio/ms/<card-id>.mp3 when they exist (plan B).
import { audioClips } from 'virtual:katakata-content';

let voices: SpeechSynthesisVoice[] = [];
let ready: Promise<void> | null = null;
const clips = new Set(audioClips);

export type VoiceKind = 'ms' | 'id' | 'none';

function loadVoices(): Promise<void> {
  if (typeof speechSynthesis === 'undefined') return Promise.resolve();
  return (ready ??= new Promise<void>((resolve) => {
    const grab = () => {
      voices = speechSynthesis.getVoices();
      if (voices.length) resolve();
    };
    grab();
    speechSynthesis.addEventListener?.('voiceschanged', grab);
    setTimeout(() => {
      voices = speechSynthesis.getVoices();
      resolve();
    }, 1500);
  }));
}

function pick(): { voice: SpeechSynthesisVoice | null; kind: VoiceKind } {
  const ms = voices.find((v) => /^ms([-_]|$)/i.test(v.lang)) ?? voices.find((v) => /malay|melayu/i.test(v.name));
  if (ms) return { voice: ms, kind: 'ms' };
  const id = voices.find((v) => /^id([-_]|$)/i.test(v.lang) || /^in([-_]|$)/i.test(v.lang));
  if (id) return { voice: id, kind: 'id' };
  return { voice: null, kind: 'none' };
}

export async function voiceKind(): Promise<VoiceKind> {
  await loadVoices();
  return pick().kind;
}

let rate = 0.9;
export function setRate(r: number): void {
  rate = r;
}

let current: HTMLAudioElement | null = null;

export async function speak(text: string, opts: { slow?: boolean; cardId?: string } = {}): Promise<void> {
  const clip = opts.cardId ? `audio/ms/${opts.cardId}.mp3` : null;
  if (clip && clips.has(clip)) {
    current?.pause();
    current = new Audio(clip);
    current.playbackRate = opts.slow ? 0.7 : 1;
    await current.play().catch(() => undefined);
    return;
  }
  if (typeof speechSynthesis === 'undefined') return;
  await loadVoices();
  const { voice } = pick();
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/\s*\/\s*/g, ', ').replace(/[()]/g, ''));
  u.lang = voice?.lang ?? 'ms-MY';
  if (voice) u.voice = voice;
  u.rate = opts.slow ? Math.max(0.4, rate * 0.6) : rate;
  speechSynthesis.speak(u);
}

export function stopSpeech(): void {
  current?.pause();
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}
