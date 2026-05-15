class Collectible {
  constructor({ x, y, value = 1, id }) {
    this.x = x;
    this.y = y;
    this.value = value;
    this.id = id;
    this.width = 15;
    this.height = 15;
  }
}

try {
  module.exports = Collectible;
} catch(e) {}

export default Collectible;
