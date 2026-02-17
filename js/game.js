const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

const BOARD_BOUNDS = {
  x: 66,
  y: 164,
  width: 668,
  height: 340,
};

const SLOT_COUNT = 7;
const MATCH_COUNT = 3;
const SCORE_PER_COMPOSE = 15;

const CARD_WIDTH = 120;
const CARD_HEIGHT = 90;
const CARD_SLOT_SCALE = 0.52;

const PONY_COLORS = [
  { key: "red", hex: 0xff5f6f, label: "Red" },
  { key: "orange", hex: 0xffa73f, label: "Orange" },
  { key: "yellow", hex: 0xffde47, label: "Yellow" },
  { key: "green", hex: 0x62d96b, label: "Green" },
  { key: "cyan", hex: 0x48d6dd, label: "Cyan" },
  { key: "blue", hex: 0x4f82ff, label: "Blue" },
  { key: "purple", hex: 0xb06dff, label: "Purple" },
];

const PONY_IMAGE_SOURCES = [
  { key: "horse-photo-1", path: "images/1771265622295.png" },
  { key: "horse-photo-2", path: "images/Screenshot_20260217_021422.jpg" },
];

class CatchPonyScene extends Phaser.Scene {
  constructor() {
    super("CatchPonyScene");
    this.boardPonies = [];
    this.stableBoxes = [];
    this.slotPositions = [];
    this.score = 0;
    this.totalPonies = 0;
    this.removedPonies = 0;
    this.isBusy = false;
    this.isGameOver = false;
    this.scoreValueText = null;
    this.progressValueText = null;
    this.stableCountText = null;
    this.toastText = null;
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
    this.buildHorseTextures();
    this.buildLayout();
    this.spawnBoardPonies();
    this.updateHud();
  }

