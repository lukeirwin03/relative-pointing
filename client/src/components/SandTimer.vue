<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';

const props = defineProps({
  isHost: { type: Boolean, default: false },
  isMyTurn: { type: Boolean, default: false },
  turnActive: { type: Boolean, default: false },
  currentColor: { type: String, default: '#4ECDC4' },
  turnStartedAt: { type: String, default: null },
  accumulatedSand: { type: Array, default: () => [] },
  draining: { type: Boolean, default: false },
  canvasHeight: { type: Number, default: 200 },
});

const canvasRef = ref(null);
const PARTICLE_SIZE = 2;
const GRAVITY = 0.01;
const HORIZONTAL_DRIFT = 0.3;
const BASE_SPAWN_RATE = 0.1; // 1 particle every 4 seconds

let particles = []; // only in-flight (unsettled) particles
let grid = []; // 2D occupancy grid: grid[row][col] = color string or null
let gridRows = 0;
let gridCols = 0;
let animFrameId = null;
let lastSpawnTime = 0;
let running = false;
let canvasWidth = 0; // logical (CSS) width
let dpr = 1;
let containerObserver = null;

// Offscreen canvas for settled particles — drawn once, composited each frame
let staticCanvas = null;
let staticCtx = null;
let settledCount = 0;

function initStaticCanvas(width, height) {
  staticCanvas = document.createElement('canvas');
  staticCanvas.width = width;
  staticCanvas.height = height;
  staticCtx = staticCanvas.getContext('2d');
  staticCtx.globalAlpha = 0.6;
  settledCount = 0;
}

function drawSettledPixel(gx, gy, color) {
  if (!staticCtx) return;
  staticCtx.fillStyle = color;
  staticCtx.fillRect(
    gx * PARTICLE_SIZE,
    gy * PARTICLE_SIZE,
    PARTICLE_SIZE,
    PARTICLE_SIZE
  );
}

function clearStaticCanvas() {
  if (!staticCtx) return;
  staticCtx.clearRect(0, 0, staticCanvas.width, staticCanvas.height);
  settledCount = 0;
}

// Grid helpers
function toGridX(px) {
  return Math.floor(px / PARTICLE_SIZE);
}

function toGridY(py) {
  return Math.floor(py / PARTICLE_SIZE);
}

function isOccupied(gx, gy) {
  if (gx < 0 || gx >= gridCols || gy < 0 || gy >= gridRows) return true;
  return grid[gy][gx] !== null;
}

function occupy(gx, gy, color) {
  if (gx >= 0 && gx < gridCols && gy >= 0 && gy < gridRows) {
    grid[gy][gx] = color;
  }
}

function vacate(gx, gy) {
  if (gx >= 0 && gx < gridCols && gy >= 0 && gy < gridRows) {
    grid[gy][gx] = null;
  }
}

function initGrid(width, height) {
  canvasWidth = width;
  gridCols = Math.floor(width / PARTICLE_SIZE);
  gridRows = Math.floor(height / PARTICLE_SIZE);
  grid = [];
  for (let r = 0; r < gridRows; r++) {
    grid.push(new Array(gridCols).fill(null));
  }
}

function loadAccumulatedSand() {
  if (!props.accumulatedSand.length) return;

  for (const entry of props.accumulatedSand) {
    const count = entry.particleCount || 0;
    const color = entry.color || '#4ECDC4';
    for (let i = 0; i < count; i++) {
      const gx = Math.floor(Math.random() * gridCols);
      let gy = -1;
      for (let r = gridRows - 1; r >= 0; r--) {
        if (!grid[r][gx]) {
          gy = r;
          break;
        }
      }
      if (gy < 0) continue;

      occupy(gx, gy, color);
      drawSettledPixel(gx, gy, color);
      settledCount++;
    }
  }
}

function spawnParticle(color) {
  if (canvasWidth <= PARTICLE_SIZE) return;
  const x = Math.floor(Math.random() * (canvasWidth - PARTICLE_SIZE));
  particles.push({
    x,
    y: 0,
    vy: 0,
    vx: (Math.random() - 0.5) * HORIZONTAL_DRIFT * 2,
    color,
    gx: toGridX(x),
    gy: 0,
  });
}

function getSpawnRate() {
  if (!props.turnStartedAt) return BASE_SPAWN_RATE;
  const elapsed = (Date.now() - new Date(props.turnStartedAt).getTime()) / 1000;
  // Ramp: double the rate every 5 minutes, cap at 4x base
  const multiplier = Math.min(1 + elapsed / 300, 4);
  return BASE_SPAWN_RATE * multiplier;
}

