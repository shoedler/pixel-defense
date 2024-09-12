import { Color } from "./engine";
import { Cell, Coordinate, Grid } from "./grid";
import { state } from "./state";

const renderBackground = (grid: Grid) => {
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

const renderPath = (grid: Grid, path: PathMap) => {
  for (const x in path) {
    for (const y in path[x]) {
      grid.set(Number(x), Number(y), path[x][y]);
    }
  }
};

type PathMap = {
  [key: number]: {
    [key: number]: Color;
  };
};

/**
 * Generate a pathmap and a path blueprint randomly.
 * @param width The width of the grid
 * @param height The height of the grid
 * @param pathWidth The width of the path in cells
 * @param pathColor The color of the path
 */
const generatePath = (
  width: number,
  height: number,
  pathWidth: number,
  pathColor: Color
): { path: PathMap; pathBlueprint: Coordinate[] } => {
  const path: PathMap = {};
  const pathBlueprint: Coordinate[] = [];

  const directions = [
    { x: pathWidth, y: 0 }, // Right
    { x: 0, y: -pathWidth }, // Up
    { x: 0, y: pathWidth }, // Down
  ];

  const isWithinBounds = (x: number, y: number): boolean => x >= 0 && x < width && y >= 0 && y < height;
  const isCell = (x: number, y: number, color: Color): boolean => path[x] && path[x][y] && path[x][y] === color;

  const countPathNeighbors = (x: number, y: number): number => {
    const neighbors = [
      { x: x - pathWidth, y: y }, // Left
      { x: x + pathWidth, y: y }, // Right
      { x: x, y: y - pathWidth }, // Up
      { x: x, y: y + pathWidth }, // Down
    ];

    return neighbors.filter(({ x, y }) => isCell(x, y, pathColor)).length;
  };

  const drawSegment = (x: number, y: number): void => {
    // Save the middle point of the segment to the pathfinding data
    const xMiddle = x + Math.floor(pathWidth / 2);
    const yMiddle = y + Math.floor(pathWidth / 2);
    pathBlueprint.push({ x: xMiddle, y: yMiddle });

    // Draw a pathWidth x pathWidth segment on the grid
    for (let dx = 0; dx < pathWidth; dx++) {
      for (let dy = 0; dy < pathWidth; dy++) {
        const cellX = x + dx;
        const cellY = y + dy;

        if (!path[cellX]) {
          path[cellX] = {};
        }
        path[cellX][cellY] = pathColor;
      }
    }
  };

  // Start the path somewhere along the left edge, not touching top (y = 0) or bottom (y = height)
  let currentX = 0;
  let currentY = Math.floor(Math.random() * (height - 2 * pathWidth)) + pathWidth; // Ensure starting position is within bounds

  // Draw the initial segment
  drawSegment(currentX, currentY);

  // Generate the path
  while (currentX < width - pathWidth) {
    // Randomly choose a valid direction
    const validMoves = directions.filter(
      ({ x, y }) =>
        isWithinBounds(currentX + x, currentY + y) &&
        !isCell(currentX + x, currentY + y, pathColor) &&
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

  return { path, pathBlueprint };
};

/**
 * Generate a continuous path from the path blueprint, which is a series of dots
 * This is done by connecting the dots through interpolation
 * @param pathBlueprint The path blueprint
 */
const generatePathfindingData = (pathBlueprint: Coordinate[]): Coordinate[] => {
  const pathfindingData: Coordinate[] = [];
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

  for (let i = 0; i < pathBlueprint.length - 1; i++) {
    const { x: x1, y: y1 } = pathBlueprint[i];
    const { x: x2, y: y2 } = pathBlueprint[i + 1];

    const xInterpolation = interpolate(x1, x2);
    const yInterpolation = interpolate(y1, y2);

    for (const x of xInterpolation) {
      for (const y of yInterpolation) {
        pathfindingData.push({ x, y });
      }
    }
  }

  return pathfindingData;
};

export const generateMap = (grid: Grid) => {
  const { width: pathWidth, color: pathColor, generations: pathGenerations } = state.path;

  const paths: { path: PathMap; pathfindingData: Coordinate[] }[] = [];

  for (let i = 0; i < pathGenerations; i++) {
    const { path, pathBlueprint } = generatePath(grid.width, grid.height, pathWidth, pathColor);
    const pathfindingData = generatePathfindingData(pathBlueprint);
    paths.push({ path, pathfindingData });
  }

  // Choose the longest path
  const { path, pathfindingData } = paths.reduce((a, b) => (a.pathfindingData.length > b.pathfindingData.length ? a : b));

  renderBackground(grid);
  renderPath(grid, path);

  return { path, pathfindingData };
};
