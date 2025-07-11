const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let gravity = 1.2;
let jumpPower = -16;
let gameOver = false;
let cameraX = 0;

const player = {
  x: 100,
  y: 300,
  width: 40,
  height: 70,
  velocityY: 0,
  isJumping: false,
  state: "idle",
  runAnimFrame: 0,
  facing: "right"
};

let keys = {};
document.addEventListener("keydown", e => keys[e.code] = true);
document.addEventListener("keyup", e => keys[e.code] = false);

let platforms = [
  { x: 0, y: 360, width: 300, height: 40, type: "normal", angle: 0, dir: 1 }
];

let crushers = [];
let platformSpacing = 250;
let nextPlatformX = 400;
let nextCrusherX = 1200;

function spawnPlatform() {
  const rand = Math.random();
  let type = "normal";

  if (rand < 0.2) type = "moving";
  else if (rand < 0.35) type = "rotating";

  const width = type === "rotating" ? 180 : 100 + Math.random() * 60;
  const height = 20;
  const y = 260 + Math.random() * 60;

  platforms.push({
    x: nextPlatformX,
    y,
    width,
    height,
    type,
    angle: 0,
    dir: 1
  });

  if (nextPlatformX >= nextCrusherX) {
    crushers.push({
      x: nextPlatformX - 150,
      y: 0,
      width: 20,
      height: 60,
      dir: 1,
      range: 100,
      baseY: y - 60
    });
    nextCrusherX += 1200;
  }

  nextPlatformX += platformSpacing;
}

// Función para obtener el punto Y en la línea inferior rotada de la plataforma en una X dada
function getRotatedPlatformYAtX(platform, x) {
  // Centro plataforma
  const cx = platform.x + platform.width / 2;
  const cy = platform.y + platform.height / 2;

  // Traslada x para calcular distancia horizontal desde centro
  const dx = x - cx;

  // Altura según rotación: cy + dx * tan(angulo)
  return cy + dx * Math.tan(platform.angle);
}

function update() {
  if (gameOver) return;

  let moved = false;
  if (keys["ArrowRight"]) {
    player.x += 4;
    player.facing = "right";
    moved = true;
  }
  if (keys["ArrowLeft"]) {
    player.x -= 4;
    player.facing = "left";
    moved = true;
  }

  if (keys["Space"] && !player.isJumping) {
    player.velocityY = jumpPower;
    player.isJumping = true;
  }

  player.velocityY += gravity;
  player.y += player.velocityY;

  cameraX = player.x - 100;

  let onPlatform = false;
  let standingPlatform = null;

  platforms.forEach(p => {
    if (p.type === "moving") {
      p.y += p.dir * 1.5;
      if (p.y > 350 || p.y < 220) p.dir *= -1;
    }
    if (p.type === "rotating") {
      p.angle += 0.01;
      if (p.angle > Math.PI) p.angle -= 2 * Math.PI;
      if (p.angle < -Math.PI) p.angle += 2 * Math.PI;
    }

    if (p.type === "rotating") {
      // Vamos a detectar si el jugador está justo "sobre" la plataforma girada

      // Comprobar el rango horizontal de la plataforma
      const platLeft = p.x;
      const platRight = p.x + p.width;

      // El jugador debe estar al menos parcialmente sobre la plataforma horizontalmente
      if (
        player.x + player.width > platLeft &&
        player.x < platRight &&
        player.velocityY >= 0
      ) {
        // Tomamos el punto X central del jugador en el eje horizontal
        const playerCenterX = player.x + player.width / 2;

        // Obtenemos la Y del suelo de la plataforma rotada en ese punto
        const platformY = getRotatedPlatformYAtX(p, playerCenterX);

        // El pie del jugador es player.y + player.height
        // Si el jugador está cayendo y su pie está dentro de un pequeño rango sobre la plataforma
        if (
          player.y + player.height >= platformY - 5 &&
          player.y + player.height <= platformY + 15
        ) {
          // Si la inclinación es muy alta, no puede pararse
          if (Math.abs(p.angle) > 0.26) {
            // El jugador caerá, no se apoya
            return;
          }

          // Ajustamos la posición del jugador para que sus pies estén en la plataforma
          player.y = platformY - player.height;
          player.velocityY = 0;
          player.isJumping = false;
          onPlatform = true;
          standingPlatform = p;
        }
      }
    } else {
      // Colisión normal AABB simple para plataformas normales y móviles
      const px = p.x;
      const py = p.y;

      if (
        player.x + player.width > px &&
        player.x < px + p.width &&
        player.y + player.height >= py &&
        player.y + player.height <= py + 15 &&
        player.velocityY >= 0
      ) {
        player.y = py - player.height;
        player.velocityY = 0;
        player.isJumping = false;
        onPlatform = true;
        standingPlatform = p;
      }
    }
  });

  crushers.forEach(c => {
    c.y += c.dir * 3;
    if (c.y > c.baseY + c.range) c.dir = -1;
    if (c.y < c.baseY) c.dir = 1;

    if (
      player.x + player.width > c.x &&
      player.x < c.x + c.width &&
      player.y < c.y + c.height &&
      player.y + player.height > c.y
    ) {
      triggerGameOver();
    }
  });

  if (!onPlatform && player.y > canvas.height) {
    triggerGameOver();
  }

  if (standingPlatform && standingPlatform.type === "rotating") {
    if (Math.abs(standingPlatform.angle) > 0.17) {
      player.x += standingPlatform.angle * 3;
    }
  }

  while (nextPlatformX < player.x + 800) {
    spawnPlatform();
  }

  platforms = platforms.filter(p => p.x + p.width > cameraX - 200);
  crushers = crushers.filter(c => c.x + c.width > cameraX - 200);

  if (player.isJumping) {
    player.state = "jump";
  } else if (keys["ArrowRight"] || keys["ArrowLeft"]) {
    player.state = "run";
  } else {
    player.state = "idle";
  }

  if (player.state === "run") {
    player.runAnimFrame += 0.2;
    if (player.runAnimFrame >= 4) player.runAnimFrame = 0;
  } else {
    player.runAnimFrame = 0;
  }
}

