(() => {
  document.addEventListener("DOMContentLoaded", (_) => {
    const sketch = document.querySelector(".sketch") as HTMLDivElement;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.width = 800;
    canvas.height = 600;

    sketch.appendChild(canvas);

    const player = new Player(50, 50);
    const ball = new Ball(canvas.width / 2, canvas.height / 2);

    const entities = [player, ball];

    document.addEventListener("keydown", (event) => {
      player.handleKeyDown(event);
    });

    // Game loop using requestAnimationFrame
    function gameLoop() {
      entities.forEach((entity) => {
        entity.update(canvas, entities);
        entity.draw(context, canvas);
      });

      requestAnimationFrame(gameLoop);
    }

    gameLoop();
  });
})();

abstract class Entity {
  protected x: number;
  protected y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  abstract draw(
    context: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ): void;
  abstract update(canvas: HTMLCanvasElement, entities: Entity[]): void;
}

class Ball extends Entity {
  private radius: number;
  private speed: number;

  constructor(x: number, y: number) {
    super(x, y);
    this.radius = 10;
    this.speed = 5;
  }

  draw(context: CanvasRenderingContext2D) {
    context.beginPath();
    context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    context.fill();
  }

  update(canvas: HTMLCanvasElement, entities: Entity[]) {
    this.x += this.speed;
    this.y += this.speed;

    if (this.x - this.radius < 0 || this.x + this.radius > canvas.width) {
      this.speed = -this.speed;
    }
    if (this.y - this.radius < 0 || this.y + this.radius > canvas.height) {
      this.speed = -this.speed;
    }
  }
}

class Player extends Entity {
  private size: number = 50;
  private speed: number;

  constructor(x: number, y: number) {
    super(x, y);
    this.speed = 5;
  }

  draw(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillRect(this.x, this.y, this.size, this.size);
  }

  update(canvas: HTMLCanvasElement, entities: Entity[]) {
    if (this.x < 0) {
      this.x = 0;
    }
    if (this.y < 0) {
      this.y = 0;
    }
    if (this.x + this.size > canvas.width) {
      this.x = canvas.width - this.size;
    }
    if (this.y + this.size > canvas.height) {
      this.y = canvas.height - this.size;
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
