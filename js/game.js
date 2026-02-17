const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const MATCH_DISTANCE = 88;
const SCORE_PER_MATCH = 10;

const PONY_COLORS = [
  { key: "red", hex: 0xff0000, css: "#ff0000" },
  { key: "orange", hex: 0xff9900, css: "#ff9900" },
  { key: "yellow", hex: 0xffff00, css: "#ffff00" },
  { key: "green", hex: 0x00ff00, css: "#00ff00" },
  { key: "cyan", hex: 0x00ffff, css: "#00ffff" },
  { key: "blue", hex: 0x0000ff, css: "#0000ff" },
  { key: "purple", hex: 0x9900ff, css: "#9900ff" },
];

const PONY_IMAGE_SOURCES = [
  { key: "horse-photo-1", path: "images/1771265622295.png" },
  { key: "horse-photo-2", path: "images/Screenshot_20260217_021422.jpg" },
];

class CatchPonyScene extends Phaser.Scene {
  constructor() {
    super("CatchPonyScene");
    this.ponies = [];
    this.score = 0;
    this.scoreValueText = null;
  }

  preload() {
    PONY_IMAGE_SOURCES.forEach((source) => {
      if (!this.textures.exists(source.key)) {
        this.load.image(source.key, source.path);
      }
    });
  }

  create() {
    this.drawBackground();
    this.buildPonyTextures();
    this.buildUi();
    this.spawnPonies();

    this.input.on("dragstart", this.onDragStart, this);
    this.input.on("drag", this.onDrag, this);
    this.input.on("dragend", this.onDragEnd, this);
  }

