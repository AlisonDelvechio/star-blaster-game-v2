import Phaser from "phaser";
import { generateTextures } from "../art/textures";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload(): void {
    for (const key of ["shoot", "hit", "explosion", "next_level"]) {
      this.load.audio(key, `audio/${key}.mp3`);
    }
  }

  create(): void {
    generateTextures(this);
    this.scene.start("Menu");
  }
}
