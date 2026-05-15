import Player from './Player.mjs';
import Collectible from './Collectible.mjs';

const socket = io();
const canvas = document.getElementById('game-window');
const context = canvas.getContext('2d');

const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;
const SPEED = 3;
const PLAYER_SIZE = 20;

let myId = null;
let players = {};
let collectible = null;

const keys = {};

document.addEventListener('keydown', (e) => {
  keys[e.key] = true;
});
document.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

function getDirection() {
  if (keys['ArrowRight'] || keys['d'] || keys['D']) return 'right';
  if (keys['ArrowLeft'] || keys['a'] || keys['A']) return 'left';
  if (keys['ArrowUp'] || keys['w'] || keys['W']) return 'up';
  if (keys['ArrowDown'] || keys['s'] || keys['S']) return 'down';
  return null;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

socket.on('init', (data) => {
  myId = data.id;
  players = {};
  data.players.forEach(p => {
    players[p.id] = new Player(p);
  });
  if (data.collectible) {
    collectible = new Collectible(data.collectible);
  }
});

socket.on('updatePlayers', (data) => {
  data.forEach(p => {
    if (players[p.id]) {
      players[p.id].x = p.x;
      players[p.id].y = p.y;
      players[p.id].score = p.score;
    } else {
      players[p.id] = new Player(p);
    }
  });
  const ids = data.map(p => p.id);
  Object.keys(players).forEach(id => {
    if (!ids.includes(id)) delete players[id];
  });
});

socket.on('updateCollectible', (data) => {
  collectible = new Collectible(data);
});

const PLAYER_COLORS = [
  '#e94560', '#a8dadc', '#f4a261', '#2a9d8f',
  '#e9c46a', '#f77f00', '#4cc9f0', '#7b2d8b'
];

function getColor(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return PLAYER_COLORS[Math.abs(hash) % PLAYER_COLORS.length];
}

function drawBackground() {
  context.fillStyle = '#16213e';
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  context.strokeStyle = 'rgba(255,255,255,0.04)';
  context.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x <= CANVAS_WIDTH; x += gridSize) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, CANVAS_HEIGHT);
    context.stroke();
  }
  for (let y = 0; y <= CANVAS_HEIGHT; y += gridSize) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(CANVAS_WIDTH, y);
    context.stroke();
  }
}

function drawCollectible() {
  if (!collectible) return;
  const cx = collectible.x + collectible.width / 2;
  const cy = collectible.y + collectible.height / 2;
  const r = collectible.width / 2;

  context.beginPath();
  context.arc(cx, cy, r, 0, Math.PI * 2);
  context.fillStyle = '#f4d03f';
  context.shadowColor = '#f4d03f';
  context.shadowBlur = 10;
  context.fill();
  context.shadowBlur = 0;

  context.fillStyle = '#8B6914';
  context.font = 'bold 10px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('+' + (collectible.value || 1), cx, cy);
}

function drawPlayers() {
  const playerArr = Object.values(players);

  playerArr.forEach(p => {
    const color = getColor(p.id);
    const isMe = p.id === myId;

    context.fillStyle = color;
    context.shadowColor = color;
    context.shadowBlur = isMe ? 12 : 6;
    context.fillRect(p.x, p.y, PLAYER_SIZE, PLAYER_SIZE);
    context.shadowBlur = 0;

    if (isMe) {
      context.strokeStyle = '#fff';
      context.lineWidth = 2;
      context.strokeRect(p.x, p.y, PLAYER_SIZE, PLAYER_SIZE);
    }

    context.fillStyle = '#fff';
    context.font = '8px "Press Start 2P", sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'bottom';
    context.fillText(isMe ? 'YOU' : 'P', p.x + PLAYER_SIZE / 2, p.y - 2);
  });
}

function drawHUD() {
  const me = players[myId];
  if (!me) return;

  const playerArr = Object.values(players);
  const rank = me.calculateRank(playerArr);

  context.fillStyle = 'rgba(0,0,0,0.5)';
  context.fillRect(5, 5, 200, 42);

  context.fillStyle = '#a8dadc';
  context.font = '9px "Press Start 2P", sans-serif';
  context.textAlign = 'left';
  context.textBaseline = 'top';
  context.fillText('Score: ' + me.score, 12, 10);
  context.fillText(rank, 12, 28);
}

function gameLoop() {
  const dir = getDirection();
  const me = players[myId];

  if (dir && me) {
    const prev = { x: me.x, y: me.y };
    me.movePlayer(dir, SPEED);

    me.x = clamp(me.x, 0, CANVAS_WIDTH - PLAYER_SIZE);
    me.y = clamp(me.y, 0, CANVAS_HEIGHT - PLAYER_SIZE);

    if (me.x !== prev.x || me.y !== prev.y) {
      socket.emit('move', { x: me.x, y: me.y, dir });
    }

    if (collectible && me.collision(collectible)) {
      socket.emit('collectItem', { collectibleId: collectible.id });
      collectible = null;
    }
  }

  drawBackground();
  drawCollectible();
  drawPlayers();
  drawHUD();

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
