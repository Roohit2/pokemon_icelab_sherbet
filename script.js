// ==============================
// 初期データ・状態管理
// ==============================

let allPokemon = [];
let selectedPokemon = null;
let selectedCard = null;

let moveSearchTerm = "";

let moveSortState = {
  key: "power",
  direction: "desc"
};

// 種族値の表示名とJSON内のキー
const STAT_LIST = [
  { label: "HP", keys: ["HP", "hp"] },
  { label: "攻", keys: ["攻撃", "atk"] },
  { label: "防", keys: ["防御", "def"] },
  { label: "特攻", keys: ["特攻", "spa"] },
  { label: "特防", keys: ["特防", "spd"] },
  { label: "素早さ", keys: ["素早さ", "素早", "spe"] }
];

// ==============================
// メイン処理
// ==============================

// JSONを読み込む
fetch("./data/pokemon.json?ver=2")
  .then(response => {
    if (!response.ok) {
      throw new Error(`JSONの読み込みに失敗しました: ${response.status}`);
    }

    return response.json();
  })
  .then(data => {
    if (!Array.isArray(data)) {
      throw new Error("pokemon.jsonが配列形式ではありません。");
    }

    allPokemon = data.filter(isValidPokemon);
    displayPokemon(allPokemon);
  })
  .catch(error => {
    console.error(error);

    const list = document.getElementById("pokemon-list");

    if (list) {
      list.innerHTML = `
        <p class="error-message">
          ポケモンデータを読み込めませんでした。<br>
          コンソールを確認してください。
        </p>
      `;
    }
  });

// ==============================
// ポケモン一覧表示
// ==============================

