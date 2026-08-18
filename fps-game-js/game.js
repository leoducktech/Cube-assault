import * as THREE from 'three';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/loaders/GLTFLoader.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x11163d);
scene.fog = new THREE.FogExp2(0x11163d, 0.0075);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x11163d);
document.body.appendChild(renderer.domElement);

const overlay = document.getElementById('overlay');
const status = document.getElementById('status');
const overlayIntro = document.getElementById('overlayIntro');
const instructions = document.getElementById('instructions');
const gameOverPanel = document.getElementById('gameOverPanel');
const finalScoreText = document.getElementById('finalScoreText');
const gameOverHint = document.getElementById('gameOverHint');
const restartButton = document.getElementById('restartButton');
const homeButton = document.getElementById('homeButton');
const accountStorageKey = 'cube_assault_account';
const CUBOTICS_PER_SCORE = 100;

function formatCubotics(value) {
  const numeric = Number(value) || 0;
  const cubotics = numeric / CUBOTICS_PER_SCORE;
  return Number.isInteger(cubotics) ? cubotics.toString() : cubotics.toFixed(1);
}

const musicToggle = document.createElement('button');
musicToggle.id = 'musicToggle';
musicToggle.type = 'button';
musicToggle.textContent = '🔊 ON';
document.body.appendChild(musicToggle);

const backgroundMusic = new Audio('backgroundmusic.mp3');
backgroundMusic.loop = true;
backgroundMusic.volume = 0.45;
let backgroundMusicStarted = false;
let musicEnabled = true;

function startBackgroundMusic() {
  if (!musicEnabled || backgroundMusicStarted) return;
  backgroundMusicStarted = true;
  backgroundMusic.play().catch(() => {});
}

function setMusicState(enabled) {
  musicEnabled = enabled;
  musicToggle.textContent = enabled ? '🔊 ON' : '🔇 OFF';
  musicToggle.classList.toggle('enabled', enabled);
  musicToggle.classList.toggle('disabled', !enabled);
  if (enabled) {
    backgroundMusic.play().catch(() => {});
  } else {
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
  }
}

musicToggle.classList.add('enabled');

musicToggle.addEventListener('click', () => {
  setMusicState(!musicEnabled);
});

window.addEventListener('pointerdown', startBackgroundMusic, { once: true });
window.addEventListener('keydown', startBackgroundMusic, { once: true });

restartButton.addEventListener('click', (event) => {
  event.stopPropagation();
  if (gameOver) {
    resetGame();
    overlay.style.display = 'none';
    overlay.classList.remove('game-over');
    restartButton.style.display = 'none';
    setPointerLock();
  }
});

function showStartOverlay() {
  overlay.classList.remove('game-over');
  overlayIntro?.classList.remove('hidden');
  instructions?.classList.remove('hidden');
  gameOverPanel?.classList.add('hidden');
  restartButton.style.display = 'none';
  homeButton.style.display = 'inline-block';
  status.textContent = 'Status: click to start';
}

function showGameOverScreen(finalScore) {
  overlay.classList.add('game-over');
  overlayIntro?.classList.add('hidden');
  instructions?.classList.add('hidden');
  gameOverPanel?.classList.remove('hidden');
  finalScoreText.textContent = `Final Cubotics: ${formatCubotics(finalScore)}`;
  gameOverHint.textContent = finalScore >= 500 ? 'You pushed the arena to its limits. 1 Cubotics = 100 score.' : 'The arena claimed your run. 1 Cubotics = 100 score.';
  restartButton.style.display = 'inline-block';
  homeButton.style.display = 'inline-block';
  status.textContent = `Status: mission failed — ${formatCubotics(finalScore)} Cubotics`;
}

function getStoredAccount() {
  try {
    return JSON.parse(localStorage.getItem(accountStorageKey));
  } catch {
    return null;
  }
}

const apiBase = (() => {
  const { hostname, port, protocol } = window.location;
  if (protocol === 'file:') return 'http://127.0.0.1:8787';
  if (hostname === '127.0.0.1' || hostname === 'localhost') {
    if (port === '8787') return '';
    return 'http://127.0.0.1:8787';
  }
  return '';
})();

