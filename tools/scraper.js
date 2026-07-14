const puppeteer = require("puppeteer");
const fs = require("fs");

const SEARCH_URL =
  "https://yakkun.com/ch/zukan/search/?type=14";

const MAX_POKEMON = 999;

// ==================================================
// URLからサイト内IDを作る
// 通常: 471
// メガ: 3621
// ヒスイなど: 713104
// ==================================================
function getIdFromUrl(url) {
  const match = url.match(
    /\/n(\d+)([a-z])?(?:$|[/?#])/
  );

  if (!match) {
    return null;
  }

  const no = Number(match[1]);
  const form = match[2] ?? "";

  if (form === "m") {
    return Number(`${no}1`);
  }

  if (form) {
    return Number(
      `${no}${form.charCodeAt(0)}`
    );
  }

  return no;
}

// ==================================================
// ID重複を除去
// 後から追加されたデータを優先
// ==================================================
function uniqueById(list = []) {
  const map = new Map();

  for (const pokemon of list) {
    if (!pokemon?.id) {
      continue;
    }

    map.set(pokemon.id, {
      ...map.get(pokemon.id),
      ...pokemon
    });
  }

  return [...map.values()];
}

// ==================================================
// 特性の重複除去
// ==================================================
function uniqueAbilities(list = []) {
  const map = new Map();

  for (const item of list) {
    const ability =
      typeof item === "string"
        ? {
          name: item,
          description: ""
        }
        : item;

    const name = String(
      ability?.name ?? ""
    )
      .replace(/^\*/, "")
      .trim();

    if (!name) {
      continue;
    }

    map.set(name, {
      name,
      description:
        ability?.description ?? ""
    });
  }

  return [...map.values()];
}

// ==================================================
// 技の重複除去
// ==================================================
function uniqueMoves(list = []) {
  const map = new Map();

  for (const move of list) {
    const name = String(
      move?.name ?? ""
    ).trim();

    if (!name) {
      continue;
    }

    map.set(name, {
      name,
      type: move.type ?? "",
      category: move.category ?? "",
      power:
        typeof move.power === "number"
          ? move.power
          : null,
      accuracy:
        typeof move.accuracy === "number"
          ? move.accuracy
          : null
    });
  }

  return [...map.values()];
}

// ==================================================
// フォーム違いのURL
// ==================================================
function buildYakkunUrl(pokemon) {
  const specialUrls = {
    38: "https://yakkun.com/ch/zukan/n38a",
    3621: "https://yakkun.com/ch/zukan/n362m",
    4601: "https://yakkun.com/ch/zukan/n460m",
    713104: "https://yakkun.com/ch/zukan/n713h"
  };

  if (specialUrls[pokemon.id]) {
    return specialUrls[pokemon.id];
  }

  if (
    pokemon.url?.includes("yakkun.com")
  ) {
    return pokemon.url;
  }

  return `https://yakkun.com/ch/zukan/n${pokemon.id}`;
}

// ==================================================
// フォーム違いの画像パス
// ==================================================
function getLocalImagePath(
  id,
  scrapedImagePath,
  oldImagePath
) {
  const specialImagePaths = {
    38: "images/n38a.png",
    3621: "images/n362m.png",
    4601: "images/n460m.png",
    713104: "images/n713h.png"
  };

  return (
    specialImagePaths[id] ||
    scrapedImagePath ||
    oldImagePath ||
    ""
  );
}

// ==================================================
// 分類の手動指定
// ==================================================
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

// ==================================================
// メイン処理
// ==================================================
async function scrape() {
  const pokemonJsonPath =
    "./data/pokemon.json";

  if (
    !fs.existsSync(pokemonJsonPath)
  ) {
    throw new Error(
      `${pokemonJsonPath} が見つかりません。`
    );
  }

  const oldPokemon = JSON.parse(
    fs.readFileSync(
      pokemonJsonPath,
      "utf8"
    )
  );

  const browser =
    await puppeteer.launch({
      headless: false
    });

  const page =
    await browser.newPage();

  page.setDefaultTimeout(60000);

  try {
    console.log(
      "氷タイプ一覧を取得中..."
    );

    await page.goto(SEARCH_URL, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    // ----------------------------------------------
    // 氷タイプ一覧からURLを取得
    // ----------------------------------------------
    const foundUrls =
      await page.evaluate(() => {
        return [
          ...document.querySelectorAll("a")
        ]
          .map(anchor => anchor.href)
          .filter(href =>
            /\/ch\/zukan\/n\d+[a-z]?$/.test(
              href
            )
          );
      });

    const uniqueUrls = [
      ...new Set(foundUrls)
    ].slice(0, MAX_POKEMON);

    console.log(
      `${uniqueUrls.length}件のURLを取得`
    );

    const scrapedPokemon = [];

    // ----------------------------------------------
    // 各ポケモンを取得
    // ----------------------------------------------
    for (const discoveredUrl of uniqueUrls) {
      const discoveredId =
        getIdFromUrl(discoveredUrl);

      if (!discoveredId) {
        console.log(
          `ID取得失敗: ${discoveredUrl}`
        );

        continue;
      }

      const old =
        oldPokemon.find(
          pokemon =>
            pokemon.id === discoveredId
        );

      const url = old
        ? buildYakkunUrl(old)
        : discoveredUrl;

      const id =
        getIdFromUrl(url) ??
        discoveredId;

      console.log(
        `\n開始: ${url}`
      );

      try {
        await page.goto(url, {
          waitUntil:
            "domcontentloaded",
          timeout: 60000
        });

        // 技テーブルが存在するまで待つ
        await page
          .waitForSelector(
            "#move_list",
            {
              timeout: 15000
            }
          )
          .catch(() => {
            console.log(
              "技テーブルが見つかりませんでした。"
            );
          });

        const scraped =
          await page.evaluate(() => {
            // ======================================
            // ページ内補助関数
            // ======================================
            function normalizeText(
              value
            ) {
              return String(
                value ?? ""
              )
                .replace(/\s+/g, " ")
                .trim();
            }

            function toNumberOrNull(
              value
            ) {
              const text =
                normalizeText(value);

              if (
                !text ||
                text === "-" ||
                text === "—" ||
                text === "--" ||
                text === "必中"
              ) {
                return null;
              }

              const match =
                text.match(/\d+/);

              return match
                ? Number(match[0])
                : null;
            }

            // ======================================
            // 基本情報
            // ======================================
            const baseTable =
              document.querySelector(
                "table[summary='基本データ']"
              ) ??
              document.querySelector(
                "#base_anchor table"
              );

            const rawName =
              baseTable
                ?.querySelector(
                  "tr.head th"
                )
                ?.innerText ??
              document
                .querySelector("h1")
                ?.innerText ??
              "";

            const name =
              normalizeText(rawName)
                .replace(/｜.*$/, "")
                .replace(
                  /ポケモン図鑑.*$/,
                  ""
                )
                .trim();

            const imageElement =
              document.querySelector(
                "img[src*='icon96']"
              );

            const imageUrl =
              imageElement?.src ?? "";

            const imageFileName =
              imageUrl
                ? imageUrl
                  .split("/")
                  .pop()
                  .split("?")[0]
                  .replace(
                    ".gif",
                    ".png"
                  )
                : "";

            const result = {
              name,
              no: "",
              category: "",
              height: "",
              weight: "",
              types: [],
              stats: {
                hp: 0,
                atk: 0,
                def: 0,
                spa: 0,
                spd: 0,
                spe: 0
              },
              abilities: [],
              hiddenAbilities: [],
              moves: [],
              imageUrl,
              imagePath:
                imageFileName
                  ? `images/${imageFileName}`
                  : ""
            };

            // ======================================
            // 基本表の行を解析
            // ======================================
            if (baseTable) {
              const rows = [
                ...baseTable.querySelectorAll(
                  "tr"
                )
              ];

              for (const row of rows) {
                const cells = [
                  ...row.querySelectorAll(
                    "th, td"
                  )
                ];

                if (
                  cells.length === 0
                ) {
                  continue;
                }

                const first =
                  normalizeText(
                    cells[0]?.innerText
                  );

                const value =
                  normalizeText(
                    cells
                      .slice(1)
                      .map(
                        cell =>
                          cell.innerText
                      )
                      .join(" ")
                  );

                if (
                  first.includes(
                    "全国No"
                  )
                ) {
                  result.no =
                    value.match(
                      /\d+/
                    )?.[0] ??
                    "";
                }

                if (
                  first.includes("高さ")
                ) {
                  result.height =
                    value.match(
                      /\d+(?:\.\d+)?m/
                    )?.[0] ??
                    "";
                }

                if (
                  first.includes("重さ")
                ) {
                  result.weight =
                    value.match(
                      /\d+(?:\.\d+)?kg/
                    )?.[0] ??
                    "";
                }

                if (
                  first.includes(
                    "タイプ"
                  )
                ) {
                  result.types = [
                    ...cells[1]
                      ?.querySelectorAll(
                        "img"
                      ) ??
                    []
                  ]
                    .map(image =>
                      normalizeText(
                        image.alt
                      ).replace(
                        /タイプ$/,
                        ""
                      )
                    )
                    .filter(Boolean);
                }
              }

              const categoryRow = [
                ...baseTable.querySelectorAll(
                  "tr"
                )
              ].find(row =>
                normalizeText(
                  row.innerText
                ).includes(
                  "ポケモン"
                )
              );

              const categoryText =
                normalizeText(
                  categoryRow?.innerText
                );

              result.category =
                categoryText.match(
                  /[ぁ-んァ-ヶ一-龠ー]+ポケモン/
                )?.[0] ??
                "";
            }

            // ======================================
            // 種族値
            // ======================================
            const allTableTexts = [
              ...document.querySelectorAll(
                "table"
              )
            ].map(table => ({
              table,
              text: normalizeText(
                table.innerText
              )
            }));

            const statTable =
              allTableTexts.find(
                item =>
                  item.text.includes(
                    "種族値"
                  ) &&
                  item.text.includes("HP") &&
                  item.text.includes(
                    "攻撃"
                  ) &&
                  item.text.includes(
                    "防御"
                  ) &&
                  item.text.includes(
                    "特攻"
                  )
              )?.table;

            if (statTable) {
              const statText =
                normalizeText(
                  statTable.innerText
                );

              const patterns = {
                hp: /HP\s*(\d+)/,
                atk: /攻撃\s*(\d+)/,
                def: /防御\s*(\d+)/,
                spa: /特攻\s*(\d+)/,
                spd: /特防\s*(\d+)/,
                spe: /素早(?:さ)?\s*(\d+)/
              };

              for (
                const [key, pattern]
                of Object.entries(
                  patterns
                )
              ) {
                result.stats[key] =
                  Number(
                    statText.match(
                      pattern
                    )?.[1] ??
                    0
                  );
              }
            }

            // ======================================
            // 特性
            // ======================================
            const abilityLinks = [
              ...document.querySelectorAll(
                "a[href*='tokusei=']"
              )
            ];

            for (
              const link
              of abilityLinks
            ) {
              const row =
                link.closest("tr");

              if (!row) {
                continue;
              }

              const abilityName =
                normalizeText(
                  link.innerText
                );

              if (!abilityName) {
                continue;
              }

              const cleanName =
                abilityName
                  .replace(/^\*/, "")
                  .trim();

              const cells = [
                ...row.querySelectorAll(
                  "th, td"
                )
              ];

              const description =
                normalizeText(
                  cells.at(-1)
                    ?.innerText
                );

              const rowText =
                normalizeText(
                  row.innerText
                );

              const previousText =
                normalizeText(
                  row
                    .previousElementSibling
                    ?.innerText
                );

              const isHidden =
                abilityName.startsWith(
                  "*"
                ) ||
                rowText.includes(
                  "隠れ特性"
                ) ||
                rowText.includes(
                  "夢特性"
                ) ||
                previousText.includes(
                  "隠れ特性"
                ) ||
                previousText.includes(
                  "夢特性"
                );

              const ability = {
                name: cleanName,
                description
              };

              if (isHidden) {
                result
                  .hiddenAbilities
                  .push(ability);
              } else {
                result
                  .abilities
                  .push(ability);
              }
            }

            // ======================================
            // チャンピオンズで覚える技
            //
            // HTML構造:
            // move_main_row
            // ↓
            // move_detail_row
            //
            // past_move は過去作限定なので除外
            // ======================================
            const moveTable =
              document.querySelector(
                "#move_list"
              );

            if (moveTable) {
              const mainRows = [
                ...moveTable
                  .querySelectorAll(
                    "tr.move_main_row"
                  )
              ];

              for (
                const mainRow
                of mainRows
              ) {
                // 過去作限定技は除外
                if (
                  mainRow.classList
                    .contains(
                      "past_move"
                    )
                ) {
                  continue;
                }

                const moveLink =
                  mainRow.querySelector(
                    ".move_name a[href*='move=']"
                  );

                const moveName =
                  normalizeText(
                    moveLink?.innerText
                  );

                if (!moveName) {
                  continue;
                }

                const detailRow =
                  mainRow
                    .nextElementSibling;

                if (
                  !detailRow ||
                  !detailRow.classList
                    .contains(
                      "move_detail_row"
                    )
                ) {
                  continue;
                }

                const detailCells = [
                  ...detailRow
                    .querySelectorAll(
                      ":scope > td"
                    )
                ];

                /*
                 * detailCells:
                 * 0 タイプ
                 * 1 分類
                 * 2 威力
                 * 3 命中
                 * 4 PP
                 * 5 接触
                 * 6 説明
                 */
                if (
                  detailCells.length < 4
                ) {
                  continue;
                }

                const type =
                  normalizeText(
                    detailCells[0]
                      ?.innerText
                  );

                const category =
                  normalizeText(
                    detailCells[1]
                      ?.innerText
                  );

                const power =
                  toNumberOrNull(
                    detailCells[2]
                      ?.innerText
                  );

                const accuracy =
                  toNumberOrNull(
                    detailCells[3]
                      ?.innerText
                  );

                result.moves.push({
                  name: moveName,
                  type,
                  category,
                  power,
                  accuracy
                });
              }
            }

            return result;
          });

        // ------------------------------------------
        // 取得結果を整理
        // ------------------------------------------
        scraped.abilities =
          uniqueAbilities(
            scraped.abilities
          );

        scraped.hiddenAbilities =
          uniqueAbilities(
            scraped.hiddenAbilities
          );

        scraped.moves =
          uniqueMoves(
            scraped.moves
          );

        console.log(
          `${scraped.name} 技取得数: ${scraped.moves.length}`
        );

        console.log(
          scraped.moves.slice(0, 5)
        );

        // ------------------------------------------
        // 既存データと統合
        // ------------------------------------------
        const merged = {
          ...old,

          id,
          url,

          no:
            scraped.no ||
            old?.no ||
            "",

          name:
            scraped.name ||
            old?.name ||
            "",

          category:
            knownCategories[id] ||
            scraped.category ||
            old?.category ||
            "",

          height:
            scraped.height ||
            old?.height ||
            "",

          weight:
            scraped.weight ||
            old?.weight ||
            "",

          imageUrl:
            scraped.imageUrl ||
            old?.imageUrl ||
            "",

          imagePath:
            getLocalImagePath(
              id,
              scraped.imagePath,
              old?.imagePath
            ),

          // 既存サイトが image を使う場合も保持
          image:
            old?.image ||
            getLocalImagePath(
              id,
              scraped.imagePath,
              old?.imagePath
            ),

          types:
            scraped.types.length > 0
              ? scraped.types
              : old?.types ||
              ["こおり"],

          stats:
            Object.values(
              scraped.stats
            ).some(value => value > 0)
              ? scraped.stats
              : old?.stats || {
                hp: 0,
                atk: 0,
                def: 0,
                spa: 0,
                spd: 0,
                spe: 0
              },

          abilities:
            scraped.abilities.length > 0
              ? scraped.abilities
              : old?.abilities || [],

          hiddenAbilities:
            scraped.hiddenAbilities
              .length > 0
              ? scraped.hiddenAbilities
              : old?.hiddenAbilities ||
              [],

          // 今回取得した技を保存
          moves:
            scraped.moves.length > 0
              ? scraped.moves
              : old?.moves || [],

          // 手動設定したおすすめ技セットは保持
          recommendedMovesets:
            old?.recommendedMovesets ||
            [],

          analysis:
            old?.analysis || {
              topKills: [],
              switchIn: []
            }
        };

        scrapedPokemon.push(merged);

        console.log(
          `${merged.name} 更新完了`
        );
      } catch (error) {
        console.error(
          `${url} 取得失敗: ${error.message}`
        );
      }
    }

    // ----------------------------------------------
    // JSONを保存
    // ----------------------------------------------
    const mergedPokemon =
      uniqueById([
        ...oldPokemon,
        ...scrapedPokemon
      ]);

    fs.writeFileSync(
      pokemonJsonPath,
      JSON.stringify(
        mergedPokemon,
        null,
        2
      ),
      "utf8"
    );

    console.log(
      "\nすべて完了しました。"
    );
  } finally {
    await browser.close();
  }
}

scrape().catch(error => {
  console.error(
    "スクレイピングエラー:",
    error
  );

  process.exitCode = 1;
});