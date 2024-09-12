import { backgroundRenderTask } from "./background";
import { RenderEngine } from "./engine";
import { SoundGenerator } from "./sound";
import { Enemy, generateEnemy, generateTower, state, Tower, TowerType } from "./state";
import { elementDimensions } from "./util";

const { innerWidth: viewportWidth, innerHeight: viewportHeight } = window;
const { height: headerHeight } = elementDimensions(document.getElementsByClassName("wrapper")[0] as HTMLElement);

const TICK_RATE = 40; // ticks per second
const TICK_DURATION = 1000 / TICK_RATE; // duration of a tick in milliseconds
const GRID_WIDTH = viewportWidth * 0.999;
const GRID_HEIGHT = (viewportHeight - headerHeight) * 0.999;
const GRID_SIZE = 8; // pixels per grid cell (width and height)

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
    engine.registerRenderTask((grid) => {
      for (const enemy of state.entities.enemies) {
        const { x, y } = pathfindingData[enemy.progress];
        grid.set(x, y, enemy.color);
      }
      for (const tower of state.entities.towers) {
        const { x, y, color } = tower;
        grid.set(x, y, color);
      }
    });

    // Post processing task for UI
    engine.registerPostProcessingTask((context) => {
      context.fillStyle = state.ui.fillStyle;
      context.font = state.ui.font;
      context.fillText(
        `enemies: ${state.entities.enemies.length} / towers: ${state.entities.towers.length}`,
        GRID_WIDTH * 0.75,
        20
      );

      context.fillText(`money: ${state.user.money}`, GRID_WIDTH * 0.75, 40);
      context.fillText(`tower type: ${TowerType[state.user.towerType]}`, GRID_WIDTH * 0.75, 60);

      const dps = state.entities.towers.reduce((acc, tower) => acc + tower.damage * (1000 / tower.fireRate), 0);
      context.fillText(`dps: ${dps}`, GRID_WIDTH * 0.75, 80);

      const totalEnemyHealth = state.entities.enemies.reduce((acc, enemy) => acc + enemy.health, 0);
      context.fillText(`total enemy health: ${totalEnemyHealth}`, GRID_WIDTH * 0.75, 100);
    });

    // Event listener for changing the tower type
    document.addEventListener("keydown", (event) => {
      const key = event.key;
      if (key === "1") {
        state.user.towerType = TowerType.Basic;
      } else if (key === "2") {
        state.user.towerType = TowerType.Sniper;
      } else if (key === "3") {
        state.user.towerType = TowerType.Machinegun;
      }
    });

    // Event listener for placing / removing towers
    document.addEventListener("mouseup", (event) => {
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
      const tower = state.entities.towers.find((tower) => tower.x === gridX && tower.y === gridY);

      // If there is a tower at the clicked position, remove it or bail out if the user wants to place a tower there
      if (tower) {
        if (event.shiftKey) {
          state.entities.towers = state.entities.towers.filter((t) => t !== tower);
          soundGenerator.playRemovePlacement();
        } else {
          soundGenerator.playInvalidPlacement();
        }
        return;
      }

      // It's also invalid to place a tower on the path
      if (
        pathfindingData.some((cell) => {
          // This should be in sync with the pathgen logic
          let { x, y } = cell;
          x -= Math.floor(state.path.width / 2);
          y -= Math.floor(state.path.width / 2);
          return x <= gridX && gridX < x + state.path.width && y <= gridY && gridY < y + state.path.width;
        })
      ) {
        soundGenerator.playInvalidPlacement();
        return;
      }

      // Bail out if the user doesn't have enough money
      if (state.user.money < 1) {
        soundGenerator.playNotEnoughMoney();
        return;
      }

      // Add a tower at the clicked position
      soundGenerator.playPlacement();
      state.user.money -= 1;
      generateTower(gridX, gridY, state.user.towerType);
    });

    engine.reset();

    // Update function for enemies, runs every tick
    const tickEnemies = (enemies: Enemy[]): Enemy[] => {
      const aliveEnemies = enemies.filter((enemy) => enemy.health > 0);

      // The player earns money for each enemy that reaches the end of the path
      state.user.money += enemies.length - aliveEnemies.length;

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

    const tickTowers = (towers: Tower[], enemies: Enemy[]) => {
      for (const tower of towers) {
        if (tower.lastShot + tower.fireRate > performance.now()) {
          continue;
        }

        const target = enemies.find((enemy) => {
          // Check if the enemy is within range of the tower (Manhattan distance)
          const { x, y } = pathfindingData[enemy.progress];
          return Math.abs(x - tower.x) + Math.abs(y - tower.y) <= tower.range;
        });

        if (target) {
          // Queue a post processing task to draw the shot
          // This is nice because this will also play the gunshot sound and apply damage to the target, meaning that everything happens in the same tick
          const { x, y } = pathfindingData[target.progress];
          const ofs = GRID_SIZE / 2;

          const drawLine = (context: CanvasRenderingContext2D, scale: number) => {
            context.beginPath();
            context.moveTo(tower.x * GRID_SIZE + ofs, tower.y * GRID_SIZE + ofs);
            context.lineTo(x * GRID_SIZE + ofs, y * GRID_SIZE + ofs);
            context.lineWidth = GRID_SIZE * scale;
            context.strokeStyle = `rgb(${tower.color.r}, ${tower.color.g}, ${tower.color.b})`;
            context.stroke();
          };

          engine.queuePostProcessingEffect({
            frames: [
              (context: CanvasRenderingContext2D) => {
                // Play the gunshot sound and apply damage to the target
                soundGenerator.playGunshot(tower.type);
                target.health -= tower.damage;
                drawLine(context, 0.9);
              },
              (context: CanvasRenderingContext2D) => drawLine(context, 0.7),
              (context: CanvasRenderingContext2D) => drawLine(context, 0.2),
            ],
          });

          tower.lastShot = performance.now();
        }
      }
    };

    // Define the update function for all entities. This function is idempotent, thus it can be called multiple times without side effects.
    const update = idempotent(() => {
      state.entities.enemies = tickEnemies(state.entities.enemies);
      tickTowers(state.entities.towers, state.entities.enemies);
    });

    // Define the game loop
    let lastTime = 0;
    const gameLoop = (currentTime: number): void => {
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
    };

    // Start
    requestAnimationFrame(gameLoop);
  });
})();

const idempotent = <T extends Function>(fn: T): T => {
  let lastCall = 0;
  return ((...args: any) => {
    if (performance.now() - lastCall > TICK_DURATION) {
      lastCall = performance.now();
      fn(...args);
    }
  }) as any;
};
