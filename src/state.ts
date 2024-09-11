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
  /** Range of the tower, radius in engine-pixels */
  range: number;
  /** Damage dealt to enemies in points */
  damage: number;
  /** Last time the tower shot (performance.now()) */
  lastShot: number;
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

export type FireMission = {
  /** Tower that is shooting */
  tower: Tower;
  /** Target enemy */
  target: Enemy;
};

export const state = {
  path: {
    width: 3,
    color: { r: 50, g: 25, b: 12, a: 255 } as Color,
    startY: 0,
  },
  background: {
    color: { r: 100, g: 100, b: 25, a: 255 } as Color,
    variance: 30,
  },
  entities: {
    enemies: [] as Enemy[],
    towers: [] as Tower[],
    fireMissions: [] as FireMission[],
  },
};

export const generateTower = (x: number, y: number, type: TowerType): void => {
  const pushTower = (tower: Omit<Tower, "x" | "y" | "lastShot" | "type">) =>
    state.entities.towers.push({ x, y, type, lastShot: 0, ...tower });

  switch (type) {
    case TowerType.Basic:
      pushTower({ range: 10, damage: 2, fireRate: 100, color: { r: 200, g: 200, b: 255 } });
      return;
    case TowerType.Sniper:
      pushTower({ range: 20, damage: 5, fireRate: 500, color: { r: 255, g: 200, b: 200 } });
      return;
    case TowerType.Machinegun:
      pushTower({ range: 5, damage: 1, fireRate: 50, color: { r: 200, g: 255, b: 200 } });
      return;
  }
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
