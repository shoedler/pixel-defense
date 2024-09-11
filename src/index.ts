import { backgroundRenderTask } from "./background";
import { RenderEngine } from "./engine";
import { Cell } from "./grid";
import { SoundGenerator } from "./sound";
import { Enemy, generateEnemy, generateTower, state, Tower, TowerType } from "./state";

const TICK_RATE = 40; // ticks per second
const TICK_DURATION = 1000 / TICK_RATE; // duration of a tick in milliseconds
const GRID_WIDTH = 1000; // pixels
const GRID_HEIGHT = 800; // pixels
const GRID_SIZE = 3; // pixels per grid cell (width and height)

(() => {
  document.addEventListener("DOMContentLoaded", (_) => {
    const sketch = document.querySelector(".sketch") as HTMLDivElement;
    const canvas = document.createElement("canvas");
    sketch.appendChild(canvas);

    // Create the sound generator
    const soundGenerator = new SoundGenerator();

    // Create & configure the render engine
    const { engine, taskResult: pathfindingData } = RenderEngine.create(
      canvas,
      GRID_WIDTH,
      GRID_HEIGHT,
      GRID_SIZE,
      backgroundRenderTask
    );

    // Render task for entities
    engine.queue((grid) => {
      for (const enemy of state.entities.enemies) {
        const { x, y } = pathfindingData[enemy.progress];
        grid.set(x, y, enemy.color);
      }
      for (const tower of state.entities.towers) {
        const { x, y, color } = tower;
        grid.set(x, y, color);
      }
    });

    // Post processing task for fire missions
    engine.post((context) => {
      while (state.entities.fireMissions.length) {
        const { tower, target } = state.entities.fireMissions.pop()!;
        const { x, y } = pathfindingData[target.progress];
        const ofs = GRID_SIZE / 2;
        context.beginPath();
        context.moveTo(tower.x * GRID_SIZE + ofs, tower.y * GRID_SIZE + ofs);
        context.lineTo(x * GRID_SIZE + ofs, y * GRID_SIZE + ofs);
        context.lineWidth = 3;
        context.strokeStyle = `rgb(${tower.color.r}, ${tower.color.g}, ${tower.color.b})`;
        context.stroke();

        // Play a sound and reduce the health of the target
        // TODO: Unsure if we really want to do both of these things in the render loop...
        soundGenerator.playGunshot(tower.type);
        target.health -= tower.damage;
      }
    });

    // Event listener for placing / removing towers
    document.addEventListener("click", (event) => {
      const { x, y } = event;
      const { width, height } = canvas;
      const { left, top } = canvas.getBoundingClientRect();

      // Bail out if the click was outside the canvas
      if (x < left || x > left + width || y < top || y > top + height) {
        return;
      }

      // Calculate the relative position of the click within the canvas
      const relativeX = x - left;
      const relativeY = y - top;

      // Calculate the grid cell that was clicked, based on the GRID_SIZE
      const gridX = Math.floor(((relativeX / width) * GRID_WIDTH) / GRID_SIZE);
      const gridY = Math.floor(((relativeY / height) * GRID_HEIGHT) / GRID_SIZE);

      // Check if a tower already exists at the clicked position
      if (state.entities.towers.some((tower) => tower.x === gridX && tower.y === gridY)) {
        // TODO: Either remove the tower or show a message to the user
        console.log("Tower already exists at this position");
        return;
      }

      // Add a tower at the clicked position
      const randomType = [TowerType.Basic, TowerType.Sniper, TowerType.Machinegun][Math.floor(Math.random() * 3)] as TowerType;
      generateTower(gridX, gridY, randomType);
    });

    engine.reset();

    // Define the update function for all entities. This function is idempotent, thus it can be called multiple times without side effects.
    const update = idempotent(() => {
      state.entities.enemies = updateEnemies(state.entities.enemies, pathfindingData);
      updateTowers(state.entities.towers, state.entities.enemies, pathfindingData);
    });

    // Define the game loop
    let lastTime = 0;
    function gameLoop(currentTime: number) {
      const deltaTime = currentTime - lastTime;

      engine.render();
      update();

      if (state.entities.enemies.length < 50) {
        generateEnemy();
      }

      if (deltaTime > TICK_DURATION) {
        lastTime = currentTime - (deltaTime % TICK_DURATION);
        engine.dispatch();
      }

      requestAnimationFrame(gameLoop);
    }

    // Start
    requestAnimationFrame(gameLoop);
  });
})();

const updateEnemies = (enemies: Enemy[], pathfindingData: Cell[]): Enemy[] => {
  let aliveEnemies = enemies.filter((enemy) => enemy.health > 0);
  for (const enemy of aliveEnemies) {
    if (enemy.lastMove + enemy.speed > performance.now()) {
      continue;
    }

    if (enemy.progress < pathfindingData.length - 1) {
      enemy.progress++;
    }

    enemy.lastMove = performance.now();
  }

  return aliveEnemies;
};

const updateTowers = (towers: Tower[], enemies: Enemy[], pathfindingData: Cell[]) => {
  for (const tower of towers) {
    if (tower.lastShot + tower.fireRate > performance.now()) {
      continue;
    }

    const target = enemies.find((enemy) => Math.abs(tower.x - pathfindingData[enemy.progress].x) <= tower.range);

    if (target) {
      state.entities.fireMissions.push({ tower, target });
      tower.lastShot = performance.now();
    }
  }
};

const idempotent = <T extends Function>(fn: T): T => {
  let lastCall = 0;
  return ((...args: any) => {
    if (performance.now() - lastCall > TICK_DURATION) {
      lastCall = performance.now();
      fn(...args);
    }
  }) as any;
};
