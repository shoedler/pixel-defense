import { Grid } from "./grid";
import { state } from "./state";

export type Color = { r: number; g: number; b: number; a?: number };

export type RenderTask<T = void> = (grid: Grid, background?: Grid) => T;

export type PostProcessingTask = (context: CanvasRenderingContext2D) => void;

export type PostProcessingEffect = {
  frames: PostProcessingTask[];
};

export class RenderEngine {
  private readonly width: number;
  private readonly height: number;
  private readonly context: CanvasRenderingContext2D;
  private readonly renderTasks: RenderTask[] = [];
  private readonly postProcessingTasks: PostProcessingTask[] = [];
  private readonly oneShotPostProcessingTasks: PostProcessingTask[] = [];
  private postProcessingEffects: PostProcessingEffect[] = [];
  private backgroundLayer: { data: ImageData; grid: Grid };
  private buffer: ImageData;
  private dispatchTimes: number[] = [];
  private fps: number = 0;

  public constructor(
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

    this.context.fillStyle = state.ui.fillStyle;
    this.context.font = state.ui.font;
    this.context.fillText(`fps ${this.fps.toFixed(1)}`, 10, 20);

    // Post processing tasks
    for (const task of this.postProcessingTasks) {
      task(this.context);
    }

    // Post processing effects
    const newPostProcessingEffects: PostProcessingEffect[] = [];
    for (const effect of this.postProcessingEffects) {
      const frame = effect.frames.shift();
      if (frame) {
        frame(this.context);
        if (effect.frames.length > 0) {
          newPostProcessingEffects.push(effect);
        }
      }
    }
    this.postProcessingEffects = newPostProcessingEffects;

    // One-shot post processing tasks
    let oneShotTask: PostProcessingTask;
    while ((oneShotTask = this.oneShotPostProcessingTasks.shift())) {
      oneShotTask(this.context);
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
   * Sets the background layer of the engine.
   */
  public setBackgroundLayer(grid: Grid) {
    // Store the background layer, so we can clone it later
    const data = this.gridToImageData(grid);
    this.backgroundLayer = { data, grid };
  }

  /**
   * Adds a render task to the queue. The task will be executed on the next render cycle.
   * It's composited on top of the previous render task.
   * @param task The render task to add
   */
  public registerRenderTask(task: RenderTask) {
    this.renderTasks.push(task);
  }

  /**
   * Adds a post processing task to the queue. The task will be executed on the next dispatch cycle.
   * It's composited on top of the rendered scene.
   * @param task The post processing task to add
   */
  public registerPostProcessingTask(task: PostProcessingTask) {
    this.postProcessingTasks.push(task);
  }

  /**
   * Adds a one-shot post processing task to the queue. The task will be executed on the next dispatch cycle and then discarded.
   * It's composited on top of the rendered scene.
   * @param task The post processing task to add
   */
  public queueOneShotPostProcessingTask(task: PostProcessingTask) {
    this.oneShotPostProcessingTasks.push(task);
  }

  /**
   * Adds a post processing effect to the queue. The effect will start execution on the next dispatch cycle.
   * From that point on, the effect will be executed on every dispatch cycle until it's frame list is exhausted.
   * After that, the effect is considered finished and will be removed from the queue.
   * @param effect The post processing effect to add
   */
  public queuePostProcessingEffect(effect: PostProcessingEffect) {
    this.postProcessingEffects.push(effect);
  }

  /**
   * Creates a fresh grid instance with the same dimensions as the engine's grid.
   * @returns A fresh grid instance with the same dimensions as the engine's grid
   */
  public fresh(): Grid {
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
