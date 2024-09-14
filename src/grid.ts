import { Color } from "./engine";

export type Coordinate = {
  x: number;
  y: number;
};

export type Cell = Coordinate & {
  color: Color;
};

export const sameCoordinate = (a: Coordinate, b: Coordinate) => a.x === b.x && a.y === b.y;

export class Grid {
  public readonly cells: Cell[][] = [];

  constructor(public readonly width: number, public readonly height: number) {}

  public set(pos: Coordinate, color: Color) {
    const { x, y } = pos;
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }

    if (!this.cells[x]) {
      this.cells[x] = [];
    }

    this.cells[x][y] = { x, y, color };
  }
}
