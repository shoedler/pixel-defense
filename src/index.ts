const TICK_RATE = 40; // ticks per second
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
    const engine = RenderEngine.create(
      canvas,
      GRID_WIDTH,
      GRID_HEIGHT,
      GRID_SIZE,
      (grid) => {
        const variance = 30;
        const color = { r: 200, g: 100, b: 50, a: 255 };

        for (let x = 0; x < grid.width; x++) {
          for (let y = 0; y < grid.height; y++) {
            const sign = Math.random() > 0.5 ? 1 : -1;
            const random = Math.random() * variance * sign;
            const r = color.r + random;
            const g = color.g + random;
            const b = color.b + random;
            grid.set(x, y, { r, g, b });
          }
        }
      }
    );

    engine.queue((grid) => {
      for (let x = 0; x < grid.width; x++) {
        grid.set(x, 0, { r: 100, g: 0, b: 0 });
        grid.set(x, 1, { r: 100, g: 0, b: 0 });
        grid.set(x, 2, { r: 100, g: 0, b: 0 });
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

type RenderTask = (grid: Grid) => void;

type Cell = {
  x: number;
  y: number;
  color: Color;
};

class Grid {
  public readonly cells: Cell[][] = [];

  constructor(public readonly width: number, public readonly height: number) {}

  public get(x: number, y: number): Cell | undefined {
    try {
      return this.cells[x][y];
    } catch {
      return undefined;
    }
  }

  public set(x: number, y: number, color: Color) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }

    if (!this.cells[x]) {
      this.cells[x] = [];
    }

    this.cells[x][y] = { x, y, color };
  }
}

class RenderEngine {
  private readonly width: number;
  private readonly height: number;
  private readonly context: CanvasRenderingContext2D;
  private readonly renderTasks: RenderTask[] = [];
  private backgroundLayer: ImageData;
  private buffer: ImageData;
  private dispatchTimes: number[] = [];
  private fps: number = 0;

  private constructor(
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
  }

  public static create(
    canvas: HTMLCanvasElement,
    canvasWidth: number,
    canvasHeight: number,
    gridSize: number,
    backgroundLayerTask: RenderTask
  ) {
    const engine = new RenderEngine(
      canvas,
      canvasWidth,
      canvasHeight,
      gridSize
    );

    // Render the background layer
    const grid = engine.fresh();
    backgroundLayerTask(grid);

    // Store the background layer, so we can clone it later
    const data = engine.gridToImageData(grid);
    engine.backgroundLayer = data;

    return engine;
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

    // Fps counter
    if (this.dispatchTimes.length > 20) {
      const baseline = this.dispatchTimes[0];
      const last = this.dispatchTimes[this.dispatchTimes.length - 1];
      this.fps = 1000 / ((last - baseline) / this.dispatchTimes.length);
      this.dispatchTimes = [];
    } else {
      this.dispatchTimes.push(performance.now());
    }

    this.context.fillStyle = "white";
    this.context.font = "16px Consolas";
    this.context.fillText(`fps ${this.fps.toFixed(1)}`, 10, 20);
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

    // Render all tasks into the same grid
    const grid = this.fresh();
    for (const task of this.renderTasks) {
      task(grid);
    }

    // Composite the background layer and the resulting layer of the render tasks
    // by cloning the background layer and drawing the grid on top of it
    const clone = new ImageData(
      this.backgroundLayer.width,
      this.backgroundLayer.height
    );
    clone.data.set(this.backgroundLayer.data);

    // This will leave us with a final buffer that we can dispatch to the canvas
    this.buffer = this.gridToImageData(grid, clone);
  }

  /**
   * Adds a render task to the queue. The task will be executed on the next render cycle.
   * It's composited on top of the previous render task.
   * @param task The render task to add
   */
  public queue(task: RenderTask) {
    this.renderTasks.push(task);
  }

  private fresh(): Grid {
    return new Grid(this.width, this.height);
  }

  private gridToImageData(grid: Grid, data?: ImageData): ImageData {
    // Providing imageData allows us to composite multiple render tasks on top of each other
    data =
      data ?? this.context.createImageData(this.canvasWidth, this.canvasHeight);

    // We skip all empty array slots - rows and cells - that's what's keeping this approach fast
    for (const row of grid.cells) {
      if (!row) continue;

      for (const cell of row) {
        if (!cell) continue;

        const px = cell.x * this.gridSize;
        const py = cell.y * this.gridSize;

        for (let i = px; i < px + this.gridSize; i++) {
          for (let j = py; j < py + this.gridSize; j++) {
            const index = (j * data.width + i) * 4;
            data.data[index] = cell.color.r;
            data.data[index + 1] = cell.color.g;
            data.data[index + 2] = cell.color.b;
            data.data[index + 3] = cell.color.a ?? 255;
          }
        }
      }
    }

    return data;
  }
}
