class Player {
  constructor({ x, y, score = 0, id }) {
    this.x = x;
    this.y = y;
    this.score = score;
    this.id = id;
    this.width = 20;
    this.height = 20;
  }

  movePlayer(dir, speed) {
    if (dir === 'right') this.x += speed;
    else if (dir === 'left') this.x -= speed;
    else if (dir === 'up') this.y -= speed;
    else if (dir === 'down') this.y += speed;
  }

  collision(item) {
    return (
      this.x < item.x + (item.width || 15) &&
      this.x + this.width > item.x &&
      this.y < item.y + (item.height || 15) &&
      this.y + this.height > item.y
    );
  }

  calculateRank(arr) {
    const sorted = [...arr].sort((a, b) => b.score - a.score);
    const rank = sorted.findIndex(p => p.id === this.id) + 1;
    return `Rank: ${rank} / ${arr.length}`;
  }
}

export default Player;
