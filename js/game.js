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

class CatchPonyScene extends Phaser.Scene {
  constructor() {
    super("CatchPonyScene");
    this.ponies = [];
    this.score = 0;
    this.scoreValueText = null;
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

      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(61, 23, 3);
      g.fillStyle(0x212121, 1);
      g.fillCircle(62, 23, 1.4);

      g.lineStyle(2, 0xffffff, 0.3);
      g.strokeRoundedRect(10, 24, 44, 24, 10);

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
