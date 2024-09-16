import { GRID_HEIGHT, GRID_SIZE, GRID_WIDTH } from ".";
import { Color } from "./engine";
import { Coordinate } from "./grid";

/**
 * Composes a drawing operation with a global composite operation.
 * @param context The canvas rendering context
 * @param type The global composite operation type
 * @param callback The drawing operation
 */
export const compose = (context: CanvasRenderingContext2D, type: GlobalCompositeOperation, callback: () => void) => {
  context.globalCompositeOperation = type;
  callback();
  context.globalCompositeOperation = "source-over";
};

/**
 * Draws a line on the canvas.
 * @param context The canvas rendering context
 * @param from The starting coordinate (Grid cell coordinates)
 * @param to The ending coordinate (Grid cell coordinates)
 * @param color The color of the line
 * @param scale The scale of the line, 1 is @see GRID_SIZE
 * @param alpha The alpha of the line, 0-1
 */
export const drawLine = (
  context: CanvasRenderingContext2D,
  from: Coordinate,
  to: Coordinate,
  color: Color,
  scale: number,
  alpha: number
) => {
  const ofs = GRID_SIZE / 2;
  const fromX = from.x * GRID_SIZE + ofs;
  const fromY = from.y * GRID_SIZE + ofs;
  const toX = to.x * GRID_SIZE + ofs;
  const toY = to.y * GRID_SIZE + ofs;

  scale *= GRID_SIZE;

  context.beginPath();
  context.moveTo(fromX, fromY);
  context.lineTo(toX, toY);
  context.lineWidth = scale;
  context.strokeStyle = `rgb(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
  context.stroke();
};

/**
 * Draws a circle on the canvas.
 * @param context The canvas rendering context
 * @param at The center of the circle (Grid cell coordinates)
 * @param color The color of the circle
 * @param scale The scale of the circle, 1 is @see GRID_SIZE
 */
export const drawCircle = (context: CanvasRenderingContext2D, at: Coordinate, color: Color, scale: number, alpha: number) => {
  const ofs = GRID_SIZE / 2;
  const x = at.x * GRID_SIZE + ofs;
  const y = at.y * GRID_SIZE + ofs;

  scale *= GRID_SIZE;

  context.beginPath();
  context.arc(x, y, scale, 0, 2 * Math.PI);
  context.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
  context.fill();
};

/**
 * Draws a health bar above the enemy.
 * @param context The canvas rendering context
 * @param enemyPos The position of the enemy (Grid cell coordinates)
 * @param health The health of the enemy, normalized to 0-1
 */
export const drawHealthBar = (context: CanvasRenderingContext2D, enemyPos: Coordinate, health: number) => {
  const barWidth = GRID_SIZE * 0.8;
  const barHeight = GRID_SIZE * 2;
  const x = enemyPos.x * GRID_SIZE + GRID_SIZE * 0.1;
  const y = enemyPos.y * GRID_SIZE - barHeight;
  const yHealth = enemyPos.y * GRID_SIZE - barHeight * health;

  context.fillStyle = "red";
  context.fillRect(x, y, barWidth, barHeight);
  context.fillStyle = "rgb(0, 230, 0)";
  context.fillRect(x, yHealth, barWidth, barHeight * health);
};

/**
 * Draws a square on the canvas.
 * @param context The canvas rendering context
 * @param at The center of the square (Grid cell coordinates)
 * @param color The color of the square
 * @param size The size of the square, 1 is @see GRID_SIZE (Manhattan distance)
 */
export const drawManhattanSquare = (context: CanvasRenderingContext2D, color: Color, at: Coordinate, size: number) => {
  const ofs = GRID_SIZE / 2;
  const x = at.x * GRID_SIZE + ofs;
  const y = at.y * GRID_SIZE + ofs;

  size *= GRID_SIZE;

  context.beginPath();
  context.moveTo(x - size, y);
  context.lineTo(x, y - size);
  context.lineTo(x + size, y);
  context.lineTo(x, y + size);
  context.closePath();

  context.lineWidth = GRID_SIZE * 0.5;
  context.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 1)`;
  context.stroke();
  context.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.2)`;
  context.fill();
};

/**
 * Fill the screen with a color.
 * @param context The canvas rendering context
 * @param color The color to fill the screen with
 */
export const drawFillScreen = (context: CanvasRenderingContext2D, color: Color) => {
  context.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a ?? 1})`;
  context.fillRect(0, 0, GRID_WIDTH * GRID_SIZE, GRID_WIDTH * GRID_SIZE);
};

/**
 * Draws the game-ending screen.
 * @param context The canvas rendering context
 * @param message The message to display
 */
export const drawGameEndingScreen = (context: CanvasRenderingContext2D, message: string) => {
  const width = GRID_WIDTH * GRID_SIZE;
  const height = GRID_HEIGHT * GRID_SIZE;

  drawFillScreen(context, { r: 0, g: 0, b: 0, a: 0.8 });

  // Huge victory message
  context.font = "48px monospace";
  context.fillStyle = "white";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(message, width / 2, height / 2);
};

/**
 * Draws the advancing frontline.
 * @param context The canvas rendering context
 * @param progress The progress of the frontline (Grid cell count)
 * @param color The color of the frontline
 */
export const drawFrontline = (context: CanvasRenderingContext2D, progress: number, color: Color) => {
  if (progress < 0) {
    return;
  }

  const ofs = GRID_SIZE / 2;
  const height = GRID_WIDTH * GRID_SIZE;
  const x = progress * GRID_SIZE + ofs;

  context.beginPath();
  context.moveTo(x, 0);
  context.lineTo(x, height);
  context.lineWidth = GRID_SIZE;
  context.strokeStyle = `rgb(${color.r}, ${color.g}, ${color.b}, 0.8)`;
  context.stroke();

  context.lineWidth = 0;
  context.lineTo(0, height);
  context.lineTo(0, 0);
  context.lineTo(x, 0);
  context.closePath();

  compose(context, "hue", () => {
    context.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.7)`;
    context.fill();
  });
};

/**
 * Draws a vignette around the screen.
 * @param context The canvas rendering context
 */
export const drawVignette = (context: CanvasRenderingContext2D) => {
  const width = GRID_WIDTH * GRID_SIZE;
  const height = GRID_HEIGHT * GRID_SIZE;
  const centerX = width / 2;
  const centerY = height / 2;

  // Calculate the maximum radius (distance from the center to a corner)
  const radius = Math.hypot(centerX, centerY);

  // Create a radial gradient
  const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);

  // Define the color stops
  gradient.addColorStop(0.5, "rgba(0, 0, 0, 0)"); // Transparent at the center
  gradient.addColorStop(1, "rgba(0, 0, 0, 0.5)"); // Semi-transparent black at the edges

  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
};