function update() {
  const now = performance.now();
  const height = props.canvasHeight;

  if (props.turnActive && props.turnStartedAt && !props.draining) {
    const spawnRate = getSpawnRate();
    const spawnInterval = 1000 / spawnRate;
    if (now - lastSpawnTime >= spawnInterval) {
      spawnParticle(props.currentColor);
      lastSpawnTime = now;
    }
  }

  // If draining, convert settled grid cells back into moving particles
  if (props.draining && settledCount > 0) {
    clearStaticCanvas();
    for (let gy = 0; gy < gridRows; gy++) {
      for (let gx = 0; gx < gridCols; gx++) {
        const color = grid[gy][gx];
        if (color !== null) {
          particles.push({
            x: gx * PARTICLE_SIZE,
            y: gy * PARTICLE_SIZE,
            vy: 2 + Math.random() * 3,
            vx: (Math.random() - 0.5) * 1,
            color,
            gx,
            gy,
          });
          grid[gy][gx] = null;
        }
      }
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    p.vy += GRAVITY;
    p.x += p.vx;
    p.y += p.vy;

    if (p.x < 0) {
      p.x = 0;
      p.vx = Math.abs(p.vx) * 0.5;
    }
    if (p.x > canvasWidth - PARTICLE_SIZE) {
      p.x = canvasWidth - PARTICLE_SIZE;
      p.vx = -Math.abs(p.vx) * 0.5;
    }

    if (p.y > height + 20) {
      particles.splice(i, 1);
      continue;
    }

    if (!props.draining) {
      const newGx = Math.max(0, Math.min(toGridX(p.x), gridCols - 1));
      const newGy = Math.max(0, Math.min(toGridY(p.y), gridRows - 1));

      const belowOccupied =
        newGy >= gridRows - 1 || isOccupied(newGx, newGy + 1);

      if (belowOccupied && p.vy >= 0) {
        const canLeft =
          newGx > 0 &&
          !isOccupied(newGx - 1, newGy) &&
          !isOccupied(newGx - 1, newGy + 1);
        const canRight =
          newGx < gridCols - 1 &&
          !isOccupied(newGx + 1, newGy) &&
          !isOccupied(newGx + 1, newGy + 1);

        if (canLeft || canRight) {
          if (canLeft && canRight) {
            p.vx = (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.5);
          } else if (canLeft) {
            p.vx = -(0.5 + Math.random() * 0.5);
          } else {
            p.vx = 0.5 + Math.random() * 0.5;
          }
          p.vy = Math.max(p.vy * 0.3, GRAVITY);
        } else {
          let settleGy = newGy;
          if (isOccupied(newGx, settleGy)) {
            for (let r = settleGy - 1; r >= 0; r--) {
              if (!isOccupied(newGx, r)) {
                settleGy = r;
                break;
              }
            }
            if (isOccupied(newGx, settleGy)) {
              particles.splice(i, 1);
              continue;
            }
          }

          // Settle: paint to static buffer, store in grid, remove from active array
          occupy(newGx, settleGy, p.color);
          drawSettledPixel(newGx, settleGy, p.color);
          settledCount++;
          particles.splice(i, 1);
        }
      }
    }
  }
}

function draw(ctx) {
  const height = props.canvasHeight;
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, canvasWidth, height);

  // Draw settled particles from static buffer
  if (staticCanvas && settledCount > 0) {
    ctx.globalAlpha = 1; // static canvas already has alpha baked in
    ctx.drawImage(staticCanvas, 0, 0);
  }

  // Draw in-flight particles
  ctx.globalAlpha = 0.6;
  for (const p of particles) {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, PARTICLE_SIZE, PARTICLE_SIZE);
  }
  ctx.restore();
}

function loop() {
  if (!running) return;

  const canvas = canvasRef.value;
  if (!canvas) {
    animFrameId = requestAnimationFrame(loop);
    return;
  }

  const ctx = canvas.getContext('2d');
  update();
  draw(ctx);
  animFrameId = requestAnimationFrame(loop);
}

function startLoop() {
  if (running) return;
  running = true;
  lastSpawnTime = performance.now();
  loop();
}

function stopLoop() {
  running = false;
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
}

function resetJar() {
  particles = [];
  if (canvasWidth > 0) {
    initGrid(canvasWidth, props.canvasHeight);
    initStaticCanvas(canvasWidth, props.canvasHeight);
  }
}

