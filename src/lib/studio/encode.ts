import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import { FRAME_H, FRAME_W } from "@/lib/studio/draw";

export async function encodeFilm(opts: {
  canvas: HTMLCanvasElement;
  draw: (time: number) => void;
  duration: number;
  withAudio: boolean;
  onProgress: (value: number) => void;
}): Promise<{ blob: Blob; ext: "mp4" | "webm" }> {
  const fps = 24;
  if (typeof VideoEncoder !== "undefined") {
    const codec = await pickCodec();
    if (codec) {
      try {
        return await encodeFast({ ...opts, fps, codec });
      } catch {
        // Realtime capture still produces a file if the fast path fails.
      }
    }
  }
  return encodeRealtime({ ...opts, fps });
}

async function pickCodec(): Promise<string | null> {
  const candidates = ["avc1.420028", "avc1.4d0028", "avc1.42E01F"];
  for (const codec of candidates) {
    try {
      const support = await VideoEncoder.isConfigSupported({
        codec,
        width: FRAME_W,
        height: FRAME_H,
        bitrate: 1_800_000,
        framerate: 24,
      });
      if (support.supported) return codec;
    } catch {
      continue;
    }
  }
  return null;
}

async function encodeFast(opts: {
  canvas: HTMLCanvasElement;
  draw: (time: number) => void;
  duration: number;
  withAudio: boolean;
  onProgress: (value: number) => void;
  fps: number;
  codec: string;
}): Promise<{ blob: Blob; ext: "mp4" }> {
  const audioSupport =
    opts.withAudio && typeof AudioEncoder !== "undefined"
      ? await AudioEncoder.isConfigSupported({
          codec: "mp4a.40.2",
          sampleRate: 48_000,
          numberOfChannels: 1,
          bitrate: 96_000,
        }).catch(() => ({ supported: false }))
      : { supported: false };
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: "avc", width: FRAME_W, height: FRAME_H, frameRate: opts.fps },
    audio: audioSupport.supported
      ? { codec: "aac", numberOfChannels: 1, sampleRate: 48_000 }
      : undefined,
    fastStart: "in-memory",
    firstTimestampBehavior: "offset",
  });
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (error) => {
      throw error;
    },
  });
  encoder.configure({
    codec: opts.codec,
    width: FRAME_W,
    height: FRAME_H,
    bitrate: 1_800_000,
    framerate: opts.fps,
    avc: { format: "avc" },
    latencyMode: "quality",
  });
  let audio: AudioEncoder | null = null;
  if (audioSupport.supported) {
    audio = new AudioEncoder({
      output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
      error: () => undefined,
    });
    audio.configure({
      codec: "mp4a.40.2",
      sampleRate: 48_000,
      numberOfChannels: 1,
      bitrate: 96_000,
    });
  }
  const frames = Math.max(1, Math.round(opts.duration * opts.fps));
  for (let i = 0; i < frames; i++) {
    opts.draw(i / opts.fps);
    const frame = new VideoFrame(opts.canvas, {
      timestamp: Math.round((i * 1_000_000) / opts.fps),
    });
    encoder.encode(frame, { keyFrame: i % (opts.fps * 2) === 0 });
    frame.close();
    if (i % 6 === 0) {
      opts.onProgress(i / frames);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  await encoder.flush();
  if (audio) {
    const pcm = scorePcm(opts.duration, 48_000);
    const chunk = 1024;
    for (let offset = 0; offset + chunk <= pcm.length; offset += chunk) {
      const data = new Float32Array(chunk);
      data.set(pcm.subarray(offset, offset + chunk));
      const audioData = new AudioData({
        format: "f32",
        sampleRate: 48_000,
        numberOfFrames: chunk,
        numberOfChannels: 1,
        timestamp: Math.round((offset / 48_000) * 1_000_000),
        data,
      });
      audio.encode(audioData);
      audioData.close();
    }
    await audio.flush();
  }
  muxer.finalize();
  opts.onProgress(1);
  return { blob: new Blob([target.buffer], { type: "video/mp4" }), ext: "mp4" };
}

async function encodeRealtime(opts: {
  canvas: HTMLCanvasElement;
  draw: (time: number) => void;
  duration: number;
  withAudio: boolean;
  onProgress: (value: number) => void;
  fps: number;
}): Promise<{ blob: Blob; ext: "mp4" | "webm" }> {
  const stream = opts.canvas.captureStream(opts.fps);
  let audio: AudioContext | null = null;
  if (opts.withAudio) {
    audio = new AudioContext();
    const dest = audio.createMediaStreamDestination();
    connectScore(audio, dest);
    const track = dest.stream.getAudioTracks()[0];
    if (track) stream.addTrack(track);
  }
  const mime = ["video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((type) =>
    MediaRecorder.isTypeSupported(type),
  );
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  const stopped = new Promise<Blob>((resolve) => {
    rec.onstop = () => resolve(new Blob(chunks, { type: rec.mimeType || "video/webm" }));
  });
  rec.start(200);
  const started = performance.now();
  await new Promise<void>((resolve) => {
    const step = (now: number) => {
      const t = (now - started) / 1000;
      opts.draw(Math.min(t, opts.duration));
      opts.onProgress(Math.min(1, t / opts.duration));
      if (t >= opts.duration) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  rec.stop();
  stream.getTracks().forEach((track) => track.stop());
  await audio?.close();
  const blob = await stopped;
  return { blob, ext: blob.type.includes("mp4") ? "mp4" : "webm" };
}

function scorePcm(duration: number, sampleRate: number): Float32Array {
  const total = Math.floor(duration * sampleRate);
  const data = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const t = i / sampleRate;
    const env = Math.min(1, t / 0.35) * Math.min(1, (duration - t) / 0.5);
    const drone = Math.sin(2 * Math.PI * 110 * t) * 0.22;
    const fifth = Math.sin(2 * Math.PI * 164.8 * t) * 0.07;
    data[i] = (drone + fifth) * env;
  }
  return data;
}

function connectScore(ctx: AudioContext, dest: AudioNode) {
  const master = ctx.createGain();
  master.gain.value = 0.2;
  master.connect(dest);
  master.connect(ctx.destination);
  const osc = ctx.createOscillator();
  const high = ctx.createOscillator();
  osc.type = "sine";
  high.type = "triangle";
  osc.frequency.value = 110;
  high.frequency.value = 164.8;
  const low = ctx.createGain();
  const mid = ctx.createGain();
  low.gain.value = 0.6;
  mid.gain.value = 0.18;
  osc.connect(low).connect(master);
  high.connect(mid).connect(master);
  osc.start();
  high.start();
}

export async function shareOrSave(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: blob.type || "video/mp4" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: filename });
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
