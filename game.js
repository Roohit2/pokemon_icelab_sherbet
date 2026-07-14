document.addEventListener("DOMContentLoaded", () => {
  // ==============================
  // HTML要素
  // ==============================

  const openButton =
    document.getElementById("open-game-button");

  const closeButton =
    document.getElementById("game-close-button");

  const startButton =
    document.getElementById("game-start-button");

  const leftButton =
    document.getElementById("game-left-button");

  const rightButton =
    document.getElementById("game-right-button");

  const modal =
    document.getElementById("game-modal");

  const gameWindow =
    document.getElementById("game-window");

  const canvas =
    document.getElementById("game-canvas");

  const scoreElement =
    document.getElementById("game-score");

  const comboElement =
    document.getElementById("game-combo");

  const timeElement =
    document.getElementById("game-time");

  const messageElement =
    document.getElementById("game-message");

  const moveDisplay =
    document.getElementById("game-move-display");

  const statusArea =
    document.querySelector(".game-status");

  if (
    !openButton ||
    !closeButton ||
    !startButton ||
    !leftButton ||
    !rightButton ||
    !modal ||
    !gameWindow ||
    !canvas ||
    !scoreElement ||
    !comboElement ||
    !timeElement ||
    !messageElement ||
    !moveDisplay
  ) {
    console.error(
      "ミニゲームに必要なHTML要素が見つかりません。"
    );

    return;
  }

  const ctx = canvas.getContext("2d");

  // ==============================
  // 画像
  // ==============================

  const playerImage = new Image();
  playerImage.src = "images/glaceon-shiny.png";

  const garchompImage = new Image();
  garchompImage.src = "images/garchomp.png";

  const megaDragoniteImage = new Image();
  megaDragoniteImage.src =
    "images/mega-dragonite.png";

  const loadedImages = {
    player: false,
    garchomp: false,
    megaDragonite: false
  };

  playerImage.addEventListener("load", () => {
    loadedImages.player = true;

    if (!gameRunning) {
      drawScene();
    }
  });

  garchompImage.addEventListener("load", () => {
    loadedImages.garchomp = true;

    if (!gameRunning) {
      drawScene();
    }
  });

  megaDragoniteImage.addEventListener(
    "load",
    () => {
      loadedImages.megaDragonite = true;

      if (!gameRunning) {
        drawScene();
      }
    }
  );

  playerImage.addEventListener("error", () => {
    console.error(
      "images/glaceon-shiny.png を読み込めませんでした。"
    );
  });

  garchompImage.addEventListener("error", () => {
    console.error(
      "images/garchomp.png を読み込めませんでした。"
    );
  });

  megaDragoniteImage.addEventListener(
    "error",
    () => {
      console.error(
        "images/mega-dragonite.png を読み込めませんでした。"
      );
    }
  );

  // ==============================
  // ゲーム状態
  // ==============================

  let gameRunning = false;
  let finalPhase = false;

  let score = 0;
  let combo = 0;
  let timeLeft = 30;

  let gameTimer = null;
  let animationId = null;
  let lastShotTime = 0;

  const keys = {
    left: false,
    right: false
  };

  // ==============================
  // プレイヤー
  // ==============================

  const player = {
    x: 190,
    y: 485,
    width: 100,
    height: 100,
    speed: 7
  };

  // ==============================
  // 敵
  // ==============================

  const enemy = {
    type: "garchomp",
    x: 175,
    y: 55,
    width: 130,
    height: 130,
    speedX: 3.2,
    direction: 1
  };

  const enemyData = {
    garchomp: {
      score: 100,
      comboBonus: 20,
      image: garchompImage
    },

    megaDragonite: {
      score: 300,
      comboBonus: 50,
      image: megaDragoniteImage
    }
  };

  // ==============================
  // 攻撃
  // ==============================

  const attacks = [];

  const attackData = {
    snowball: {
      radius: 13,
      speed: 13,
      cooldown: 220
    },

    iceBeam: {
      width: 12,
      height: 46,
      speed: 18,
      cooldown: 120
    }
  };

  // ==============================
  // 爆発エフェクト
  // ==============================

  const explosions = [];

  function createExplosion(x, y) {
    const particles = [];

    for (let index = 0; index < 20; index++) {
      const angle =
        Math.random() *
        Math.PI *
        2;

      const speed =
        2 +
        Math.random() *
        4.5;

      particles.push({
        x,
        y,

        speedX:
          Math.cos(angle) *
          speed,

        speedY:
          Math.sin(angle) *
          speed,

        radius:
          3 +
          Math.random() *
          7,

        life: 1,

        fade:
          0.035 +
          Math.random() *
          0.025
      });
    }

    explosions.push({
      particles
    });
  }

  function updateExplosions() {
    for (
      let explosionIndex =
        explosions.length - 1;
      explosionIndex >= 0;
      explosionIndex--
    ) {
      const explosion =
        explosions[explosionIndex];

      for (
        let particleIndex =
          explosion.particles.length - 1;
        particleIndex >= 0;
        particleIndex--
      ) {
        const particle =
          explosion.particles[particleIndex];

        particle.x += particle.speedX;
        particle.y += particle.speedY;

        particle.speedX *= 0.96;
        particle.speedY *= 0.96;

        particle.life -= particle.fade;
        particle.radius *= 0.97;

        if (
          particle.life <= 0 ||
          particle.radius <= 0.5
        ) {
          explosion.particles.splice(
            particleIndex,
            1
          );
        }
      }

      if (explosion.particles.length === 0) {
        explosions.splice(
          explosionIndex,
          1
        );
      }
    }
  }

  function drawExplosions() {
    explosions.forEach(explosion => {
      explosion.particles.forEach(particle => {
        ctx.save();

        ctx.globalAlpha = particle.life;

        const gradient =
          ctx.createRadialGradient(
            particle.x,
            particle.y,
            0,
            particle.x,
            particle.y,
            particle.radius
          );

        gradient.addColorStop(
          0,
          "#ffffff"
        );

        gradient.addColorStop(
          0.35,
          "#bae6fd"
        );

        gradient.addColorStop(
          0.7,
          "#38bdf8"
        );

        gradient.addColorStop(
          1,
          "rgba(14, 165, 233, 0)"
        );

        ctx.fillStyle = gradient;

        ctx.beginPath();

        ctx.arc(
          particle.x,
          particle.y,
          particle.radius,
          0,
          Math.PI * 2
        );

        ctx.fill();

        ctx.restore();
      });
    });
  }

  // ==============================
  // モーダル
  // ==============================

  openButton.addEventListener("click", () => {
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");

    resetGameScreen();
  });

  closeButton.addEventListener("click", () => {
    closeGameModal();
  });

  modal.addEventListener("click", event => {
    if (event.target === modal) {
      closeGameModal();
    }
  });

  function closeGameModal() {
    stopGame();

    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }

  // ==============================
  // ゲーム開始
  // ==============================

  startButton.addEventListener(
    "click",
    startGame
  );

  function startGame() {
    stopAnimationAndTimer();

    gameRunning = true;
    finalPhase = false;

    score = 0;
    combo = 0;
    timeLeft = 30;
    lastShotTime = 0;

    keys.left = false;
    keys.right = false;

    attacks.length = 0;
    explosions.length = 0;

    player.x =
      canvas.width / 2 -
      player.width / 2;

    player.y =
      canvas.height -
      player.height -
      15;

    setGarchomp();

    if (statusArea) {
      statusArea.classList.remove("danger");
    }

    updateAttackDisplay();
    updateStatus();

    messageElement.textContent =
      "攻撃を当ててスコアを稼げ！";

    startButton.disabled = true;
    startButton.textContent = "ゲーム中";

    gameTimer = setInterval(() => {
      timeLeft -= 1;

      if (
        timeLeft === 10 &&
        !finalPhase
      ) {
        startFinalPhase();
      }

      if (timeLeft <= 0) {
        timeLeft = 0;

        updateStatus();
        finishGame();

        return;
      }

      updateStatus();
    }, 1000);

    gameLoop();
  }

  // ==============================
  // ラスト10秒
  // ==============================

  function startFinalPhase() {
    finalPhase = true;

    attacks.length = 0;

    enemy.type = "megaDragonite";
    enemy.width = 145;
    enemy.height = 145;
    enemy.speedX = 7;
    enemy.y = 45;

    enemy.x =
      canvas.width / 2 -
      enemy.width / 2;

    enemy.direction =
      Math.random() < 0.5
        ? -1
        : 1;

    updateAttackDisplay();

    messageElement.textContent =
      "ラスト10秒！ れいとうビームに変化！";

    if (statusArea) {
      statusArea.classList.add("danger");
    }
  }

  function updateAttackDisplay() {
    if (finalPhase) {
      moveDisplay.textContent =
        "✦ れいとうビーム";

      moveDisplay.classList.add(
        "ice-beam"
      );

      return;
    }

    moveDisplay.textContent =
      "❄ こおりのつぶて";

    moveDisplay.classList.remove(
      "ice-beam"
    );
  }

  // ==============================
  // 停止・終了
  // ==============================

  function stopAnimationAndTimer() {
    if (gameTimer !== null) {
      clearInterval(gameTimer);
    }

    if (animationId !== null) {
      cancelAnimationFrame(animationId);
    }

    gameTimer = null;
    animationId = null;
  }

  function releaseMovementButtons() {
    keys.left = false;
    keys.right = false;

    leftButton.classList.remove("pressed");
    rightButton.classList.remove("pressed");
  }

  function stopGame() {
    gameRunning = false;

    stopAnimationAndTimer();
    releaseMovementButtons();

    startButton.disabled = false;
    startButton.textContent = "ゲーム開始";
  }

  function finishGame() {
    gameRunning = false;

    stopAnimationAndTimer();
    releaseMovementButtons();

    startButton.disabled = false;
    startButton.textContent = "もう一度遊ぶ";

    messageElement.textContent =
      `ゲーム終了！ SCORE：${score}`;
  }

  // ==============================
  // ステータス
  // ==============================

  function updateStatus() {
    scoreElement.textContent = score;
    comboElement.textContent = combo;
    timeElement.textContent = timeLeft;
  }

  // ==============================
  // PCキーボード操作
  // ==============================

  window.addEventListener("keydown", event => {
    if (!modal.classList.contains("open")) {
      return;
    }

    if (
      event.code === "ArrowLeft" ||
      event.code === "ArrowRight" ||
      event.code === "Space"
    ) {
      event.preventDefault();
    }

    if (event.code === "ArrowLeft") {
      keys.left = true;
    }

    if (event.code === "ArrowRight") {
      keys.right = true;
    }

    if (
      event.code === "Space" &&
      !event.repeat
    ) {
      shootAttack();
    }

    if (event.code === "Escape") {
      closeGameModal();
    }
  });

  window.addEventListener("keyup", event => {
    if (event.code === "ArrowLeft") {
      keys.left = false;
    }

    if (event.code === "ArrowRight") {
      keys.right = false;
    }
  });

  // ==============================
  // スマホ左右ボタン
  // ==============================

  function startMobileMove(
    direction,
    button,
    event
  ) {
    event.preventDefault();
    event.stopPropagation();

    if (!gameRunning) {
      return;
    }

    if (direction === "left") {
      keys.left = true;
    }

    if (direction === "right") {
      keys.right = true;
    }

    button.classList.add("pressed");

    if (button.setPointerCapture) {
      button.setPointerCapture(
        event.pointerId
      );
    }
  }

  function stopMobileMove(
    direction,
    button,
    event
  ) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (direction === "left") {
      keys.left = false;
    }

    if (direction === "right") {
      keys.right = false;
    }

    button.classList.remove("pressed");
  }

  leftButton.addEventListener(
    "pointerdown",
    event => {
      startMobileMove(
        "left",
        leftButton,
        event
      );
    }
  );

  leftButton.addEventListener(
    "pointerup",
    event => {
      stopMobileMove(
        "left",
        leftButton,
        event
      );
    }
  );

  leftButton.addEventListener(
    "pointercancel",
    event => {
      stopMobileMove(
        "left",
        leftButton,
        event
      );
    }
  );

  rightButton.addEventListener(
    "pointerdown",
    event => {
      startMobileMove(
        "right",
        rightButton,
        event
      );
    }
  );

  rightButton.addEventListener(
    "pointerup",
    event => {
      stopMobileMove(
        "right",
        rightButton,
        event
      );
    }
  );

  rightButton.addEventListener(
    "pointercancel",
    event => {
      stopMobileMove(
        "right",
        rightButton,
        event
      );
    }
  );

  window.addEventListener(
    "pointerup",
    releaseMovementButtons
  );

  window.addEventListener(
    "pointercancel",
    releaseMovementButtons
  );

  // ==============================
  // スマホ画面タップで発射
  // ==============================

  gameWindow.addEventListener(
    "pointerdown",
    event => {
      if (!gameRunning) {
        return;
      }

      if (
        event.pointerType !== "touch" &&
        event.pointerType !== "pen"
      ) {
        return;
      }

      if (event.target.closest("button")) {
        return;
      }

      event.preventDefault();

      shootAttack();
    }
  );

  // ==============================
  // 攻撃発射
  // ==============================

  function shootAttack() {
    if (!gameRunning) {
      return;
    }

    const currentTime =
      performance.now();

    const cooldown = finalPhase
      ? attackData.iceBeam.cooldown
      : attackData.snowball.cooldown;

    if (
      currentTime - lastShotTime <
      cooldown
    ) {
      return;
    }

    lastShotTime = currentTime;

    if (finalPhase) {
      attacks.push({
        type: "iceBeam",

        x:
          player.x +
          player.width / 2 -
          attackData.iceBeam.width / 2,

        y:
          player.y,

        width:
          attackData.iceBeam.width,

        height:
          attackData.iceBeam.height,

        speedY:
          -attackData.iceBeam.speed
      });

      messageElement.textContent =
        "れいとうビーム！";

      return;
    }

    attacks.push({
      type: "snowball",

      x:
        player.x +
        player.width / 2,

      y:
        player.y,

      radius:
        attackData.snowball.radius,

      speedY:
        -attackData.snowball.speed,

      rotation:
        0
    });

    messageElement.textContent =
      "こおりのつぶて！";
  }

  // ==============================
  // プレイヤー更新
  // ==============================

  function updatePlayer() {
    if (keys.left && !keys.right) {
      player.x -= player.speed;
    }

    if (keys.right && !keys.left) {
      player.x += player.speed;
    }

    if (player.x < 0) {
      player.x = 0;
    }

    if (
      player.x + player.width >
      canvas.width
    ) {
      player.x =
        canvas.width - player.width;
    }
  }

  // ==============================
  // 敵設定
  // ==============================

  function setGarchomp() {
    enemy.type = "garchomp";
    enemy.width = 130;
    enemy.height = 130;
    enemy.speedX = 3.2;
    enemy.y = 55;

    enemy.x =
      Math.random() *
      (canvas.width - enemy.width);

    enemy.direction =
      Math.random() < 0.5
        ? -1
        : 1;
  }

  function resetEnemyPosition() {
    enemy.x =
      Math.random() *
      (canvas.width - enemy.width);

    enemy.direction =
      Math.random() < 0.5
        ? -1
        : 1;
  }

  // ==============================
  // 敵移動
  // 横方向のみ
  // ==============================

  function updateEnemy() {
    enemy.x +=
      enemy.speedX *
      enemy.direction;

    if (enemy.x <= 0) {
      enemy.x = 0;
      enemy.direction = 1;
    }

    if (
      enemy.x + enemy.width >=
      canvas.width
    ) {
      enemy.x =
        canvas.width -
        enemy.width;

      enemy.direction = -1;
    }
  }

  // ==============================
  // 攻撃更新
  // ==============================

  function updateAttacks() {
    for (
      let index = attacks.length - 1;
      index >= 0;
      index--
    ) {
      const attack = attacks[index];

      attack.y += attack.speedY;

      if (attack.type === "snowball") {
        attack.rotation += 0.18;
      }

      if (isAttackHit(attack, enemy)) {
        handleEnemyHit(index);

        continue;
      }

      const attackBottom =
        attack.type === "snowball"
          ? attack.y + attack.radius
          : attack.y + attack.height;

      if (attackBottom < 0) {
        attacks.splice(index, 1);

        combo = 0;
        updateStatus();

        messageElement.textContent =
          "攻撃が外れた！";
      }
    }
  }

  // ==============================
  // 命中処理
  // ==============================

  function handleEnemyHit(attackIndex) {
    const currentEnemy =
      enemyData[enemy.type];

    const explosionX =
      enemy.x +
      enemy.width / 2;

    const explosionY =
      enemy.y +
      enemy.height / 2;

    createExplosion(
      explosionX,
      explosionY
    );

    score +=
      currentEnemy.score +
      combo *
      currentEnemy.comboBonus;

    combo += 1;

    attacks.splice(
      attackIndex,
      1
    );

    updateStatus();

    messageElement.textContent =
      `命中！ ${combo} COMBO！`;

    resetEnemyPosition();
  }

  // ==============================
  // 当たり判定
  // ==============================

  function isAttackHit(
    attack,
    target
  ) {
    const marginX =
      target.width * 0.18;

    const marginY =
      target.height * 0.15;

    const targetLeft =
      target.x + marginX;

    const targetRight =
      target.x +
      target.width -
      marginX;

    const targetTop =
      target.y + marginY;

    const targetBottom =
      target.y +
      target.height -
      marginY;

    if (attack.type === "iceBeam") {
      const attackLeft =
        attack.x;

      const attackRight =
        attack.x +
        attack.width;

      const attackTop =
        attack.y;

      const attackBottom =
        attack.y +
        attack.height;

      return (
        attackLeft < targetRight &&
        attackRight > targetLeft &&
        attackTop < targetBottom &&
        attackBottom > targetTop
      );
    }

    const nearestX = Math.max(
      targetLeft,
      Math.min(
        attack.x,
        targetRight
      )
    );

    const nearestY = Math.max(
      targetTop,
      Math.min(
        attack.y,
        targetBottom
      )
    );

    const distanceX =
      attack.x -
      nearestX;

    const distanceY =
      attack.y -
      nearestY;

    return (
      distanceX * distanceX +
      distanceY * distanceY <=
      attack.radius *
      attack.radius
    );
  }

  // ==============================
  // 背景描画
  // ==============================

  function drawBackground() {
    const gradient =
      ctx.createLinearGradient(
        0,
        0,
        0,
        canvas.height
      );

    gradient.addColorStop(
      0,
      finalPhase
        ? "#071c38"
        : "#061426"
    );

    gradient.addColorStop(
      0.5,
      finalPhase
        ? "#0369a1"
        : "#3179a8"
    );

    gradient.addColorStop(
      1,
      "#dff7ff"
    );

    ctx.fillStyle = gradient;

    ctx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    drawMountains();
    drawSnowGround();
    drawSnowflakes();
  }

  function drawMountains() {
    ctx.fillStyle =
      "rgba(117, 171, 204, 0.7)";

    ctx.beginPath();

    ctx.moveTo(0, 410);
    ctx.lineTo(90, 220);
    ctx.lineTo(180, 410);
    ctx.lineTo(295, 180);
    ctx.lineTo(400, 410);
    ctx.lineTo(480, 250);
    ctx.lineTo(480, 480);
    ctx.lineTo(0, 480);

    ctx.closePath();
    ctx.fill();
  }

  function drawSnowGround() {
    ctx.fillStyle = "#f4fcff";

    ctx.beginPath();

    ctx.moveTo(
      0,
      canvas.height - 105
    );

    ctx.quadraticCurveTo(
      120,
      canvas.height - 135,
      240,
      canvas.height - 95
    );

    ctx.quadraticCurveTo(
      360,
      canvas.height - 65,
      480,
      canvas.height - 105
    );

    ctx.lineTo(
      480,
      canvas.height
    );

    ctx.lineTo(
      0,
      canvas.height
    );

    ctx.closePath();
    ctx.fill();
  }

  function drawSnowflakes() {
    ctx.fillStyle =
      "rgba(255, 255, 255, 0.85)";

    for (
      let index = 0;
      index < 45;
      index++
    ) {
      const x =
        (
          index * 79 +
          27
        ) %
        canvas.width;

      const y =
        (
          index * 113 +
          19
        ) %
        (
          canvas.height -
          90
        );

      const radius =
        1.5 +
        index % 4;

      ctx.beginPath();

      ctx.arc(
        x,
        y,
        radius * 0.55,
        0,
        Math.PI * 2
      );

      ctx.fill();
    }
  }

  // ==============================
  // プレイヤー描画
  // ==============================

  function drawPlayer() {
    if (loadedImages.player) {
      ctx.drawImage(
        playerImage,
        player.x,
        player.y,
        player.width,
        player.height
      );

      return;
    }

    ctx.fillStyle = "#bfeaff";

    ctx.beginPath();

    ctx.arc(
      player.x +
      player.width / 2,
      player.y +
      player.height / 2,
      38,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }

  // ==============================
  // 敵描画
  // ==============================

  function drawEnemy() {
    const currentEnemy =
      enemyData[enemy.type];

    const imageLoaded =
      enemy.type === "garchomp"
        ? loadedImages.garchomp
        : loadedImages.megaDragonite;

    if (imageLoaded) {
      ctx.drawImage(
        currentEnemy.image,
        enemy.x,
        enemy.y,
        enemy.width,
        enemy.height
      );

      return;
    }

    ctx.fillStyle =
      enemy.type === "garchomp"
        ? "#315e87"
        : "#f4a261";

    ctx.beginPath();

    ctx.arc(
      enemy.x +
      enemy.width / 2,
      enemy.y +
      enemy.height / 2,
      enemy.width * 0.35,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }

  // ==============================
  // 攻撃描画
  // ==============================

  function drawAttacks() {
    attacks.forEach(attack => {
      if (attack.type === "iceBeam") {
        drawIceBeam(attack);
      } else {
        drawSnowball(attack);
      }
    });
  }

  function drawSnowball(snowball) {
    ctx.save();

    ctx.translate(
      snowball.x,
      snowball.y
    );

    ctx.rotate(
      snowball.rotation
    );

    ctx.shadowColor =
      "rgba(190, 235, 255, 0.95)";

    ctx.shadowBlur = 14;

    const gradient =
      ctx.createRadialGradient(
        -4,
        -5,
        2,
        0,
        0,
        snowball.radius
      );

    gradient.addColorStop(
      0,
      "#ffffff"
    );

    gradient.addColorStop(
      0.65,
      "#e5f7ff"
    );

    gradient.addColorStop(
      1,
      "#8ed1ed"
    );

    ctx.fillStyle = gradient;

    ctx.beginPath();

    ctx.arc(
      0,
      0,
      snowball.radius,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.strokeStyle =
      "rgba(72, 160, 202, 0.85)";

    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  function drawIceBeam(beam) {
    ctx.save();

    ctx.shadowColor =
      "rgba(103, 232, 249, 1)";

    ctx.shadowBlur = 18;

    const gradient =
      ctx.createLinearGradient(
        beam.x,
        0,
        beam.x + beam.width,
        0
      );

    gradient.addColorStop(
      0,
      "#38bdf8"
    );

    gradient.addColorStop(
      0.5,
      "#ffffff"
    );

    gradient.addColorStop(
      1,
      "#67e8f9"
    );

    ctx.fillStyle = gradient;

    ctx.fillRect(
      beam.x,
      beam.y,
      beam.width,
      beam.height
    );

    ctx.fillStyle =
      "rgba(255, 255, 255, 0.9)";

    ctx.fillRect(
      beam.x +
      beam.width * 0.4,

      beam.y,

      beam.width * 0.2,

      beam.height
    );

    ctx.restore();
  }

  // ==============================
  // 全体描画
  // ==============================

  function drawScene() {
    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    drawBackground();
    drawEnemy();
    drawPlayer();
    drawAttacks();
    drawExplosions();
  }

  // ==============================
  // ゲームループ
  // ==============================

  function gameLoop() {
    if (!gameRunning) {
      return;
    }

    updatePlayer();
    updateEnemy();
    updateAttacks();
    updateExplosions();

    drawScene();

    animationId =
      requestAnimationFrame(
        gameLoop
      );
  }

  // ==============================
  // 初期化
  // ==============================

  function resetGameScreen() {
    stopGame();

    score = 0;
    combo = 0;
    timeLeft = 30;
    lastShotTime = 0;
    finalPhase = false;

    attacks.length = 0;
    explosions.length = 0;

    player.x =
      canvas.width / 2 -
      player.width / 2;

    player.y =
      canvas.height -
      player.height -
      15;

    setGarchomp();

    if (statusArea) {
      statusArea.classList.remove(
        "danger"
      );
    }

    updateAttackDisplay();
    updateStatus();
    drawScene();

    messageElement.textContent =
      "「ゲーム開始」を押してください。";

    startButton.disabled = false;
    startButton.textContent =
      "ゲーム開始";
  }

  resetGameScreen();
});