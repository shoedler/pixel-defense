import { Cell, Color } from ".";

export const state = {
  path: {
    width: 3,
    color: { r: 50, g: 25, b: 12, a: 255 } as Color,
    startY: 0,
    data: [] as Cell[],
  },
  background: {
    color: { r: 200, g: 100, b: 50, a: 255 } as Color,
    variance: 30,
  },
};
