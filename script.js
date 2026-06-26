// ==============================
// 初期データ・状態管理
// ==============================

let allPokemon = [];
let selectedPokemon = null;
let selectedCard = null;

// 種族値の表示名と、JSON内のキーをまとめて管理する
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

// JSONを読み込み、表示できるデータだけを一覧表示する
fetch("./data/ice_pokemon_with_category.json?ver=1")
  .then(response => response.json())
  .then(data => {
    allPokemon = data.filter(isValidPokemon);
    displayPokemon(allPokemon);
  });

// ポケモン一覧をカード形式で表示する
function displayPokemon(pokemonList) {
  const list = document.getElementById("pokemon-list");
  list.innerHTML = "";

  pokemonList.forEach(pokemon => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <img src="${getImage(pokemon)}" width="100" alt="${pokemon.name}">

      <h2>${pokemon.name}</h2>

<p class="category">
  ${pokemon.category ? pokemon.category : ""}
</p>

      <p class="rank-line">
        ${createRankHtml(pokemon)}
      </p>
    `;

    card.onclick = () => showPokemon(pokemon, card);
    list.appendChild(card);
  });
}

// カードクリック時に詳細欄を表示する
function showPokemon(pokemon, card) {
  const result = document.getElementById("result");

  clearSelectedCard();

  // 同じカードをもう一度クリックしたら詳細欄を閉じる
  if (selectedPokemon === pokemon.name) {
    result.innerHTML = "";
    selectedPokemon = null;
    selectedCard = null;
    return;
  }

  card.classList.add("selected");
  selectedPokemon = pokemon.name;
  selectedCard = card;

  result.innerHTML = `
    <div class="result-box">
      <img
        src="${getImage(pokemon)}"
        class="pokemon-image"
        alt="${pokemon.name}"
      >

      <h2>${pokemon.name}</h2>

      ${createBasicInfoHtml(pokemon)}

      <h3>種族値</h3>
      ${createStatsBarHtml(pokemon)}

      <h3>特性</h3>
      ${createAbilitiesHtml(pokemon)}

      ${createMemoHtml(pokemon)}
    </div>
  `;

  result.scrollIntoView({
    behavior: "smooth"
  });
}

// ==============================
// ソート・フィルター機能
// ==============================

// HP順に並び替える
function sortByHp() {
  sortByStat(["HP", "hp"]);
}

// 攻撃順に並び替える
function sortByAtk() {
  sortByStat(["攻撃", "atk"]);
}

// 防御順に並び替える
function sortByDefense() {
  sortByStat(["防御", "def"]);
}

// 特攻順に並び替える
function sortBySpAtk() {
  sortByStat(["特攻", "spa"]);
}

// 特防順に並び替える
function sortBySpDefense() {
  sortByStat(["特防", "spd"]);
}

// 素早さ順に並び替える
function sortBySpeed() {
  sortByStat(["素早さ", "素早", "spe"]);
}

// メガシンカポケモンだけ表示する
function showMegaOnly() {
  const filtered = allPokemon.filter(pokemon =>
    pokemon.name.includes("メガ")
  );

  displayPokemon(filtered);
}

// 全ポケモンを表示する
function showAllPokemon() {
  displayPokemon(allPokemon);
}

// 指定した種族値で降順ソートする
function sortByStat(keys) {
  const sorted = [...allPokemon];

  sorted.sort((a, b) =>
    getStat(b, keys) - getStat(a, keys)
  );

  displayPokemon(sorted);
}

// ==============================
// HTML生成
// ==============================

// カード内のランク表示HTMLを作る
function createRankHtml(pokemon) {
  return STAT_LIST.map(stat => {
    const value = getStat(pokemon, stat.keys);

    return `
      ${stat.label}:
      <span class="${getRankClass(value)}">
        ${getRank(value)}
      </span>
    `;
  }).join("");
}

// 詳細欄の基本情報HTMLを作る
function createBasicInfoHtml(pokemon) {
  const typeText = Array.isArray(pokemon.types)
    ? pokemon.types.join(" / ")
    : "";

  return `
    <p class="basic-info">
      ${typeText ? `タイプ：${typeText}<br>` : ""}
      ${pokemon.height ? `高さ：${pokemon.height}<br>` : ""}
      ${pokemon.weight ? `重さ：${pokemon.weight}` : ""}
    </p>
  `;
}

// 詳細欄の種族値バーHTMLを作る
function createStatsBarHtml(pokemon) {
  return `
    <div>
      ${STAT_LIST.map(stat => {
    const value = getStat(pokemon, stat.keys);
    const width = Math.min(value / 200 * 100, 100);

    return `
          ${stat.label} ${value}
          <div class="stat-bar">
            <div
              class="stat-fill"
              style="width:${width}%">
            </div>
          </div>
        `;
  }).join("")}
    </div>
  `;
}

// 特性一覧HTMLを作る
function createAbilitiesHtml(pokemon) {
  const abilities = normalizeAbilities(pokemon.abilities);
  const hiddenAbility = getHiddenAbility(pokemon);

  return `
    <ul>
      ${abilities.map(ability => `<li>${ability}</li>`).join("")}
      ${hiddenAbility ? `<li>夢特性：${hiddenAbility}</li>` : ""}
    </ul>
  `;
}

// memo表示HTMLを作る
function createMemoHtml(pokemon) {
  if (!pokemon.memo) {
    return "";
  }

  return `
    <h3>メモ</h3>
    <p class="memo">
      ${pokemon.memo}
    </p>
  `;
}

// ==============================
// データ取得・整形
// ==============================

// ポケモンの画像パスを取得する
function getImage(pokemon) {
  return pokemon.imagePath || pokemon.image || "";
}

// 種族値を数値として取得する
function getStat(pokemon, keys) {
  const keyList = Array.isArray(keys) ? keys : [keys];

  for (const key of keyList) {
    const value = pokemon.stats?.[key];

    if (value !== undefined && value !== null && value !== "") {
      return Number(value);
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
        return ability;
      }

      return ability.name;
    })
    .filter(Boolean);
}

// 夢特性を取得する
function getHiddenAbility(pokemon) {
  if (pokemon.hiddenAbility) {
    return pokemon.hiddenAbility;
  }

  if (!Array.isArray(pokemon.hiddenAbilities)) {
    return "";
  }

  const hiddenAbility = pokemon.hiddenAbilities.find(ability =>
    ability.name &&
    !isNonAbilityData(ability.name)
  );

  return hiddenAbility?.name || "";
}

// 特性ではない混入データを除外する
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

// 表示に必要な最低限のデータがあるか判定する
function isValidPokemon(pokemon) {
  return pokemon && pokemon.name && pokemon.stats;
}

// ==============================
// UI補助
// ==============================

// 選択中カードの見た目を解除する
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
  value = Number(value);

  if (value >= 120) return "S";
  if (value >= 100) return "A";
  if (value >= 80) return "B";
  if (value >= 60) return "C";
  if (value >= 40) return "D";
  return "E";
}

// 種族値からCSSクラス名を返す
function getRankClass(value) {
  return `rank-${getRank(value).toLowerCase()}`;
}