import Phaser from "phaser";

const lastPlayed = new Map<string, number>();

/** Plays a sound effect, throttling rapid repeats so the mix stays clean. */
export function sfx(scene: Phaser.Scene, key: string, volume = 0.4, minGapMs = 40): void {
  const now = scene.time.now;
  const last = lastPlayed.get(key) ?? -Infinity;
  if (now - last < minGapMs) return;
  lastPlayed.set(key, now);
  if (!scene.cache.audio.exists(key)) return;
  scene.sound.play(key, { volume, detune: Phaser.Math.Between(-80, 80) });
}
