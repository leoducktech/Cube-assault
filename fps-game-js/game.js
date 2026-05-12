import * as THREE from 'three';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/loaders/GLTFLoader.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x4a3a27);
scene.fog = new THREE.FogExp2(0x4a3a27, 0.015);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x4a3a27);
document.body.appendChild(renderer.domElement);

const overlay = document.getElementById('overlay');
const status = document.getElementById('status');

window.addEventListener('error', (event) => {
  status.textContent = `Error: ${event.message}`;
  overlay.style.display = 'block';
});

const ambient = new THREE.AmbientLight(0xf2e2c8, 0.45);
scene.add(ambient);
const hemi = new THREE.HemisphereLight(0xfff1d0, 0x332820, 0.7);
scene.add(hemi);
const dirLight = new THREE.DirectionalLight(0xffe9c1, 1.0);
dirLight.position.set(6, 14, 7);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(1024, 1024);
scene.add(dirLight);

function createStoneTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#7b6a53';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 1000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const shade = 40 + Math.random() * 20;
    ctx.fillStyle = `rgba(${shade}, ${shade - 5}, ${shade - 20}, ${0.08 + Math.random() * 0.12})`;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = 20 + Math.random() * 40;
    const angle = Math.random() * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 12);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function createCarvingTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#8d7359';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  for (let x = 16; x < size; x += 32) {
    for (let y = 16; y < size; y += 32) {
      ctx.beginPath();
      ctx.arc(x, y, 6 + Math.random() * 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  return new THREE.CanvasTexture(canvas);
}

const floorTexture = createStoneTexture();
const floor = new THREE.Mesh(
  new THREE.BoxGeometry(90, 1, 90),
  new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 0.95, metalness: 0.03 })
);
floor.position.y = -0.5;
floor.receiveShadow = true;
scene.add(floor);

const walls = [];
const stoneMaterial = new THREE.MeshStandardMaterial({ map: createCarvingTexture(), roughness: 0.82, metalness: 0.06, color: 0xbf9b73 });

function addBlock(x, z, width, height, depth) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), stoneMaterial);
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
const WAVE_DELAY_SECONDS = 5; // Time between waves
const ENEMY_MIN_SCALE_FACTOR = 0.5; // Minimum scale factor for enemies based on health

const waves = [
  { numEnemies: 3, baseHealth: 80, healthVariance: 20, baseSpeed: 2.5, speedVariance: 0.5, spawnRadius: 20, color: 0xff4444, scale: 1 },
  { numEnemies: 5, baseHealth: 100, healthVariance: 30, baseSpeed: 3, speedVariance: 1, spawnRadius: 25, color: 0xff4444, scale: 1 },
  { numEnemies: 7, baseHealth: 120, healthVariance: 40, baseSpeed: 3.5, speedVariance: 1.5, spawnRadius: 30, color: 0xff4444, scale: 1 },
  { numEnemies: 10, baseHealth: 150, healthVariance: 50, baseSpeed: 4, speedVariance: 2, spawnRadius: 35, color: 0xff4444, scale: 1 },
  { numEnemies: 1, baseHealth: 1000, healthVariance: 0, baseSpeed: 2, speedVariance: 0, spawnRadius: 10, color: 0xaa00ff, scale: 4 }, // BOSS ROUND
  // Add more waves as desired
];

const roundDisplay = document.createElement('div');
roundDisplay.id = 'roundDisplay';
roundDisplay.style.position = 'absolute';
roundDisplay.style.top = '10px';
roundDisplay.style.left = '10px';
roundDisplay.style.color = 'white';
roundDisplay.style.fontFamily = 'monospace';
roundDisplay.style.fontSize = '18px';
document.body.appendChild(roundDisplay);

