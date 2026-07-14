// ==============================
// 初期データ・状態管理
// ==============================

let allPokemon = [];
let selectedPokemon = null;
let selectedCard = null;

let moveTypeFilter = "";
let moveCategoryFilter = "";

let moveSortState = {
  key: "power",
  direction: "desc"
};

const STAT_LIST = [
  { label: "HP", keys: ["HP", "hp"] },
  { label: "攻", keys: ["攻撃", "atk"] },
  { label: "防", keys: ["防御", "def"] },
  { label: "特攻", keys: ["特攻", "spa"] },
  { label: "特防", keys: ["特防", "spd"] },
  {
    label: "素早さ",
    keys: ["素早さ", "素早", "spe"]
  }
];

// ==============================
// メイン処理
// ==============================

fetch("./data/pokemon.json?ver=4")
  .then(response => {
    if (!response.ok) {
      throw new Error(
        `JSONの読み込みに失敗しました: ${response.status}`
      );
    }

    return response.json();
  })
  .then(data => {
    if (!Array.isArray(data)) {
      throw new Error(
        "pokemon.jsonが配列形式ではありません。"
      );
    }

    allPokemon =
      data.filter(isValidPokemon);

    displayPokemon(allPokemon);
  })
  .catch(error => {
    console.error(error);

    const list =
      document.getElementById(
        "pokemon-list"
      );

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
// ポケモン一覧
// ==============================

function displayPokemon(pokemonList) {
  const list =
    document.getElementById(
      "pokemon-list"
    );

  const result =
    document.getElementById(
      "result"
    );

  if (!list) {
    return;
  }

  list.innerHTML = "";

  selectedPokemon = null;
  selectedCard = null;

  if (result) {
    result.innerHTML = "";
  }

  if (
    !Array.isArray(pokemonList) ||
    pokemonList.length === 0
  ) {
    list.innerHTML = `
      <p class="empty-message">
        表示できるポケモンがいません。
      </p>
    `;

    return;
  }

  pokemonList.forEach(pokemon => {
    const card =
      document.createElement("div");

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

    card.addEventListener(
      "click",
      () => {
        showPokemon(
          pokemon,
          card
        );
      }
    );

    list.appendChild(card);
  });
}

// ==============================
// 詳細表示
// ==============================

function showPokemon(pokemon, card) {
  const result =
    document.getElementById(
      "result"
    );

  if (!result) {
    return;
  }

  const isSamePokemon =
    selectedPokemon === pokemon.name;

  clearSelectedCard();

  if (isSamePokemon) {
    result.innerHTML = "";
    selectedPokemon = null;
    selectedCard = null;

    return;
  }

  card.classList.add("selected");

  selectedPokemon = pokemon.name;
  selectedCard = card;

  moveTypeFilter = "";
  moveCategoryFilter = "";

  moveSortState = {
    key: "power",
    direction: "desc"
  };

  result.innerHTML = `
    <div class="result-box">
      <div class="result-header">
        <div class="pokemon-images">
          <div class="pokemon-image-item">
            <span class="pokemon-image-label">
              通常色
            </span>

            <img
              src="${getImage(pokemon)}"
              class="pokemon-image"
              alt="${pokemon.name} 通常色"
            >
          </div>

          ${getShinyImage(pokemon)
      ? `
                <div class="pokemon-image-item">
                  <span
                    class="pokemon-image-label shiny-label"
                  >
                    色違い
                  </span>

                  <img
                    src="${getShinyImage(pokemon)}"
                    class="pokemon-image shiny-image"
                    alt="${pokemon.name} 色違い"
                  >
                </div>
              `
      : ""
    }
        </div>

        <div class="result-title-area">
          <h2>${pokemon.name}</h2>

          ${pokemon.category
      ? `
                <p class="result-category">
                  ${pokemon.category}
                </p>
              `
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
// ポケモン一覧ソート
// ==============================

function sortByHp() {
  sortByStat(["HP", "hp"]);
}

function sortByAtk() {
  sortByStat(["攻撃", "atk"]);
}

function sortByDefense() {
  sortByStat(["防御", "def"]);
}

function sortBySpAtk() {
  sortByStat(["特攻", "spa"]);
}

function sortBySpDefense() {
  sortByStat(["特防", "spd"]);
}

function sortBySpeed() {
  sortByStat([
    "素早さ",
    "素早",
    "spe"
  ]);
}

function showMegaOnly() {
  const filtered =
    allPokemon.filter(pokemon =>
      pokemon.name.includes("メガ")
    );

  displayPokemon(filtered);
}

function showAllPokemon() {
  displayPokemon(allPokemon);
}

function sortByStat(keys) {
  const sorted = [...allPokemon];

  sorted.sort((a, b) =>
    getStat(b, keys) -
    getStat(a, keys)
  );

  displayPokemon(sorted);
}

// ==============================
// カードHTML
// ==============================

function createCardTypeHtml(pokemon) {
  const types =
    Array.isArray(pokemon.types)
      ? pokemon.types.filter(Boolean)
      : [];

  if (types.length === 0) {
    return "";
  }

  return `
    <div class="card-types">
      ${types.map(type => `
        <span
          class="type-badge type-${type}"
        >
          ${type}
        </span>
      `).join("")}
    </div>
  `;
}

function createRankHtml(pokemon) {
  return STAT_LIST.map(stat => {
    const value =
      getStat(
        pokemon,
        stat.keys
      );

    return `
      <span class="rank-item">
        <span class="rank-label">
          ${stat.label}
        </span>

        <span
          class="${getRankClass(value)}"
        >
          ${getRank(value)}
        </span>
      </span>
    `;
  }).join("");
}

// ==============================
// 詳細HTML
// ==============================

function createTypeBadgesHtml(pokemon) {
  const types =
    Array.isArray(pokemon.types)
      ? pokemon.types.filter(Boolean)
      : [];

  if (types.length === 0) {
    return "";
  }

  return `
    <div class="type-badges">
      ${types.map(type => `
        <span
          class="type-badge type-${type}"
        >
          ${type}
        </span>
      `).join("")}
    </div>
  `;
}

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
              <span class="basic-info-label">
                高さ
              </span>

              <span>
                ${pokemon.height}
              </span>
            </div>
          `
      : ""
    }

      ${hasWeight
      ? `
            <div class="basic-info-item">
              <span class="basic-info-label">
                重さ
              </span>

              <span>
                ${pokemon.weight}
              </span>
            </div>
          `
      : ""
    }
    </section>
  `;
}

function createStatsBarHtml(pokemon) {
  return `
    <div class="stats-list">
      ${STAT_LIST.map(stat => {
    const value =
      getStat(
        pokemon,
        stat.keys
      );

    const width =
      Math.min(
        value / 200 * 100,
        100
      );

    return `
          <div class="stat-row">
            <div class="stat-text">
              <span class="stat-name">
                ${stat.label}
              </span>

              <strong class="stat-value">
                ${value}
              </strong>

              <span
                class="${getRankClass(value)} stat-rank"
              >
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

function createAbilitiesHtml(pokemon) {
  const abilities =
    normalizeAbilities(
      pokemon.abilities
    );

  const hiddenAbilities =
    getHiddenAbilities(
      pokemon
    );

  if (
    abilities.length === 0 &&
    hiddenAbilities.length === 0
  ) {
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
          <span class="ability-label">
            通常特性
          </span>

          <span>${ability}</span>
        </li>
      `).join("")}

      ${hiddenAbilities.map(ability => `
        <li class="hidden-ability">
          <span
            class="ability-label hidden-label"
          >
            夢特性
          </span>

          <span>${ability}</span>
        </li>
      `).join("")}
    </ul>
  `;
}

function createMemoHtml(pokemon) {
  if (!pokemon.memo) {
    return "";
  }

  return `
    <section
      class="detail-section memo-section"
    >
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

function renderMoves(pokemon) {
  const originalMoves =
    Array.isArray(pokemon.moves)
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

  const filteredMoves =
    filterMoves(originalMoves);

  const moves =
    sortMovesList(
      filteredMoves,
      moveSortState.key,
      moveSortState.direction
    );

  const pokemonTypes =
    Array.isArray(pokemon.types)
      ? pokemon.types
      : [];

  const moveTypes =
    getMoveTypes(originalMoves);

  return `
    <section class="moves-section">
      <div class="moves-heading">
        <h3>覚える技</h3>

        <p class="moves-count">
          ${moves.length} / ${originalMoves.length}個
        </p>
      </div>

      <div class="moves-filters">
        <label class="moves-filter-label">
          <span>技タイプ</span>

          <select
            class="moves-filter-select"
            onchange="changeMoveTypeFilter(this.value)"
          >
            <option value="">
              すべて
            </option>

            ${moveTypes.map(type => `
              <option
                value="${type}"
                ${moveTypeFilter === type
      ? "selected"
      : ""
    }
              >
                ${type}
              </option>
            `).join("")}
          </select>
        </label>

        <label class="moves-filter-label">
          <span>分類</span>

          <select
            class="moves-filter-select"
            onchange="changeMoveCategoryFilter(this.value)"
          >
            <option value="">
              すべて
            </option>

            <option
              value="物理"
              ${moveCategoryFilter === "物理"
      ? "selected"
      : ""
    }
            >
              物理
            </option>

            <option
              value="特殊"
              ${moveCategoryFilter === "特殊"
      ? "selected"
      : ""
    }
            >
              特殊
            </option>

            <option
              value="変化"
              ${moveCategoryFilter === "変化"
      ? "selected"
      : ""
    }
            >
              変化
            </option>
          </select>
        </label>

        ${moveTypeFilter ||
      moveCategoryFilter
      ? `
              <button
                type="button"
                class="moves-filter-clear"
                onclick="clearMoveFilters()"
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
        const moveName =
          move.name ||
          "—";

        const moveType =
          move.type ||
          "不明";

        const category =
          move.category ||
          "";

        const power =
          formatMoveValue(
            move.power
          );

        const accuracy =
          formatMoveValue(
            move.accuracy
          );

        const isSameType =
          pokemonTypes.includes(
            moveType
          );

        const isAccuracy100 =
          Number(
            move.accuracy
          ) === 100;

        return `
                      <tr>
                        <td
                          class="${isSameType
            ? "same-type-move"
            : ""
          }"
                        >
                          ${moveName}
                        </td>

                        <td
                          class="move-type type-${moveType}"
                        >
                          ${moveType}
                        </td>

                        <td
                          class="move-category"
                          title="${category || "分類不明"}"
                        >
                          ${getMoveCategorySymbol(
            category
          )}
                        </td>

                        <td class="move-number">
                          ${power}
                        </td>

                        <td
                          class="move-number ${isAccuracy100
            ? "accuracy-100"
            : ""
          }"
                        >
                          ${accuracy}
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
                      条件に一致する技はありません。
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

// ==============================
// 技絞り込み
// ==============================

function filterMoves(moves) {
  return moves.filter(move => {
    const type =
      String(
        move.type || ""
      ).trim();

    const category =
      normalizeMoveCategory(
        move.category
      );

    if (
      moveTypeFilter &&
      type !== moveTypeFilter
    ) {
      return false;
    }

    if (
      moveCategoryFilter &&
      category !==
      moveCategoryFilter
    ) {
      return false;
    }

    return true;
  });
}

function changeMoveTypeFilter(value) {
  moveTypeFilter = value;
  refreshMovesSection();
}

function changeMoveCategoryFilter(
  value
) {
  moveCategoryFilter = value;
  refreshMovesSection();
}

function clearMoveFilters() {
  moveTypeFilter = "";
  moveCategoryFilter = "";

  refreshMovesSection();
}

function getMoveTypes(moves) {
  const types =
    moves
      .map(move =>
        String(
          move.type || ""
        ).trim()
      )
      .filter(Boolean);

  return [...new Set(types)]
    .sort((a, b) =>
      a.localeCompare(
        b,
        "ja"
      )
    );
}

function normalizeMoveCategory(
  category
) {
  const value =
    String(
      category || ""
    ).trim();

  if (value.includes("物理")) {
    return "物理";
  }

  if (value.includes("特殊")) {
    return "特殊";
  }

  if (value.includes("変化")) {
    return "変化";
  }

  return value;
}

// ==============================
// 技一覧更新
// ==============================

function refreshMovesSection() {
  const pokemon =
    allPokemon.find(
      item =>
        item.name ===
        selectedPokemon
    );

  if (!pokemon) {
    return;
  }

  const currentSection =
    document.querySelector(
      ".moves-section"
    );

  if (!currentSection) {
    return;
  }

  currentSection.outerHTML =
    renderMoves(pokemon);
}

// ==============================
// 技ソート
// ==============================

function sortMoves(key) {
  if (
    moveSortState.key === key
  ) {
    moveSortState.direction =
      moveSortState.direction ===
        "asc"
        ? "desc"
        : "asc";
  } else {
    moveSortState.key = key;

    moveSortState.direction =
      key === "power" ||
        key === "accuracy"
        ? "desc"
        : "asc";
  }

  refreshMovesSection();
}

function sortMovesList(
  moves,
  key,
  direction
) {
  const sorted = [...moves];

  sorted.sort((a, b) => {
    if (
      key === "power" ||
      key === "accuracy"
    ) {
      return compareMoveNumbers(
        a[key],
        b[key],
        direction
      );
    }

    let valueA =
      String(a[key] || "");

    let valueB =
      String(b[key] || "");

    if (key === "category") {
      valueA =
        normalizeMoveCategory(
          a.category
        );

      valueB =
        normalizeMoveCategory(
          b.category
        );
    }

    const result =
      valueA.localeCompare(
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

function compareMoveNumbers(
  valueA,
  valueB,
  direction
) {
  const numberA =
    toSortableMoveNumber(
      valueA
    );

  const numberB =
    toSortableMoveNumber(
      valueB
    );

  if (
    numberA === null &&
    numberB === null
  ) {
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

function toSortableMoveNumber(
  value
) {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "-" ||
    value === "—"
  ) {
    return null;
  }

  const numberValue =
    Number(value);

  return Number.isNaN(
    numberValue
  )
    ? null
    : numberValue;
}

function getMoveSortMark(key) {
  if (
    moveSortState.key !== key
  ) {
    return "";
  }

  return moveSortState.direction ===
    "asc"
    ? " ▲"
    : " ▼";
}

function getMoveCategorySymbol(
  category
) {
  const normalized =
    normalizeMoveCategory(
      category
    );

  if (normalized === "物理") {
    return "★";
  }

  if (normalized === "特殊") {
    return "◎";
  }

  return "－";
}

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
// 画像
// ==============================

function getImage(pokemon) {
  return (
    pokemon.imagePath ||
    pokemon.image ||
    pokemon.imageUrl ||
    ""
  );
}

function getShinyImage(pokemon) {
  return (
    pokemon.shinyImagePath ||
    pokemon.shinyImage ||
    pokemon.shinyImageUrl ||
    ""
  );
}

// ==============================
// データ整形
// ==============================

function getStat(pokemon, keys) {
  const keyList =
    Array.isArray(keys)
      ? keys
      : [keys];

  for (const key of keyList) {
    const value =
      pokemon.stats?.[key];

    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      const numberValue =
        Number(value);

      return Number.isNaN(
        numberValue
      )
        ? 0
        : numberValue;
    }
  }

  return 0;
}

function normalizeAbilities(
  abilities
) {
  if (!Array.isArray(abilities)) {
    return [];
  }

  return abilities
    .map(ability => {
      if (
        typeof ability ===
        "string"
      ) {
        return ability.trim();
      }

      return String(
        ability?.name || ""
      ).trim();
    })
    .filter(name =>
      name &&
      !isNonAbilityData(name)
    );
}

function getHiddenAbilities(
  pokemon
) {
  const result = [];

  if (
    typeof pokemon.hiddenAbility ===
    "string" &&
    pokemon.hiddenAbility.trim()
  ) {
    result.push(
      pokemon.hiddenAbility.trim()
    );
  }

  if (
    Array.isArray(
      pokemon.hiddenAbilities
    )
  ) {
    for (
      const ability
      of pokemon.hiddenAbilities
    ) {
      const name =
        typeof ability ===
          "string"
          ? ability.trim()
          : String(
            ability?.name || ""
          ).trim();

      if (
        name &&
        !isNonAbilityData(name)
      ) {
        result.push(name);
      }
    }
  }

  return [...new Set(result)];
}

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

function clearSelectedCard() {
  if (selectedCard) {
    selectedCard.classList.remove(
      "selected"
    );
  }
}

// ==============================
// ランク
// ==============================

function getRank(value) {
  const numberValue =
    Number(value);

  if (numberValue >= 120) {
    return "S";
  }

  if (numberValue >= 100) {
    return "A";
  }

  if (numberValue >= 80) {
    return "B";
  }

  if (numberValue >= 60) {
    return "C";
  }

  if (numberValue >= 40) {
    return "D";
  }

  return "E";
}

function getRankClass(value) {
  const rank =
    getRank(value);

  return `rank rank-${rank.toLowerCase()}`;
}