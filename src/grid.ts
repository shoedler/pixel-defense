import { Color } from "./engine";

export type Cell = {
  x: number;
  y: number;
  color: Color;
};

export class Grid {
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