  drawBackground() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x2a1762, 0x2a1762, 0x120b2f, 0x120b2f, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    for (let i = 0; i < 26; i += 1) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const y = Phaser.Math.Between(0, GAME_HEIGHT);
      const radius = Phaser.Math.Between(18, 84);
      const alpha = Phaser.Math.FloatBetween(0.07, 0.15);
      const tint = Phaser.Display.Color.RandomRGB(20, 220).color;
      g.fillStyle(tint, alpha);
      g.fillCircle(x, y, radius);
    }

    const floor = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT - 36,
      GAME_WIDTH + 80,
      92,
      0x0f0a23,
      0.66,
    );
    floor.setStrokeStyle(2, 0xffffff, 0.12);
  }

  buildUi() {
    const scorePanel = this.add.rectangle(18, 16, 180, 72, 0x100a24, 0.82).setOrigin(0);
    scorePanel.setStrokeStyle(2, 0xffffff, 0.2);

    this.add
      .text(30, 24, "SCORE", {
        fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
        fontSize: "20px",
        color: "#fff4d3",
        fontStyle: "bold",
      })
      .setShadow(0, 1, "#000000", 4, false, true);

    this.scoreValueText = this.add.text(30, 50, "0", {
      fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
      fontSize: "26px",
      color: "#fefefe",
      fontStyle: "bold",
    });

    const buttonX = GAME_WIDTH - 110;
    const buttonY = GAME_HEIGHT - 40;
    const button = this.add.rectangle(buttonX, buttonY, 176, 52, 0x2a184e, 0.95);
    button.setStrokeStyle(2, 0xffffff, 0.28);
    button.setInteractive({ useHandCursor: true });

    const buttonLabel = this.add
      .text(buttonX, buttonY, "Restart", {
        fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
        fontSize: "23px",
        color: "#ffeecf",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    button.on("pointerover", () => {
      button.setFillStyle(0x382266, 0.98);
      buttonLabel.setScale(1.04);
    });
    button.on("pointerout", () => {
      button.setFillStyle(0x2a184e, 0.95);
      buttonLabel.setScale(1);
    });
    button.on("pointerup", () => {
      this.restartRound();
    });
  }

  buildPonyTextures() {
    const cutoutCanvases = PONY_IMAGE_SOURCES.map((source, index) =>
      this.extractHorseCanvas(source.key, index),
    ).filter(Boolean);

    if (cutoutCanvases.length === 0) {
      this.buildFallbackPonyTextures();
      return;
    }

    PONY_COLORS.forEach((entry, index) => {
      const sourceCanvas = cutoutCanvases[index % cutoutCanvases.length];
      const colorized = this.colorizeHorseCanvas(sourceCanvas, entry.hex);
      const textureKey = `pony-${entry.key}`;
      if (this.textures.exists(textureKey)) {
        this.textures.remove(textureKey);
      }
      this.textures.addCanvas(textureKey, colorized);
    });
  }

  extractHorseCanvas(sourceTextureKey, sourceIndex) {
    if (!this.textures.exists(sourceTextureKey)) {
      return null;
    }

    const sourceImage = this.textures.get(sourceTextureKey).getSourceImage();
    if (!sourceImage) {
      return null;
    }

    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = sourceImage.width;
    sourceCanvas.height = sourceImage.height;

    const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
    sourceContext.drawImage(sourceImage, 0, 0);
    const imageData = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    const pixels = imageData.data;

    let minX = sourceCanvas.width;
    let minY = sourceCanvas.height;
    let maxX = -1;
    let maxY = -1;

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const pixelIndex = i / 4;
      const x = pixelIndex % sourceCanvas.width;
      const y = Math.floor(pixelIndex / sourceCanvas.width);

      const neutralColor = Math.abs(r - g) < 14 && Math.abs(g - b) < 14;
      const brightBackground = r > 196 && g > 196 && b > 196;
      if (neutralColor && brightBackground) {
        pixels[i + 3] = 0;
        continue;
      }

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }

    sourceContext.putImageData(imageData, 0, 0);

    if (maxX < 0 || maxY < 0) {
      return null;
    }

    const pad = 18;
    const cropX = Math.max(0, minX - pad);
    const cropY = Math.max(0, minY - pad);
    const cropW = Math.min(sourceCanvas.width - cropX, maxX - minX + 1 + pad * 2);
    const cropH = Math.min(sourceCanvas.height - cropY, maxY - minY + 1 + pad * 2);

    const cropped = document.createElement("canvas");
    cropped.width = cropW;
    cropped.height = cropH;

    const croppedContext = cropped.getContext("2d");
    croppedContext.drawImage(sourceCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    const targetHeight = 118;
    const scale = targetHeight / cropH;
    const targetWidth = Math.max(72, Math.round(cropW * scale));

    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = targetWidth;
    finalCanvas.height = targetHeight;

    const finalContext = finalCanvas.getContext("2d");
    finalContext.imageSmoothingEnabled = true;
    finalContext.imageSmoothingQuality = "high";
    finalContext.drawImage(cropped, 0, 0, targetWidth, targetHeight);

    const cleanedKey = `horse-cutout-${sourceIndex}`;
    if (this.textures.exists(cleanedKey)) {
      this.textures.remove(cleanedKey);
    }
    this.textures.addCanvas(cleanedKey, finalCanvas);

    return finalCanvas;
  }

  colorizeHorseCanvas(sourceCanvas, targetHex) {
    const canvas = document.createElement("canvas");
    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(sourceCanvas, 0, 0);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    const targetColor = Phaser.Display.Color.IntegerToRGB(targetHex);
    const [targetHue] = this.rgbToHsl(targetColor.r, targetColor.g, targetColor.b);

    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] === 0) {
        continue;
      }

      const red = pixels[i];
      const green = pixels[i + 1];
      const blue = pixels[i + 2];
      const [hue, saturation, lightness] = this.rgbToHsl(red, green, blue);

      if (saturation < 0.1 && lightness > 0.74) {
        continue;
      }

      const adjustedSaturation = Math.min(1, Math.max(0.45, saturation));
      const [nextRed, nextGreen, nextBlue] = this.hslToRgb(
        targetHue,
        adjustedSaturation,
        lightness,
      );

      pixels[i] = nextRed;
      pixels[i + 1] = nextGreen;
      pixels[i + 2] = nextBlue;

      const shadeLift = 1 + Math.min(0.35, hue * 0.05);
      pixels[i] = Math.min(255, Math.round(pixels[i] * shadeLift));
      pixels[i + 1] = Math.min(255, Math.round(pixels[i + 1] * shadeLift));
      pixels[i + 2] = Math.min(255, Math.round(pixels[i + 2] * shadeLift));
    }

    context.putImageData(imageData, 0, 0);
    return canvas;
  }

  rgbToHsl(r, g, b) {
    const nr = r / 255;
    const ng = g / 255;
    const nb = b / 255;
    const max = Math.max(nr, ng, nb);
    const min = Math.min(nr, ng, nb);
    const delta = max - min;

    let hue = 0;
    let saturation = 0;
    const lightness = (max + min) / 2;

    if (delta !== 0) {
      saturation = delta / (1 - Math.abs(2 * lightness - 1));

      switch (max) {
        case nr:
          hue = ((ng - nb) / delta) % 6;
          break;
        case ng:
          hue = (nb - nr) / delta + 2;
          break;
        default:
          hue = (nr - ng) / delta + 4;
          break;
      }

      hue /= 6;
      if (hue < 0) {
        hue += 1;
      }
    }

    return [hue, saturation, lightness];
  }

  hslToRgb(h, s, l) {
    if (s === 0) {
      const gray = Math.round(l * 255);
      return [gray, gray, gray];
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hueToChannel = (t) => {
      let nt = t;
      if (nt < 0) nt += 1;
      if (nt > 1) nt -= 1;
      if (nt < 1 / 6) return p + (q - p) * 6 * nt;
      if (nt < 1 / 2) return q;
      if (nt < 2 / 3) return p + (q - p) * (2 / 3 - nt) * 6;
      return p;
    };

    const red = Math.round(hueToChannel(h + 1 / 3) * 255);
    const green = Math.round(hueToChannel(h) * 255);
    const blue = Math.round(hueToChannel(h - 1 / 3) * 255);
    return [red, green, blue];
  }

  buildFallbackPonyTextures() {
    PONY_COLORS.forEach((entry) => {
      const textureKey = `pony-${entry.key}`;
      if (this.textures.exists(textureKey)) {
        return;
      }

      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(entry.hex, 1);
      g.fillRoundedRect(10, 24, 44, 24, 10);
      g.fillCircle(56, 25, 13);
      g.fillTriangle(62, 8, 56, 18, 66, 18);
      g.fillTriangle(51, 9, 45, 19, 55, 19);
      g.fillRoundedRect(16, 44, 7, 14, 3);
      g.fillRoundedRect(30, 44, 7, 14, 3);
      g.fillTriangle(10, 33, 0, 26, 4, 42);
      g.generateTexture(textureKey, 72, 60);
      g.destroy();
    });
  }

  spawnPonies() {
    this.clearPonies();

    const total = Phaser.Math.Between(36, 48);
    for (let i = 0; i < total; i += 1) {
      const color = Phaser.Utils.Array.GetRandom(PONY_COLORS);
      const pony = this.add.image(
        Phaser.Math.Between(72, GAME_WIDTH - 72),
        Phaser.Math.Between(100, GAME_HEIGHT - 90),
        `pony-${color.key}`,
      );

      pony.setScale(Phaser.Math.FloatBetween(0.9, 1.12));
      pony.setRotation(Phaser.Math.FloatBetween(-0.13, 0.13));
      pony.setDepth(i);
      pony.colorKey = color.key;
      pony.isEliminating = false;
      pony.originalScale = pony.scaleX;

      pony.setInteractive({ useHandCursor: true });
      this.input.setDraggable(pony);
      this.ponies.push(pony);
    }
  }

  clearPonies() {
    this.ponies.forEach((pony) => {
      pony.destroy();
    });
    this.ponies = [];
  }

  onDragStart(_pointer, pony) {
    if (!pony.active || pony.isEliminating) {
      return;
    }

    pony.originalScale = pony.scaleX;
    pony.setScale(pony.scaleX * 1.05);
    pony.setDepth(9999);
  }

  onDrag(_pointer, pony, dragX, dragY) {
    if (!pony.active || pony.isEliminating) {
      return;
    }

    pony.x = Phaser.Math.Clamp(dragX, 36, GAME_WIDTH - 36);
    pony.y = Phaser.Math.Clamp(dragY, 70, GAME_HEIGHT - 50);
  }

  onDragEnd(_pointer, pony) {
    if (!pony.active || pony.isEliminating) {
      return;
    }

    pony.setScale(pony.originalScale || 1);
    pony.setDepth(this.ponies.length + 2);
    this.tryMatchFromPony(pony);
  }

  tryMatchFromPony(anchorPony) {
    if (!anchorPony.active || anchorPony.isEliminating) {
      return;
    }

    const sameColor = this.ponies.filter(
      (pony) => pony.active && !pony.isEliminating && pony.colorKey === anchorPony.colorKey,
    );
    if (sameColor.length < 3) {
      return;
    }

    const cluster = this.collectConnected(anchorPony, sameColor, MATCH_DISTANCE);
    if (cluster.length < 3) {
      return;
    }

    cluster.sort(
      (a, b) =>
        Phaser.Math.Distance.Between(anchorPony.x, anchorPony.y, a.x, a.y) -
        Phaser.Math.Distance.Between(anchorPony.x, anchorPony.y, b.x, b.y),
    );

    const trio = cluster.slice(0, 3);
    this.removeMatchedPonies(trio);
  }

  collectConnected(seed, pool, distanceThreshold) {
    const queue = [seed];
    const visited = new Set([seed]);

    while (queue.length > 0) {
      const current = queue.shift();
      for (let i = 0; i < pool.length; i += 1) {
        const other = pool[i];
        if (visited.has(other) || other === current || !other.active || other.isEliminating) {
          continue;
        }
        const distance = Phaser.Math.Distance.Between(current.x, current.y, other.x, other.y);
        if (distance <= distanceThreshold) {
          visited.add(other);
          queue.push(other);
        }
      }
    }

    return [...visited];
  }

  removeMatchedPonies(poniesToRemove) {
    if (poniesToRemove.length < 3) {
      return;
    }

    const color = poniesToRemove[0].colorKey;
    poniesToRemove.forEach((pony) => {
      pony.isEliminating = true;
      pony.disableInteractive();
    });

    const center = this.groupCenter(poniesToRemove);
    this.bumpScore(SCORE_PER_MATCH, center.x, center.y);

    this.tweens.add({
      targets: poniesToRemove,
      alpha: 0,
      scaleX: 0,
      scaleY: 0,
      angle: "+=160",
      duration: 280,
      ease: "Back.In",
      onComplete: () => {
        poniesToRemove.forEach((pony) => {
          this.ponies = this.ponies.filter((item) => item !== pony);
          pony.destroy();
        });
        this.findAndChainMatches(color);
      },
    });
  }

  findAndChainMatches(colorKey) {
    const candidates = this.ponies.filter(
      (pony) => pony.active && !pony.isEliminating && pony.colorKey === colorKey,
    );
    const seen = new Set();

    for (let i = 0; i < candidates.length; i += 1) {
      const pony = candidates[i];
      if (seen.has(pony)) {
        continue;
      }

      const cluster = this.collectConnected(pony, candidates, MATCH_DISTANCE);
      cluster.forEach((item) => seen.add(item));

      if (cluster.length >= 3) {
        this.removeMatchedPonies(cluster.slice(0, 3));
        return;
      }
    }
  }

  groupCenter(items) {
    const total = items.reduce(
      (acc, pony) => {
        acc.x += pony.x;
        acc.y += pony.y;
        return acc;
      },
      { x: 0, y: 0 },
    );

    return {
      x: total.x / items.length,
      y: total.y / items.length,
    };
  }

  bumpScore(amount, x, y) {
    this.score += amount;
    this.scoreValueText.setText(String(this.score));

    const burst = this.add
      .text(x, y, `+${amount}`, {
        fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
        fontSize: "30px",
        color: "#fff17a",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    burst.setShadow(0, 2, "#000000", 4, false, true);

    this.tweens.add({
      targets: burst,
      y: y - 34,
      alpha: 0,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 420,
      ease: "Quad.Out",
      onComplete: () => burst.destroy(),
    });
  }

  restartRound() {
    this.score = 0;
    this.scoreValueText.setText("0");
    this.spawnPonies();
  }
}

const gameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  scene: [CatchPonyScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(gameConfig);
