import { Color } from "./engine";

export type Enemy = {
  /** Integer between 0 and path length */
  progress: number;
  /** Integer between 0 and 100 */
  health: number;
  /** Color of the enemy */
  color: Color;
  /** Last time the enemy moved (performance.now()) */
  lastMove: number;
  /** Delay between moving to the next engine-pixel in ms */
  speed: number;
};

export type Tower = {
  /** Grid cell x coordinate on the map */
  x: number;
  /** Grid cell y coordinate on the map */
  y: number;
  /** Last time the tower shot (performance.now()) */
  lastShot: number;

  /** Range of the tower, radius in engine-pixels */
  range: number;
  /** Damage dealt to enemies in points */
  damage: number;
  /** Delay between shots in ms */
  fireRate: number;
  /** Color of the tower */
  color: Color;
  /** Type of the tower */
  type: TowerType;
};

export enum TowerType {
  Basic,
  Sniper,
  Machinegun,
}

export const state = {
  path: {
    width: 3,
    color: { r: 50, g: 25, b: 12, a: 255 } as Color,
    generations: 100,
  },
  background: {
    color: { r: 100, g: 100, b: 25, a: 255 } as Color,
    variance: 30,
  },
  entities: {
    enemies: [] as Enemy[],
    towers: [] as Tower[],
  },
  ui: {
    fillStyle: "white",
    font: "16px monospace",
  },
  user: {
    money: 5,
    towerType: TowerType.Basic,
    input: {
      holdingRightClick: false,
      mouse: null as { gridX: number; gridY: number } | null,
    },
  },
  sound: {
    volume: 0.05,
  },
};

type StatlessTower = Omit<Tower, "x" | "y" | "lastShot">;

export const towerFactory: { [key in TowerType]: () => StatlessTower } = {
  [TowerType.Basic]: () => ({
    range: 15,
    damage: 2,
    fireRate: 100,
    color: { r: 200, g: 200, b: 255 },
    type: TowerType.Basic,
  }),
  [TowerType.Sniper]: () => ({
    range: 30,
    damage: 5,
    fireRate: 500,
    color: { r: 255, g: 200, b: 200 },
    type: TowerType.Sniper,
  }),
  [TowerType.Machinegun]: () => ({
    range: 10,
    damage: 2,
    fireRate: 50,
    color: { r: 200, g: 255, b: 200 },
    type: TowerType.Machinegun,
  }),
};

export const generateTower = (x: number, y: number, type: TowerType): void => {
  state.entities.towers.push({ x, y, lastShot: 0, ...towerFactory[type]() });
};

export const generateEnemy = (): void => {
  const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  state.entities.enemies.push({
    progress: 0,
    health: 100,
    color: { r: randInt(100, 255), g: randInt(100, 255), b: randInt(100, 255) },
    lastMove: performance.now(),
    speed: randInt(100, 500),
  });
};
