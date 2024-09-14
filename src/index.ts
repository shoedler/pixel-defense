import {
  compose,
  drawCircle,
  drawFillScreen,
  drawFrontline,
  drawGameEndingScreen,
  drawHealthBar,
  drawLine,
  drawManhattanSquare,
  drawVignette,
} from "./draw";
import { createRenderer } from "./engine";
import { sameCoordinate } from "./grid";
import { createMap } from "./map";
import { createSoundEngine } from "./sound";
import { buildTower, Enemy, generateEnemyWave, state, Tower, towerFactory, TowerType } from "./state";
import { elementDimensions, idempotent, manhattanDistance } from "./util";

const { innerWidth: viewportWidth, innerHeight: viewportHeight } = window;
const { height: headerHeight } = elementDimensions(document.getElementsByClassName("wrapper")[0] as HTMLElement);

const TICK_RATE = 30; // ticks per second
const TICK_DURATION = 1000 / TICK_RATE; // duration of a tick in milliseconds

const CANVAS_WIDTH = viewportWidth * 0.999;
const CANVAS_HEIGHT = (viewportHeight - headerHeight) * 0.999;
export const GRID_SIZE = 8; // pixels per grid cell (width and height)
export const GRID_HEIGHT = Math.floor(CANVAS_HEIGHT / GRID_SIZE);
export const GRID_WIDTH = Math.floor(CANVAS_WIDTH / GRID_SIZE);

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
      const pos = pathfindingData[enemy.progress];
      grid.set(pos, enemy.color);
    }
    for (const tower of state.entities.towers) {
      const { pos, color } = tower;
      grid.set(pos, color);
    }
  });

  // Post processing task for the frontline and background composition
  engine.registerPostProcessingTask((context) => {
    // Draw frontline progress
    drawFrontline(context, state.user.frontlineProgress, state.background.frontlineColor);

    // Draw background composite layer and vignette
    compose(context, state.ui.compositeMode, () => {
      drawFillScreen(context, state.ui.compositeColor);
    });

    drawVignette(context);
  });

  // Post processing task for UI
  engine.registerPostProcessingTask((context) => {
    // Draw UI text
    const left = (GRID_WIDTH - 1) * GRID_SIZE;
    const top = GRID_SIZE;

    context.fillStyle = state.ui.fillStyle;
    context.font = state.ui.font;
    context.textAlign = "end";
    context.textBaseline = "top";

    [
      `👾 ${state.entities.enemies.length} | 🏯 ${state.entities.towers.length}`,
      `🪙 ${state.user.money}`,
      `🔲 ${TowerType[state.user.towerType]}`,
      `⚔️ ${state.entities.towers.reduce((acc, tower) => acc + tower.damage * (1000 / tower.fireRate), 0)} dps`,
      `❤️ ${state.entities.enemies.reduce((acc, enemy) => acc + enemy.health, 0)} hp`,
    ].forEach((text, index) => context.fillText(text, left, top + index * 20));

    // Draw game ending screen
    if (state.user.frontlineProgress >= GRID_WIDTH - 1) {
      drawGameEndingScreen(context, "Defeat! 💀");
      return;
    }
    if (state.entities.enemies.length === 0) {
      drawGameEndingScreen(context, "Victory! 🎉");
    }
  });

  // Post processing task for showing the tower range of the currently
  // selected tower type, aswell as health bars over enemies
  engine.registerPostProcessingTask((context) => {
    if (!state.user.input.holdingRightClick || !state.user.input.mouseGridPos) {
      return;
    }

    // Draw the tower range
    const mousePos = state.user.input.mouseGridPos;
    const { range, color } = towerFactory[state.user.towerType]();
    drawManhattanSquare(context, color, mousePos, range);

    // Show health bars over enemies
    for (const enemy of state.entities.enemies) {
      const enemyPos = pathfindingData[enemy.progress];
      const normalizedHealth = enemy.health / enemy.initialHealth;
      drawHealthBar(context, enemyPos, normalizedHealth);
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

    // Null-out the mouse position if the cursor is outside the canvas
    if (x < left || x > left + width || y < top || y > top + height) {
      state.user.input.mouseGridPos = null;
      return;
    }

    const relativeX = x - left;
    const relativeY = y - top;

    // Calculate the grid cell that was clicked, based on the GRID_SIZE
    const gridX = Math.floor(((relativeX / width) * CANVAS_WIDTH) / GRID_SIZE);
    const gridY = Math.floor(((relativeY / height) * CANVAS_HEIGHT) / GRID_SIZE);

    state.user.input.mouseGridPos = { x: gridX, y: gridY };
  });

  // Event listener for placing / removing towers
  document.addEventListener("mouseup", (event) => {
    // Bail out if the cursor is not over the canvas
    if (!state.user.input.mouseGridPos) {
      return;
    }

    const mousePos = state.user.input.mouseGridPos;

    // Check if a tower already exists at the clicked position
    const tower = state.entities.towers.find((tower) => sameCoordinate(tower.pos, mousePos));

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

    // Bail out if the user is holding the shift key (Probably a misclick)
    if (event.shiftKey) {
      return;
    }

    // It's also invalid to place a tower on the path
    if (path[mousePos.x] && path[mousePos.x][mousePos.y]) {
      soundGenerator.playInvalidPlacement();
      return;
    }

    // Aswell as left of the frontline
    if (mousePos.x <= state.user.frontlineProgress) {
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
    const newTower = buildTower(mousePos, state.user.towerType);
    state.entities.towers.push(newTower);
    state.user.money -= newTower.cost;
  });

  // Update function for enemies
  const tickEnemies = (enemies: Enemy[]): Enemy[] => {
    const aliveEnemies = [] as Enemy[];
    const finishedEnemies = [] as Enemy[];
    const deadEnemies = [] as Enemy[];

    for (const enemy of enemies) {
      if (enemy.health <= 0) {
        deadEnemies.push(enemy);
        continue;
      }

      if (enemy.progress >= pathfindingData.length - 1) {
        finishedEnemies.push(enemy);
        continue;
      }

      aliveEnemies.push(enemy);
    }

    // The player earns money for each enemy that dies
    state.user.money += deadEnemies.length;

    // The frontline progresses for each enemy that reaches the end of the path
    state.user.frontlineProgress += finishedEnemies.length;

    // Move the alive enemies
    for (const enemy of aliveEnemies) {
      if (enemy.lastMove + enemy.moveRate > performance.now()) {
        continue;
      }

      enemy.progress++;
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

      // Check if there are enemies within range of the tower
      const targets = enemies.filter((enemy) => {
        const enemyPos = pathfindingData[enemy.progress];
        return manhattanDistance(tower.pos, enemyPos) <= tower.range;
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
      const enemyPos = pathfindingData[target.progress];
      const towerPos = tower.pos;
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
            tower.lastShot = performance.now();
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
    }
  };

  // Define the update function for all entities. This function is idempotent, thus it can be called multiple times without side effects.
  const update = idempotent(TICK_DURATION, () => {
    state.entities.enemies = tickEnemies(state.entities.enemies);
    tickTowers(state.entities.towers, state.entities.enemies);
  });

  // Generate enemies
  // generateEnemyWave(1000, 2, 2, 30);
  generateEnemyWave(1000, 50, 300, 3);

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
