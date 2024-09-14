import { Color } from "./engine";
import { Coordinate } from "./grid";
import { hslToRgb, randomInteger } from "./util";

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
    frontlineColor: { r: 100, g: 50, b: 50 } as Color,
  },
  entities: {
    enemies: [] as Enemy[],
    towers: [] as Tower[],
  },
  ui: {
    fillStyle: "white",
    font: "16px monospace",
    compositeMode: "difference" as GlobalCompositeOperation,
    compositeColor: { r: 100, g: 50, b: 50, a: 0.8 } as Color,
  },
  user: {
    money: 5,
    towerType: TowerType.Basic,
    frontlineProgress: -1,
    input: {
      holdingRightClick: false,
      mouseGridPos: null as Coordinate | null,
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
  /** Delay between moving to the next cell in ms (Higher is slower) */
  moveRate: number;
  /** Initial health of the enemy */
  initialHealth: number;
};

export type Tower = {
  /** Position of the tower (Grid cell coordinates) */
  pos: Coordinate;
  /** Last time the tower shot (performance.now()) */
  lastShot: number;

  /** Range of the tower, radius in cells */
  range: number;
  /** Damage dealt to enemies in points */
  damage: number;
  /** Delay between shots in ms (Higher is slower) */
  fireRate: number;
  /** Color of the tower */
  color: Color;
  /** Type of the tower */
  type: TowerType;
  /** Cost of the tower */
  cost: number;
};

type StatelessTower = Omit<Tower, "pos" | "lastShot">;

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

export const buildTower = (pos: Coordinate, type: TowerType): Tower => {
  const tower = { pos, lastShot: 0, ...towerFactory[type]() };
  return tower;
};

export const generateEnemy = (minMoveRate: number, maxMoveRate: number): Enemy => {
  const moveRate = randomInteger(minMoveRate, maxMoveRate);

  const h = Math.random();
  const s = 0.88;
  const l = 0.8 - moveRate.normalized / 2;

  const { r, g, b } = hslToRgb(h, s, l);
  const health = moveRate.value * 1.5;

  const enemy: Enemy = {
    progress: 0,
    health,
    lastMove: performance.now(),
    color: { r, g, b },
    moveRate: moveRate.value,
    initialHealth: health,
  };

  return enemy;
};

export const generateEnemyWave = (
  count: number,
  minMoveRate: number,
  maxMoveRate: number,
  spawnDelayFactor: number = 1
): void => {
  let i = 0;
  const spawnEnemy = () => {
    const enemy = generateEnemy(minMoveRate, maxMoveRate);
    state.entities.enemies.push(enemy);

    if (++i < count) {
      setTimeout(spawnEnemy, enemy.moveRate * spawnDelayFactor);
    }
  };

  spawnEnemy();
};