function sizeCanvas() {
  const canvas = canvasRef.value;
  if (!canvas) return 0;

  const container = canvas.parentElement;
  const width = container.clientWidth;
  const height = props.canvasHeight;
  if (width <= 0 || height <= 0) return 0;

  dpr = window.devicePixelRatio || 1;

  // Set the CSS display size
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  // Set the actual backing store size scaled by DPR
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  return width;
}

function redrawStaticFromGrid() {
  if (!staticCtx) return;
  clearStaticCanvas();
  for (let gy = 0; gy < gridRows; gy++) {
    for (let gx = 0; gx < gridCols; gx++) {
      const color = grid[gy][gx];
      if (color !== null) {
        drawSettledPixel(gx, gy, color);
        settledCount++;
      }
    }
  }
}

function rebuildGrid(newWidth, newHeight) {
  // Collect settled data from old grid
  const oldSettled = [];
  for (let gy = 0; gy < gridRows; gy++) {
    for (let gx = 0; gx < gridCols; gx++) {
      if (grid[gy][gx] !== null) {
        oldSettled.push({ gx, gy, color: grid[gy][gx] });
      }
    }
  }
  const unsettled = [...particles];
  particles = [];

  initGrid(newWidth, newHeight);
  initStaticCanvas(newWidth, newHeight);

  // Re-place settled particles: keep x column, find lowest empty cell
  for (const s of oldSettled) {
    const gx = Math.max(0, Math.min(s.gx, gridCols - 1));
    let gy = -1;
    for (let r = gridRows - 1; r >= 0; r--) {
      if (!grid[r][gx]) {
        gy = r;
        break;
      }
    }
    if (gy < 0) continue;

    occupy(gx, gy, s.color);
    drawSettledPixel(gx, gy, s.color);
    settledCount++;
  }

  // Load accumulated sand on top (only if no prior settled data)
  if (props.accumulatedSand.length > 0 && oldSettled.length === 0) {
    loadAccumulatedSand();
  }

  // Re-add in-flight particles, clamping x
  for (const p of unsettled) {
    p.x = Math.max(0, Math.min(p.x, newWidth - PARTICLE_SIZE));
    particles.push(p);
  }
}

function handleContainerResize(entries) {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const entry = entries[0];
  const newWidth = Math.floor(entry.contentRect.width);
  if (newWidth > 0 && newWidth !== canvasWidth) {
    sizeCanvas();
    rebuildGrid(newWidth, props.canvasHeight);
  }
}

function initCanvas() {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const width = sizeCanvas();
  if (width <= 0) return;

  initGrid(width, props.canvasHeight);
  initStaticCanvas(width, props.canvasHeight);

  if (props.accumulatedSand.length > 0) {
    loadAccumulatedSand();
  }

  // Watch container for width changes (e.g. sidebar expand transition)
  const container = canvas.parentElement;
  containerObserver = new ResizeObserver(handleContainerResize);
  containerObserver.observe(container);

  startLoop();
}

// Watch for drain trigger
watch(
  () => props.draining,
  (draining) => {
    if (draining) {
      const checkDrain = setInterval(() => {
        if (particles.length === 0 && settledCount === 0) {
          clearInterval(checkDrain);
          resetJar();
        }
      }, 100);
    }
  }
);

// Watch canvasHeight changes — resize canvas and rebuild grid
watch(
  () => props.canvasHeight,
  (newHeight) => {
    if (newHeight > 0 && canvasRef.value) {
      sizeCanvas();
      rebuildGrid(canvasWidth, newHeight);
    }
  }
);

watch(
  () => props.accumulatedSand,
  (newSand, oldSand) => {
    if (newSand.length > (oldSand?.length || 0)) {
      // New turn recorded — existing particles stay, new ones spawn in new color
    }
  },
  { deep: true }
);

watch(
  () => props.currentColor,
  () => {
    // New turn started, particles will now spawn in the new color
  }
);

onMounted(() => {
  nextTick(() => initCanvas());
});

onUnmounted(() => {
  stopLoop();
  if (containerObserver) {
    containerObserver.disconnect();
    containerObserver = null;
  }
  staticCanvas = null;
  staticCtx = null;
});
</script>

<template>
  <div class="sand-timer-canvas">
    <canvas ref="canvasRef" class="block" />
  </div>
</template>

<style scoped>
.sand-timer-canvas {
  width: 100%;
  height: 100%;
}
</style>