  drawBackground() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x06111e, 0x06111e, 0x122c49, 0x122c49, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    for (let i = 0; i < 28; i += 1) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const y = Phaser.Math.Between(0, GAME_HEIGHT);
      const radius = Phaser.Math.Between(35, 120);
      g.fillStyle(Phaser.Display.Color.RandomRGB(40, 210).color, Phaser.Math.FloatBetween(0.06, 0.15));
      g.fillCircle(x, y, radius);
    }

    const topGlow = this.add.rectangle(GAME_WIDTH / 2, 0, GAME_WIDTH, 180, 0xffffff, 0.07);
    topGlow.setOrigin(0.5, 0);
  }

  buildLayout() {
    const topPanel = this.add.rectangle(GAME_WIDTH / 2, 52, 742, 94, 0x112538, 0.86);
    topPanel.setStrokeStyle(2, 0xffffff, 0.2);

    const titlePill = this.add.rectangle(400, 24, 138, 34, 0x24394d, 0.95);
    titlePill.setStrokeStyle(1, 0xffffff, 0.3);
    this.add
      .text(400, 24, "Stable Match", {
        fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
        fontSize: "18px",
        color: "#f7f9ff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.scoreValueText = this.add.text(90, 24, "Score 0", {
      fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
      fontSize: "20px",
      color: "#d9f0ff",
      fontStyle: "bold",
    });
    this.scoreValueText.setShadow(0, 2, "#00111d", 4, false, true);

    this.progressValueText = this.add.text(632, 24, "Progress 0%", {
      fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
      fontSize: "19px",
      color: "#d7ffe3",
      fontStyle: "bold",
    });
    this.progressValueText.setOrigin(1, 0);
    this.progressValueText.setShadow(0, 2, "#00111d", 4, false, true);

    const stablePanel = this.add.rectangle(GAME_WIDTH / 2, 80, 678, 42, 0x18314a, 0.94);
    stablePanel.setStrokeStyle(1.5, 0xffffff, 0.25);

    this.add.text(88, 80, "Stable", {
      fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
      fontSize: "20px",
      color: "#edfcff",
      fontStyle: "bold",
    }).setOrigin(0, 0.5);

    this.stableCountText = this.add.text(720, 80, "0/7", {
      fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
      fontSize: "19px",
      color: "#fff0cb",
      fontStyle: "bold",
    }).setOrigin(1, 0.5);

    this.buildSlots();

    const boardPanel = this.add.rectangle(
      BOARD_BOUNDS.x + BOARD_BOUNDS.width / 2,
      BOARD_BOUNDS.y + BOARD_BOUNDS.height / 2,
      BOARD_BOUNDS.width + 30,
      BOARD_BOUNDS.height + 26,
      0x0d2235,
      0.45,
    );
    boardPanel.setStrokeStyle(2, 0xffffff, 0.2);

    this.makeUiButton(122, 552, 170, 44, "Shuffle", () => this.shuffleBoard());
    this.makeUiButton(678, 552, 170, 44, "Restart", () => this.scene.restart());

    this.toastText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 28, "", {
        fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
        fontSize: "20px",
        color: "#fff5d7",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setAlpha(0);
  }

  buildSlots() {
    const slotWidth = 72;
    const gap = 10;
    const totalWidth = SLOT_COUNT * slotWidth + (SLOT_COUNT - 1) * gap;
    const startX = (GAME_WIDTH - totalWidth) / 2 + slotWidth / 2;

    this.slotPositions = [];
    this.stableBoxes = [];
    for (let i = 0; i < SLOT_COUNT; i += 1) {
      const x = startX + i * (slotWidth + gap);
      const y = 80;
      this.slotPositions.push({ x, y });
      this.stableBoxes.push({ x, y, colorKey: null, cards: [] });

      const slot = this.add.rectangle(x, y, slotWidth, 34, 0x22405f, 0.78);
      slot.setStrokeStyle(1.5, 0xffffff, 0.38);

      const shine = this.add.rectangle(x, y - 9, slotWidth - 14, 6, 0xffffff, 0.16);
      shine.setStrokeStyle(0.5, 0xffffff, 0.2);
    }
  }

  makeUiButton(x, y, width, height, label, onClick) {
    const button = this.add.rectangle(x, y, width, height, 0x1f3a56, 0.95);
    button.setStrokeStyle(1.5, 0xffffff, 0.3);
    button.setInteractive({ useHandCursor: true });

    const text = this.add.text(x, y, label, {
      fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
      fontSize: "23px",
      color: "#f4fbff",
      fontStyle: "bold",
    }).setOrigin(0.5);

    button.on("pointerover", () => {
      button.setFillStyle(0x2a5378, 0.97);
      text.setScale(1.04);
    });
    button.on("pointerout", () => {
      button.setFillStyle(0x1f3a56, 0.95);
      text.setScale(1);
    });
    button.on("pointerup", onClick);
  }

  buildHorseTextures() {
    const cutoutCanvases = PONY_IMAGE_SOURCES.map((source, index) =>
      this.extractHorseCanvas(source.key, index),
    ).filter(Boolean);

    if (cutoutCanvases.length === 0) {
      this.buildFallbackHorseTextures();
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

      const neutralColor = Math.abs(r - g) < 16 && Math.abs(g - b) < 16;
      const brightBackground = r > 188 && g > 188 && b > 188;
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
    cropped.getContext("2d").drawImage(sourceCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    const targetHeight = 112;
    const scale = targetHeight / cropH;
    const targetWidth = Math.max(68, Math.round(cropW * scale));

    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = targetWidth;
    finalCanvas.height = targetHeight;

    const finalContext = finalCanvas.getContext("2d");
    finalContext.imageSmoothingEnabled = true;
    finalContext.imageSmoothingQuality = "high";
    finalContext.drawImage(cropped, 0, 0, targetWidth, targetHeight);

    const textureKey = `horse-cutout-${sourceIndex}`;
    if (this.textures.exists(textureKey)) {
      this.textures.remove(textureKey);
    }
    this.textures.addCanvas(textureKey, finalCanvas);
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

      if (saturation < 0.12 && lightness > 0.7) {
        continue;
      }

      const tunedSaturation = Math.min(1, Math.max(0.52, saturation));
      const [nextRed, nextGreen, nextBlue] = this.hslToRgb(targetHue, tunedSaturation, lightness);

      const lift = 1 + Math.min(0.3, hue * 0.05);
      pixels[i] = Math.min(255, Math.round(nextRed * lift));
      pixels[i + 1] = Math.min(255, Math.round(nextGreen * lift));
      pixels[i + 2] = Math.min(255, Math.round(nextBlue * lift));
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

    return [
      Math.round(hueToChannel(h + 1 / 3) * 255),
      Math.round(hueToChannel(h) * 255),
      Math.round(hueToChannel(h - 1 / 3) * 255),
    ];
  }

  buildFallbackHorseTextures() {
    PONY_COLORS.forEach((entry) => {
      const textureKey = `pony-${entry.key}`;
      if (this.textures.exists(textureKey)) {
        return;
      }

      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(entry.hex, 1);
      g.fillRoundedRect(7, 26, 56, 28, 12);
      g.fillCircle(66, 26, 14);
      g.fillTriangle(70, 8, 64, 20, 74, 20);
      g.fillTriangle(57, 9, 51, 21, 61, 21);
      g.fillRoundedRect(14, 49, 8, 14, 3);
      g.fillRoundedRect(30, 49, 8, 14, 3);
      g.generateTexture(textureKey, 80, 66);
      g.destroy();
    });
  }

  spawnBoardPonies() {
    this.clearBoard();
    this.clearStable();
    this.closeResultOverlay();

    this.isBusy = false;
    this.isGameOver = false;
    this.score = 0;
    this.removedPonies = 0;
    const colorTriplets = Phaser.Math.Between(12, 15);
    const colorQueue = [];
    for (let i = 0; i < colorTriplets; i += 1) {
      const color = Phaser.Utils.Array.GetRandom(PONY_COLORS);
      colorQueue.push(color, color, color);
    }
    Phaser.Utils.Array.Shuffle(colorQueue);

    this.totalPonies = colorQueue.length;
    colorQueue.forEach((color, i) => {
      const x = Phaser.Math.Between(BOARD_BOUNDS.x + 52, BOARD_BOUNDS.x + BOARD_BOUNDS.width - 52);
      const y = Phaser.Math.Between(BOARD_BOUNDS.y + 42, BOARD_BOUNDS.y + BOARD_BOUNDS.height - 42);

      const ponyCard = this.createPonyCard(color, x, y, true);
      ponyCard.setDepth(110 + i);
      this.boardPonies.push(ponyCard);
    });
  }

  createPonyCard(colorEntry, x, y, isBoard) {
    const card = this.add.container(x, y);

    const shadow = this.add.rectangle(5, 6, CARD_WIDTH, CARD_HEIGHT, 0x000000, 0.2);
    const body = this.add.rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT, 0xf6fbff, 0.97);
    body.setStrokeStyle(3, 0xffffff, 0.8);

    const glass = this.add.rectangle(0, -26, CARD_WIDTH - 14, 16, 0xffffff, 0.15);
    const horse = this.add.image(0, 4, `pony-${colorEntry.key}`);
    const fitScale = Math.min(90 / horse.width, 70 / horse.height);
    horse.setScale(fitScale);

    const badge = this.add.circle(44, -28, 10, colorEntry.hex, 0.95);
    badge.setStrokeStyle(2, 0xffffff, 0.75);

    card.add([shadow, body, glass, horse, badge]);
    card.setSize(CARD_WIDTH, CARD_HEIGHT);
    card.colorKey = colorEntry.key;
    card.colorLabel = colorEntry.label;
    card.isInStable = !isBoard;

    card.setInteractive(
      new Phaser.Geom.Rectangle(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT),
      Phaser.Geom.Rectangle.Contains,
    );

    if (isBoard) {
      card.baseScale = Phaser.Math.FloatBetween(0.94, 1.05);
      card.setScale(card.baseScale);
      card.setAngle(Phaser.Math.FloatBetween(-10, 10));
      card.on("pointerdown", () => this.collectToStable(card));
      card.on("pointerover", () => {
        if (this.isBusy || this.isGameOver || card.isInStable) return;
        card.setScale(card.baseScale + 0.025);
      });
      card.on("pointerout", () => {
        if (this.isBusy || this.isGameOver || card.isInStable) return;
        card.setScale(card.baseScale);
      });
    }

    return card;
  }

  collectToStable(ponyCard) {
    if (this.isBusy || this.isGameOver || ponyCard.isInStable) {
      return;
    }

    const targetBox = this.findTargetBox(ponyCard.colorKey);
    if (!targetBox) {
      this.showToast("No matching box");
      this.endRound(false, "Stable Full");
      return;
    }

    this.isBusy = true;
    ponyCard.isInStable = true;
    ponyCard.disableInteractive();
    ponyCard.removeAllListeners();
    this.boardPonies = this.boardPonies.filter((item) => item !== ponyCard);

    if (!targetBox.colorKey) {
      targetBox.colorKey = ponyCard.colorKey;
    }
    targetBox.cards.push(ponyCard);
    const target = this.getCardTargetInBox(targetBox, targetBox.cards.length - 1);

    this.tweens.add({
      targets: ponyCard,
      x: target.x,
      y: target.y,
      angle: 0,
      scaleX: CARD_SLOT_SCALE,
      scaleY: CARD_SLOT_SCALE,
      duration: 210,
      ease: "Cubic.Out",
      onStart: () => ponyCard.setDepth(2200 + this.stableBoxes.indexOf(targetBox)),
      onComplete: () => {
        this.isBusy = false;
        this.updateHud();
        this.checkBoxMatch(targetBox);
      },
    });
  }

  findTargetBox(colorKey) {
    const sameColorBox = this.stableBoxes.find((box) => box.colorKey === colorKey);
    if (sameColorBox) {
      return sameColorBox;
    }
    return this.stableBoxes.find((box) => box.colorKey === null) || null;
  }

  getCardTargetInBox(box, stackIndex) {
    const index = Math.min(stackIndex, MATCH_COUNT - 1);
    const xOffset = (index - 1) * 10;
    const yOffset = -index * 4;
    return { x: box.x + xOffset, y: box.y + yOffset };
  }

  checkBoxMatch(box) {
    if (this.isBusy || this.isGameOver) {
      return;
    }

    if (box.cards.length >= MATCH_COUNT) {
      this.composeMatchedPonies(box);
      return;
    }

    this.evaluateRoundState();
  }

  composeMatchedPonies(box) {
    this.isBusy = true;
    const matchedPonies = box.cards.slice(0, MATCH_COUNT);
    const center = this.getCenterPoint(matchedPonies);

    this.flashCompose(center.x, center.y, matchedPonies[0].colorLabel);

    this.tweens.add({
      targets: matchedPonies,
      x: center.x,
      y: center.y,
      alpha: 0,
      angle: "+=120",
      scaleX: 0.08,
      scaleY: 0.08,
      duration: 260,
      ease: "Back.In",
      onComplete: () => {
        matchedPonies.forEach((pony) => {
          pony.destroy();
          this.removedPonies += 1;
        });

        box.cards = [];
        box.colorKey = null;
        this.score += SCORE_PER_COMPOSE;
        this.updateHud();
        this.isBusy = false;
        this.evaluateRoundState();
      },
    });
  }

  getStableCardCount() {
    return this.stableBoxes.reduce((sum, box) => sum + box.cards.length, 0);
  }

  evaluateRoundState() {
    if (this.isBusy || this.isGameOver) {
      return;
    }

    const stableCardCount = this.getStableCardCount();

    if (this.boardPonies.length === 0) {
      if (stableCardCount === 0) {
        this.endRound(true, "Perfect Stable");
      } else {
        this.endRound(false, "No More Horses");
      }
      return;
    }

    const hasEmptyBox = this.stableBoxes.some((box) => box.colorKey === null);
    if (hasEmptyBox) {
      return;
    }

    const boardColors = new Set(this.boardPonies.map((pony) => pony.colorKey));
    const boxColors = new Set(this.stableBoxes.map((box) => box.colorKey));
    const hasPlaceableMove = [...boardColors].some((color) => boxColors.has(color));

    if (!hasPlaceableMove) {
      this.endRound(false, "Stable Full");
    }
  }

  shuffleBoard() {
    if (this.isBusy || this.isGameOver || this.boardPonies.length === 0) {
      return;
    }

    this.isBusy = true;
    this.showToast("Shuffle");

    let completeCount = 0;
    this.boardPonies.forEach((pony) => {
      const x = Phaser.Math.Between(BOARD_BOUNDS.x + 52, BOARD_BOUNDS.x + BOARD_BOUNDS.width - 52);
      const y = Phaser.Math.Between(BOARD_BOUNDS.y + 42, BOARD_BOUNDS.y + BOARD_BOUNDS.height - 42);

      this.tweens.add({
        targets: pony,
        x,
        y,
        angle: Phaser.Math.FloatBetween(-10, 10),
        duration: 320,
        ease: "Back.Out",
        onComplete: () => {
          completeCount += 1;
          if (completeCount === this.boardPonies.length) {
            this.isBusy = false;
          }
        },
      });
    });
  }

  getCenterPoint(items) {
    const total = items.reduce(
      (acc, item) => {
        acc.x += item.x;
        acc.y += item.y;
        return acc;
      },
      { x: 0, y: 0 },
    );

    return {
      x: total.x / items.length,
      y: total.y / items.length,
    };
  }

  flashCompose(x, y, colorLabel) {
    const ring = this.add.circle(x, y, 16, 0xffffff, 0.35);
    ring.setStrokeStyle(4, 0xffffff, 0.85);

    const text = this.add.text(x, y - 14, `${colorLabel} x3`, {
      fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
      fontSize: "28px",
      color: "#fff4ce",
      fontStyle: "bold",
    }).setOrigin(0.5);
    text.setShadow(0, 2, "#00151f", 4, false, true);

    this.tweens.add({
      targets: ring,
      scaleX: 7.5,
      scaleY: 7.5,
      alpha: 0,
      duration: 320,
      ease: "Quad.Out",
      onComplete: () => ring.destroy(),
    });

    this.tweens.add({
      targets: text,
      y: y - 50,
      alpha: 0,
      duration: 430,
      ease: "Cubic.Out",
      onComplete: () => text.destroy(),
    });
  }

  showToast(message) {
    if (!this.toastText) {
      return;
    }

    this.toastText.setText(message);
    this.toastText.setAlpha(1);

    this.tweens.killTweensOf(this.toastText);
    this.tweens.add({
      targets: this.toastText,
      y: GAME_HEIGHT - 44,
      alpha: 0,
      duration: 700,
      ease: "Quad.Out",
      onComplete: () => {
        this.toastText.setY(GAME_HEIGHT - 28);
      },
    });
  }

  endRound(isWin, title) {
    if (this.isGameOver) {
      return;
    }

    this.isGameOver = true;
    this.isBusy = true;

    const cover = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x03101a, 0.55);
    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 430, 230, isWin ? 0x1a4450 : 0x4b1f2a, 0.95);
    panel.setStrokeStyle(2, 0xffffff, 0.34);

    const titleText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 56, title, {
      fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
      fontSize: "44px",
      color: isWin ? "#cefff1" : "#ffe6e9",
      fontStyle: "bold",
    }).setOrigin(0.5);

    const scoreText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 6, `Score ${this.score}`, {
      fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
      fontSize: "34px",
      color: "#fef8de",
      fontStyle: "bold",
    }).setOrigin(0.5);

    const restartButton = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 62, 220, 54, 0x214e5d, 0.98);
    restartButton.setStrokeStyle(2, 0xffffff, 0.3);
    restartButton.setInteractive({ useHandCursor: true });
    const restartLabel = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 62, "Play Again", {
      fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
      fontSize: "30px",
      color: "#ebf8ff",
      fontStyle: "bold",
    }).setOrigin(0.5);

    restartButton.on("pointerover", () => {
      restartButton.setFillStyle(0x2f6375, 1);
      restartLabel.setScale(1.04);
    });
    restartButton.on("pointerout", () => {
      restartButton.setFillStyle(0x214e5d, 0.98);
      restartLabel.setScale(1);
    });
    restartButton.on("pointerup", () => this.scene.restart());

    this.resultOverlay = [cover, panel, titleText, scoreText, restartButton, restartLabel];
  }

  closeResultOverlay() {
    if (!this.resultOverlay) {
      return;
    }

    this.resultOverlay.forEach((item) => item.destroy());
    this.resultOverlay = null;
  }

  clearBoard() {
    this.boardPonies.forEach((pony) => pony.destroy());
    this.boardPonies = [];
  }

  clearStable() {
    this.stableBoxes.forEach((box) => {
      box.cards.forEach((pony) => pony.destroy());
      box.cards = [];
      box.colorKey = null;
    });
  }

  updateHud() {
    if (this.scoreValueText) {
      this.scoreValueText.setText(`Score ${this.score}`);
    }

    if (this.stableCountText) {
      const usedBoxes = this.stableBoxes.filter((box) => box.colorKey !== null).length;
      this.stableCountText.setText(`${usedBoxes}/${SLOT_COUNT}`);
    }

    if (this.progressValueText) {
      const progress = this.totalPonies === 0 ? 0 : Math.round((this.removedPonies / this.totalPonies) * 100);
      this.progressValueText.setText(`Progress ${progress}%`);
    }
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
