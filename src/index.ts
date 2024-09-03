const TICK_RATE = 50; // ticks per second
const TICK_DURATION = 1000 / TICK_RATE; // duration of a tick in milliseconds
const GRID_WIDTH = 1000; // pixels
const GRID_HEIGHT = 1000; // pixels
const GRID_SIZE = 10; // pixels per grid cell (width and height)

(() => {
  document.addEventListener("DOMContentLoaded", (_) => {
    const sketch = document.querySelector(".sketch") as HTMLDivElement;
    const canvas = document.createElement("canvas");
    sketch.appendChild(canvas);

    // Create & configure the render engine
    const engine = new RenderEngine(canvas, GRID_WIDTH, GRID_HEIGHT, GRID_SIZE);

    engine.renderTasks.push((data) => {
      engine.variingFloodFill(data, { r: 200, g: 100, b: 50 }, 30);
    });
    engine.renderTasks.push((_, { width, height, setCell }) => {
      for (let x = 0; x < width; x++) {
        setCell(x, height / 2, { r: 0, g: 0, b: 0 });
      }
    });

    engine.reset();

    // Define the game loop
    let lastTime = 0;
    function gameLoop(currentTime: number) {
      const deltaTime = currentTime - lastTime;

      engine.render();

      if (deltaTime > TICK_DURATION) {
        lastTime = currentTime - (deltaTime % TICK_DURATION);
        engine.dispatch();
      }

      requestAnimationFrame(gameLoop);
    }

    // Start
    requestAnimationFrame(gameLoop);
  });
})();

type Color = { r: number; g: number; b: number; a?: number };

type RenderTask = (data: ImageData, utils: RenderTaskUtils) => void;

type RenderTaskUtils = {
  setCell: (x: number, y: number, color: Color) => void;
  height: number;
  width: number;
};

class RenderEngine {
  private readonly width: number;
  private readonly height: number;
  private readonly context: CanvasRenderingContext2D;
  public readonly renderTasks: RenderTask[] = [];

  private buffer: ImageData | undefined = undefined;
  private readonly utils: RenderTaskUtils;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly canvasWidth: number,
    private readonly canvasHeight: number,
    private readonly gridSize: number
  ) {
    this.context = this.canvas.getContext("2d", { willReadFrequently: true });

    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;

    this.width = Math.floor(this.canvasWidth / this.gridSize);
    this.height = Math.floor(this.canvasHeight / this.gridSize);

    this.context.fillStyle = "black";

    // Initialize the utils object here to avoid creating it every frame
    this.utils = {
      setCell: (x: number, y: number, color: Color) =>
        this.setCell(this.buffer as ImageData, x, y, color),
      height: this.height,
      width: this.width,
    };
  }

  public reset() {
    this.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    this.context.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  /**
   * Dispatches the rendered scene to the canvas.
   * This function is idempotent, thus it can be called multiple times without side effects.
   * Idempotency is cleared when the `render` function is called @see render
   */
  public dispatch(): void {
    if (!this.buffer) {
      return;
    }

    this.context.putImageData(this.buffer, 0, 0);
    this.buffer = undefined;
  }

  /**
   * Executes all render tasks and stores the rendered scene in memory.
   * This function is idempotent, thus it can be called multiple times without side effects.
   * Idempotency is cleared when the `dispatch` function is called @see dispatch
   */
  public render(): void {
    if (this.buffer) {
      return;
    }

    this.buffer = this.context.getImageData(
      0,
      0,
      this.canvasWidth,
      this.canvasHeight
    );

    this.renderTasks.forEach((task) => task(this.buffer, this.utils));
  }

  public setCell(data: ImageData, x: number, y: number, color: Color) {
    // TODO: Possibly optimize this away, not required if the cell indices are within bounds
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }

    const px = x * this.gridSize;
    const py = y * this.gridSize;

    for (let i = px; i < px + this.gridSize; i++) {
      for (let j = py; j < py + this.gridSize; j++) {
        const index = (j * data.width + i) * 4;
        data.data[index] = color.r;
        data.data[index + 1] = color.g;
        data.data[index + 2] = color.b;
        data.data[index + 3] = 255;
      }
    }
  }

  public variingFloodFill(data: ImageData, color: Color, variance: number) {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        const sign = Math.random() > 0.5 ? 1 : -1;
        const random = Math.random() * variance * sign;
        const r = color.r + random;
        const g = color.g + random;
        const b = color.b + random;
        this.setCell(data, x, y, { r, g, b });
      }
    }
  }
}