const enemiesDisplay = document.createElement('div');
enemiesDisplay.id = 'enemiesDisplay';
enemiesDisplay.style.position = 'absolute';
enemiesDisplay.style.top = '35px';
enemiesDisplay.style.left = '10px';
enemiesDisplay.style.color = 'white';
enemiesDisplay.style.fontFamily = 'monospace';
enemiesDisplay.style.fontSize = '18px';
document.body.appendChild(enemiesDisplay);

const scoreDisplay = document.createElement('div');
scoreDisplay.id = 'scoreDisplay';
scoreDisplay.style.position = 'absolute';
scoreDisplay.style.top = '60px';
scoreDisplay.style.left = '10px';
scoreDisplay.style.color = 'white';
scoreDisplay.style.fontFamily = 'monospace';
scoreDisplay.style.fontSize = '18px';
document.body.appendChild(scoreDisplay);

const goldDisplay = document.createElement('div');
goldDisplay.id = 'goldDisplay';
goldDisplay.style.position = 'absolute';
goldDisplay.style.top = '110px';
goldDisplay.style.left = '10px';
goldDisplay.style.color = 'white';
goldDisplay.style.fontFamily = 'monospace';
goldDisplay.style.fontSize = '18px';
document.body.appendChild(goldDisplay);

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
playerHealthDisplay.style.position = 'absolute';
playerHealthDisplay.style.top = '185px';
playerHealthDisplay.style.left = '10px';
playerHealthDisplay.style.color = 'white';
playerHealthDisplay.style.fontFamily = 'monospace';
playerHealthDisplay.style.fontSize = '18px';
document.body.appendChild(playerHealthDisplay);


function updateGameUI() {
  roundDisplay.textContent = `Round: ${currentRound}`;
  enemiesDisplay.textContent = `Enemies: ${enemiesRemaining}`;
  scoreDisplay.textContent = `Score: ${score}`;
  goldDisplay.textContent = `Gold: ${goldCount}`;
  playerHealthDisplay.textContent = `Health: ${player.health}/${player.maxHealth}`;
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
    goldMaterial
  );
  ring.position.set(shopState.position.x, 2.8, shopState.position.z);
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);
}

addShopDecoration();

function startNextWave() {
  currentRound++;
  if (currentRound > waves.length) {
    console.log("All waves completed! You win!");
    status.textContent = "You Win! Click to play again.";
    overlay.style.display = 'block';
    return;
  }

  const wave = waves[currentRound - 1];
  enemiesRemaining = wave.numEnemies;
  waveActive = true;
  console.log(`Starting Wave ${currentRound} with ${wave.numEnemies} enemies.`);

  for (let i = 0; i < wave.numEnemies; i++) {
    const health = wave.baseHealth + (Math.random() - 0.5) * 2 * wave.healthVariance;
    const speed = wave.baseSpeed + (Math.random() - 0.5) * 2 * wave.speedVariance;

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


    createEnemy(spawnX, spawnZ, health, speed, wave.color, wave.scale);
  }
  updateGameUI();
}

const enemies = [];
const fragments = [];
const projectiles = [];
const golds = [];
let goldCount = 0;

const goldMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0x553300, roughness: 0.25, metalness: 1 });

function createGold(x, z, amount = 1) {
  const geometry = new THREE.TorusGeometry(0.5, 0.18, 16, 30);
  const mesh = new THREE.Mesh(geometry, goldMaterial);
  mesh.position.set(x, 0.8, z);
  mesh.rotation.x = Math.PI / 2;
  mesh.userData.amount = amount;
  mesh.userData.spinSpeed = 1.5 + Math.random() * 1.5;
  scene.add(mesh);
  golds.push(mesh);
  return mesh;
}

function collectGold(gold) {
  goldCount += gold.userData.amount;
  score += gold.userData.amount * 5;
  scene.remove(gold);
  const index = golds.indexOf(gold);
  if (index !== -1) golds.splice(index, 1);
  updateGameUI();
}

for (const pos of [{ x: -20, z: 20 }, { x: 20, z: 20 }, { x: -20, z: -20 }, { x: 20, z: -20 }]) {
  createGold(pos.x, pos.z, 3);
}

