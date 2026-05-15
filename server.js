require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const expect = require('chai');
const socketIO = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner.js');

const app = express();

app.use(helmet.noSniff());
app.use(helmet.xssFilter());
app.use(helmet.hidePoweredBy({ setTo: 'PHP 7.4.3' }));
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader('Expires', '0');
  next();
});

app.use('/public', express.static(process.cwd() + '/public'));
app.use('/assets', express.static(process.cwd() + '/assets'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({ origin: '*' }));

app.route('/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  });

fccTestingRoutes(app);

app.use(function (req, res, next) {
  res.status(404).type('text').send('Not Found');
});

const portNum = process.env.PORT || 3000;
const server = http.createServer(app);
const io = socketIO(server);

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const PLAYER_SIZE = 20;
const COLLECTIBLE_SIZE = 15;
const players = {};

function randomPos(max, size) {
  return Math.floor(Math.random() * (max - size));
}

function newCollectible() {
  return {
    x: randomPos(CANVAS_WIDTH, COLLECTIBLE_SIZE),
    y: randomPos(CANVAS_HEIGHT, COLLECTIBLE_SIZE),
    value: 1,
    id: Date.now().toString(),
    width: COLLECTIBLE_SIZE,
    height: COLLECTIBLE_SIZE
  };
}

let collectible = newCollectible();

io.on('connection', (socket) => {
  const player = {
    id: socket.id,
    x: randomPos(CANVAS_WIDTH, PLAYER_SIZE),
    y: randomPos(CANVAS_HEIGHT, PLAYER_SIZE),
    score: 0,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE
  };
  players[socket.id] = player;

  socket.emit('init', {
    id: socket.id,
    players: Object.values(players),
    collectible
  });
  socket.broadcast.emit('updatePlayers', Object.values(players));

  socket.on('move', (data) => {
    const p = players[socket.id];
    if (!p) return;
    p.x = Math.max(0, Math.min(CANVAS_WIDTH - PLAYER_SIZE, data.x));
    p.y = Math.max(0, Math.min(CANVAS_HEIGHT - PLAYER_SIZE, data.y));
    io.emit('updatePlayers', Object.values(players));
  });

  socket.on('collectItem', (data) => {
    const p = players[socket.id];
    if (!p) return;
    if (collectible && data.collectibleId === collectible.id) {
      p.score += collectible.value;
      collectible = newCollectible();
      io.emit('updatePlayers', Object.values(players));
      io.emit('updateCollectible', collectible);
    }
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('updatePlayers', Object.values(players));
  });
});

server.listen(portNum, () => {
  console.log(`Listening on port ${portNum}`);
  if (process.env.NODE_ENV === 'test') {
    console.log('Running Tests...');
    setTimeout(function () {
      try {
        runner.run();
      } catch (error) {
        console.log('Tests are not valid:');
        console.error(error);
      }
    }, 1500);
  }
});

module.exports = app;
