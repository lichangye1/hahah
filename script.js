const chars = [
  { id: 'ghost', name: '影拳·无常', speed: 460, jump: 940, atk: 15, heavy: 27, reach: 105, tint: '#f4f4f4' },
  { id: 'blade', name: '断刃·夜枭', speed: 430, jump: 980, atk: 18, heavy: 31, reach: 112, tint: '#d8d8d8' },
  { id: 'monk', name: '墨僧·玄骨', speed: 390, jump: 900, atk: 22, heavy: 34, reach: 95, tint: '#ededed' },
  { id: 'assassin', name: '飞鸦·残影', speed: 500, jump: 1020, atk: 14, heavy: 25, reach: 98, tint: '#cdcdcd' },
];

const cfg = {
  gravity: 2500,
  ground: 610,
  stageLeft: 100,
  stageRight: 1180,
  friction: 0.83,
};

const el = {
  canvas: document.getElementById('game'),
  menu: document.getElementById('menu'),
  startBtn: document.getElementById('startBtn'),
  playerPick: document.getElementById('playerPick'),
  enemyPick: document.getElementById('enemyPick'),
  pHp: document.getElementById('pHp'),
  eHp: document.getElementById('eHp'),
  pName: document.getElementById('pName'),
  eName: document.getElementById('eName'),
  msg: document.getElementById('roundMsg')
};
const ctx = el.canvas.getContext('2d');

const key = Object.create(null);
const game = {
  running: false,
  over: false,
  shake: 0,
  hitStop: 0,
  particles: [],
  player: null,
  enemy: null,
  aiTimer: 0,
  roundTimer: 99,
  last: performance.now(),
};

function fillRoleOptions() {
  chars.forEach((c) => {
    const p = document.createElement('option');
    p.value = c.id;
    p.textContent = c.name;
    const e = p.cloneNode(true);
    el.playerPick.appendChild(p);
    el.enemyPick.appendChild(e);
  });
  el.playerPick.value = chars[0].id;
  el.enemyPick.value = chars[1].id;
}

function makeFighter(def, x, dir, bot = false) {
  return {
    def, x, y: cfg.ground, vx: 0, vy: 0, dir,
    hp: 100,
    bot,
    block: false,
    onGround: true,
    moveInt: 0,
    attackTimer: 0,
    hurtTimer: 0,
    cooldown: 0,
    dashing: 0,
    canDash: 0,
    combo: 0,
    comboReset: 0,
  };
}

function reset() {
  const pDef = chars.find((c) => c.id === el.playerPick.value) || chars[0];
  const eDef = chars.find((c) => c.id === el.enemyPick.value) || chars[1];
  game.player = makeFighter(pDef, 300, 1, false);
  game.enemy = makeFighter(eDef, 980, -1, true);
  game.running = true;
  game.over = false;
  game.roundTimer = 99;
  game.particles.length = 0;
  el.pName.textContent = pDef.name;
  el.eName.textContent = eDef.name;
  el.msg.textContent = 'FIGHT!';
  setTimeout(() => {
    if (!game.over) el.msg.textContent = 'ROUND 1';
  }, 1000);
}

function spawnInk(x, y, count = 12) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 120 + Math.random() * 260;
    game.particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.35 + Math.random() * 0.35,
      size: 2 + Math.random() * 7,
      gray: 160 + Math.random() * 70,
    });
  }
}

function attack(attacker, defender, heavy = false) {
  if (attacker.cooldown > 0 || attacker.attackTimer > 0) return;
  const range = attacker.def.reach + (heavy ? 16 : 0);
  const dist = Math.abs(defender.x - attacker.x);
  const sameSide = Math.sign(defender.x - attacker.x) === attacker.dir;

  attacker.attackTimer = heavy ? 0.28 : 0.16;
  attacker.cooldown = heavy ? 0.35 : 0.12;

  if (dist < range && sameSide && Math.abs(defender.y - attacker.y) < 80) {
    const base = heavy ? attacker.def.heavy : attacker.def.atk;
    const blocked = defender.block && !heavy;
    const dmg = blocked ? base * 0.3 : base;
    defender.hp = Math.max(0, defender.hp - dmg);
    defender.hurtTimer = 0.15;
    defender.vx += attacker.dir * (heavy ? 280 : 180);
    defender.vy = heavy ? -120 : defender.vy;
    attacker.combo = attacker.combo + 1;
    attacker.comboReset = 1;
    game.shake = heavy ? 8 : 4;
    game.hitStop = heavy ? 0.06 : 0.03;
    spawnInk(defender.x, defender.y - 40, heavy ? 24 : 15);

    if (defender.hp <= 0) {
      game.over = true;
      game.running = false;
      el.msg.textContent = attacker.bot ? '你输了' : '你赢了';
      spawnInk(defender.x, defender.y - 70, 46);
    }
  }
}

function dash(f) {
  if (f.canDash > 0 || f.attackTimer > 0) return;
  f.dashing = 0.12;
  f.canDash = 0.8;
  f.vx = f.dir * (f.def.speed * 1.8);
}

function controlPlayer(dt) {
  const p = game.player;
  p.block = !!key['s'];
  let move = 0;
  if (key['a']) move -= 1;
  if (key['d']) move += 1;
  p.moveInt = move;
  if (move !== 0) p.dir = move;

  if (key['w'] && p.onGround) {
    p.vy = -p.def.jump;
    p.onGround = false;
  }
}