function createEnemy(x, z, health = 100, speed = 3, color = 0xff4444, scale = 1) {
  const group = new THREE.Group();

  // Body
  const bodyGeo = new THREE.BoxGeometry(1, 1, 1);
  const bodyMat = new THREE.MeshStandardMaterial({ color: color });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Arms
  const armGeo = new THREE.BoxGeometry(0.25, 0.7, 0.25);
  const armMat = new THREE.MeshStandardMaterial({ color: color });
  const leftArm = new THREE.Mesh(armGeo, armMat);
  leftArm.position.set(-0.65, 0, 0);
  leftArm.castShadow = true;
  group.add(leftArm);
  const rightArm = new THREE.Mesh(armGeo, armMat);
  rightArm.position.set(0.65, 0, 0);
  rightArm.castShadow = true;
  group.add(rightArm);

  // Legs
  const legGeo = new THREE.BoxGeometry(0.3, 0.8, 0.3);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const leftLeg = new THREE.Mesh(legGeo, legMat);
  leftLeg.position.set(-0.3, -0.9, 0);
  leftLeg.castShadow = true;
  group.add(leftLeg);
  const rightLeg = new THREE.Mesh(legGeo, legMat);
  rightLeg.position.set(0.3, -0.9, 0);
  rightLeg.castShadow = true;
  group.add(rightLeg);

  // Face
  const eyeGeo = new THREE.BoxGeometry(0.2, 0.2, 0.1);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.25, 0.2, 0.51);
  group.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.25, 0.2, 0.51);
  group.add(rightEye);
  const mouthGeo = new THREE.BoxGeometry(0.5, 0.1, 0.1);
  const mouth = new THREE.Mesh(mouthGeo, eyeMat);
  mouth.position.set(0, -0.25, 0.51);
  group.add(mouth);

  // Health Bar
  const healthBarGroup = new THREE.Group();
  healthBarGroup.position.set(0, 1, 0); // Position above the body
  group.add(healthBarGroup);

  const hbBgGeo = new THREE.PlaneGeometry(1, 0.15);
  const hbBgMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
  const hbBg = new THREE.Mesh(hbBgGeo, hbBgMat);
  healthBarGroup.add(hbBg);

  const hbFgGeo = new THREE.PlaneGeometry(1, 0.15);
  const hbFgMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const hbFg = new THREE.Mesh(hbFgGeo, hbFgMat);
  hbFg.position.z = 0.01; // Slightly in front of the background
  healthBarGroup.add(hbFg);

  group.userData.health = health;
  group.userData.maxHealth = health;
  group.userData.speed = speed;
  group.userData.baseScale = scale;
  group.userData.color = color;
  group.userData.healthBar = hbFg;
  group.userData.healthBarContainer = healthBarGroup;
  group.userData.knockbackForce = 0;
  group.userData.knockbackDir = new THREE.Vector3();
  group.userData.leftArm = leftArm;
  group.userData.rightArm = rightArm;
  group.userData.leftLeg = leftLeg;
  group.userData.rightLeg = rightLeg;

  group.position.set(x, 1.3, z);
  scene.add(group);

  // Create and add a BoxHelper to visualize the enemy's hitbox
  const helper = new THREE.BoxHelper(group, 0xff0000);
  scene.add(helper);
  group.userData.helper = helper;

  enemies.push(group);
  return group;
}

function spawnBossProjectile(sourcePos, color) {
  const pGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const pMat = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.5 });
  const projectile = new THREE.Mesh(pGeo, pMat);
  
  projectile.position.copy(sourcePos);
  projectile.position.y += 1.5; // Shoot from chest height
  
  const direction = new THREE.Vector3().subVectors(player.position, projectile.position).normalize();
  projectile.userData.velocity = direction.multiplyScalar(12); // Projectile speed
  projectile.userData.life = 4.0; // Seconds before it disappears
  
  scene.add(projectile);
  projectiles.push(projectile);
}

