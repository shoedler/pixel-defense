(() => {
  document.addEventListener("DOMContentLoaded", (_) => {
    const sketch = document.querySelector(".sketch") as HTMLDivElement;
    const canvas = document.createElement("canvas");

    canvas.width = 800;
    canvas.height = 600;

    sketch.appendChild(canvas);

    // Create a moveable player object (Arrow keys)
    const player = new Player(canvas);

    document.addEventListener("keydown", (event) => {
      player.handleKeyDown(event);
    });

    // Game loop using requestAnimationFrame
    function gameLoop() {
      player.draw();
      player.update();
      requestAnimationFrame(gameLoop);
    }

    gameLoop();
  });
})();

class Player {
  private size: number = 50;
  private x: number;
  private y: number;
  private speed: number;
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.x = 0;
    this.y = 0;
    this.speed = 5;
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
  }

  draw() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.fillRect(this.x, this.y, this.size, this.size);
  }

  update() {
    if (this.x < 0) {
      this.x = 0;
    }
    if (this.y < 0) {
      this.y = 0;
    }
    if (this.x + this.size > this.canvas.width) {
      this.x = this.canvas.width - this.size;
    }
    if (this.y + this.size > this.canvas.height) {
      this.y = this.canvas.height - this.size;
    }
  }

  handleKeyDown(event: KeyboardEvent) {
    switch (event.key) {
      case "ArrowUp":
        this.y -= this.speed;
        break;
      case "ArrowDown":
        this.y += this.speed;
        break;
      case "ArrowLeft":
        this.x -= this.speed;
        break;
      case "ArrowRight":
        this.x += this.speed;
        break;
    }
  }
}