async function persistScore(finalScore) {
  const account = getStoredAccount();
  if (!account?.username) return;

  const updatedAccount = { ...account, score: finalScore };
  localStorage.setItem(accountStorageKey, JSON.stringify(updatedAccount));

  try {
    const response = await fetch(`${apiBase}/api/update-score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: account.username, score: finalScore }),
    });

    const result = await response.json().catch(() => null);
    if (result?.success && typeof result.score === 'number') {
      updatedAccount.score = result.score;
      localStorage.setItem(accountStorageKey, JSON.stringify(updatedAccount));
    }
  } catch {
    // Ignore persistence failures and keep the local score.
  }
}

const hpFlashOverlay = document.createElement('div');
hpFlashOverlay.id = 'hpFlashOverlay';
document.body.appendChild(hpFlashOverlay);

function triggerHpFlash() {
  hpFlashOverlay.classList.remove('active');
  void hpFlashOverlay.offsetWidth;
  hpFlashOverlay.classList.add('active');
}

window.addEventListener('error', (event) => {
  status.textContent = `Error: ${event.message}`;
  overlay.style.display = 'block';
});

const ambient = new THREE.AmbientLight(0x99e4ff, 0.45);
scene.add(ambient);
const hemi = new THREE.HemisphereLight(0xab92ff, 0x17204d, 0.55);
scene.add(hemi);
const dirLight = new THREE.DirectionalLight(0xb8f2ff, 1.4);
dirLight.position.set(6, 18, 6);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(1024, 1024);
scene.add(dirLight);

const neonGlow = new THREE.PointLight(0x7ed8ff, 0.55, 50, 1.5);
neonGlow.position.set(0, 12, 0);
scene.add(neonGlow);

const fillGlow = new THREE.PointLight(0xd786ff, 0.35, 40, 1.7);
fillGlow.position.set(0, 6, 0);
scene.add(fillGlow);

function createNeonFloorTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#03040f';
  ctx.fillRect(0, 0, size, size);

  const step = 32;
  for (let i = 0; i <= size; i += step) {
    ctx.strokeStyle = i % (step * 2) === 0 ? 'rgba(80, 245, 255, 0.48)' : 'rgba(120, 65, 255, 0.30)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  for (let i = 0; i < 120; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const alpha = 0.18 + Math.random() * 0.18;
    ctx.fillStyle = `rgba(190, 110, 255, ${alpha})`;
    ctx.fillRect(x, y, 2.4, 2.4);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(18, 18);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function createNeonWallTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#121139';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(120, 255, 255, 0.35)';
  ctx.lineWidth = 2;
  for (let i = 18; i < size; i += 36) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(245, 110, 255, 0.32)';
  ctx.lineWidth = 1.5;
  for (let i = 20; i < size; i += 44) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
  }

  for (let i = 0; i < 20; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillStyle = `rgba(181, 255, 255, ${0.08 + Math.random() * 0.1})`;
    ctx.fillRect(x, y, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

const floor = new THREE.Mesh(
  new THREE.BoxGeometry(90, 1, 90),
  new THREE.MeshStandardMaterial({
    color: 0x080d1d,
    emissive: 0x0b1730,
    emissiveIntensity: 0.25,
    roughness: 0.82,
    metalness: 0.2,
  })
);
floor.position.y = -0.5;
floor.receiveShadow = true;
scene.add(floor);

const walls = [];
const boundaryMaterial = new THREE.MeshStandardMaterial({
  color: 0x0d0d18,
  emissive: 0x0d1d2d,
  emissiveIntensity: 0.18,
  roughness: 0.8,
  metalness: 0.15,
});
const stoneMaterial = new THREE.MeshStandardMaterial({
  map: createNeonWallTexture(),
  emissive: 0x4900ff,
  emissiveIntensity: 0.7,
  roughness: 0.32,
  metalness: 0.8,
  color: 0x0b0520,
});

function addBlock(x, z, width, height, depth) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), boundaryMaterial);
  mesh.position.set(x, height / 2 - 0.5, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  walls.push(mesh);
}

addBlock(0, -40, 90, 6, 4);
addBlock(0, 40, 90, 6, 4);
addBlock(-40, 0, 4, 6, 90);
addBlock(40, 0, 4, 6, 90);
addBlock(-10, -12, 40, 4, 4);
addBlock(10, 12, 40, 4, 4);

function addColumn(x, z) {
  const col = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 6, 12), stoneMaterial);
  col.position.set(x, 2.5, z);
  col.castShadow = true;
  col.receiveShadow = true;
  scene.add(col);
  walls.push(col);
}

addColumn(-18, -18);
addColumn(18, -18);
addColumn(-18, 18);
addColumn(18, 18);

const archHeight = 5;
const arch = new THREE.Mesh(new THREE.TorusGeometry(6.5, 1.1, 16, 60, Math.PI), stoneMaterial);
arch.rotation.x = Math.PI / 2;
arch.position.set(0, archHeight - 0.1, -26);
arch.castShadow = true;
arch.receiveShadow = true;
scene.add(arch);
addBlock(-5.8, -26, 3.5, 5.5, 3.5);
addBlock(5.8, -26, 3.5, 5.5, 3.5);

function addRubble(x, z) {
  const group = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const size = 0.6 + Math.random() * 0.8;
    const stone = new THREE.Mesh(new THREE.BoxGeometry(size, size * 0.5, size), new THREE.MeshStandardMaterial({ color: 0x6d593d, roughness: 0.9, metalness: 0.02 }));
    stone.position.set((Math.random() - 0.5) * 2, 0.2 + i * 0.16, (Math.random() - 0.5) * 2);
    stone.rotation.y = Math.random() * Math.PI;
    stone.castShadow = true;
    stone.receiveShadow = true;
    group.add(stone);
  }
  group.position.set(x, 0, z);
  scene.add(group);
  walls.push(...group.children);
}
addRubble(-20, 10);
addRubble(22, -8);
addRubble(8, 22);

const mossMaterial = new THREE.MeshStandardMaterial({ color: 0x5d6c31, roughness: 0.96, metalness: 0.02 });
for (const pos of [{ x: 18, z: 10 }, { x: -9, z: 5 }, { x: 6, z: -14 }]) {
  const patch = new THREE.Mesh(new THREE.CircleGeometry(4, 18), mossMaterial);
  patch.rotation.x = -Math.PI / 2;
  patch.position.set(pos.x, 0.01, pos.z);
  scene.add(patch);
}

let currentRound = 0;
let enemiesRemaining = 0;
let score = 0;
let waveActive = false;
let waveDelayTimer = 0;
let gameOver = false;
let prevRound = -1;
let prevEnemies = -1;
let prevScore = -1;
let prevGold = -1;
let prevHealth = -1;
const WAVE_DELAY_SECONDS = 5; // Time between waves
const ENEMY_MIN_SCALE_FACTOR = 0.5; // Minimum scale factor for enemies based on health

const waves = [
  { numEnemies: 3, baseHealth: 80, healthVariance: 20, baseSpeed: 2.5, speedVariance: 0.5, spawnRadius: 20, color: 0xff4444, scale: 1 },
  { numEnemies: 5, baseHealth: 100, healthVariance: 30, baseSpeed: 3, speedVariance: 1, spawnRadius: 25, color: 0xff4444, scale: 1 },
  { numEnemies: 7, baseHealth: 120, healthVariance: 40, baseSpeed: 3.5, speedVariance: 1.5, spawnRadius: 30, color: 0xff4444, scale: 1 },
  { numEnemies: 10, baseHealth: 150, healthVariance: 50, baseSpeed: 4, speedVariance: 2, spawnRadius: 35, color: 0xff4444, scale: 1 },
  { numEnemies: 1, baseHealth: 1000, healthVariance: 0, baseSpeed: 2, speedVariance: 0, spawnRadius: 10, color: 0xaa00ff, scale: 4, emissiveColor: 0xff88ff }, // BOSS ROUND
  // Add more waves as desired
];

function createEndlessWave(roundNumber) {
  const extra = roundNumber - waves.length;
  const enemyCount = Math.max(3, 3 + extra * 2);
  const baseHealth = 80 + extra * 45;
  const healthVariance = 20 + extra * 12;
  const baseSpeed = 2.5 + extra * 0.35;
  const speedVariance = 0.5 + extra * 0.2;
  const spawnRadius = 20 + extra * 3.5;

  return {
    numEnemies: enemyCount,
    baseHealth,
    healthVariance,
    baseSpeed,
    speedVariance,
    spawnRadius,
    color: 0xff4444,
    scale: 1,
  };
}

const hudPanel = document.createElement('div');
hudPanel.id = 'hudPanel';
hudPanel.style.position = 'absolute';
hudPanel.style.top = '12px';
hudPanel.style.left = '12px';
hudPanel.style.zIndex = '10';
hudPanel.style.display = 'grid';
hudPanel.style.gap = '10px';
hudPanel.style.padding = '16px';
hudPanel.style.background = 'rgba(6, 6, 25, 0.92)';
hudPanel.style.border = '1px solid rgba(68, 212, 255, 0.35)';
hudPanel.style.borderRadius = '18px';
hudPanel.style.backdropFilter = 'blur(12px)';
hudPanel.style.boxShadow = '0 0 30px rgba(68, 212, 255, 0.16)';
document.body.appendChild(hudPanel);

const roundDisplay = document.createElement('div');
roundDisplay.id = 'roundDisplay';
roundDisplay.className = 'hud-item';
document.body.appendChild(roundDisplay);
hudPanel.appendChild(roundDisplay);

const enemiesDisplay = document.createElement('div');
enemiesDisplay.id = 'enemiesDisplay';
enemiesDisplay.className = 'hud-item';
document.body.appendChild(enemiesDisplay);
hudPanel.appendChild(enemiesDisplay);

const scoreDisplay = document.createElement('div');
scoreDisplay.id = 'scoreDisplay';
scoreDisplay.className = 'hud-item';
document.body.appendChild(scoreDisplay);
hudPanel.appendChild(scoreDisplay);

const goldDisplay = document.createElement('div');
goldDisplay.id = 'goldDisplay';
goldDisplay.className = 'hud-item';
document.body.appendChild(goldDisplay);
hudPanel.appendChild(goldDisplay);

const shopPromptDisplay = document.createElement('div');
shopPromptDisplay.id = 'shopPromptDisplay';
shopPromptDisplay.style.position = 'absolute';
shopPromptDisplay.style.top = '160px';
shopPromptDisplay.style.left = '10px';
shopPromptDisplay.style.color = '#fff3b0';
shopPromptDisplay.style.fontFamily = 'monospace';
shopPromptDisplay.style.fontSize = '16px';
shopPromptDisplay.style.pointerEvents = 'none';
document.body.appendChild(shopPromptDisplay);

const playerHealthDisplay = document.createElement('div');
playerHealthDisplay.id = 'playerHealthDisplay';
playerHealthDisplay.className = 'hud-item player-health';
document.body.appendChild(playerHealthDisplay);
hudPanel.appendChild(playerHealthDisplay);

function animateHudChange(element, effectClass = 'pulse') {
  element.classList.remove(effectClass);
  void element.offsetWidth;
  element.classList.add(effectClass);
  window.setTimeout(() => element.classList.remove(effectClass), 500);
}

function updateGameUI() {
  if (currentRound !== prevRound) {
    animateHudChange(roundDisplay);
    prevRound = currentRound;
  }
  if (enemiesRemaining !== prevEnemies) {
    animateHudChange(enemiesDisplay);
    prevEnemies = enemiesRemaining;
  }
  if (score !== prevScore) {
    animateHudChange(scoreDisplay);
    prevScore = score;
  }
  if (goldCount !== prevGold) {
    animateHudChange(goldDisplay, 'gold-pulse');
    prevGold = goldCount;
  }

  const currentHealth = Math.max(0, Math.min(player.maxHealth, player.health));
  if (currentHealth !== prevHealth) {
    animateHudChange(playerHealthDisplay);
    prevHealth = currentHealth;
  }

  roundDisplay.textContent = `Round: ${currentRound}`;
  enemiesDisplay.textContent = `Enemies: ${enemiesRemaining}`;
  scoreDisplay.textContent = `Cubotics: ${formatCubotics(score)}`;
  goldDisplay.textContent = `Gold: ${goldCount}`;
  playerHealthDisplay.textContent = `HP: ${player.health}/${player.maxHealth}`;
  const healthPercent = Math.max(0, Math.min(100, (player.health / player.maxHealth) * 100));
  playerHealthDisplay.style.setProperty('--hp-percent', `${healthPercent}%`);
  playerHealthDisplay.classList.toggle('danger', healthPercent <= 25);
  document.body.classList.toggle('critical-hp', healthPercent <= 25);
}

const shopState = {
  open: false,
  position: new THREE.Vector3(0, 0, 24),
  radius: 4,
};

const shopOverlay = document.createElement('div');
shopOverlay.id = 'shopOverlay';
shopOverlay.style.position = 'absolute';
shopOverlay.style.top = '50%';
shopOverlay.style.left = '50%';
shopOverlay.style.transform = 'translate(-50%, -50%)';
shopOverlay.style.minWidth = '320px';
shopOverlay.style.background = 'rgba(20, 16, 10, 0.94)';
shopOverlay.style.border = '1px solid rgba(255, 215, 0, 0.6)';
shopOverlay.style.borderRadius = '14px';
shopOverlay.style.padding = '18px';
shopOverlay.style.color = '#f8e7b6';
shopOverlay.style.fontFamily = 'monospace';
shopOverlay.style.fontSize = '16px';
shopOverlay.style.display = 'none';
shopOverlay.style.zIndex = '20';
shopOverlay.style.boxShadow = '0 0 36px rgba(255, 215, 0, 0.2)';
document.body.appendChild(shopOverlay);

const shopTitle = document.createElement('div');
shopTitle.textContent = 'Shop';
shopTitle.style.fontSize = '20px';
shopTitle.style.marginBottom = '10px';
shopOverlay.appendChild(shopTitle);

const shopMessage = document.createElement('div');
shopMessage.style.minHeight = '22px';
shopMessage.style.marginBottom = '12px';
shopMessage.style.color = '#ffdb76';
shopOverlay.appendChild(shopMessage);

const shopItems = [
  { id: 'health', label: 'Max Health +20', cost: 10, buy() { player.maxHealth += 20; player.health = Math.min(player.health + 20, player.maxHealth); } },
  { id: 'speed', label: 'Move Speed +1', cost: 15, buy() { player.speed += 1; } },
  { id: 'damage', label: 'Attack Damage +10', cost: 20, buy() { player.attackDamage += 10; } },
  { id: 'jump', label: 'Jump Height +2', cost: 12, buy() { player.jumpSpeed += 2; } },
  { id: 'heal', label: 'Heal Fully', cost: 5, buy() { player.health = player.maxHealth; } },
];

shopItems.forEach((item) => {
  const button = document.createElement('button');
  button.textContent = `${item.label} — ${item.cost} gold`;
  button.style.display = 'block';
  button.style.width = '100%';
  button.style.marginBottom = '10px';
  button.style.padding = '10px';
  button.style.border = '1px solid rgba(255, 215, 0, 0.4)';
  button.style.background = 'rgba(45, 35, 18, 0.97)';
  button.style.color = '#ffe8a0';
  button.style.cursor = 'pointer';
  button.style.fontFamily = 'monospace';
  button.style.fontSize = '14px';
  button.addEventListener('click', () => {
    if (goldCount >= item.cost) {
      goldCount -= item.cost;
      item.buy();
      shopMessage.textContent = `Purchased ${item.label}.`;
      updateGameUI();
    } else {
      shopMessage.textContent = `Not enough gold for ${item.label}.`;
    }
  });
  shopOverlay.appendChild(button);
});

const shopCloseButton = document.createElement('button');
shopCloseButton.textContent = 'Close Shop';
shopCloseButton.style.display = 'block';
shopCloseButton.style.width = '100%';
shopCloseButton.style.padding = '10px';
shopCloseButton.style.border = '1px solid rgba(255, 255, 255, 0.2)';
shopCloseButton.style.background = 'rgba(255, 255, 255, 0.08)';
shopCloseButton.style.color = '#fff';
shopCloseButton.style.cursor = 'pointer';
shopCloseButton.style.marginTop = '8px';
shopCloseButton.addEventListener('click', () => toggleShop(false));
shopOverlay.appendChild(shopCloseButton);

function toggleShop(open) {
  shopState.open = open;
  shopOverlay.style.display = open ? 'block' : 'none';
  shopPromptDisplay.style.display = open ? 'none' : 'block';
  shopMessage.textContent = '';
}

function isPlayerNearShop() {
  return player.position.distanceTo(shopState.position) < shopState.radius;
}

function updateShopPrompt() {
  if (shopState.open) {
    shopPromptDisplay.textContent = '';
    return;
  }
  shopPromptDisplay.textContent = isPlayerNearShop() ? 'Press E to open the shop' : '';
}

function addShopDecoration() {
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 0.6, 24),
    new THREE.MeshStandardMaterial({ color: 0x42321d, roughness: 0.9, metalness: 0.15 })
  );
  base.position.set(shopState.position.x, 0.3, shopState.position.z);
  base.receiveShadow = true;
  scene.add(base);

  const stand = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.2, 1.6),
    new THREE.MeshStandardMaterial({ color: 0x593d21, roughness: 0.7, metalness: 0.08 })
  );
  stand.position.set(shopState.position.x, 1.0, shopState.position.z);
  stand.castShadow = true;
  stand.receiveShadow = true;
  scene.add(stand);

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 1, 0.2),
    new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0x3a2500, roughness: 0.4, metalness: 0.9 })
  );
  sign.position.set(shopState.position.x, 2.1, shopState.position.z);
  scene.add(sign);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.7, 0.18, 16, 30),
    goldRingMaterial
  );
  ring.position.set(shopState.position.x, 2.8, shopState.position.z);
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);
}

function startNextWave() {
  currentRound++;
  const wave = currentRound <= waves.length ? waves[currentRound - 1] : createEndlessWave(currentRound);
  if (currentRound > waves.length) {
    console.log(`Entering endless mode at round ${currentRound}.`);
    status.textContent = `Endless mode: Round ${currentRound}`;
  }

  const necromancerChance = currentRound <= 4 ? 0.25 : 0.5;
  const shouldSpawnNecromancer = Math.random() < necromancerChance;
  let necromancerSpawned = false;

  enemiesRemaining = wave.numEnemies;
  waveActive = true;
  console.log(`Starting Wave ${currentRound} with ${wave.numEnemies} enemies.`);

  for (let i = 0; i < wave.numEnemies; i++) {
    const health = wave.baseHealth + (Math.random() - 0.5) * 2 * wave.healthVariance;
    const speed = wave.baseSpeed + (Math.random() - 0.5) * 2 * wave.speedVariance;
    const emissiveColor = wave.emissiveColor || 0x000000;
    const isBossRound = currentRound === waves.length;
    let enemyType = 'normal';
    if (isBossRound) {
      enemyType = 'boss';
    } else if (shouldSpawnNecromancer && !necromancerSpawned && i === 0) {
      enemyType = 'necromancer';
      necromancerSpawned = true;
    } else if (i % 5 === 0) {
      enemyType = 'heavy';
    } else if (i % 5 === 2) {
      enemyType = 'light';
    }

    let spawnX, spawnZ;
    let attempts = 0;
    const MAX_SPAWN_ATTEMPTS = 50; // Prevent infinite loops if no valid spawn point exists

    do {
      spawnX = (Math.random() - 0.5) * wave.spawnRadius * 2;
      spawnZ = (Math.random() - 0.5) * wave.spawnRadius * 2;

      attempts++;
      if (attempts > MAX_SPAWN_ATTEMPTS) {
        console.warn("Could not find a valid spawn point for enemy after multiple attempts. Spawning at (0,0).");
        spawnX = 0;
        spawnZ = 0;
        break; // Exit loop to prevent infinite attempts
      }

    } while (
      player.position.distanceTo(new THREE.Vector3(spawnX, player.position.y, spawnZ)) < 15 || // Ensure not too close to player
      checkEnemyCollisionAtPosition(spawnX, 1.3, spawnZ, wave.scale) // Check collision with walls
    );


    createEnemy(spawnX, spawnZ, health, speed, wave.color, wave.scale, emissiveColor, enemyType);
  }
  updateGameUI();
}

const enemies = [];
const fragments = [];
const projectiles = [];
const golds = [];
let goldCount = 0;

const goldRingMaterial = new THREE.MeshStandardMaterial({
  color: 0x7ff8ff,
  emissive: 0x4ae5ff,
  emissiveIntensity: 1.8,
  roughness: 0.06,
  metalness: 0.92,
});
const goldCoreMaterial = new THREE.MeshStandardMaterial({
  color: 0xe8ffff,
  emissive: 0x8effff,
  emissiveIntensity: 2.6,
  roughness: 0.15,
  metalness: 0.8,
  transparent: true,
  opacity: 0.96,
});
const goldGlowMaterial = new THREE.MeshBasicMaterial({
  color: 0x5ff8ff,
  transparent: true,
  opacity: 0.22,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

function createGold(x, z, amount = 1) {
  const group = new THREE.Group();

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.12, 16, 40), goldRingMaterial);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  const core = new THREE.Mesh(new THREE.SphereGeometry(0.26, 18, 18), goldCoreMaterial);
  core.position.y = 0;
  group.add(core);

  const glow = new THREE.Mesh(new THREE.RingGeometry(0.82, 1.18, 48), goldGlowMaterial);
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.01;
  group.add(glow);

  group.position.set(x, 0.8, z);
  group.userData.amount = amount;
  group.userData.spinSpeed = 1.5 + Math.random() * 1.5;
  group.userData.pulseOffset = Math.random() * Math.PI * 2;
  group.userData.pulseGlow = glow;
  group.userData.coreMesh = core;
  scene.add(group);
  golds.push(group);
  return group;
}

addShopDecoration();

function collectGold(gold) {
  goldCount += gold.userData.amount;
  score += gold.userData.amount * 5;
  scene.remove(gold);
  const index = golds.indexOf(gold);
  if (index !== -1) golds.splice(index, 1);
  updateGameUI();
  animateHudChange(goldDisplay, 'gold-pulse');
}

for (const pos of [
  { x: -20, z: 20 },
  { x: 20, z: 20 },
  { x: -20, z: -20 },
  { x: 20, z: -20 },
  { x: -12, z: 18 },
  { x: 12, z: 18 },
  { x: -12, z: -18 },
  { x: 12, z: -18 },
]) {
  createGold(pos.x, pos.z, 3);
}

function createEnemyScars(enemy) {
  const scarGroups = [];
  const scarPositions = [
    { x: 0.16, y: 0.06, z: 0.51, rotX: 0, rotY: 0, rotZ: 0.65, chunkX: 0.05, chunkY: 0.01 },
    { x: -0.14, y: 0.08, z: 0.51, rotX: 0, rotY: 0, rotZ: -0.4, chunkX: -0.05, chunkY: -0.01 },
    { x: 0.42, y: -0.02, z: 0.28, rotX: 0, rotY: 1.1, rotZ: 0, chunkX: 0.04, chunkY: 0.02 },
    { x: -0.38, y: -0.08, z: 0.24, rotX: 0, rotY: -1.0, rotZ: 0, chunkX: -0.04, chunkY: -0.01 },
    { x: 0.12, y: -0.55, z: 0.22, rotX: 0.7, rotY: 0, rotZ: 0.15, chunkX: 0.02, chunkY: -0.03 },
  ];

  scarPositions.forEach((entry) => {
    const scarGroup = new THREE.Group();

    const woundGeom = new THREE.BoxGeometry(0.16, 0.08, 0.04);
    const woundMat = new THREE.MeshStandardMaterial({
      color: 0x3f1717,
      emissive: 0x200606,
      transparent: true,
      opacity: 0.74,
      depthWrite: false,
      roughness: 0.9,
      metalness: 0,
    });
    const wound = new THREE.Mesh(woundGeom, woundMat);
    wound.position.set(0, 0, 0.02);
    scarGroup.add(wound);

    const chunkGeom = new THREE.BoxGeometry(0.07, 0.05, 0.03);
    const chunkMat = new THREE.MeshStandardMaterial({
      color: 0x1c0909,
      emissive: 0x110000,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      roughness: 1,
      metalness: 0,
    });
    const chunk = new THREE.Mesh(chunkGeom, chunkMat);
    chunk.position.set(entry.chunkX, entry.chunkY, 0.03);
    scarGroup.add(chunk);

    scarGroup.position.set(entry.x, entry.y, entry.z);
    scarGroup.rotation.set(entry.rotX, entry.rotY, entry.rotZ);
    enemy.add(scarGroup);
    scarGroups.push(scarGroup);
  });

  enemy.userData.scarMeshes = scarGroups;
}

function updateEnemyScars(enemy) {
  if (!enemy?.userData?.scarMeshes?.length) return;

  const healthRatio = Math.max(0, Math.min(1, enemy.userData.health / enemy.userData.maxHealth));
  const damageLevel = 1 - healthRatio;
  const intensity = 0.24 + damageLevel * 0.68;
  const scale = 0.75 + damageLevel * 0.35;

  enemy.userData.scarMeshes.forEach((scarGroup) => {
    scarGroup.scale.setScalar(scale);

    scarGroup.children.forEach((child) => {
      if (child.material) {
        child.material.opacity = intensity;
      }
    });
  });
}

function getEnemyVariantConfig(type, color, emissiveColor) {
  switch (type) {
    case 'heavy':
      return {
        bodyGeometry: new THREE.BoxGeometry(1.25, 1.4, 1.15),
        bodyColor: 0x5f4938,
        bodyEmissive: 0x170c05,
        bodyEmissiveIntensity: 0.35,
        armGeometry: new THREE.BoxGeometry(0.34, 0.95, 0.32),
        armColor: 0x4d3c2d,
        armEmissive: 0x140a04,
        armEmissiveIntensity: 0.2,
        legGeometry: new THREE.BoxGeometry(0.36, 1.0, 0.34),
        legColor: 0x292421,
        eyeColor: 0x040404,
        scaleMultiplier: 1.14,
        healthMultiplier: 1.9,
        speedMultiplier: 0.75,
      };
    case 'light':
      return {
        bodyGeometry: new THREE.BoxGeometry(0.76, 0.84, 0.82),
        bodyColor: 0x7edbff,
        bodyEmissive: 0x0e2c47,
        bodyEmissiveIntensity: 0.45,
        armGeometry: new THREE.BoxGeometry(0.2, 0.64, 0.2),
        armColor: 0x6bc6f0,
        armEmissive: 0x0b2433,
        armEmissiveIntensity: 0.25,
        legGeometry: new THREE.BoxGeometry(0.24, 0.72, 0.24),
        legColor: 0x1f2b36,
        eyeColor: 0xf9ffff,
        scaleMultiplier: 0.82,
        healthMultiplier: 0.7,
        speedMultiplier: 1.25,
      };
    case 'necromancer':
      return {
        bodyGeometry: new THREE.BoxGeometry(0.95, 1.1, 0.95),
        bodyColor: 0x3f2a68,
        bodyEmissive: 0x2d0949,
        bodyEmissiveIntensity: 0.8,
        armGeometry: new THREE.BoxGeometry(0.22, 0.72, 0.22),
        armColor: 0x4f3b7d,
        armEmissive: 0x2d0949,
        armEmissiveIntensity: 0.5,
        legGeometry: new THREE.BoxGeometry(0.28, 0.8, 0.28),
        legColor: 0x20182d,
        eyeColor: 0xf4d7ff,
        scaleMultiplier: 1,
        healthMultiplier: 1.5,
        speedMultiplier: 0.9,
      };
    case 'boss':
      return {
        bodyGeometry: new THREE.BoxGeometry(1, 1, 1),
        bodyColor: color,
        bodyEmissive: emissiveColor,
        bodyEmissiveIntensity: 0.75,
        armGeometry: new THREE.BoxGeometry(0.25, 0.7, 0.25),
        armColor: color,
        armEmissive: emissiveColor,
        armEmissiveIntensity: 0.55,
        legGeometry: new THREE.BoxGeometry(0.3, 0.8, 0.3),
        legColor: 0x333333,
        eyeColor: 0x000000,
        scaleMultiplier: 1,
        healthMultiplier: 1,
        speedMultiplier: 1,
      };
    default:
      return {
        bodyGeometry: new THREE.BoxGeometry(1, 1, 1),
        bodyColor: color,
        bodyEmissive: emissiveColor,
        bodyEmissiveIntensity: emissiveColor !== 0x000000 ? 0.75 : 0,
        armGeometry: new THREE.BoxGeometry(0.25, 0.7, 0.25),
        armColor: color,
        armEmissive: emissiveColor,
        armEmissiveIntensity: emissiveColor !== 0x000000 ? 0.55 : 0,
        legGeometry: new THREE.BoxGeometry(0.3, 0.8, 0.3),
        legColor: 0x333333,
        eyeColor: 0x000000,
        scaleMultiplier: 1,
        healthMultiplier: 1,
        speedMultiplier: 1,
      };
  }
}

function createHeavyRamMarker(enemy) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0.08, 0),
    new THREE.Vector3(6, 0.08, 0),
  ]);
  const material = new THREE.LineBasicMaterial({
    color: 0xff3b30,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });

  const marker = new THREE.Line(geometry, material);
  marker.visible = false;
  enemy.add(marker);
  enemy.userData.ramMarker = marker;
}

function updateHeavyRamMarker(enemy) {
  const marker = enemy.userData.ramMarker;
  if (!marker) return;

  const activeState = enemy.userData.ramState === 'windup' || enemy.userData.ramState === 'charge';
  marker.visible = activeState;
  if (!activeState) return;

  const dir = enemy.userData.ramDirection ? enemy.userData.ramDirection.clone() : new THREE.Vector3(0, 0, -1);
  if (dir.lengthSq() < 0.001) dir.set(0, 0, -1);
  dir.y = 0; dir.normalize();

  const range = Math.max(8, Math.min(20, enemy.position.distanceTo(player.position)));
  marker.geometry.setFromPoints([
    new THREE.Vector3(0, 0.08, 0),
    new THREE.Vector3(range, 0.08, 0),
  ]);
  marker.rotation.set(0, Math.atan2(dir.x, dir.z), 0);
  marker.material.opacity = enemy.userData.ramState === 'charge' ? 1 : 0.82;
  marker.material.color.setHex(enemy.userData.ramState === 'charge' ? 0xff2d2d : 0xff8a5b);
}

function handleHeavyRamAttack(enemy, delta, currentScale) {
  if (enemy.userData.variant !== 'heavy') return false;

  enemy.userData.ramCooldown = Math.max(0, (enemy.userData.ramCooldown || 0) - delta);

  if (enemy.userData.ramState === 'windup') {
    enemy.userData.ramWindup = (enemy.userData.ramWindup || 0) - delta;
    updateHeavyRamMarker(enemy);
    const swing = Math.sin(clock.elapsedTime * 12) * 1.1;
    enemy.userData.leftArm.rotation.x = -1.4 + swing * 0.35;
    enemy.userData.rightArm.rotation.x = 1.4 - swing * 0.35;
    if (enemy.userData.ramWindup <= 0) {
      enemy.userData.ramState = 'charge';
      enemy.userData.ramChargeTime = 0.72;
    }
    return true;
  }

  if (enemy.userData.ramState === 'charge') {
    enemy.userData.ramChargeTime = (enemy.userData.ramChargeTime || 0.72) - delta;
    const chargeDir = enemy.userData.ramDirection ? enemy.userData.ramDirection.clone() : new THREE.Vector3(0, 0, -1);
    chargeDir.y = 0;
    chargeDir.normalize();

    const oldPos = enemy.position.clone();
    const movement = chargeDir.clone().multiplyScalar(13 * delta);

    enemy.position.x += movement.x;
    if (checkEnemyCollision(enemy)) {
      enemy.position.x = oldPos.x;
      enemy.userData.ramState = 'cooldown';
      enemy.userData.ramCooldown = 2.8;
      updateHeavyRamMarker(enemy);
      return true;
    }

    enemy.position.z += movement.z;
    if (checkEnemyCollision(enemy)) {
      enemy.position.z = oldPos.z;
      enemy.userData.ramState = 'cooldown';
      enemy.userData.ramCooldown = 2.8;
      updateHeavyRamMarker(enemy);
      return true;
    }

    enemy.lookAt(enemy.position.x + chargeDir.x, enemy.position.y, enemy.position.z + chargeDir.z);

    if (enemy.position.distanceTo(player.position) < 1.5 * currentScale + 0.7) {
      damagePlayer(18);
      player.damageCooldown = 1.1;
      enemy.userData.ramState = 'cooldown';
      enemy.userData.ramCooldown = 3.2;
      updateHeavyRamMarker(enemy);
      return true;
    }

    if (enemy.userData.ramChargeTime <= 0) {
      enemy.userData.ramState = 'cooldown';
      enemy.userData.ramCooldown = 3.0;
    }

    updateHeavyRamMarker(enemy);
    return true;
  }

  if (enemy.userData.ramState === 'cooldown') {
    updateHeavyRamMarker(enemy);
    if (enemy.userData.ramCooldown <= 0) {
      enemy.userData.ramState = 'idle';
      if (enemy.userData.ramMarker) enemy.userData.ramMarker.visible = false;
    }
    return true;
  }

  const toPlayer = new THREE.Vector3().subVectors(player.position, enemy.position);
  toPlayer.y = 0;
  const distance = toPlayer.length();
  if (distance <= 15 && enemy.userData.ramCooldown <= 0) {
    enemy.userData.ramState = 'windup';
    enemy.userData.ramWindup = 1.05;
    enemy.userData.ramDirection = toPlayer.normalize();
    enemy.userData.ramCooldown = 3.7;
    updateHeavyRamMarker(enemy);
    return true;
  }

  return false;
}

function createEnemy(x, z, health = 100, speed = 3, color = 0xff4444, scale = 1, emissiveColor = 0x000000, type = 'normal') {
  const group = new THREE.Group();
  const variant = getEnemyVariantConfig(type, color, emissiveColor);
  const scaledHealth = health * (variant.healthMultiplier || 1);
  const scaledSpeed = speed * (variant.speedMultiplier || 1);
  const scaledBaseScale = scale * (variant.scaleMultiplier || 1);

  // Body
  const bodyMat = new THREE.MeshStandardMaterial({
    color: variant.bodyColor,
    emissive: variant.bodyEmissive,
    emissiveIntensity: variant.bodyEmissiveIntensity || 0,
  });
  const body = new THREE.Mesh(variant.bodyGeometry, bodyMat);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Arms
  const armMat = new THREE.MeshStandardMaterial({
    color: variant.armColor,
    emissive: variant.armEmissive,
    emissiveIntensity: variant.armEmissiveIntensity || 0,
  });
  const leftArm = new THREE.Mesh(variant.armGeometry, armMat);
  leftArm.position.set(type === 'heavy' ? -0.75 : type === 'light' ? -0.5 : type === 'necromancer' ? -0.55 : -0.65, 0, 0);
  leftArm.castShadow = true;
  group.add(leftArm);
  const rightArm = new THREE.Mesh(variant.armGeometry, armMat);
  rightArm.position.set(type === 'heavy' ? 0.75 : type === 'light' ? 0.5 : type === 'necromancer' ? 0.55 : 0.65, 0, 0);
  rightArm.castShadow = true;
  group.add(rightArm);

  // Legs
  const legMat = new THREE.MeshStandardMaterial({ color: variant.legColor });
  const leftLeg = new THREE.Mesh(variant.legGeometry, legMat);
  leftLeg.position.set(type === 'heavy' ? -0.35 : type === 'light' ? -0.2 : type === 'necromancer' ? -0.26 : -0.3, -0.9, 0);
  leftLeg.castShadow = true;
  group.add(leftLeg);
  const rightLeg = new THREE.Mesh(variant.legGeometry, legMat);
  rightLeg.position.set(type === 'heavy' ? 0.35 : type === 'light' ? 0.2 : type === 'necromancer' ? 0.26 : 0.3, -0.9, 0);
  rightLeg.castShadow = true;
  group.add(rightLeg);

  if (type === 'necromancer') {
    const staffGroup = new THREE.Group();
    const staffMat = new THREE.MeshStandardMaterial({ color: 0x8b7ad9, emissive: 0x371a65, emissiveIntensity: 0.5 });
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.8, 10), staffMat);
    staff.rotation.z = Math.PI / 2 * 0.12;
    staff.position.set(0.7, 0.25, 0.1);
    staffGroup.add(staff);

    const gemMat = new THREE.MeshStandardMaterial({ color: 0xff9bf0, emissive: 0xff4ed8, emissiveIntensity: 1.2 });
    const gem = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), gemMat);
    gem.position.set(0.7, 1.3, 0.1);
    staffGroup.add(gem);

    const rune = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 8, 20), new THREE.MeshBasicMaterial({ color: 0xff8af1, transparent: true, opacity: 0.8 }));
    rune.rotation.x = Math.PI / 2;
    rune.position.set(0.7, 1.3, 0.1);
    staffGroup.add(rune);
    staffGroup.userData.rune = rune;
    group.add(staffGroup);
    group.userData.staff = staffGroup;
  }

  // Face
  const eyeGeo = new THREE.BoxGeometry(0.2, 0.2, 0.1);
  const eyeMat = new THREE.MeshStandardMaterial({ color: variant.eyeColor });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(type === 'light' ? -0.18 : type === 'necromancer' ? -0.2 : -0.25, 0.2, 0.51);
  group.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(type === 'light' ? 0.18 : type === 'necromancer' ? 0.2 : 0.25, 0.2, 0.51);
  group.add(rightEye);
  const mouthGeo = new THREE.BoxGeometry(type === 'light' ? 0.34 : type === 'necromancer' ? 0.42 : 0.5, 0.1, 0.1);
  const mouth = new THREE.Mesh(mouthGeo, eyeMat);
  mouth.position.set(0, -0.25, 0.51);
  group.add(mouth);

  // Health Bar
  const healthBarGroup = new THREE.Group();
  healthBarGroup.position.set(0, 1, 0); // Position above the body
  scene.add(healthBarGroup);
  healthBarGroup.userData.owner = group;

  const hbBgGeo = new THREE.PlaneGeometry(1, 0.15);
  const hbBgMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
  const hbBg = new THREE.Mesh(hbBgGeo, hbBgMat);
  healthBarGroup.add(hbBg);

  const hbFgGeo = new THREE.PlaneGeometry(1, 0.15);
  const hbFgMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const hbFg = new THREE.Mesh(hbFgGeo, hbFgMat);
  hbFg.position.z = 0.01; // Slightly in front of the background
  healthBarGroup.add(hbFg);

  group.userData.health = scaledHealth;
  group.userData.maxHealth = scaledHealth;
  group.userData.speed = scaledSpeed;
  group.userData.baseScale = scaledBaseScale;
  group.userData.variant = type;
  group.userData.color = color;
  group.userData.healthBar = hbFg;
  group.userData.healthBarContainer = healthBarGroup;
  group.userData.knockbackForce = 0;
  group.userData.knockbackDir = new THREE.Vector3();
  group.userData.leftArm = leftArm;
  group.userData.rightArm = rightArm;
  group.userData.leftLeg = leftLeg;
  group.userData.rightLeg = rightLeg;
  group.userData.emissiveColor = emissiveColor;
  group.userData.emissiveOrigIntensity = bodyMat.emissiveIntensity || 0;
  group.userData.summonTriggered = false;
  group.userData.summonTimer = 0;
  group.userData.summonCooldown = 0;
  group.userData.projectileCooldown = 1.2;

  createEnemyScars(group);
  updateEnemyScars(group);

  group.position.set(x, 1.3, z);
  scene.add(group);

  // Create and add a BoxHelper to visualize the enemy's hitbox
  const helper = new THREE.BoxHelper(group, 0xff0000);
  scene.add(helper);
  group.userData.helper = helper;

  enemies.push(group);
  return group;
}

function spawnBossProjectile(sourcePos, color, sizeScale = 1, variant = 'boss') {
  if (variant === 'heavy') return;
  const baseSize = variant === 'heavy' ? 0.45 : 0.6;
  const size = baseSize * Math.max(0.8, sizeScale);
  const pGeo = new THREE.BoxGeometry(size, size, size);
  const pMat = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: variant === 'heavy' ? 0.3 : 0.6 });
  const projectile = new THREE.Mesh(pGeo, pMat);
  projectile.position.copy(sourcePos);
  projectile.position.y += 1.2;

  const dir = new THREE.Vector3().subVectors(player.position, projectile.position);
  if (dir.lengthSq() < 0.0001) {
    dir.set(0, 0, -1);
  } else {
    dir.normalize();
  }

  projectile.userData.velocity = dir.clone().multiplyScalar(variant === 'heavy' ? 7.5 : 10 + 4 * Math.max(0.5, sizeScale));
  const spawnOffset = Math.max(0.4, size * 0.8) + 0.2;
  projectile.position.addScaledVector(dir, spawnOffset);
  projectile.userData.life = variant === 'heavy' ? 1.2 : 5.0;
  projectile.userData.damage = Math.ceil((variant === 'heavy' ? 8 : 12) * Math.max(1, sizeScale));
  projectile.userData.reflected = false;
  projectile.userData.variant = variant;

  scene.add(projectile);
  projectiles.push(projectile);
}

function summonNecromancerMinions(enemy) {
  if (!enemy || enemy.userData.summonTriggered) return;

  enemy.userData.summonTriggered = true;
  enemy.userData.summonTimer = 1.5;
  enemy.userData.projectileCooldown = 1.2;

  const summonRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.2, 0.08, 10, 36),
    new THREE.MeshBasicMaterial({ color: 0xff9bf0, transparent: true, opacity: 0.9 })
  );
  summonRing.rotation.x = Math.PI / 2;
  summonRing.position.set(enemy.position.x, 0.7, enemy.position.z);
  summonRing.userData.life = 1.5;
  scene.add(summonRing);
  enemy.userData.summonRing = summonRing;

  const summonPositions = [
    { x: -1.8, z: -1.2 },
    { x: 1.8, z: 1.2 },
  ];

  summonPositions.forEach((offset) => {
    const spawnX = enemy.position.x + offset.x;
    const spawnZ = enemy.position.z + offset.z;
    const lightEnemy = createEnemy(spawnX, spawnZ, 60, 3.8, 0x7edbff, 0.82, 0x0e2c47, 'light');
    lightEnemy.userData.isSummoned = true;
    lightEnemy.userData.summoner = enemy;
    lightEnemy.userData.originSpawn = true;
  });
}

function updateNecromancer(enemy, delta) {
  if (enemy.userData.variant !== 'necromancer') return;

  const staff = enemy.userData.staff;
  if (staff) {
    staff.rotation.y += delta * 1.4;
    if (staff.userData.rune) {
      staff.userData.rune.rotation.z += delta * 4.5;
    }
  }

  if (enemy.userData.summonRing) {
    const ring = enemy.userData.summonRing;
    ring.userData.life -= delta;
    const progress = Math.max(0, ring.userData.life / 1.5);
    const currentScale = 1 + (1 - progress) * 1.8;
    ring.scale.setScalar(currentScale);
    ring.material.opacity = Math.max(0, progress * 0.9);
    if (ring.userData.life <= 0) {
      scene.remove(ring);
      enemy.userData.summonRing = null;
    }
  }

  if (!enemy.userData.summonTriggered && enemy.position.distanceTo(player.position) < 18) {
    summonNecromancerMinions(enemy);
  }

  if (enemy.userData.summonTriggered) {
    enemy.userData.summonTimer = Math.max(0, (enemy.userData.summonTimer || 0) - delta);
    enemy.userData.projectileCooldown = Math.max(0, (enemy.userData.projectileCooldown || 1.2) - delta);

    if (enemy.userData.projectileCooldown <= 0) {
      const dir = new THREE.Vector3().subVectors(player.position, enemy.position);
      dir.y = 0;
      if (dir.lengthSq() > 0.0001) dir.normalize();
      const projectilePos = enemy.position.clone().addScaledVector(dir, 1.1);
      projectilePos.y += 1.2;
      const projectile = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.42, 0.42),
        new THREE.MeshStandardMaterial({ color: 0xff6fe8, emissive: 0xff4ccf, emissiveIntensity: 1.3 })
      );
      projectile.position.copy(projectilePos);
      projectile.userData.velocity = dir.clone().multiplyScalar(8.5);
      projectile.userData.life = 4.5;
      projectile.userData.damage = 12;
      projectile.userData.reflected = false;
      projectile.userData.variant = 'necromancer';
      scene.add(projectile);
      projectiles.push(projectile);
      enemy.userData.projectileCooldown = 1.6 + Math.random() * 0.8;
    }
  }
}

function updateEnemyHealthBar(enemy) {
  if (!enemy?.userData?.healthBar) return;

  const healthRatio = Math.max(0, Math.min(1, enemy.userData.health / enemy.userData.maxHealth));
  enemy.userData.healthBar.scale.x = healthRatio;
  updateEnemyScars(enemy);

  const enemyScale = Math.max(0.0001, enemy.scale?.x || 1);
  if (enemy.userData.healthBarContainer) {
    enemy.userData.healthBarContainer.scale.set(1 / enemyScale, 1 / enemyScale, 1 / enemyScale);
    enemy.userData.healthBarContainer.position.set(
      enemy.position.x,
      enemy.position.y + 1.4 + (enemy.userData.baseScale || 1) * 0.1,
      enemy.position.z
    );
  }
}

function damageEnemy(enemy, amount) {
  enemy.userData.health -= amount;
  updateEnemyHealthBar(enemy);

  if (enemy.userData.health <= 0) {
    createExplosion(enemy.position, enemy.userData.color);
    const dropCount = enemy.userData.baseScale > 1 ? 4 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < dropCount; i++) {
      const offsetX = (Math.random() - 0.5) * 2;
      const offsetZ = (Math.random() - 0.5) * 2;
      createGold(enemy.position.x + offsetX, enemy.position.z + offsetZ, 1);
    }
    scene.remove(enemy);
    if (enemy.userData.helper) scene.remove(enemy.userData.helper);
    if (enemy.userData.healthBarContainer) scene.remove(enemy.userData.healthBarContainer);
    if (enemy.userData.ramMarker) scene.remove(enemy.userData.ramMarker);
    
    score += 100;
    enemiesRemaining--;
    if (enemiesRemaining <= 0) waveActive = false;
    updateGameUI();
    return true;
  }
  return false;
}

// Helper function to check if a potential enemy spawn position collides with walls
function checkEnemyCollisionAtPosition(x, y, z, scale) {
  const tempEnemy = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)); // Use a generic box for collision
  tempEnemy.position.set(x, y, z);
  tempEnemy.scale.set(scale, scale, scale); // Apply scale to the temporary enemy
  tempEnemy.updateMatrixWorld(true); // Ensure world matrix is updated for accurate bounding box

  const enemyBox = new THREE.Box3().setFromObject(tempEnemy);
  for (const wall of walls) {
    const box = new THREE.Box3().setFromObject(wall);
    if (enemyBox.intersectsBox(box)) return true;
  }
  return false;
}

function damagePlayer(amount) {
  player.health -= amount;
  if (player.health < 0) player.health = 0;
  if (player.health <= Math.max(25, player.maxHealth * 0.25)) {
    triggerHpFlash();
  }
  updateGameUI();
  
  if (player.health <= 0) {
    gameOver = true;
    persistScore(score);
    showGameOverScreen(score);
    overlay.style.display = 'block';
    if (document.pointerLockElement === renderer.domElement) {
      document.exitPointerLock();
    }
  }
}

function resetGame() {
  gameOver = false;
  restartButton.style.display = 'none';
  applySelectedPerk();
  // Clear enemies from scene and array
  enemies.forEach(enemy => {
    scene.remove(enemy);
    if (enemy.userData.helper) scene.remove(enemy.userData.helper);
    if (enemy.userData.ramMarker) scene.remove(enemy.userData.ramMarker);
  });
  enemies.length = 0;

  // Clear projectiles and fragments from scene and arrays
  projectiles.forEach(p => scene.remove(p));
  projectiles.length = 0;
  fragments.forEach(f => scene.remove(f));
  fragments.length = 0;

  // Reset game state variables
  currentRound = 0;
  enemiesRemaining = 0;
  score = 0;
  waveActive = false;
  waveDelayTimer = 0;
  
  // Reset player state and position
  player.health = player.maxHealth;
  player.position.set(0, 1.8, 30);
  player.velocity.set(0, 0, 0);
  player.yaw = 0;
  player.pitch = 0;
  player.damageCooldown = 0;
  
  updateGameUI();
  updateStatus();
}

function createExplosion(position, color) {
  const fragmentCount = 8;
  for (let i = 0; i < fragmentCount; i++) {
    const size = 0.2 + Math.random() * 0.3;
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshStandardMaterial({ color: color });
    const fragment = new THREE.Mesh(geometry, material);

    fragment.position.copy(position);
    fragment.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 10,
      Math.random() * 8 + 2,
      (Math.random() - 0.5) * 10
    );
    fragment.userData.life = 1.0;
    scene.add(fragment);
    fragments.push(fragment);
  }
}

const player = {
  velocity: new THREE.Vector3(),
  direction: new THREE.Vector3(),
  speed: 8,
  jumpSpeed: 8,
  position: new THREE.Vector3(0, 1.8, 30),
  canJump: false,
  yaw: 0,
  pitch: 0,
  mouseLocked: false,
  health: 100,
  maxHealth: 100,
  attackDamage: 34,
  damageCooldown: 0, // Cooldown for taking damage from enemies
};

const perkModifiers = {
  fortified: { maxHealthBoost: 20 },
  swift: { speedBoost: 1 },
  impact: { damageBoost: 10 },
  aegis: { maxHealthBoost: 35 },
  storm: { speedBoost: 2, jumpBoost: 2 },
  overdrive: { damageBoost: 18 },
};

function getPurchasedPerks() {
  try {
    const raw = JSON.parse(localStorage.getItem('cube_assault_purchased_perks') || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch (error) {
    return [];
  }
}

function applySelectedPerk() {
  const purchased = new Set(getPurchasedPerks());
  const perkId = localStorage.getItem('cube_assault_perk');

  if (!perkId || !purchased.has(perkId)) {
    localStorage.removeItem('cube_assault_perk');
    player.maxHealth = 100;
    player.speed = 8;
    player.attackDamage = 34;
    player.jumpSpeed = 8;
    player.health = player.maxHealth;
    return;
  }

  const mod = perkModifiers[perkId] || { };
  player.maxHealth = 100 + (mod.maxHealthBoost || 0);
  player.speed = 8 + (mod.speedBoost || 0);
  player.attackDamage = 34 + (mod.damageBoost || 0);
  player.jumpSpeed = 8 + (mod.jumpBoost || 0);
  player.health = player.maxHealth;
}

camera.position.copy(player.position);
camera.rotation.order = 'YXZ';
scene.add(camera);

const mixer = new THREE.AnimationMixer(camera);
const gltfLoader = new GLTFLoader();
let playerModel = null;
let attackAction = null;
let idleAction = null;

const modelPath = encodeURI('knife_animated.glb');
gltfLoader.load(
  modelPath,
  (gltf) => {
    playerModel = gltf.scene;
    playerModel.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });

    playerModel.scale.set(0.02, 0.02, 0.02);
    playerModel.position.set(0.25, -0.2, -0.4);
    playerModel.rotation.set(0, Math.PI, 0);
    camera.add(playerModel);

    if (gltf.animations && gltf.animations.length > 0) {
      // Create and play the idle animation from frames 0 to 40.
      const idleClip = THREE.AnimationUtils.subclip(gltf.animations[0], 'idle', 0, 40);
      idleAction = mixer.clipAction(idleClip, playerModel);
      idleAction.play();

      // Create the attack animation from the next 20 frames (40 to 60) 
      // from the full 145-frame sequence.
      const attackClip = THREE.AnimationUtils.subclip(gltf.animations[0], 'attack', 40, 60);
      attackAction = mixer.clipAction(attackClip, playerModel);
      attackAction.setLoop(THREE.LoopOnce);
    }
  },
  undefined,
  (error) => {
    console.error('Failed to load player model:', error);
    status.textContent = 'Error: failed to load arm model';
  }
);

const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  jump: false,
  shift: false,
};

function updateStatus() {
  status.textContent = `Status: ${player.mouseLocked ? 'Camera locked' : 'Click to start'} | Position: ${player.position.x.toFixed(1)}, ${player.position.y.toFixed(1)}, ${player.position.z.toFixed(1)}`;
}

function checkEnemyCollision(enemy) {
  enemy.position.y = 1.3;
  enemy.updateMatrixWorld(true);
  const enemyBox = new THREE.Box3().setFromObject(enemy).expandByScalar(0.08);

  for (const wall of walls) {
    wall.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(wall);
    if (enemyBox.intersectsBox(box)) {
      return true;
    }
  }

  for (const other of enemies) {
    if (other === enemy) continue;
    other.updateMatrixWorld(true);
    const otherBox = new THREE.Box3().setFromObject(other).expandByScalar(0.08);
    if (enemyBox.intersectsBox(otherBox)) {
      return true;
    }
  }

  return false;
}

function collide(position) {
  const radius = 0.5;
  const halfHeight = 0.8;
  const playerBox = new THREE.Box3(
    new THREE.Vector3(position.x - radius, position.y - halfHeight, position.z - radius),
    new THREE.Vector3(position.x + radius, position.y + halfHeight, position.z + radius)
  );
  for (const wall of walls) {
    wall.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(wall);
    if (playerBox.intersectsBox(box)) {
      return true;
    }
  }
  return false;
}



function checkGround() {
  const down = player.position.clone();
  down.y -= 0.6;
  if (down.y <= 0) return true;
  return walls.some((wall) => {
    const box = new THREE.Box3().setFromObject(wall);
    return box.containsPoint(down);
  });
}

function isBlockedForEnemy(enemy, position, radius = 0.9) {
  const groundY = 1.3;
  const enemyBox = new THREE.Box3(
    new THREE.Vector3(position.x - radius, groundY - 1.6, position.z - radius),
    new THREE.Vector3(position.x + radius, groundY + 0.8, position.z + radius)
  );

  for (const wall of walls) {
    wall.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(wall);
    if (enemyBox.intersectsBox(box)) {
      return true;
    }
  }

  for (const other of enemies) {
    if (other === enemy) continue;
    other.updateMatrixWorld(true);
    const otherBox = new THREE.Box3().setFromObject(other).expandByScalar(0.08);
    if (enemyBox.intersectsBox(otherBox)) {
      return true;
    }
  }

  return false;
}

function findAvoidanceDirection(enemy, enemyPos, targetDir, searchAngles = 8) {
  const testDir = targetDir.clone().normalize();
  const right = new THREE.Vector3(-testDir.z, 0, testDir.x).normalize();

  const testPositions = [
    { pos: enemyPos.clone().addScaledVector(testDir, 0.8), weight: 10 },
    { pos: enemyPos.clone().addScaledVector(right, 0.9), weight: 5 },
    { pos: enemyPos.clone().addScaledVector(right, -0.9), weight: 5 },
    { pos: enemyPos.clone().addScaledVector(right, 1.4), weight: 3 },
    { pos: enemyPos.clone().addScaledVector(right, -1.4), weight: 3 },
    { pos: enemyPos.clone().addScaledVector(testDir, 1.4), weight: 2 },
  ];

  for (let angle = 30; angle <= 330; angle += 30) {
    const rad = (angle * Math.PI) / 180;
    const rotDir = new THREE.Vector3(
      testDir.x * Math.cos(rad) - testDir.z * Math.sin(rad),
      0,
      testDir.x * Math.sin(rad) + testDir.z * Math.cos(rad)
    ).normalize();
    testPositions.push({ pos: enemyPos.clone().addScaledVector(rotDir, 1.1), weight: 4 });
  }

  let bestDir = testDir.clone();
  let bestWeight = -Infinity;

  for (const test of testPositions) {
    if (!isBlockedForEnemy(enemy, test.pos, 0.85)) {
      const distToTarget = test.pos.distanceTo(player.position);
      const weight = test.weight - distToTarget * 0.06;
      if (weight > bestWeight) {
        bestWeight = weight;
        bestDir = new THREE.Vector3().subVectors(test.pos, enemyPos).normalize();
      }
    }
  }

  if (!bestDir.lengthSq()) bestDir = testDir.clone();
  return bestDir;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.03);
  mixer.update(delta);
  updateShopPrompt();

  // --- Wave Management ---
  if (shopState.open) {
    updateStatus();
    renderer.render(scene, camera);
    return;
  }

  if (!waveActive && enemies.length === 0 && fragments.length === 0) { // Wait for fragments to clear too
    if (waveDelayTimer <= 0) {
      // waveActive is already false here, as per the outer 'if' condition
      startNextWave();
      waveDelayTimer = WAVE_DELAY_SECONDS; // Reset timer for next wave
    } else {
      waveDelayTimer -= delta;
    }
  }

  // Enemy AI: Move towards player
  player.damageCooldown = Math.max(0, player.damageCooldown - delta);
  const enemiesToKeep = [];
  enemies.forEach((enemy, i) => {
    // Handle visual flash effect when recently hit by a reflected projectile
    if (enemy.userData.flashTimer && enemy.userData.flashTimer > 0) {
      enemy.userData.flashTimer -= delta;
      const t = Math.max(0, enemy.userData.flashTimer / (enemy.userData.flashDuration || 0.18));
      const intensity = (enemy.userData.flashIntensity || 2) * t;
      enemy.traverse((c) => {
        if (c.isMesh && c.material && 'emissiveIntensity' in c.material) {
          if (enemy.userData._flashColor) c.material.emissive.setHex(enemy.userData._flashColor);
          c.material.emissiveIntensity = intensity;
        }
      });
      if (enemy.userData.flashTimer <= 0) {
        // restore emissive intensity and color
        enemy.traverse((c) => {
          if (c.isMesh && c.material && 'emissiveIntensity' in c.material) {
            c.material.emissiveIntensity = enemy.userData.emissiveOrigIntensity || 0;
            if (enemy.userData.emissiveColor) c.material.emissive.setHex(enemy.userData.emissiveColor);
          }
        });
      }
    }
    let isKnockedBack = false;
    if (handleHeavyRamAttack(enemy, delta, Math.max(0.0001, enemy.userData.baseScale || 1))) {
      if (enemy.userData.helper) enemy.userData.helper.update();
      if (enemy.userData.healthBarContainer) {
        enemy.userData.healthBarContainer.quaternion.copy(camera.quaternion);
        updateEnemyHealthBar(enemy);
      }
      enemiesToKeep.push(enemy);
      return;
    }
    // --- Health-based Scaling ---
    const healthRatio = enemy.userData.health / enemy.userData.maxHealth;
    const baseScale = enemy.userData.baseScale || 1;
    const currentScale = Math.max(ENEMY_MIN_SCALE_FACTOR * baseScale, baseScale * (0.5 + healthRatio * 0.5)); // Don't let them get TOO small
    enemy.scale.set(currentScale, currentScale, currentScale);
    updateEnemyHealthBar(enemy);

    const speed = enemy.userData.speed;
    const direction = new THREE.Vector3().subVectors(player.position, enemy.position);
    direction.y = 0; // Keep enemies on the ground level
    // Avoid merging: Calculate separation from other enemies
    const separation = new THREE.Vector3();

    for (let j = 0; j < enemies.length; j++) {
      if (i === j) continue;
      const other = enemies[j];
      const dist = enemy.position.distanceTo(other.position);
      if (dist < 1.5 * currentScale) { // Adjust separation distance based on current enemy scale
        const pushAway = new THREE.Vector3().subVectors(enemy.position, other.position);
        separation.add(pushAway.normalize().divideScalar(dist || 0.1));
      }
    }

    let movement = new THREE.Vector3(0, 0, 0);
    if (enemy.userData.knockbackForce > 0) {
      isKnockedBack = true;
      // Apply and decay knockback force
      movement.addScaledVector(enemy.userData.knockbackDir, enemy.userData.knockbackForce * 60 * delta);
      enemy.userData.knockbackForce -= delta * 3; // Fade out the push
      if (enemy.userData.knockbackForce < 0) enemy.userData.knockbackForce = 0;

      // Reset limbs during knockback
      enemy.userData.leftArm.rotation.x = 0;
      enemy.userData.rightArm.rotation.x = 0;
      enemy.userData.leftLeg.rotation.x = 0;
      enemy.userData.rightLeg.rotation.x = 0;
    } else if (direction.length() > 1.5 * currentScale) { // Stop moving when close to the player, adjusted for scale
      let moveDir = direction.normalize().add(separation.multiplyScalar(0.8)).normalize();
      
      // Check if direct path is blocked; if so, use pathfinding
      const testPos = enemy.position.clone().addScaledVector(moveDir, speed * delta * 1.2);
      if (isBlockedForEnemy(enemy, testPos, 0.8)) {
        moveDir = findAvoidanceDirection(enemy, enemy.position, direction);
      }
      if (isBlockedForEnemy(enemy, enemy.position.clone().addScaledVector(moveDir, speed * delta * 1.5), 0.85)) {
        moveDir = findAvoidanceDirection(enemy, enemy.position, direction).multiplyScalar(1.1).normalize();
      }
      
      movement.addScaledVector(moveDir, speed * delta);
      enemy.lookAt(player.position.x, enemy.position.y, player.position.z);

      // Walking animation: swing limbs back and forth
      const swing = Math.sin(clock.elapsedTime * speed * 3.3) * 0.5;
      enemy.userData.leftArm.rotation.x = swing;
      enemy.userData.rightArm.rotation.x = -swing;
      enemy.userData.leftLeg.rotation.x = -swing;
      enemy.userData.rightLeg.rotation.x = swing;
    } else if (separation.lengthSq() > 0) {
      // Still apply separation even if close to player
      movement.addScaledVector(separation.normalize(), speed * delta);
      
      // Reset limbs when standing still
      enemy.userData.leftArm.rotation.x = 0;
      enemy.userData.rightArm.rotation.x = 0;
      enemy.userData.leftLeg.rotation.x = 0;
      enemy.userData.rightLeg.rotation.x = 0;
    } else {
      // Stand still if not walking or separating
      enemy.userData.leftArm.rotation.x = 0;
      enemy.userData.rightArm.rotation.x = 0;
      enemy.userData.leftLeg.rotation.x = 0;
      enemy.userData.rightLeg.rotation.x = 0;
    }

    let defeatedByWall = false;
    if (movement.lengthSq() > 0) {
      const oldX = enemy.position.x;
      enemy.position.x += movement.x;
      if (checkEnemyCollision(enemy)) {
        enemy.position.x = oldX; // Revert movement
        if (isKnockedBack) {
          if (damageEnemy(enemy, 10)) defeatedByWall = true; // Apply damage if knocked back into wall
        }
      }

      if (!defeatedByWall) { // Only check Z if not already defeated by X collision
        const oldZ = enemy.position.z;
        enemy.position.z += movement.z;
        if (checkEnemyCollision(enemy)) {
          enemy.position.z = oldZ; // Revert movement
          if (isKnockedBack) {
            if (damageEnemy(enemy, 10)) defeatedByWall = true; // Apply damage if knocked back into wall
          }
        }
      }
    }

    // Check for enemy-player collision to deal damage
    const distanceToPlayer = enemy.position.distanceTo(player.position);
    if (distanceToPlayer < 1.5 * currentScale && player.damageCooldown <= 0) {
      damagePlayer(10); // Deal 10 damage
      player.damageCooldown = 1.0; // 1 second cooldown before taking damage again
    }

    const isBoss = enemy.userData.variant === 'boss';
    if (isBoss) {
      enemy.userData.shootTimer = (enemy.userData.shootTimer || 0) - delta;
      if (enemy.userData.shootTimer <= 0) {
        const distanceToPlayer = enemy.position.distanceTo(player.position);
        if (distanceToPlayer <= 24) {
          spawnBossProjectile(enemy.position, enemy.userData.color, enemy.userData.baseScale || 1, 'boss');
        }
        enemy.userData.shootTimer = 1.5 + Math.random();
      }
    }

    if (enemy.userData.variant === 'necromancer') {
      updateNecromancer(enemy, delta);
    }

    // Update the visual helper as the enemy moves
    if (enemy.userData.helper) enemy.userData.helper.update();

    // Billboard the health bar (make it face the camera) and keep it anchored to the enemy
    if (enemy.userData.healthBarContainer) {
      enemy.userData.healthBarContainer.quaternion.copy(camera.quaternion);
      updateEnemyHealthBar(enemy);
    }

    // If not defeated by wall damage, keep the enemy
    if (!defeatedByWall) {
      enemiesToKeep.push(enemy);
    }
  });

  // Update projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.position.addScaledVector(p.userData.velocity, delta);
    p.userData.life -= delta;
    
    // Collision check with player
    if (p.position.distanceTo(player.position) < 1.2) { // TODO: Add player damage logic here
      // Here you could trigger player damage logic
      scene.remove(p);
      projectiles.splice(i, 1);
      continue;
    }

    // NEW: Collision check with walls
    const projectileBox = new THREE.Box3().setFromObject(p);
    let hitWall = false;
    for (const wall of walls) {
        const wallBox = new THREE.Box3().setFromObject(wall);
        if (projectileBox.intersectsBox(wallBox)) {
            createExplosion(p.position, p.material.color.getHex()); // Use projectile's color for explosion
            scene.remove(p);
            projectiles.splice(i, 1);
            hitWall = true;
            break; // Projectile hit a wall, no need to check other walls
        }
    }
    if (hitWall) continue; // Projectile was removed, move to next projectile

    // Check reflected projectiles for enemy hits
    const enemyProjectileBox = new THREE.Box3().setFromObject(p);
    let hitEnemy = false;
    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];
      enemy.updateWorldMatrix(true, true);
      const enemyBox = new THREE.Box3().setFromObject(enemy);
      if (enemyProjectileBox.intersectsBox(enemyBox)) {
        if (p.userData.reflected) {
          const dmg = p.userData.damage || Math.ceil(player.attackDamage * 1.8);
          const defeated = damageEnemy(enemy, dmg);
          if (!defeated) {
            enemy.userData.flashTimer = 0.18;
            enemy.userData.flashDuration = 0.18;
            enemy.userData.flashIntensity = Math.min(5, 2 + (enemy.userData.baseScale || 1));
            enemy.userData._flashColor = 0xffffff;
          } else {
            enemies.splice(j, 1);
          }
          createExplosion(p.position, p.material && p.material.color ? p.material.color.getHex() : 0x88ffff);
        }
        scene.remove(p);
        projectiles.splice(i, 1);
        hitEnemy = true;
        break;
      }
    }
    if (hitEnemy) continue;

    if (p.userData.life <= 0) {
      scene.remove(p);
      projectiles.splice(i, 1);
    }
  }
  // Update the main enemies array with only the living enemies
  enemies.length = 0;
  enemies.push(...enemiesToKeep);

  // Update gold pickups
  for (let i = golds.length - 1; i >= 0; i--) {
    const gold = golds[i];
    if (!gold || !gold.userData) continue;
    gold.rotation.y += gold.userData.spinSpeed * delta;

    const pulse = gold.userData.pulseGlow;
    if (pulse) {
      const pulseValue = 1 + Math.sin(clock.elapsedTime * 2.2 + (gold.userData.pulseOffset || 0)) * 0.08;
      pulse.scale.setScalar(pulseValue);
    }

    const core = gold.userData.coreMesh;
    if (core && core.material && 'emissiveIntensity' in core.material) {
      core.material.emissiveIntensity = 2.2 + Math.sin(clock.elapsedTime * 2.6 + (gold.userData.pulseOffset || 0)) * 0.2;
    }

    if (gold.position.distanceTo(player.position) < 1.4) {
      collectGold(gold);
    }
  }

  // Update death fragments
  for (let i = fragments.length - 1; i >= 0; i--) {
    const frag = fragments[i];
    frag.position.addScaledVector(frag.userData.velocity, delta);
    frag.userData.velocity.y -= 20 * delta; // Gravity
    frag.userData.life -= delta * 1.5;
    frag.scale.setScalar(Math.max(0, frag.userData.life));
    if (frag.userData.life <= 0) {
      scene.remove(frag);
      fragments.splice(i, 1);
    }
  }

  player.direction.set(0, 0, 0);
  if (keys.forward) player.direction.z -= 1;
  if (keys.backward) player.direction.z += 1;
  if (keys.left) player.direction.x -= 1;
  if (keys.right) player.direction.x += 1;
  player.direction.normalize();

  const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, player.yaw, 0));
  forward.y = 0;
  forward.normalize();
  const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, player.yaw, 0));
  right.y = 0;
  right.normalize();

  const moveDirection = new THREE.Vector3();
  moveDirection.addScaledVector(forward, -player.direction.z);
  moveDirection.addScaledVector(right, player.direction.x);
  if (moveDirection.lengthSq() > 0) moveDirection.normalize();

  player.velocity.x = moveDirection.x * player.speed;
  player.velocity.z = moveDirection.z * player.speed;

  if (keys.jump && player.canJump) {
    player.velocity.y = player.jumpSpeed;
    player.canJump = false;
  }

  player.velocity.y -= 20 * delta;
  const nextPosition = player.position.clone().addScaledVector(player.velocity, delta);

  const horizontalX = new THREE.Vector3(nextPosition.x, player.position.y, player.position.z);
  if (!collide(horizontalX)) {
    player.position.x = nextPosition.x;
  } else {
    player.velocity.x = 0;
  }

  const horizontalZ = new THREE.Vector3(player.position.x, player.position.y, nextPosition.z);
  if (!collide(horizontalZ)) {
    player.position.z = nextPosition.z;
  } else {
    player.velocity.z = 0;
  }

  const verticalPos = new THREE.Vector3(player.position.x, nextPosition.y, player.position.z);
  if (!collide(verticalPos)) {
    player.position.y = nextPosition.y;
  } else {
    if (player.velocity.y > 0) {
      player.velocity.y = 0;
    }
  }

  if (player.position.y <= 1.2) {
    player.position.y = 1.2;
    player.velocity.y = 0;
    player.canJump = true;
  }
  player.canJump = player.canJump || checkGround();

  camera.position.copy(player.position);
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;

  updateStatus();
  renderer.render(scene, camera); // Render only if game is not over
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onWindowResize);
window.addEventListener('keydown', (event) => {
  switch (event.code) {
    case 'KeyW':
    case 'ArrowUp':
      keys.forward = true;
      break;
    case 'KeyS':
    case 'ArrowDown':
      keys.backward = true;
      break;
    case 'KeyA':
    case 'ArrowLeft':
      keys.left = true;
      break;
    case 'KeyD':
    case 'ArrowRight':
      keys.right = true;
      break;
    case 'Space':
      keys.jump = true;
      break;
    case 'ShiftLeft':
    case 'ShiftRight':
      keys.shift = true;
      break;
    case 'KeyE':
      if (shopState.open) {
        toggleShop(false);
      } else if (isPlayerNearShop()) {
        toggleShop(true);
      }
      break;
  }
});

window.addEventListener('keyup', (event) => {
  switch (event.code) {
    case 'KeyW':
    case 'ArrowUp':
      keys.forward = false;
      break;
    case 'KeyS':
    case 'ArrowDown':
      keys.backward = false;
      break;
    case 'KeyA':
    case 'ArrowLeft':
      keys.left = false;
      break;
    case 'KeyD':
    case 'ArrowRight':
      keys.right = false;
      break;
    case 'Space':
      keys.jump = false;
      break;
    case 'ShiftLeft':
    case 'ShiftRight':
      keys.shift = false;
      break;
  }
});

window.addEventListener('mousemove', (event) => {
  if (!player.mouseLocked) return;
  player.yaw -= event.movementX * 0.0022;
  player.pitch -= event.movementY * 0.0022;
  player.pitch = clamp(player.pitch, -Math.PI / 2 + 0.05, Math.PI / 2 - 0.05);
});

function checkAttack() {
  if (shopState.open) return;
  // Get the direction the camera is facing
  const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  // Define the center of the attack area in front of the player
  const attackPos = player.position.clone().addScaledVector(direction, 1.5);
  
  // Define the attack hitbox dimensions
  const attackBox = new THREE.Box3().setFromCenterAndSize(
    attackPos,
    new THREE.Vector3(2, 2, 2)
  );

  // Iterate backwards to safely remove enemies during the loop
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    enemy.updateWorldMatrix(true, true); // Ensure hitbox is calculated on current position
    const enemyBox = new THREE.Box3().setFromObject(enemy);

    if (attackBox.intersectsBox(enemyBox)) {
      if (damageEnemy(enemy, player.attackDamage)) { // Apply damage, check if defeated
        enemies.splice(i, 1); // Remove from array if defeated
      }
      // Trigger knockback effect
      const impactDir = new THREE.Vector3().subVectors(enemy.position, player.position);
      impactDir.y = 0;
      impactDir.normalize();
      enemy.userData.knockbackDir.copy(impactDir);
      enemy.userData.knockbackForce = 0.5; // Intensity of the push
    }
  }
  
  // Reflect boss projectiles when the player attacks.
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const projectile = projectiles[i];
    const projectileBox = new THREE.Box3().setFromObject(projectile);
    if (attackBox.intersectsBox(projectileBox)) {
      projectile.userData.velocity.copy(direction).multiplyScalar(18);
      projectile.userData.reflected = true;
      projectile.userData.life = 3.5;
      if (projectile.material && projectile.material.emissive) {
        projectile.material.emissive.setHex(0x88ffff);
        projectile.material.emissiveIntensity = 0.9;
      }
        // Make reflected projectiles larger and more damaging
        const reflectSizeMul = 1.6;
        if (projectile.scale) projectile.scale.multiplyScalar(reflectSizeMul);
        projectile.userData.damage = Math.ceil((projectile.userData.damage || 12) * 1.9);
        projectile.userData.velocity.multiplyScalar(1.15);
    }
  }
}

window.addEventListener('mousedown', () => {
  if (player.mouseLocked && attackAction) {
    attackAction.reset().play();
    checkAttack();
  }
});

function setPointerLock() {
  renderer.domElement.requestPointerLock();
}

renderer.domElement.addEventListener('click', () => {
  if (!player.mouseLocked) {
    overlay.style.display = 'none';
    setPointerLock();
  }
});

overlay.addEventListener('click', (event) => {
  event.stopPropagation();
  if (!player.mouseLocked && !gameOver) {
    overlay.style.display = 'none';
    setPointerLock();
  }
});

document.addEventListener('pointerlockchange', () => {
  player.mouseLocked = document.pointerLockElement === renderer.domElement;
  overlay.style.display = player.mouseLocked ? 'none' : 'block';
  updateStatus();
});

showStartOverlay();
updateGameUI(); // Initial UI update
updateStatus(); // Initial status update
let animationFrameId = requestAnimationFrame(animate); // Start the animation loop