function damageEnemy(enemy, amount) {
  enemy.userData.health -= amount;
  const healthRatio = Math.max(0, enemy.userData.health / enemy.userData.maxHealth);
  
  if (enemy.userData.healthBar) {
    enemy.userData.healthBar.scale.x = healthRatio;
  }

  if (enemy.userData.health <= 0) {
    createExplosion(enemy.position, enemy.userData.color);
    scene.remove(enemy);
    if (enemy.userData.helper) scene.remove(enemy.userData.helper);
    
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
  updateGameUI();
  
  if (player.health <= 0) {
    status.textContent = "GAME OVER! Click to try again.";
    overlay.style.display = 'block';
    if (document.pointerLockElement === renderer.domElement) {
      document.exitPointerLock();
    }
  }
}

function resetGame() {
  // Clear enemies from scene and array
  enemies.forEach(enemy => {
    scene.remove(enemy);
    if (enemy.userData.helper) scene.remove(enemy.userData.helper);
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

camera.position.copy(player.position);
camera.rotation.order = 'YXZ';
scene.add(camera);

const mixer = new THREE.AnimationMixer(camera);
const gltfLoader = new GLTFLoader();
let playerModel = null;
let attackAction = null;
let idleAction = null;

const modelPath = encodeURI('knife_animated (1).glb');
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
  const enemyBox = new THREE.Box3().setFromObject(enemy);
  for (const wall of walls) {
    const box = new THREE.Box3().setFromObject(wall);
    if (enemyBox.intersectsBox(box)) {
      return true;
    }
  }
  return false;
}

function collide(position) {
  const radius = 0.55;
  const height = 1.8;
  const playerBox = new THREE.Box3(
    new THREE.Vector3(position.x - radius, position.y - 0.9, position.z - radius),
    new THREE.Vector3(position.x + radius, position.y + 0.9, position.z + radius)
  );
  for (const wall of walls) {
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
    let isKnockedBack = false;
    // --- Health-based Scaling ---
    const healthRatio = enemy.userData.health / enemy.userData.maxHealth;
    const baseScale = enemy.userData.baseScale || 1;
    const currentScale = Math.max(ENEMY_MIN_SCALE_FACTOR * baseScale, baseScale * (0.5 + healthRatio * 0.5)); // Don't let them get TOO small
    enemy.scale.set(currentScale, currentScale, currentScale);

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
      const moveDir = direction.normalize().add(separation.multiplyScalar(0.8)).normalize();
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

    if (enemy.userData.baseScale > 1) {
      enemy.userData.shootTimer = (enemy.userData.shootTimer || 0) - delta;
      if (enemy.userData.shootTimer <= 0) {
        spawnBossProjectile(enemy.position, enemy.userData.color);
        enemy.userData.shootTimer = 1.5 + Math.random(); // Wait 1.5 to 2.5 seconds
      }
    }

    // Update the visual helper as the enemy moves
    if (enemy.userData.helper) enemy.userData.helper.update();

    // Billboard the health bar (make it face the camera)
    if (enemy.userData.healthBarContainer) enemy.userData.healthBarContainer.quaternion.copy(camera.quaternion);

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
    gold.rotation.y += gold.userData.spinSpeed * delta;
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
  if (!player.mouseLocked) {
    if (player.health <= 0 || currentRound > waves.length) {
      resetGame();
    }
    overlay.style.display = 'none';
    setPointerLock();
  }
});

document.addEventListener('pointerlockchange', () => {
  player.mouseLocked = document.pointerLockElement === renderer.domElement;
  overlay.style.display = player.mouseLocked ? 'none' : 'block';
  updateStatus();
});

updateGameUI(); // Initial UI update
updateStatus(); // Initial status update
let animationFrameId = requestAnimationFrame(animate); // Start the animation loop