function triggerGameOver() {
  gameOver = true;
  document.getElementById("game-over").style.display = "block";
  document.getElementById("restart-btn").style.display = "block";
}

function drawPlayer() {
  const x = player.x - cameraX;
  const y = player.y;

  ctx.save();

  if (player.facing === "left") {
    ctx.translate(x + 20, 0);
    ctx.scale(-1, 1);
    ctx.translate(-x - 20, 0);
  }

  ctx.beginPath();
  ctx.fillStyle = "#000";
  ctx.arc(x + 20, y + 10, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(x + 20, y + 20);
  ctx.lineTo(x + 20, y + 50);
  ctx.stroke();

  if (player.state === "idle") {
    ctx.beginPath();
    ctx.moveTo(x + 20, y + 30);
    ctx.lineTo(x + 5, y + 40);
    ctx.moveTo(x + 20, y + 30);
    ctx.lineTo(x + 35, y + 40);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + 20, y + 50);
    ctx.lineTo(x + 10, y + 70);
    ctx.moveTo(x + 20, y + 50);
    ctx.lineTo(x + 30, y + 70);
    ctx.stroke();
  } else if (player.state === "run") {
    const frame = Math.floor(player.runAnimFrame);

    const armUp = [
      [5,40, 35,40],
      [10,35, 30,45],
      [5,40, 35,40],
      [10,45, 30,35]
    ];

    const legUp = [
      [10,70, 30,70],
      [15,60, 25,80],
      [10,70, 30,70],
      [15,80, 25,60]
    ];

    ctx.beginPath();
    ctx.moveTo(x + 20, y + 30);
    ctx.lineTo(x + armUp[frame][0], y + armUp[frame][1]);
    ctx.moveTo(x + 20, y + 30);
    ctx.lineTo(x + armUp[frame][2], y + armUp[frame][3]);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + 20, y + 50);
    ctx.lineTo(x + legUp[frame][0], y + legUp[frame][1]);
    ctx.moveTo(x + 20, y + 50);
    ctx.lineTo(x + legUp[frame][2], y + legUp[frame][3]);
    ctx.stroke();
  } else if (player.state === "jump") {
    ctx.beginPath();
    ctx.moveTo(x + 20, y + 30);
    ctx.lineTo(x + 0, y + 20);
    ctx.moveTo(x + 20, y + 30);
    ctx.lineTo(x + 40, y + 20);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + 20, y + 50);
    ctx.lineTo(x + 10, y + 70);
    ctx.moveTo(x + 20, y + 50);
    ctx.lineTo(x + 30, y + 70);
    ctx.stroke();
  }

  ctx.restore();
}

function drawPlatforms() {
  platforms.forEach(p => {
    const x = p.x - cameraX;
    const y = p.y;

    if (p.type === "normal") ctx.fillStyle = "#4caf50";
    if (p.type === "moving") ctx.fillStyle = "#ff9800";
    if (p.type === "rotating") ctx.fillStyle = "#ab47bc";

    if (p.type === "rotating") {
      ctx.save();
      ctx.translate(x + p.width / 2, y + p.height / 2);
      ctx.rotate(p.angle);
      ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
      ctx.restore();
    } else {
      ctx.fillRect(x, y, p.width, p.height);
    }
  });
}

function drawCrushers() {
  ctx.fillStyle = "#d32f2f";
  crushers.forEach(c => {
    ctx.fillRect(c.x - cameraX, c.y, c.width, c.height);
  });
}

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  update();
  drawPlatforms();
  drawCrushers();
  drawPlayer();

  if (!gameOver) requestAnimationFrame(loop);
}

loop();