function controlEnemy(dt) {
  const e = game.enemy;
  const p = game.player;
  e.block = false;
  game.aiTimer -= dt;

  const dx = p.x - e.x;
  const dist = Math.abs(dx);
  e.dir = dx > 0 ? 1 : -1;

  if (dist > 140) e.moveInt = e.dir;
  else if (dist < 85) e.moveInt = -e.dir;
  else e.moveInt = 0;

  if (game.aiTimer <= 0) {
    game.aiTimer = 0.08 + Math.random() * 0.12;
    if (dist < 120 && Math.random() < 0.6) attack(e, p, false);
    if (dist < 130 && Math.random() < 0.25) attack(e, p, true);
    if (Math.random() < 0.12) e.block = true;
    if (Math.random() < 0.08 && e.onGround) e.vy = -e.def.jump * 0.85;
  }
}

function stepFighter(f, dt) {
  f.attackTimer = Math.max(0, f.attackTimer - dt);
  f.hurtTimer = Math.max(0, f.hurtTimer - dt);
  f.cooldown = Math.max(0, f.cooldown - dt);
  f.canDash = Math.max(0, f.canDash - dt);
  f.comboReset = Math.max(0, f.comboReset - dt);
  if (f.comboReset === 0) f.combo = 0;

  if (f.attackTimer <= 0) {
    const speed = f.def.speed * (f.block ? 0.35 : 1);
    if (f.dashing > 0) {
      f.dashing -= dt;
    } else {
      f.vx += f.moveInt * speed * dt * 8;
    }
  }

  f.vy += cfg.gravity * dt;
  f.vx *= cfg.friction;
  f.x += f.vx * dt;
  f.y += f.vy * dt;

  if (f.y >= cfg.ground) {
    f.y = cfg.ground;
    f.vy = 0;
    f.onGround = true;
  }

  f.x = Math.max(cfg.stageLeft, Math.min(cfg.stageRight, f.x));
}

function updateHud() {
  el.pHp.style.width = `${game.player.hp}%`;
  el.eHp.style.width = `${game.enemy.hp}%`;
}

function drawBg() {
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, 1280, 720);

  const grad = ctx.createLinearGradient(0, 0, 0, 720);
  grad.addColorStop(0, '#191919');
  grad.addColorStop(1, '#060606');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 460, 1280, 260);

  ctx.strokeStyle = '#1f1f1f';
  for (let i = 0; i < 16; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 90, 430 + Math.sin(i) * 5);
    ctx.lineTo(i * 92, 690);
    ctx.stroke();
  }
}

function drawFighter(f) {
  const x = f.x;
  const y = f.y;
  const flip = f.dir;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip, 1);

  ctx.globalAlpha = f.hurtTimer > 0 ? 0.7 : 1;
  ctx.fillStyle = f.def.tint;

  // head
  ctx.beginPath();
  ctx.arc(0, -116, 24, 0, Math.PI * 2);
  ctx.fill();

  // body
  ctx.fillRect(-14, -95, 28, 86);

  // arms
  const armY = f.attackTimer > 0 ? -82 : -72;
  const armX = f.attackTimer > 0 ? 44 : 30;
  ctx.fillRect(2, armY, armX, 9);
  ctx.fillRect(-40, -72, 35, 9);

  // legs
  ctx.fillRect(-10, -10, 8, 65);
  ctx.fillRect(2, -10, 8, 65);

  if (f.block) {
    ctx.strokeStyle = '#f1f1f1';
    ctx.lineWidth = 4;
    ctx.strokeRect(18, -102, 30, 90);
  }

  ctx.restore();

  // shadow
  ctx.fillStyle = '#000';
  ctx.globalAlpha = 0.36;
  ctx.beginPath();
  ctx.ellipse(x, 628, 38, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawParticles(dt) {
  for (let i = game.particles.length - 1; i >= 0; i--) {
    const p = game.particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      game.particles.splice(i, 1);
      continue;
    }
    p.vy += 900 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    ctx.fillStyle = `rgb(${p.gray},${p.gray},${p.gray})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function frame(t) {
  const dtRaw = Math.min((t - game.last) / 1000, 0.033);
  game.last = t;

  drawBg();

  if (game.hitStop > 0) {
    game.hitStop -= dtRaw;
  } else if (game.running) {
    controlPlayer(dtRaw);
    controlEnemy(dtRaw);

    stepFighter(game.player, dtRaw);
    stepFighter(game.enemy, dtRaw);

    if (game.player.attackTimer === 0 && key['j']) attack(game.player, game.enemy, false);
    if (game.player.attackTimer === 0 && key['k']) attack(game.player, game.enemy, true);
    if (key['l']) dash(game.player);

    game.roundTimer = Math.max(0, game.roundTimer - dtRaw * 0.35);
    if (game.roundTimer <= 0 && !game.over) {
      game.over = true;
      game.running = false;
      el.msg.textContent = game.player.hp >= game.enemy.hp ? '时间到，你赢了' : '时间到，你输了';
    }
  }

  const shakeX = (Math.random() - 0.5) * game.shake;
  const shakeY = (Math.random() - 0.5) * game.shake;
  game.shake *= 0.88;

  ctx.save();
  ctx.translate(shakeX, shakeY);
  drawFighter(game.player);
  drawFighter(game.enemy);
  drawParticles(dtRaw);
  ctx.restore();

  updateHud();
  requestAnimationFrame(frame);
}

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  key[k] = true;
});
window.addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  key[k] = false;
});

el.startBtn.addEventListener('click', reset);
fillRoleOptions();
reset();
requestAnimationFrame(frame);
