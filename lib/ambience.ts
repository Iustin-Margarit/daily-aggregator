/*
 * The ambient sound for the street banner: a calm 1890s promenade on the
 * cobbles. Real CC0 recordings only (public/sounds/street, credits and the
 * Freesound links in docs/ASSETS.md), mixed in the browser with the Web Audio
 * API. Nothing is synthesised, and there is no wind and no drone.
 *
 *              (switched off for now: see MIX)
 *   birds      daytime birdsong, looped (Morning Edition only)
 *   steps      every few seconds someone walks past on the stones
 *   voices     now and then a small group passes, chatting
 *   carriage   hooves and wooden wheels, timed to the cab on the banner: it
 *              comes in on the side the cab enters, is loudest when the cab is
 *              in the middle and fades as it leaves
 *   pigeons    soft cooing now and then, and a flutter of wings when the
 *              carrier pigeon flies in (Morning Edition only)
 *
 * Always off when a page loads; the reader turns it on with the banner's
 * "Sound" ticket (components/site/street-theatre.tsx). The banner's Pause
 * button (the "banner" reading preference) holds it on every page. It keeps
 * playing while the reader moves around the site; whenever it is audible and
 * the banner is out of sight, a small "Stop sound" ticket
 * (components/site/sound-ticket.tsx) stays in the corner to turn it off.
 */

const BASE = '/sounds/street/';

/*
 * The mix. Every clip was loudness-matched when it was cut (its measured
 * loudness is noted beside it); `gain` sets how loud it plays at its loudest.
 * Swapping a clip: keep the new one at a similar loudness, or move its gain.
 */
const MIX = {
  /** Birdsong by day (-22.4 LUFS -> about -31 LUFS). Off in the Night Edition. */
  birds: { file: 'birds.mp3', gain: 0.37 },
  /** Hooves and wheels at the moment the cab is closest (-20.3 LUFS -> about -21.7 LUFS): the loudest thing on the street. */
  carriage: { file: 'carriage.mp3', gain: 0.85 },
  /** A walker at their closest (about -27 LUFS); the gains even out the clips' own levels. */
  steps: [
    { file: 'steps-1.mp3', gain: 1.2 }, // -28.6 LUFS
    { file: 'steps-2.mp3', gain: 1.0 }, // -26.9 LUFS
    { file: 'steps-3.mp3', gain: 0.9 }, // -26.1 LUFS
  ],
  /** A group chatting as it passes (-20.4 LUFS -> about -26 LUFS). */
  voices: { file: 'voices.mp3', gain: 0.52 },
  /** Pigeon cooing (-21.7 LUFS -> about -30 LUFS), by day. */
  pigeon: { file: 'pigeon.mp3', gain: 0.38 },
  /** Wings (-28.2 LUFS -> about -30 LUFS), by day. */
  wings: { file: 'wings.mp3', gain: 0.8 },
};

/** Overall level; a limiter after it keeps rare overlaps from clipping. */
const VOLUME = 0.7;
const FADE_IN = 2.5;
const FADE_OUT = 1.2;
const PAUSE_FADE = 0.4;
/** How quickly the birds come and go when the edition changes (seconds). */
const EDITION_FADE = 1.5;

/** The cab on the banner (styles/street-theatre.css): its width and the share of its loop it spends on the road. */
const CAB_WIDTH = 0.34 * 1.7964;
const CAB_ON_ROAD = 0.6;
const CAB_SPEED = 0.17;
/** The pigeon flies across the sky for the first 40% of its loop. */
const PIGEON_IN_SKY = 0.4;

type Clip = { buffer: AudioBuffer; gain: number };
type Buffers = {
  birds: Clip | null;
  carriage: Clip | null;
  steps: Clip[];
  voices: Clip | null;
  pigeon: Clip | null;
  wings: Clip | null;
};

type Player = {
  ctx: AudioContext;
  master: GainNode;
  birds: GainNode;
  buffers: Buffers | null;
  timer: number;
  night: boolean;
  /** Audio-clock times (the clock stands still while paused). */
  nextSteps: number;
  nextVoices: number;
  nextCoo: number;
  nextWings: number;
  nextCarriage: number;
  carriageUntil: number;
  walkers: number;
  /** Loop numbers of the cab and pigeon animations already given a sound. */
  cabLoop: number;
  pigeonLoop: number;
  suspendTimer: number;
};

let player: Player | null = null;
let on = false;
let paused = false;
/** The banner, so the sound can follow its cab and pigeon, and whether it is on screen. */
let stage: HTMLElement | null = null;
let stageInView = false;
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

/** True while the banner is paused (the reader's "banner" setting is Still): the sound is on but silent. */
export function isAmbiencePaused() {
  return paused;
}

/** True while the banner, with its own Sound ticket, is on screen. */
export function isAmbienceStageInView() {
  return stage !== null && stageInView;
}

