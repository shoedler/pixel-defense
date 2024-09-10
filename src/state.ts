import { Cell, Color } from ".";

export type Enemy = {
  progress: number;
  health: number;
  color: Color;
  lastMove: number;
  speed: number;
};

export type Tower = {
  x: number;
  y: number;
  range: number;
  damage: number;
  lastShot: number;
  color: Color;
};

export const state = {
  path: {
    width: 3,
    color: { r: 50, g: 25, b: 12, a: 255 } as Color,
    startY: 0,
  },
  background: {
    color: { r: 200, g: 100, b: 50, a: 255 } as Color,
    variance: 30,
  },
  entities: {
    enemies: [] as Enemy[],
    towers: [] as Tower[],
  },
};
