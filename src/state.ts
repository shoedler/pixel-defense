import { Color } from "./engine";
import { hslToRgb } from "./util";

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

export type Enemy = {
  /** Integer between 0 and path length */
  progress: number;
  /** Integer between 0 and 100 */
  health: number;
  /** Last time the enemy moved (performance.now()) */
  lastMove: number;

  /** Color of the enemy */
  color: Color;
  /** Delay between moving to the next engine-pixel in ms */
  speed: number;
  /** Initial health of the enemy */
  initialHealth: number;
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
  /** Cost of the tower */
  cost: number;
};

type StatelessTower = Omit<Tower, "x" | "y" | "lastShot">;

export const towerFactory: { [key in TowerType]: () => StatelessTower } = {
  [TowerType.Basic]: () => ({
    range: 15,
    damage: 3,
    fireRate: 160,
    color: { r: 200, g: 200, b: 255 },
    type: TowerType.Basic,
    cost: 1,
  }),
  [TowerType.Sniper]: () => ({
    range: 30,
    damage: 6,
    fireRate: 300,
    color: { r: 255, g: 200, b: 200 },
    type: TowerType.Sniper,
    cost: 1,
  }),
  [TowerType.Machinegun]: () => ({
    range: 10,
    damage: 2,
    fireRate: 80,
    color: { r: 200, g: 255, b: 200 },
    type: TowerType.Machinegun,
    cost: 1,
  }),
};

export const generateTower = (x: number, y: number, type: TowerType): Tower => {
  const tower = { x, y, lastShot: 0, ...towerFactory[type]() };
  state.entities.towers.push(tower);
  return tower;
};

export const generateEnemy = (): void => {
  const randInt = (min: number, max: number) => {
    const value = Math.floor(Math.random() * (max - min + 1)) + min;
    const normalized = (value - min) / (max - min);
    return {
      value,
      normalized,
    };
  };

  const speed = randInt(100, 500);

  const h = Math.random();
  const s = 0.85;
  const l = 0.8 - speed.normalized / 2;

  const { r, g, b } = hslToRgb(h, s, l);
  const health = speed.value * 1.5;

  state.entities.enemies.push({
    progress: 0,
    health,
    lastMove: performance.now(),
    color: { r, g, b },
    speed: speed.value,
    initialHealth: health,
  });
};
