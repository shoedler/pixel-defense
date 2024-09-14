import { draw45DegSquare, drawCircle, drawHealthBar, drawLine } from "./draw";
import { createRenderer } from "./engine";
import { createMap } from "./map";
import { createSoundEngine } from "./sound";
import { Enemy, generateEnemy, generateTower, state, Tower, towerFactory, TowerType } from "./state";
import { elementDimensions, idempotent } from "./util";

const { innerWidth: viewportWidth, innerHeight: viewportHeight } = window;
const { height: headerHeight } = elementDimensions(document.getElementsByClassName("wrapper")[0] as HTMLElement);

const TICK_RATE = 30; // ticks per second
const TICK_DURATION = 1000 / TICK_RATE; // duration of a tick in milliseconds
const GRID_WIDTH = viewportWidth * 0.999;
const GRID_HEIGHT = (viewportHeight - headerHeight) * 0.999;
export const GRID_SIZE = 8; // pixels per grid cell (width and height)

document.addEventListener("DOMContentLoaded", (_) => {
  const sketch = document.querySelector(".sketch") as HTMLDivElement;
  const canvas = document.createElement("canvas");
  sketch.appendChild(canvas);

  // Create the sound generator
  const { soundGenerator } = createSoundEngine(state.sound);

  // Create the render engine
  const { engine } = createRenderer(canvas, GRID_WIDTH, GRID_HEIGHT, GRID_SIZE, state.ui);

  // Create the map
  const { pathfindingData, path, background } = createMap(engine.fresh(), state.background, state.path);

  engine.setBackgroundLayer(background);

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

  // Post processing task for showing the tower range (manhattan distance) of the currently
  // selected tower type, aswell as health bars over enemies
  engine.registerPostProcessingTask((context) => {
    if (!state.user.input.holdingRightClick || !state.user.input.mouse) {
      return;
    }

    const { gridX, gridY } = state.user.input.mouse;
    const { range, color } = towerFactory[state.user.towerType]();
    draw45DegSquare(context, color, gridX * GRID_SIZE + GRID_SIZE / 2, gridY * GRID_SIZE + GRID_SIZE / 2, range * GRID_SIZE);

    // Show health bars over enemies
    for (const enemy of state.entities.enemies) {
      const enemyPos = pathfindingData[enemy.progress];
      const normalizedHealth = enemy.health / enemy.initialHealth;
      drawHealthBar(context, enemyPos, normalizedHealth);
    }
  });

  // Post processing task for UI
  engine.registerPostProcessingTask((context) => {
    const left = GRID_WIDTH * 0.9;
    context.fillStyle = state.ui.fillStyle;
    context.font = state.ui.font;

    [
      `👾 ${state.entities.enemies.length} | 🏯 ${state.entities.towers.length}`,
      `🪙 ${state.user.money}`,
      `🔲 ${TowerType[state.user.towerType]}`,
      `⚔️ ${state.entities.towers.reduce((acc, tower) => acc + tower.damage * (1000 / tower.fireRate), 0)} dps`,
      `❤️ ${state.entities.enemies.reduce((acc, enemy) => acc + enemy.health, 0)} hp`,
    ].forEach((text, index) => context.fillText(text, left, 20 + index * 20));

    if (state.entities.enemies.length === 0) {
      // Darken the screen
      context.fillStyle = "rgba(0, 0, 0, 0.5)";
      context.fillRect(0, 0, GRID_WIDTH, GRID_HEIGHT);

      // Huge victory message
      context.font = "48px monospace";
      context.fillStyle = "white";
      context.fillText("🎉 VICTORY!", GRID_WIDTH / 2 - 200, GRID_HEIGHT / 2);
    }
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

  // Event listeners for right click hold and release
  document.addEventListener("contextmenu", (event) => event.preventDefault());
  document.addEventListener("mousedown", (event) => {
    state.user.input.holdingRightClick = event.button === 2;
  });
  document.addEventListener("mouseleave", (_) => {
    state.user.input.holdingRightClick = false;
  });
  document.addEventListener("mouseup", (event) => {
    if (event.button === 2) {
      state.user.input.holdingRightClick = false;
      event.stopImmediatePropagation();
    }
  });

  // Event listener for mouse movement
  document.addEventListener("mousemove", (event) => {
    const { x, y } = event;
    const { width, height } = canvas;
    const { left, top } = canvas.getBoundingClientRect();

    if (x < left || x > left + width || y < top || y > top + height) {
      state.user.input.mouse = null;
      return;
    }

    const relativeX = x - left;
    const relativeY = y - top;

    // Calculate the grid cell that was clicked, based on the GRID_SIZE
    const gridX = Math.floor(((relativeX / width) * GRID_WIDTH) / GRID_SIZE);
    const gridY = Math.floor(((relativeY / height) * GRID_HEIGHT) / GRID_SIZE);

    state.user.input.mouse = { gridX, gridY };
  });

  // Event listener for placing / removing towers
  document.addEventListener("mouseup", (event) => {
    // Bail out if the cursor is not over the canvas
    if (!state.user.input.mouse) {
      return;
    }

    const { gridX, gridY } = state.user.input.mouse;

    // Check if a tower already exists at the clicked position
    const tower = state.entities.towers.find((tower) => tower.x === gridX && tower.y === gridY);

    // If there is a tower at the clicked position, remove it or bail out if the user wants to place a tower there
    if (tower) {
      if (event.shiftKey) {
        state.entities.towers = state.entities.towers.filter((t) => t !== tower);
        soundGenerator.playRemovePlacement();
        state.user.money += tower.cost;
      } else {
        soundGenerator.playInvalidPlacement();
      }
      return;
    }

    // It's also invalid to place a tower on the path
    if (path[gridX] && path[gridX][gridY]) {
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
    const newTower = generateTower(gridX, gridY, state.user.towerType);
    state.user.money -= newTower.cost;
  });

  // Update function for enemies
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

  // Update function for towers
  const tickTowers = (towers: Tower[], enemies: Enemy[]) => {
    for (const tower of towers) {
      if (tower.lastShot + tower.fireRate > performance.now()) {
        continue;
      }

      // Check if there are enemies within range of the tower (Manhattan distance)
      const targets = enemies.filter((enemy) => {
        const { x, y } = pathfindingData[enemy.progress];
        return Math.abs(x - tower.x) + Math.abs(y - tower.y) <= tower.range;
      });

      // If there are no targets in range, continue with the next tower
      if (!targets.length) {
        continue;
      }

      // Prioritize: lowest health first, then closest to the end of the path.
      const target = targets.reduce((best, current) => {
        const currentIsLowerHealth = current.health < best.health;
        const equalHealth = current.health === best.health;
        const currentIsCloserToEnd = current.progress > best.progress;

        return currentIsLowerHealth || (equalHealth && currentIsCloserToEnd) ? current : best;
      }, targets[0]);

      // Otherwise, we shoot at it.
      // Queue a post processing task to draw the shot.
      // This is nice because this will also play the gunshot sound and apply damage to the target, meaning that everything happens in the same tick
      const enemyPos = pathfindingData[target.progress];
      const towerPos = { x: tower.x, y: tower.y };

      const soundFn =
        tower.type === TowerType.Basic
          ? () => soundGenerator.playBasicGunshot()
          : tower.type === TowerType.Sniper
          ? () => soundGenerator.playSniperGunshot()
          : tower.type === TowerType.Machinegun
          ? () => soundGenerator.playMachinegunGunshot()
          : () => {};

      engine.queuePostProcessingEffect({
        frames: [
          (context: CanvasRenderingContext2D) => {
            // Play the gunshot sound and apply damage to the target
            soundFn();
            target.health -= tower.damage;
            drawLine(context, towerPos, enemyPos, tower.color, 0.9);
          },
          (context: CanvasRenderingContext2D) => {
            drawLine(context, towerPos, enemyPos, tower.color, 0.7);
            drawCircle(context, enemyPos, tower.color, 2, 0.8);
          },
          (context: CanvasRenderingContext2D) => {
            drawLine(context, towerPos, enemyPos, tower.color, 0.5);
            drawCircle(context, enemyPos, tower.color, 1, 0.3);
          },
        ],
      });

      tower.lastShot = performance.now();
    }
  };

  // Define the update function for all entities. This function is idempotent, thus it can be called multiple times without side effects.
  const update = idempotent(TICK_DURATION, () => {
    state.entities.enemies = tickEnemies(state.entities.enemies);
    tickTowers(state.entities.towers, state.entities.enemies);
  });

  // Generate 50 enemies
  for (let i = 0; i < 50; i++) {
    generateEnemy();
  }

  // And finally, create the game loop
  let lastTime = 0;
  const gameLoop = (currentTime: number): void => {
    const deltaTime = currentTime - lastTime;

    engine.render();
    update();

    if (deltaTime >= TICK_DURATION) {
      lastTime = currentTime - (deltaTime % TICK_DURATION);
      engine.dispatch();
    }

    requestAnimationFrame(gameLoop);
  };

  // Start
  requestAnimationFrame(gameLoop);
});
