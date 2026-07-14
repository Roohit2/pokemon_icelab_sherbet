const puppeteer = require("puppeteer");
const fs = require("fs");

// ========================
// ヤッカン図鑑URL生成
// メガ・リージョンなど通常URLで飛べないものはここで指定
// ========================
function buildYakkunUrl(pokemon) {
  const specialUrls = {
    38: "https://yakkun.com/ch/zukan/n38a",       // アローラキュウコン
    3621: "https://yakkun.com/ch/zukan/n362m",    // メガオニゴーリ
    4601: "https://yakkun.com/ch/zukan/n460m",    // メガユキノオー
    713104: "https://yakkun.com/ch/zukan/n713h"   // ヒスイクレベース
  };

  if (specialUrls[pokemon.id]) {
    return specialUrls[pokemon.id];
  }

  if (pokemon.url?.includes("yakkun.com")) {
    return pokemon.url;
  }

  return `https://yakkun.com/ch/zukan/n${pokemon.id}`;
}

// ========================
// フォルムごとの画像パス
// 同じ全国図鑑番号でも画像が重複しないようにする
// ========================
function getLocalImagePath(pokemon, scrapedImagePath) {
  const specialImagePaths = {
    38: "images/n38a.png",       // アローラキュウコン
    3621: "images/n362m.png",    // メガオニゴーリ
    4601: "images/n460m.png",    // メガユキノオー
    713104: "images/n713h.png"   // ヒスイクレベース
  };

  if (specialImagePaths[pokemon.id]) {
    return specialImagePaths[pokemon.id];
  }

  return scrapedImagePath || pokemon.imagePath || "";
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
        ? {
          name: a,
          description: ""
        }
        : a;

    if (!ability?.name) {
      continue;
    }

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

  return uniqueAbilities(list).filter(ability => {
    if (!ability?.name) {
      return false;
    }

    if (ngNames.includes(ability.name)) {
      return false;
    }

    if (ability.name.includes("ナイト")) {
      return false;
    }

    if (ability.name.includes("登場しない")) {
      return false;
    }

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
// ヤッカン本文から拾うと
// 「ポケモンチャンピオンズ攻略ポケモン」を
// 誤取得するため手動指定
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
  478: "ゆきぐにポケモン",
  713: "ひょうざんポケモン",
  713104: "ひょうざんポケモン"
};

// ========================
// 通常特性側に入っている夢特性を分離
// ========================
function splitHiddenAbilities(pokemon) {
  const hiddenNames =
    knownHiddenAbilities[pokemon.id] ?? [];

  if (hiddenNames.length === 0) {
    return;
  }

  const abilities = cleanAbilities(pokemon.abilities);
  const hiddenAbilities = cleanAbilities(
    pokemon.hiddenAbilities
  );

  const movedHiddenAbilities = abilities.filter(ability =>
    hiddenNames.includes(ability.name)
  );

  pokemon.abilities = abilities.filter(ability =>
    !hiddenNames.includes(ability.name)
  );

  pokemon.hiddenAbilities = uniqueAbilities([
    ...hiddenAbilities,
    ...movedHiddenAbilities
  ]);
}

// ========================
// メイン処理
// ========================
async function scrape() {
  const pokemonList = JSON.parse(
    fs.readFileSync("./data/pokemon.json", "utf8")
  );

  const browser = await puppeteer.launch({
    headless: false
  });

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

        const imageElement =
          document.querySelector("img[src*='icon96']");

        const imageUrl = imageElement?.src ?? "";

        const imageFileName = imageUrl
          ? imageUrl
            .split("/")
            .pop()
            .split("?")[0]
            .replace(".gif", ".png")
          : "";

        return {
          url: location.href,

          no:
            text.match(/No\.(\d+)/)?.[1] ??
            "",

          category:
            text
              .match(
                /([ぁ-んァ-ヶ一-龠ー]+ポケモン)\s*高さ/
              )?.[1]
              ?.replace(/\s*高さ$/, "") ??
            "",

          height:
            text.match(
              /高さ\s*([\d.]+m)/
            )?.[1] ?? "",

          weight:
            text.match(
              /重さ\s*([\d.]+kg)/
            )?.[1] ?? "",

          imageUrl,

          imagePath: imageFileName
            ? `images/${imageFileName}`
            : ""
        };
      });

      // ========================
      // 基本情報を更新
      // 取れなかった場合は既存値を残す
      // ========================
      pokemon.url =
        scraped.url ||
        url;

      pokemon.no =
        scraped.no ||
        pokemon.no ||
        "";

      pokemon.category =
        knownCategories[pokemon.id] ||
        scraped.category ||
        pokemon.category ||
        "";

      pokemon.height =
        scraped.height ||
        pokemon.height ||
        "";

      pokemon.weight =
        scraped.weight ||
        pokemon.weight ||
        "";

      pokemon.imageUrl =
        scraped.imageUrl ||
        pokemon.imageUrl ||
        "";

      // フォルムごとに画像パスを分ける
      pokemon.imagePath = getLocalImagePath(
        pokemon,
        scraped.imagePath
      );

      // ========================
      // 特性・夢特性は既存データを保持
      // ヤッカン側の構造が特殊なので現状は再取得しない
      // ゴミデータだけ除去する
      // ========================
      pokemon.abilities = cleanAbilities(
        pokemon.abilities
      );

      pokemon.hiddenAbilities = cleanAbilities(
        pokemon.hiddenAbilities
      );

      // 通常特性側に混ざっている夢特性を移す
      splitHiddenAbilities(pokemon);

      // ========================
      // 確認ログ
      // ========================
      console.log(
        `${pokemon.name} ID:`,
        pokemon.id
      );

      console.log(
        `${pokemon.name} URL:`,
        pokemon.url
      );

      console.log(
        `${pokemon.name} 画像URL:`,
        pokemon.imageUrl
      );

      console.log(
        `${pokemon.name} 画像パス:`,
        pokemon.imagePath
      );

      console.log(
        `${pokemon.name} 特性:`,
        pokemon.abilities.map(
          ability => ability.name
        )
      );

      console.log(
        `${pokemon.name} 夢特性:`,
        pokemon.hiddenAbilities.map(
          ability => ability.name
        )
      );

      console.log(
        `${pokemon.name} 更新完了`
      );
    } catch (error) {
      console.log(
        `${pokemon.name} 失敗: ${error.message}`
      );
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

scrape().catch(error => {
  console.error("スクレイピング中にエラー:", error);
  process.exitCode = 1;
});