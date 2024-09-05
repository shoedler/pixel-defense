import { backgroundRenderTask } from "./background";
import { state } from "./state";

const TICK_RATE = 40; // ticks per second
const TICK_DURATION = 1000 / TICK_RATE; // duration of a tick in milliseconds
const GRID_WIDTH = 1000; // pixels
const GRID_HEIGHT = 800; // pixels
const GRID_SIZE = 5; // pixels per grid cell (width and height)

(() => {
  document.addEventListener("DOMContentLoaded", _ => {
    const sketch = document.querySelector(".sketch") as HTMLDivElement;
    const canvas = document.createElement("canvas");
    sketch.appendChild(canvas);

    // Create & configure the render engine
    const engine = RenderEngine.create(
      canvas,
      GRID_WIDTH,
      GRID_HEIGHT,
      GRID_SIZE,
      backgroundRenderTask
    );

    const bloke = {
      x: 0,
      y: state.path.startY,
      dir: { x: 1, y: 0 },
      c: 0,
    };

    engine.queue((grid, background) => {
      const blokeColor = { r: 255, g: 255, b: 255, a: 255 };

      bloke.c++;
      if (bloke.c % 5 !== 0) {
        grid.set(bloke.x, bloke.y, blokeColor);
        return;
      }

      // Helper function to check if the bloke can move to a given position
      const canMove = ({ x, y }: { x: number; y: number }): boolean => {
        return (
          grid.isWithinBounds(bloke.x + x, bloke.y + y) && // Is it within grid bounds?
          background.isCell(bloke.x + x, bloke.y + y, state.path.color) // Is it on the path?
        );
      };

      // Helper function to move the bloke to a given position
      const moveBloke = (x: number, y: number): void => {
        grid.set(x, y, blokeColor);
        bloke.x = x;
        bloke.y = y;
      };

      // Try to move in the current direction first.
      if (canMove(bloke.dir)) {
        moveBloke(bloke.x + bloke.dir.x, bloke.y + bloke.dir.y);
        return;
      }

      const neighbors = [
        { x: 1, y: 0 }, // Right
        { x: 0, y: -1 }, // Up
        { x: 0, y: 1 }, // Down
      ];

      const validDirs = neighbors.filter(canMove);

      if (validDirs.length === 0) {
        console.log("No valid dirs");
        return;
      }

      // If there are multiple valid directions, prioritize moving right
      const nextDir = validDirs.find(({ x }) => x === 1) ?? validDirs[0];
      bloke.dir = nextDir;

      moveBloke(bloke.x + bloke.dir.x, bloke.y + bloke.dir.y);
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

export type Color = { r: number; g: number; b: number; a?: number };

export type RenderTask = (grid: Grid, background?: Grid) => void;

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

  public isWithinBounds = (x: number, y: number): boolean => {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  };

  public isCell = (x: number, y: number, color: Color): boolean => {
    const cell = this.get(x, y);
    return cell !== undefined && cell.color === color;
  };
}

class RenderEngine {
  private readonly width: number;
  private readonly height: number;
  private readonly context: CanvasRenderingContext2D;
  private readonly renderTasks: RenderTask[] = [];
  private backgroundLayer: { data: ImageData; grid: Grid };
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
    engine.backgroundLayer = { data, grid };

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
    this.buffer = undefined;

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
    this.context.font = "12px Consolas";
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
      task(grid, this.backgroundLayer.grid);
    }

    // Composite the background layer and the resulting layer of the render tasks
    // by cloning the background layer and drawing the grid on top of it
    const clone = new ImageData(
      this.backgroundLayer.data.width,
      this.backgroundLayer.data.height
    );
    clone.data.set(this.backgroundLayer.data.data);

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
