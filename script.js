const ROWS = 5;
const COLS = 9;
const plantDefs = {
  sunflower: { cost: 50, hp: 5, icon: "🌻" },
  peashooter: { cost: 100, hp: 6, icon: "🟢" },
  wallnut: { cost: 75, hp: 16, icon: "🥔" },
};

const boardEl = document.getElementById("board");
const sunEl = document.getElementById("sun");
const waveEl = document.getElementById("wave");
const baseHpEl = document.getElementById("baseHp");
const hintEl = document.getElementById("hint");

let state;

function init() {
  state = {
    sun: 150,
    selectedPlant: null,
    baseHp: 5,
    wave: 1,
    gameOver: false,
    plants: new Map(),
    zombies: [],
    peas: [],
    timers: [],
  };

  renderBoard();
  bindButtons();
  updateHud();
  startLoops();
}

function cellId(r, c) {
  return `${r}-${c}`;
}

function renderBoard() {
  boardEl.innerHTML = "";
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement("button");
      cell.className = "cell";
      cell.type = "button";
      cell.dataset.row = String(r);
      cell.dataset.col = String(c);
      cell.addEventListener("click", () => onCellClick(r, c));
      boardEl.appendChild(cell);
    }
  }
}

function bindButtons() {
  document.querySelectorAll(".card[data-plant]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.selectedPlant = btn.dataset.plant;
      document.querySelectorAll(".card[data-plant]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      hintEl.textContent = `已选择 ${btn.textContent}，点击草地放置。`;
    });
  });

  document.getElementById("cancel").addEventListener("click", () => {
    state.selectedPlant = null;
    document.querySelectorAll(".card[data-plant]").forEach((b) => b.classList.remove("active"));
    hintEl.textContent = "已取消种植。";
  });

  document.getElementById("restart").addEventListener("click", () => {
    state.timers.forEach(clearInterval);
    init();
  });
}

function onCellClick(r, c) {
  if (state.gameOver || !state.selectedPlant) return;
  const id = cellId(r, c);
  if (state.plants.has(id)) {
    hintEl.textContent = "这里已经有植物了。";
    return;
  }

  const def = plantDefs[state.selectedPlant];
  if (state.sun < def.cost) {
    hintEl.textContent = "阳光不足！";
    return;
  }

  state.sun -= def.cost;
  state.plants.set(id, { type: state.selectedPlant, hp: def.hp, row: r, col: c, cd: 0 });
  updateHud();
  draw();
}

function startLoops() {
  state.timers.push(setInterval(gameTick, 250));
  state.timers.push(setInterval(spawnZombie, 2600));
  state.timers.push(setInterval(() => {
    if (!state.gameOver) {
      state.sun += 10;
      updateHud();
    }
  }, 4000));
}

function spawnZombie() {
  if (state.gameOver) return;
  const row = Math.floor(Math.random() * ROWS);
  const hp = 8 + Math.floor(state.wave / 2);
  state.zombies.push({ row, x: COLS - 0.1, hp, speed: 0.06 + state.wave * 0.002 });
  if (Math.random() < 0.35) state.wave += 1;
  updateHud();
}

function gameTick() {
  if (state.gameOver) return;

  for (const plant of state.plants.values()) {
    plant.cd -= 1;
    if (plant.type === "sunflower" && plant.cd <= 0) {
      state.sun += 25;
      plant.cd = 16;
    }

    if (plant.type === "peashooter" && plant.cd <= 0) {
      const target = state.zombies.some((z) => z.row === plant.row && z.x > plant.col);
      if (target) {
        state.peas.push({ row: plant.row, x: plant.col + 0.6, damage: 1 });
        plant.cd = 3;
      }
    }
  }

  for (const pea of state.peas) {
    pea.x += 0.36;
    const hit = state.zombies.find((z) => z.row === pea.row && Math.abs(z.x - pea.x) < 0.28);
    if (hit) {
      hit.hp -= pea.damage;
      pea.x = COLS + 1;
    }
  }

  for (const z of state.zombies) {
    const c = Math.floor(z.x);
    const id = cellId(z.row, c);
    const plant = state.plants.get(id);

    if (plant) {
      plant.hp -= 0.45;
      if (plant.hp <= 0) state.plants.delete(id);
    } else {
      z.x -= z.speed;
    }

    if (z.x < 0) {
      state.baseHp -= 1;
      z.hp = -999;
      if (state.baseHp <= 0) {
        state.gameOver = true;
        hintEl.textContent = "僵尸攻破了基地！点击重新开始再来一局。";
      }
    }
  }

  state.zombies = state.zombies.filter((z) => z.hp > 0);
  state.peas = state.peas.filter((p) => p.x < COLS);

  updateHud();
  draw();
}

function updateHud() {
  sunEl.textContent = String(state.sun);
  waveEl.textContent = String(state.wave);
  baseHpEl.textContent = String(state.baseHp);
}

function draw() {
  const cells = Array.from(document.querySelectorAll(".cell"));
  cells.forEach((cell) => {
    const r = Number(cell.dataset.row);
    const c = Number(cell.dataset.col);
    const id = cellId(r, c);
    cell.innerHTML = "";

    const plant = state.plants.get(id);
    if (plant) {
      const plantEl = document.createElement("span");
      plantEl.className = "plant";
      plantEl.textContent = plantDefs[plant.type].icon;
      const hp = document.createElement("span");
      hp.className = "hp";
      hp.textContent = `HP ${Math.max(0, Math.ceil(plant.hp))}`;
      cell.append(plantEl, hp);
    }

    const zombies = state.zombies.filter((z) => z.row === r && Math.floor(z.x) === c);
    zombies.forEach((z) => {
      const zEl = document.createElement("span");
      zEl.className = "zombie";
      zEl.style.left = `${((z.x - c) * 100).toFixed(2)}%`;
      zEl.textContent = "🧟";
      cell.appendChild(zEl);
    });

    const peas = state.peas.filter((p) => p.row === r && Math.floor(p.x) === c);
    peas.forEach((p) => {
      const pEl = document.createElement("span");
      pEl.className = "pea";
      pEl.style.left = `${((p.x - c) * 100).toFixed(2)}%`;
      pEl.textContent = "●";
      cell.appendChild(pEl);
    });
  });
}

init();