/** The banner registers itself here so the carriage can follow the cab. */
export function setAmbienceStage(element: HTMLElement | null) {
  stage = element;
  if (!element) stageInView = false;
  emit();
}

/** The banner says when it scrolls in and out of view (the corner ticket shows while it is away). */
export function setAmbienceStageInView(next: boolean) {
  if (next === stageInView) return;
  stageInView = next;
  emit();
}

// ---------------------------------------------------------------- loading

/** The files are fetched once per visit; each start decodes its own copy. */
const downloads = new Map<string, Promise<ArrayBuffer | null>>();

function download(name: string) {
  let request = downloads.get(name);
  if (!request) {
    request = fetch(BASE + name)
      .then((response) => (response.ok ? response.arrayBuffer() : null))
      .catch(() => null);
    downloads.set(name, request);
  }
  return request;
}

async function decode(ctx: AudioContext, entry: { file: string; gain: number }): Promise<Clip | null> {
  if (entry.gain <= 0) return null; // switched off in MIX: not fetched at all
  const data = await download(entry.file);
  if (!data) return null;
  try {
    return { buffer: await ctx.decodeAudioData(data.slice(0)), gain: entry.gain };
  } catch {
    return null;
  }
}

async function load(ctx: AudioContext): Promise<Buffers> {
  const [birds, carriage, voices, pigeon, wings, ...steps] = await Promise.all([
    decode(ctx, MIX.birds),
    decode(ctx, MIX.carriage),
    decode(ctx, MIX.voices),
    decode(ctx, MIX.pigeon),
    decode(ctx, MIX.wings),
    ...MIX.steps.map((entry) => decode(ctx, entry)),
  ]);
  return { birds, carriage, voices, pigeon, wings, steps: steps.filter((clip): clip is Clip => clip !== null) };
}

// ---------------------------------------------------------------- the street

const between = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)];
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const isNight = () => document.documentElement.classList.contains('dark');

/** A looped bed (the street, the birds), started at a random point so each visit sounds a little different. */
function playBed(p: Player, clip: Clip, into: AudioNode) {
  const source = p.ctx.createBufferSource();
  source.buffer = clip.buffer;
  source.loop = true;
  const gain = p.ctx.createGain();
  gain.gain.value = clip.gain;
  source.connect(gain).connect(into);
  source.start(p.ctx.currentTime, between(0, clip.buffer.duration - 1));
}

/** Where a sound is at a moment of its passing: how near (0 to 1) and where left to right (-1 to 1). */
type Place = { near: number; pan: number };

/**
 * Plays a clip for `length` seconds while it moves along `path` (called with
 * 0 at the start to 1 at the end): louder and brighter when near, quieter and
 * a little muffled when far. Short fades at both ends so nothing clicks.
 */
function playMoving(p: Player, clip: Clip, options: { at: number; length: number; path: (u: number) => Place; loop?: boolean; rate?: number; offset?: number }) {
  const { ctx } = p;
  const { at, length } = options;
  const rate = options.rate ?? 1;
  const points = Math.max(16, Math.ceil(length * 8));
  const gains = new Float32Array(points);
  const pans = new Float32Array(points);
  const tones = new Float32Array(points);
  const fade = Math.min(0.6, length / 4);
  for (let i = 0; i < points; i++) {
    const u = i / (points - 1);
    const t = u * length;
    const place = options.path(u);
    const edges = Math.min(1, t / fade, (length - t) / fade);
    gains[i] = Math.max(0, clip.gain * place.near * edges);
    pans[i] = clamp(place.pan, -1, 1);
    tones[i] = 2400 + 9600 * place.near;
  }

  const source = ctx.createBufferSource();
  source.buffer = clip.buffer;
  source.loop = options.loop ?? false;
  source.playbackRate.value = rate;
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = tones[0];
  tone.frequency.setValueCurveAtTime(tones, at, length);
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.gain.setValueCurveAtTime(gains, at, length);
  const pan = ctx.createStereoPanner();
  pan.pan.value = pans[0];
  pan.pan.setValueCurveAtTime(pans, at, length);
  source.connect(tone).connect(gain).connect(pan).connect(p.master);

  const offset = options.offset ?? (source.loop ? between(0, clip.buffer.duration) : 0);
  source.start(at, offset);
  source.stop(at + length + 0.05);
  return source;
}

/** Someone walking past: in from one side, closest half-way, out on the other side. */
function walkPast(p: Player, clip: Clip, options: { spread: number; edge: number }) {
  const from = Math.random() < 0.5 ? -1 : 1;
  // `edge` is how loud they are at the ends compared with when closest.
  const k = Math.sqrt(1 / options.edge - 1);
  const rate = between(0.97, 1.03);
  const source = playMoving(p, clip, {
    at: p.ctx.currentTime + 0.05,
    length: clip.buffer.duration / rate,
    rate,
    path: (u) => {
      const x = from * (2 * u - 1);
      return { near: 1 / (1 + (k * x) ** 2), pan: x * options.spread };
    },
  });
  return source;
}

