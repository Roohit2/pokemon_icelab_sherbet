const puppeteer = require("puppeteer");
const fs = require("fs");

// ========================
// ヤッカン図鑑URL生成
// メガ・リージョンなど通常URLで飛べないものはここで指定
// ========================
function buildYakkunUrl(pokemon) {
  const specialUrls = {
    38: "https://yakkun.com/ch/zukan/n38a",     // アローラキュウコン
    3621: "https://yakkun.com/ch/zukan/n362m",  // メガオニゴーリ
    4601: "https://yakkun.com/ch/zukan/n460m"   // メガユキノオー
  };

  if (specialUrls[pokemon.id]) return specialUrls[pokemon.id];
  if (pokemon.url?.includes("yakkun.com")) return pokemon.url;

  return `https://yakkun.com/ch/zukan/n${pokemon.id}`;
}

// ========================
// 特性の重複除去
// 文字列でも { name, description } 形式にそろえる
// ========================
function uniqueAbilities(list = []) {
  const map = new Map();

  for (const a of list) {
    const ability =
      typeof a === "string"
        ? { name: a, description: "" }
        : a;

    if (!ability?.name) continue;
    map.set(ability.name, ability);
  }

  return [...map.values()];
}

// ========================
// 特性欄に混入したゴミデータを除去
// 例: 通常色 / ZA / SV / オニゴーリナイト など
// ========================
function cleanAbilities(list = []) {
  const ngNames = [
    "通常色",
    "色違い",
    "ZA",
    "SV",
    "BDSP",
    "剣盾",
    "ピカブイ",
    "ｱﾙｾｳｽ",
    "SM"
  ];

  return uniqueAbilities(list).filter(a => {
    if (!a?.name) return false;
    if (ngNames.includes(a.name)) return false;
    if (a.name.includes("ナイト")) return false;
    if (a.name.includes("登場しない")) return false;
    return true;
  });
}

// ========================
// 夢特性を通常特性から分離
// ========================
const knownHiddenAbilities = {
  38: ["ゆきふらし"],
  362: ["ムラっけ"],
  460: ["ぼうおん"],
  461: ["わるいてぐせ"],
  471: ["アイスボディ"],
  473: ["あついしぼう"],
  478: ["のろわれボディ"]
};

// ========================
// 分類（○○ポケモン）
// ヤッカン本文から拾うと「ポケモンチャンピオンズ攻略ポケモン」を誤取得するため手動指定
// ========================
const knownCategories = {
  38: "きつねポケモン",
  351: "てんきポケモン",
  362: "がんめんポケモン",
  3621: "がんめんポケモン",
  460: "じゅひょうポケモン",
  4601: "じゅひょうポケモン",
  461: "かぎづめポケモン",
  471: "しんせつポケモン",
  473: "２ほんキバポケモン",
  478: "ゆきぐにポケモン"
};

function splitHiddenAbilities(pokemon) {
  const hiddenNames =
    knownHiddenAbilities[pokemon.id] ?? [];

  pokemon.hiddenAbilities =
    pokemon.abilities.filter(a =>
      hiddenNames.includes(a.name)
    );

  pokemon.abilities =
    pokemon.abilities.filter(a =>
      !hiddenNames.includes(a.name)
    );
}

async function scrape() {
  const pokemonList = JSON.parse(
    fs.readFileSync("./data/pokemon.json", "utf8")
  );

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  for (const pokemon of pokemonList) {
    const url = buildYakkunUrl(pokemon);

    console.log(`${pokemon.name} 開始: ${url}`);

    try {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 60000
      });

      const scraped = await page.evaluate(() => {
        const text = document.body.innerText;
        console.log(
          text.match(/.{0,30}ポケモン.{0,30}/g)
        );

        return {
          url: location.href,
          no: text.match(/No\.(\d+)/)?.[1] ?? "",
          category:
            text.match(/([ぁ-んァ-ヶ一-龠ー]+ポケモン)\s*高さ/)?.[1]?.replace(/\s*高さ$/, "") ?? "",
          height: text.match(/高さ\s*([\d.]+m)/)?.[1] ?? "",
          weight: text.match(/重さ\s*([\d.]+kg)/)?.[1] ?? "",

          // ヤッカンのアイコン画像URL
          imageUrl: document.querySelector("img[src*='icon96']")?.src ?? "",

          // ローカル画像用パス
          imagePath: document.querySelector("img[src*='icon96']")?.src
            ? `images/${document.querySelector("img[src*='icon96']").src.split("/").pop().replace(".gif", ".png")}`
            : ""
        };
      });

      // ========================
      // 基本情報を更新
      // 取れなかった場合は既存値を残す
      // ========================
      pokemon.url = scraped.url || url;
      pokemon.no = scraped.no || pokemon.no;
      pokemon.category =
        knownCategories[pokemon.id] ||
        scraped.category ||
        pokemon.category;
      pokemon.height = scraped.height || pokemon.height;
      pokemon.weight = scraped.weight || pokemon.weight;
      pokemon.imageUrl = scraped.imageUrl || pokemon.imageUrl;
      pokemon.imagePath = scraped.imagePath || pokemon.imagePath;

      // ========================
      // 特性・夢特性は既存データを保持
      // ヤッカン側の構造が特殊なので、現状は再取得しない
      // ゴミデータだけ除去する
      // ========================
      pokemon.abilities = cleanAbilities(pokemon.abilities);
      pokemon.hiddenAbilities = cleanAbilities(pokemon.hiddenAbilities);

      // 通常特性側に混ざっている夢特性を hiddenAbilities に移す
      splitHiddenAbilities(pokemon);

      // ========================
      // 確認ログ
      // ========================
      console.log(
        `${pokemon.name} 特性:`,
        pokemon.abilities.map(a => a.name)
      );

      console.log(
        `${pokemon.name} 夢特性:`,
        pokemon.hiddenAbilities.map(a => a.name)
      );

      console.log(`${pokemon.name} 更新完了`);
    } catch (error) {
      console.log(`${pokemon.name} 失敗: ${error.message}`);
    }
  }

  fs.writeFileSync(
    "./data/pokemon.json",
    JSON.stringify(pokemonList, null, 2),
    "utf8"
  );

  await browser.close();

  console.log("完了");
}

scrape();