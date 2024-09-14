import { GRID_SIZE } from ".";
import { Color } from "./engine";
import { Coordinate } from "./grid";

/**
 * Draws a line on the canvas.
 * @param context The canvas rendering context
 * @param from The starting coordinate (Grid cell coordinates)
 * @param to The ending coordinate (Grid cell coordinates)
 * @param color The color of the line
 * @param scale The scale of the line, 1 is @see GRID_SIZE
 */
export const drawLine = (context: CanvasRenderingContext2D, from: Coordinate, to: Coordinate, color: Color, scale: number) => {
  const ofs = GRID_SIZE / 2;
  context.beginPath();
  context.moveTo(from.x * GRID_SIZE + ofs, from.y * GRID_SIZE + ofs);
  context.lineTo(to.x * GRID_SIZE + ofs, to.y * GRID_SIZE + ofs);
  context.lineWidth = GRID_SIZE * scale;
  context.strokeStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
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
  context.beginPath();
  context.arc(at.x * GRID_SIZE + ofs, at.y * GRID_SIZE + ofs, GRID_SIZE * scale, 0, 2 * Math.PI);
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

  context.fillStyle = "red";
  context.fillRect(enemyPos.x * GRID_SIZE + GRID_SIZE * 0.1, enemyPos.y * GRID_SIZE - barHeight, barWidth, barHeight);
  context.fillStyle = "rgb(0, 230, 0)";
  context.fillRect(
    enemyPos.x * GRID_SIZE + GRID_SIZE * 0.1,
    enemyPos.y * GRID_SIZE - barHeight * health,
    barWidth,
    barHeight * health
  );
};

export const draw45DegSquare = (context: CanvasRenderingContext2D, color: Color, x: number, y: number, size: number) => {
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