/**
 * The carriage crossing the banner from left to right. `from` and `to` are
 * how far along the road the cab is (0 = just coming in, 1 = just gone), and
 * `span` the banner's width in banner heights. Loudness follows the distance
 * from the middle of the banner, where the reader is.
 */
function carriagePass(p: Player, clip: Clip, options: { at: number; length: number; from: number; span: number }) {
  const { span, from } = options;
  p.carriageUntil = options.at + options.length;
  playMoving(p, clip, {
    at: options.at,
    length: options.length,
    loop: true,
    path: (u) => {
      const along = from + (1 - from) * u;
      const centre = -CAB_WIDTH + (span + CAB_WIDTH) * along + CAB_WIDTH / 2;
      const away = centre - span / 2;
      return { near: 1 / (1 + (away / 2.6) ** 2), pan: (away / (span / 2)) * 0.9 };
    },
  });
}

/** A few seconds of cooing from somewhere on the rooftops. */
function coo(p: Player, clip: Clip) {
  const length = Math.min(clip.buffer.duration, between(4, 8));
  const pan = between(-0.7, 0.7);
  playMoving(p, clip, {
    at: p.ctx.currentTime + 0.05,
    length,
    offset: between(0, clip.buffer.duration - length),
    path: () => ({ near: 1, pan }),
  });
}

function flutter(p: Player, clip: Clip, pan: number) {
  playMoving(p, clip, { at: p.ctx.currentTime + 0.05, length: clip.buffer.duration, path: () => ({ near: 1, pan }) });
}

/** A running CSS animation on the banner: how far through its loop it is, the loop's length (s) and which loop it is on. */
function animationState(selector: string, name: string) {
  const element = stage?.querySelector<HTMLElement>(selector);
  if (!element || typeof element.getAnimations !== 'function') return null;
  const animation = element.getAnimations().find((a) => (a as CSSAnimation).animationName === name);
  if (!animation || animation.playState !== 'running') return null;
  const timing = animation.effect?.getComputedTiming();
  if (!timing || timing.progress == null || typeof timing.duration !== 'number' || timing.duration <= 0) return null;
  return { progress: timing.progress, loop: timing.duration / 1000, round: timing.currentIteration ?? 0 };
}

function bannerSpan() {
  const span = stage ? parseFloat(getComputedStyle(stage).getPropertyValue('--span')) : NaN;
  return Number.isFinite(span) && span > 0 ? span : 8;
}

/**
 * The carriage follows the cab while the cab moves on screen. When it cannot
 * be seen moving (banner scrolled away, or a reader who asks for less motion),
 * a carriage still passes now and then.
 */
function carriage(p: Player, clip: Clip, now: number) {
  const cab = animationState('.st-cab', 'st-cab-drive');
  if (cab) {
    p.nextCarriage = Math.max(p.nextCarriage, now + 15);
    const onRoad = CAB_ON_ROAD * cab.loop;
    if (cab.progress < CAB_ON_ROAD) {
      // On the road and not given its sound yet (the sound was just switched on, or the banner came back into view).
      const left = (CAB_ON_ROAD - cab.progress) * cab.loop;
      if (cab.round !== p.cabLoop && left > 4 && now >= p.carriageUntil) {
        p.cabLoop = cab.round;
        carriagePass(p, clip, { at: now + 0.05, length: left, from: cab.progress / CAB_ON_ROAD, span: bannerSpan() });
      }
    } else {
      // Out of sight: start the sound exactly when the cab comes back in.
      const wait = (1 - cab.progress) * cab.loop;
      if (wait < 1.5 && cab.round + 1 !== p.cabLoop) {
        p.cabLoop = cab.round + 1;
        carriagePass(p, clip, { at: now + wait, length: onRoad, from: 0, span: bannerSpan() });
      }
    }
    return;
  }
  if (now >= p.nextCarriage && now >= p.carriageUntil) {
    const span = bannerSpan();
    carriagePass(p, clip, { at: now + 0.05, length: (span + CAB_WIDTH) / CAB_SPEED, from: 0, span });
    p.nextCarriage = p.carriageUntil + between(25, 50);
  }
}

/** Wings as the carrier pigeon flies in from the left; now and then otherwise. */
function pigeonWings(p: Player, clip: Clip, now: number) {
  const pigeon = animationState('.st-pigeon-path', 'st-pigeon-fly');
  if (pigeon) {
    p.nextWings = Math.max(p.nextWings, now + 20);
    if (pigeon.round !== p.pigeonLoop && pigeon.progress < PIGEON_IN_SKY * 0.15) {
      p.pigeonLoop = pigeon.round;
      flutter(p, clip, -0.75);
    }
    return;
  }
  if (now >= p.nextWings) {
    flutter(p, clip, between(-0.8, 0.8));
    p.nextWings = now + between(50, 100);
  }
}

