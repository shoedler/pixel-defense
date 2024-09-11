import { Grid } from "./grid";

export type Color = { r: number; g: number; b: number; a?: number };

export type RenderTask<T = void> = (grid: Grid, background?: Grid) => T;

export type PostProcessingTask = (context: CanvasRenderingContext2D) => void;

export class RenderEngine {
  private readonly width: number;
  private readonly height: number;
  private readonly context: CanvasRenderingContext2D;
  private readonly renderTasks: RenderTask[] = [];
  private readonly postProcessingTasks: PostProcessingTask[] = [];
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

  public static create<T = void>(
    canvas: HTMLCanvasElement,
    canvasWidth: number,
    canvasHeight: number,
    gridSize: number,
    backgroundLayerTask: RenderTask<T>
  ): { engine: RenderEngine; taskResult: T } {
    const engine = new RenderEngine(canvas, canvasWidth, canvasHeight, gridSize);

    // Render the background layer
    const grid = engine.fresh();
    const taskResult = backgroundLayerTask(grid);

    // Store the background layer, so we can clone it later
    const data = engine.gridToImageData(grid);
    engine.backgroundLayer = { data, grid };

    return { engine, taskResult };
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

    // Post processing tasks
    for (const task of this.postProcessingTasks) {
      task(this.context);
    }
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
    const clone = new ImageData(this.backgroundLayer.data.width, this.backgroundLayer.data.height);
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

  /**
   * Adds a post processing task to the queue. The task will be executed on the next dispatch cycle.
   * It's composited on top of the rendered scene.
   * @param task The post processing task to add
   */
  public post(task: PostProcessingTask) {
    this.postProcessingTasks.push(task);
  }

  private fresh(): Grid {
    return new Grid(this.width, this.height);
  }

  private gridToImageData(grid: Grid, data?: ImageData): ImageData {
    // Providing imageData allows us to composite multiple render tasks on top of each other
    data = data ?? this.context.createImageData(this.canvasWidth, this.canvasHeight);

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