// ポケモン一覧をカード形式で表示する
function displayPokemon(pokemonList) {
  const list = document.getElementById("pokemon-list");
  const result = document.getElementById("result");

  if (!list) {
    console.error("#pokemon-list が見つかりません。");
    return;
  }

  list.innerHTML = "";

  // ソート・絞り込み時に詳細表示を解除
  selectedPokemon = null;
  selectedCard = null;

  if (result) {
    result.innerHTML = "";
  }

  if (!Array.isArray(pokemonList) || pokemonList.length === 0) {
    list.innerHTML = `
      <p class="empty-message">
        表示できるポケモンがいません。
      </p>
    `;
    return;
  }

  pokemonList.forEach(pokemon => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <img
        src="${getImage(pokemon)}"
        class="card-image"
        alt="${pokemon.name}"
      >

      <h2>${pokemon.name}</h2>

      <p class="category">
        ${pokemon.category || ""}
      </p>

      ${createCardTypeHtml(pokemon)}

      <p class="rank-line">
        ${createRankHtml(pokemon)}
      </p>
    `;

    card.addEventListener("click", () => {
      showPokemon(pokemon, card);
    });

    list.appendChild(card);
  });
}

// カードクリック時に詳細欄を表示する
function showPokemon(pokemon, card) {
  const result = document.getElementById("result");

  if (!result) {
    console.error("#result が見つかりません。");
    return;
  }

  const isSamePokemon = selectedPokemon === pokemon.name;

  clearSelectedCard();

  // 同じカードをもう一度クリックした場合は閉じる
  if (isSamePokemon) {
    result.innerHTML = "";
    selectedPokemon = null;
    selectedCard = null;
    return;
  }

  card.classList.add("selected");

  selectedPokemon = pokemon.name;
  selectedCard = card;

  moveSearchTerm = "";

  moveSortState = {
    key: "power",
    direction: "desc"
  };

  result.innerHTML = `
    <div class="result-box">
      <div class="result-header">
        <img
          src="${getImage(pokemon)}"
          class="pokemon-image"
          alt="${pokemon.name}"
        >

        <div class="result-title-area">
          <h2>${pokemon.name}</h2>

          ${pokemon.category
      ? `<p class="result-category">${pokemon.category}</p>`
      : ""
    }

          ${createTypeBadgesHtml(pokemon)}
        </div>
      </div>

      ${createBasicInfoHtml(pokemon)}

      <section class="detail-section">
        <h3>種族値</h3>
        ${createStatsBarHtml(pokemon)}
      </section>

      <section class="detail-section">
        <h3>特性</h3>
        ${createAbilitiesHtml(pokemon)}
      </section>

      ${createMemoHtml(pokemon)}

      ${renderMoves(pokemon)}
    </div>
  `;

  result.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

// ==============================
// ソート・フィルター機能
// ==============================

// HP順
function sortByHp() {
  sortByStat(["HP", "hp"]);
}

// 攻撃順
function sortByAtk() {
  sortByStat(["攻撃", "atk"]);
}

// 防御順
function sortByDefense() {
  sortByStat(["防御", "def"]);
}

// 特攻順
function sortBySpAtk() {
  sortByStat(["特攻", "spa"]);
}

// 特防順
function sortBySpDefense() {
  sortByStat(["特防", "spd"]);
}

// 素早さ順
function sortBySpeed() {
  sortByStat(["素早さ", "素早", "spe"]);
}

// メガシンカだけ表示
function showMegaOnly() {
  const filtered = allPokemon.filter(pokemon =>
    pokemon.name.includes("メガ")
  );

  displayPokemon(filtered);
}

// 全ポケモンを表示
function showAllPokemon() {
  displayPokemon(allPokemon);
}

// 指定した種族値で降順ソート
function sortByStat(keys) {
  const sorted = [...allPokemon];

  sorted.sort((a, b) => {
    return getStat(b, keys) - getStat(a, keys);
  });

  displayPokemon(sorted);
}

// ==============================
// カード用HTML生成
// ==============================

// カードのタイプ表示
function createCardTypeHtml(pokemon) {
  const types = Array.isArray(pokemon.types)
    ? pokemon.types.filter(Boolean)
    : [];

  if (types.length === 0) {
    return "";
  }

  return `
    <div class="card-types">
      ${types.map(type => `
        <span class="type-badge type-${type}">
          ${type}
        </span>
      `).join("")}
    </div>
  `;
}

// カード内のランク表示
function createRankHtml(pokemon) {
  return STAT_LIST.map(stat => {
    const value = getStat(pokemon, stat.keys);

    return `
      <span class="rank-item">
        <span class="rank-label">${stat.label}</span>
        <span class="${getRankClass(value)}">
          ${getRank(value)}
        </span>
      </span>
    `;
  }).join("");
}

// ==============================
// 詳細欄HTML生成
// ==============================

// 詳細欄のタイプバッジ
function createTypeBadgesHtml(pokemon) {
  const types = Array.isArray(pokemon.types)
    ? pokemon.types.filter(Boolean)
    : [];

  if (types.length === 0) {
    return "";
  }

  return `
    <div class="type-badges">
      ${types.map(type => `
        <span class="type-badge type-${type}">
          ${type}
        </span>
      `).join("")}
    </div>
  `;
}

// 基本情報
function createBasicInfoHtml(pokemon) {
  const hasHeight =
    pokemon.height !== undefined &&
    pokemon.height !== null &&
    pokemon.height !== "";

  const hasWeight =
    pokemon.weight !== undefined &&
    pokemon.weight !== null &&
    pokemon.weight !== "";

  if (!hasHeight && !hasWeight) {
    return "";
  }

  return `
    <section class="basic-info">
      ${hasHeight
      ? `
            <div class="basic-info-item">
              <span class="basic-info-label">高さ</span>
              <span>${pokemon.height}</span>
            </div>
          `
      : ""
    }

      ${hasWeight
      ? `
            <div class="basic-info-item">
              <span class="basic-info-label">重さ</span>
              <span>${pokemon.weight}</span>
            </div>
          `
      : ""
    }
    </section>
  `;
}

// 種族値バー
function createStatsBarHtml(pokemon) {
  return `
    <div class="stats-list">
      ${STAT_LIST.map(stat => {
    const value = getStat(pokemon, stat.keys);
    const width = Math.min((value / 200) * 100, 100);

    return `
          <div class="stat-row">
            <div class="stat-text">
              <span class="stat-name">${stat.label}</span>
              <strong class="stat-value">${value}</strong>
              <span class="${getRankClass(value)} stat-rank">
                ${getRank(value)}
              </span>
            </div>

            <div class="stat-bar">
              <div
                class="stat-fill"
                style="width: ${width}%"
              ></div>
            </div>
          </div>
        `;
  }).join("")}
    </div>
  `;
}

// 特性一覧
function createAbilitiesHtml(pokemon) {
  const abilities = normalizeAbilities(pokemon.abilities);
  const hiddenAbilities = getHiddenAbilities(pokemon);

  if (abilities.length === 0 && hiddenAbilities.length === 0) {
    return `
      <p class="no-data">
        特性データはありません。
      </p>
    `;
  }

  return `
    <ul class="abilities-list">
      ${abilities.map(ability => `
        <li>
          <span class="ability-label">通常特性</span>
          <span>${ability}</span>
        </li>
      `).join("")}

      ${hiddenAbilities.map(ability => `
        <li class="hidden-ability">
          <span class="ability-label hidden-label">夢特性</span>
          <span>${ability}</span>
        </li>
      `).join("")}
    </ul>
  `;
}

// メモ
function createMemoHtml(pokemon) {
  if (!pokemon.memo) {
    return "";
  }

  return `
    <section class="detail-section memo-section">
      <h3>メモ</h3>

      <p class="memo">
        ${pokemon.memo}
      </p>
    </section>
  `;
}

// ==============================
// 技一覧
// ==============================

// 覚える技一覧
// ==============================
// 技一覧
// ==============================

function renderMoves(pokemon) {
  const originalMoves = Array.isArray(pokemon.moves)
    ? pokemon.moves
    : [];

  if (originalMoves.length === 0) {
    return `
      <section class="moves-section">
        <h3>覚える技</h3>

        <p class="no-data">
          技データはありません。
        </p>
      </section>
    `;
  }

  const filteredMoves = filterMovesByName(
    originalMoves,
    moveSearchTerm
  );

  const moves = sortMovesList(
    filteredMoves,
    moveSortState.key,
    moveSortState.direction
  );

  const pokemonTypes = Array.isArray(pokemon.types)
    ? pokemon.types
    : [];

  return `
    <section class="moves-section">
      <div class="moves-heading">
        <h3>覚える技</h3>

        <p class="moves-count">
          ${moves.length} / ${originalMoves.length}個
        </p>
      </div>

      <div class="moves-tools">
        <label class="move-search-label">
          <span>技名で絞り込み</span>

          <input
            type="search"
            class="move-search-input"
            value="${escapeHtmlAttribute(moveSearchTerm)}"
            placeholder="例：れいとう、こおり"
            oninput="filterMoves(this.value)"
          >
        </label>

        ${moveSearchTerm
      ? `
              <button
                type="button"
                class="move-search-clear"
                onclick="clearMoveSearch()"
              >
                絞り込み解除
              </button>
            `
      : ""
    }
      </div>

      <p class="moves-sort-help">
        見出しをクリックすると並び替えできます。
      </p>

      <div class="moves-table-wrapper">
        <table class="moves-table">
          <thead>
            <tr>
              <th>
                <button
                  type="button"
                  class="move-sort-button"
                  onclick="sortMoves('name')"
                >
                  技名${getMoveSortMark("name")}
                </button>
              </th>

              <th>
                <button
                  type="button"
                  class="move-sort-button"
                  onclick="sortMoves('type')"
                >
                  タイプ${getMoveSortMark("type")}
                </button>
              </th>

              <th>
                <button
                  type="button"
                  class="move-sort-button"
                  onclick="sortMoves('category')"
                >
                  分類${getMoveSortMark("category")}
                </button>
              </th>

              <th>
                <button
                  type="button"
                  class="move-sort-button"
                  onclick="sortMoves('power')"
                >
                  威力${getMoveSortMark("power")}
                </button>
              </th>

              <th>
                <button
                  type="button"
                  class="move-sort-button"
                  onclick="sortMoves('accuracy')"
                >
                  命中${getMoveSortMark("accuracy")}
                </button>
              </th>
            </tr>
          </thead>

          <tbody>
            ${moves.length > 0
      ? moves.map(move => {
        const moveName = move.name || "—";
        const moveType = move.type || "不明";
        const moveCategory = move.category || "";
        const movePower = formatMoveValue(move.power);
        const moveAccuracy = formatMoveValue(move.accuracy);

        const isSameType =
          pokemonTypes.includes(moveType);

        const isAccuracy100 =
          Number(move.accuracy) === 100;

        return `
                      <tr>
                        <td class="${isSameType ? "same-type-move" : ""}">
                          ${moveName}
                        </td>

                        <td class="move-type type-${moveType}">
                          ${moveType}
                        </td>

                        <td
                          class="move-category"
                          title="${moveCategory || "分類不明"}"
                        >
                          ${getMoveCategorySymbol(moveCategory)}
                        </td>

                        <td class="move-number">
                          ${movePower}
                        </td>

                        <td class="move-number ${isAccuracy100 ? "accuracy-100" : ""}">
                          ${moveAccuracy}
                        </td>
                      </tr>
                    `;
      }).join("")
      : `
                  <tr>
                    <td
                      colspan="5"
                      class="moves-empty"
                    >
                      「${escapeHtml(moveSearchTerm)}」に一致する技はありません。
                    </td>
                  </tr>
                `
    }
          </tbody>
        </table>
      </div>

      <div class="move-symbol-guide">
        <span><strong>★</strong> 物理</span>
        <span><strong>◎</strong> 特殊</span>
        <span><strong>－</strong> 変化技</span>
      </div>
    </section>
  `;
}

// 技名で絞り込む
function filterMovesByName(moves, searchTerm) {
  const normalizedSearch = normalizeSearchText(searchTerm);

  if (!normalizedSearch) {
    return [...moves];
  }

  return moves.filter(move => {
    const moveName = normalizeSearchText(move.name);

    return moveName.includes(normalizedSearch);
  });
}

// 入力された文字で技表を更新する
function filterMoves(value) {
  moveSearchTerm = value;

  refreshMovesSection({
    focusSearchInput: true
  });
}

// 絞り込みを解除する
function clearMoveSearch() {
  moveSearchTerm = "";

  refreshMovesSection({
    focusSearchInput: true
  });
}

// 技一覧部分だけ再描画する
function refreshMovesSection(options = {}) {
  const pokemon = allPokemon.find(item =>
    item.name === selectedPokemon
  );

  if (!pokemon) {
    return;
  }

  const currentSection =
    document.querySelector(".moves-section");

  if (!currentSection) {
    return;
  }

  currentSection.outerHTML = renderMoves(pokemon);

  if (options.focusSearchInput) {
    const searchInput =
      document.querySelector(".move-search-input");

    if (searchInput) {
      searchInput.focus();

      const endPosition = searchInput.value.length;

      searchInput.setSelectionRange(
        endPosition,
        endPosition
      );
    }
  }
}

// 検索用の文字列を整える
function normalizeSearchText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\s+/g, "");
}

// HTML本文用エスケープ
function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// inputのvalue属性用エスケープ
function escapeHtmlAttribute(value) {
  return escapeHtml(value);
}

// 技表の見出しをクリックしたときの処理
function sortMoves(key) {
  if (moveSortState.key === key) {
    moveSortState.direction =
      moveSortState.direction === "asc"
        ? "desc"
        : "asc";
  } else {
    moveSortState.key = key;

    moveSortState.direction =
      key === "power" || key === "accuracy"
        ? "desc"
        : "asc";
  }

  refreshMovesSection();
}

// 技一覧を並び替える
function sortMovesList(moves, key, direction) {
  const sorted = [...moves];

  sorted.sort((a, b) => {
    let result = 0;

    if (key === "power" || key === "accuracy") {
      result = compareMoveNumbers(
        a[key],
        b[key],
        direction
      );

      return result;
    }

    const valueA = String(a[key] || "");
    const valueB = String(b[key] || "");

    result = valueA.localeCompare(
      valueB,
      "ja",
      {
        numeric: true,
        sensitivity: "base"
      }
    );

    return direction === "asc"
      ? result
      : -result;
  });

  return sorted;
}

// 威力・命中などの数値比較
function compareMoveNumbers(valueA, valueB, direction) {
  const numberA = toSortableMoveNumber(valueA);
  const numberB = toSortableMoveNumber(valueB);

  // 数値がない技は常に一番下
  if (numberA === null && numberB === null) {
    return 0;
  }

  if (numberA === null) {
    return 1;
  }

  if (numberB === null) {
    return -1;
  }

  return direction === "asc"
    ? numberA - numberB
    : numberB - numberA;
}

// ソートできる数値へ変換
function toSortableMoveNumber(value) {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "-" ||
    value === "—"
  ) {
    return null;
  }

  const numberValue = Number(value);

  return Number.isNaN(numberValue)
    ? null
    : numberValue;
}

// 現在のソート方向を表示
function getMoveSortMark(key) {
  if (moveSortState.key !== key) {
    return "";
  }

  return moveSortState.direction === "asc"
    ? " ▲"
    : " ▼";
}

// 技の分類を記号に変換
function getMoveCategorySymbol(category) {
  const normalizedCategory =
    String(category || "").trim();

  if (normalizedCategory.includes("物理")) {
    return "★";
  }

  if (normalizedCategory.includes("特殊")) {
    return "◎";
  }

  if (normalizedCategory.includes("変化")) {
    return "－";
  }

  return "－";
}

// 威力・命中の表示調整
function formatMoveValue(value) {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "-"
  ) {
    return "—";
  }

  return value;
}

// ==============================
// データ取得・整形
// ==============================

// 画像パスを取得
function getImage(pokemon) {
  return (
    pokemon.imageUrl ||
    pokemon.imagePath ||
    pokemon.image ||
    ""
  );
}

// 種族値を数値として取得
function getStat(pokemon, keys) {
  const keyList = Array.isArray(keys)
    ? keys
    : [keys];

  for (const key of keyList) {
    const value = pokemon.stats?.[key];

    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      const numberValue = Number(value);

      return Number.isNaN(numberValue)
        ? 0
        : numberValue;
    }
  }

  return 0;
}

// 通常特性を文字列配列にそろえる
function normalizeAbilities(abilities) {
  if (!Array.isArray(abilities)) {
    return [];
  }

  return abilities
    .map(ability => {
      if (typeof ability === "string") {
        return ability.trim();
      }

      if (
        ability &&
        typeof ability === "object"
      ) {
        return String(ability.name || "").trim();
      }

      return "";
    })
    .filter(name => {
      return name && !isNonAbilityData(name);
    });
}

// 夢特性を配列で取得
function getHiddenAbilities(pokemon) {
  const hiddenAbilities = [];

  if (
    typeof pokemon.hiddenAbility === "string" &&
    pokemon.hiddenAbility.trim()
  ) {
    hiddenAbilities.push(
      pokemon.hiddenAbility.trim()
    );
  }

  if (Array.isArray(pokemon.hiddenAbilities)) {
    pokemon.hiddenAbilities.forEach(ability => {
      let abilityName = "";

      if (typeof ability === "string") {
        abilityName = ability.trim();
      } else if (
        ability &&
        typeof ability === "object"
      ) {
        abilityName = String(
          ability.name || ""
        ).trim();
      }

      if (
        abilityName &&
        !isNonAbilityData(abilityName)
      ) {
        hiddenAbilities.push(abilityName);
      }
    });
  }

  return [...new Set(hiddenAbilities)];
}

// 特性ではない混入データ
function isNonAbilityData(name) {
  return [
    "通常色",
    "色違い",
    "ZA",
    "SV",
    "ｱﾙｾｳｽ",
    "BDSP",
    "剣盾",
    "ピカブイ"
  ].includes(name);
}

// 表示に必要なデータがあるか判定
function isValidPokemon(pokemon) {
  return Boolean(
    pokemon &&
    pokemon.name &&
    pokemon.stats
  );
}

// ==============================
// UI補助
// ==============================

// 選択中カードを解除
function clearSelectedCard() {
  if (selectedCard) {
    selectedCard.classList.remove("selected");
  }
}

// ==============================
// ランク判定
// ==============================

// 種族値からランク文字を返す
function getRank(value) {
  const numberValue = Number(value);

  if (numberValue >= 120) return "S";
  if (numberValue >= 100) return "A";
  if (numberValue >= 80) return "B";
  if (numberValue >= 60) return "C";
  if (numberValue >= 40) return "D";

  return "E";
}

// 種族値からCSSクラス名を返す
function getRankClass(value) {
  const rank = getRank(value);

  return `rank rank-${rank.toLowerCase()}`;
}