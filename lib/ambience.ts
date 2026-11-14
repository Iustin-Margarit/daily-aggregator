/*
 * The ambient sound for the street banner: soft rain on the cobbles and a faint
 * pocket watch, made in the browser with the Web Audio API (no sound files).
 * Always off when a page loads; the reader turns it on with the banner's
 * "Sound" ticket (components/site/street-theatre.tsx), which stops it again when
 * the street leaves the page.
 *
 *   rain   pink noise, filtered to a soft hiss, swelling slowly; a low brown
 *          noise under it for the steady downpour
 *   drops  tiny bursts of filtered noise at random, and now and then a drip
 *   watch  a tick and a slightly lower tock, one a second
 */

const VOLUME = 0.55;
/** How far ahead (seconds) drops and ticks are scheduled: enough to survive a background tab's slow timers. */
const LOOKAHEAD = 1.6;

type Player = {
  ctx: AudioContext;
  master: GainNode;
  noise: AudioBuffer;
  timer: number;
  nextDrop: number;
  nextDrip: number;
  nextTick: number;
  tock: boolean;
};

let player: Player | null = null;
let on = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeAmbience(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isAmbiencePlaying() {
  return on;
}

/** Pink noise (Paul Kellet's filter), a few seconds long, to loop and to cut drops from. */
function pinkNoise(ctx: AudioContext, seconds: number): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  return buffer;
}

/** Brown noise: a deep, even rumble. */
function brownNoise(ctx: AudioContext, seconds: number): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    data[i] = last * 3.5;
  }
  return buffer;
}

function loop(ctx: AudioContext, buffer: AudioBuffer): AudioBufferSourceNode {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.start(0, Math.random() * buffer.duration);
  return source;
}

/** A short burst of filtered noise: a raindrop, a drip, or the watch's tick. */
function burst(p: Player, at: number, options: { freq: number; q: number; gain: number; length: number }) {
  const { ctx } = p;
  const source = ctx.createBufferSource();
  source.buffer = p.noise;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = options.freq;
  filter.Q.value = options.q;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(options.gain, at + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + options.length);
  source.connect(filter).connect(gain).connect(p.master);
  source.start(at, Math.random() * (p.noise.duration - 0.5), options.length + 0.05);
}

function schedule(p: Player) {
  const until = p.ctx.currentTime + LOOKAHEAD;
  // Small drops pattering on the stones: about 14 a second.
  while (p.nextDrop < until) {
    burst(p, p.nextDrop, { freq: 1800 + Math.random() * 3800, q: 3 + Math.random() * 5, gain: 0.05 + Math.random() * 0.1, length: 0.02 + Math.random() * 0.04 });
    p.nextDrop += -Math.log(1 - Math.random()) / 14;
  }
  // Now and then a fatter drip from a gutter.
  while (p.nextDrip < until) {
    burst(p, p.nextDrip, { freq: 700 + Math.random() * 600, q: 9, gain: 0.22, length: 0.09 });
    p.nextDrip += 1.2 + Math.random() * 3.5;
  }
  // The pocket watch: tick (higher), tock (lower), once a second.
  while (p.nextTick < until) {
    burst(p, p.nextTick, { freq: p.tock ? 3100 : 3900, q: 14, gain: 0.32, length: 0.018 });
    p.tock = !p.tock;
    p.nextTick += 1;
  }
}

function start() {
  const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return false;
  const ctx = new AudioCtx();
  void ctx.resume();

  const master = ctx.createGain();
  master.gain.setValueAtTime(0, ctx.currentTime);
  master.gain.linearRampToValueAtTime(VOLUME, ctx.currentTime + 2.5);
  master.connect(ctx.destination);

  const noise = pinkNoise(ctx, 6);

  // The rain: a soft hiss that swells and eases every half a minute or so.
  const hiss = loop(ctx, noise);
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 500;
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 3200;
  lowpass.Q.value = 0.3;
  const rain = ctx.createGain();
  rain.gain.value = 0.32;
  const swell = ctx.createOscillator();
  swell.frequency.value = 0.035;
  const swellDepth = ctx.createGain();
  swellDepth.gain.value = 0.08;
  swell.connect(swellDepth).connect(rain.gain);
  swell.start();
  hiss.connect(highpass).connect(lowpass).connect(rain).connect(master);

  // The steady downpour further off.
  const rumble = loop(ctx, brownNoise(ctx, 5));
  const rumbleFilter = ctx.createBiquadFilter();
  rumbleFilter.type = 'lowpass';
  rumbleFilter.frequency.value = 420;
  const rumbleGain = ctx.createGain();
  rumbleGain.gain.value = 0.22;
  rumble.connect(rumbleFilter).connect(rumbleGain).connect(master);

  const now = ctx.currentTime + 0.1;
  const p: Player = { ctx, master, noise, timer: 0, nextDrop: now, nextDrip: now + 1, nextTick: now + 0.5, tock: false };
  schedule(p);
  p.timer = window.setInterval(() => schedule(p), 400);
  player = p;
  return true;
}

function stop() {
  const p = player;
  player = null;
  if (!p) return;
  window.clearInterval(p.timer);
  const t = p.ctx.currentTime;
  p.master.gain.cancelScheduledValues(t);
  p.master.gain.setValueAtTime(p.master.gain.value, t);
  p.master.gain.linearRampToValueAtTime(0, t + 0.8);
  window.setTimeout(() => void p.ctx.close(), 900);
}

/** Turns the ambience on or off (call it from a click: browsers only allow sound after one). */
export function setAmbience(next: boolean) {
  if (next === on) return;
  if (next) {
    if (!start()) return;
  } else {
    stop();
  }
  on = next;
  emit();
}
