import { RenderTask } from "./engine";
import { Cell } from "./grid";
import { state } from "./state";

const generateBackground: RenderTask = (grid) => {
  const { width, height } = grid;
  const {
    variance,
    color: { r, g, b },
  } = state.background;

  // Background generation
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const sign = Math.random() > 0.5 ? 1 : -1;
      const random = Math.random() * variance * sign;
      grid.set(x, y, { r: r + random, g: g + random, b: b + random });
    }
  }
};

const generatePath: RenderTask<Cell[]> = (grid) => {
  const { width, height } = grid;
  const { width: pathWidth, color } = state.path;
  const pathfindingData: Cell[] = [];

  const directions = [
    { x: pathWidth, y: 0 }, // Right
    { x: 0, y: -pathWidth }, // Up
    { x: 0, y: pathWidth }, // Down
  ];

  // Start the path somewhere along the left edge, not touching top (y = 0) or bottom (y = height)
  let currentX = 0;
  let currentY = Math.floor(Math.random() * (height - 2 * pathWidth)) + pathWidth; // Ensure starting position is within bounds

  // Save the starting position to global state
  state.path.startY = currentY;

  const countPathNeighbors = (x: number, y: number): number => {
    const neighbors = [
      { x: x - pathWidth, y: y }, // Left
      { x: x + pathWidth, y: y }, // Right
      { x: x, y: y - pathWidth }, // Up
      { x: x, y: y + pathWidth }, // Down
    ];

    return neighbors.filter(({ x, y }) => grid.isCell(x, y, color)).length;
  };

  const drawSegment = (x: number, y: number): void => {
    // Save the middle point of the segment to the pathfinding data
    // This calculation should be in sync with the click event listener for tower placement
    const xMiddle = x + Math.floor(pathWidth / 2);
    const yMiddle = y + Math.floor(pathWidth / 2);
    pathfindingData.push({ x: xMiddle, y: yMiddle, color });

    // Draw a pathWidth x pathWidth segment on the grid
    for (let dx = 0; dx < pathWidth; dx++) {
      for (let dy = 0; dy < pathWidth; dy++) {
        grid.set(x + dx, y + dy, color);
      }
    }
  };

  // Draw the initial segment
  drawSegment(currentX, currentY);

  // Generate the path
  while (currentX < width - pathWidth) {
    // Randomly choose a valid direction
    const validMoves = directions.filter(
      ({ x, y }) =>
        grid.isWithinBounds(currentX + x, currentY + y) &&
        !grid.isCell(currentX + x, currentY + y, color) &&
        countPathNeighbors(currentX + x, currentY + y) <= 1 // Ensure next move doesn't touch the path
    );

    if (validMoves.length === 0) {
      alert("No valid moves left. Stopping path generation.");
      break;
    }

    // Choose a random valid move
    const { x: moveX, y: moveY } = validMoves[Math.floor(Math.random() * validMoves.length)];

    // Update the current position
    currentX += moveX;
    currentY += moveY;

    // Draw the new segment
    drawSegment(currentX, currentY);
  }

  // Since a segment is usually larger than one pixel, we need to fill in the gaps between segments in the pathfindingData
  // This is done by interpolating between the middle points of each segment
  const interpolatedPathfindingData: Cell[] = [];
  const interpolate = (a: number, b: number): number[] => {
    if (a === b) {
      return [a];
    }

    const result = [];

    if (a < b) {
      for (let i = a; i < b; i++) {
        result.push(i);
      }
    } else {
      for (let i = a; i > b; i--) {
        result.push(i);
      }
    }

    return result;
  };

  for (let i = 0; i < pathfindingData.length - 1; i++) {
    const { x: x1, y: y1 } = pathfindingData[i];
    const { x: x2, y: y2 } = pathfindingData[i + 1];

    const xInterpolation = interpolate(x1, x2);
    const yInterpolation = interpolate(y1, y2);

    for (const x of xInterpolation) {
      for (const y of yInterpolation) {
        interpolatedPathfindingData.push({ x, y, color });
      }
    }
  }

  return interpolatedPathfindingData;
};

export const backgroundRenderTask: RenderTask<Cell[]> = (grid) => {
  generateBackground(grid);
  return generatePath(grid);
};