/** Twice a second: who is due to pass, and is it day or night. */
function tick(p: Player) {
  const b = p.buffers;
  if (!b || p.ctx.state !== 'running') return;
  const now = p.ctx.currentTime;

  const night = isNight();
  if (night !== p.night) {
    p.night = night;
    p.birds.gain.setTargetAtTime(night ? 0 : 1, now, EDITION_FADE / 3);
  }

  if (now >= p.nextSteps && b.steps.length > 0 && p.walkers < 2) {
    p.walkers++;
    walkPast(p, pick(b.steps), { spread: 0.6, edge: 0.3 }).addEventListener('ended', () => p.walkers--);
    p.nextSteps = now + between(4, 9);
  }
  if (now >= p.nextVoices && b.voices) {
    walkPast(p, b.voices, { spread: 0.5, edge: 0.3 });
    p.nextVoices = now + between(22, 40);
  }
  if (b.carriage) carriage(p, b.carriage, now);
  if (!night) {
    if (now >= p.nextCoo && b.pigeon) {
      coo(p, b.pigeon);
      p.nextCoo = now + between(14, 28);
    }
    if (b.wings) pigeonWings(p, b.wings, now);
  }
}

// ---------------------------------------------------------------- on, off and pause

function ramp(p: Player, to: number, seconds: number) {
  const t = p.ctx.currentTime;
  const gain = p.master.gain;
  gain.cancelScheduledValues(t);
  gain.setValueAtTime(gain.value, t);
  gain.linearRampToValueAtTime(to, t + seconds);
}

/** Must run inside the click (browsers only allow sound after one); the files load afterwards. */
function start() {
  const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return false;
  const ctx = new AudioCtx();
  void ctx.resume();

  // A gentle limiter last, so a carriage, a walker and a group passing at once never clip.
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -4;
  limiter.knee.value = 4;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.2;
  limiter.connect(ctx.destination);
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(limiter);
  const night = isNight();
  const birds = ctx.createGain();
  birds.gain.value = night ? 0 : 1;
  birds.connect(master);

  const p: Player = {
    ctx,
    master,
    birds,
    buffers: null,
    timer: 0,
    night,
    nextSteps: 0,
    nextVoices: 0,
    nextCoo: 0,
    nextWings: 0,
    nextCarriage: 0,
    carriageUntil: 0,
    walkers: 0,
    cabLoop: -1,
    pigeonLoop: -1,
    suspendTimer: 0,
  };
  player = p;

  void load(ctx).then((buffers) => {
    if (player !== p) return; // switched off while loading
    const any = buffers.birds || buffers.carriage || buffers.voices || buffers.pigeon || buffers.wings || buffers.steps.length > 0;
    if (!any) {
      setAmbience(false); // nothing could be loaded
      return;
    }
    p.buffers = buffers;
    const now = ctx.currentTime;
    p.nextSteps = now + between(1.5, 3);
    p.nextVoices = now + between(6, 12);
    p.nextCoo = now + between(3, 8);
    p.nextWings = now + between(20, 40);
    p.nextCarriage = now + between(8, 14);
    if (buffers.birds) playBed(p, buffers.birds, birds);
    p.timer = window.setInterval(() => tick(p), 500);
    if (paused) {
      void ctx.suspend();
    } else {
      ramp(p, VOLUME, FADE_IN);
    }
  });
  return true;
}

function stop() {
  const p = player;
  player = null;
  if (!p) return;
  window.clearInterval(p.timer);
  window.clearTimeout(p.suspendTimer);
  if (p.ctx.state === 'running') {
    ramp(p, 0, FADE_OUT);
    window.setTimeout(() => void p.ctx.close(), FADE_OUT * 1000 + 100);
  } else {
    void p.ctx.close();
  }
}

/** Turns the street sound on or off (call it from a click). */
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

/** Follows the banner's Pause button: a short fade, then the street holds its breath. */
export function setAmbiencePaused(next: boolean) {
  if (next === paused) return;
  paused = next;
  emit();
  const p = player;
  if (!p || !p.buffers) return; // still loading: start() looks at `paused`
  window.clearTimeout(p.suspendTimer);
  if (next) {
    ramp(p, 0, PAUSE_FADE);
    p.suspendTimer = window.setTimeout(() => void p.ctx.suspend(), PAUSE_FADE * 1000 + 50);
  } else {
    void p.ctx.resume().then(() => {
      if (player === p && !paused) ramp(p, VOLUME, 0.8);
    });
  }
}
