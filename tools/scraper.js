const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const SEARCH_URL =
  "https://yakkun.com/ch/zukan/search/?type=14";

const MAX_POKEMON = 999;

const POKEMON_JSON_PATH = path.resolve(
  __dirname,
  "../data/pokemon.json"
);

const IMAGE_DIRECTORY = path.resolve(
  __dirname,
  "../images"
);

// ==================================================
// URLからサイト内IDを作る
// 通常: 471
// メガ: 3621
// ヒスイなど: 713104
// ==================================================

function getIdFromUrl(url) {
  const match = String(url || "").match(
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
// 待機
// ==================================================

function sleep(milliseconds) {
  return new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });
}

// ==================================================
// MIMEタイプから拡張子を取得
// ==================================================

function getExtensionFromMimeType(mimeType) {
  const normalized = String(
    mimeType || ""
  )
    .split(";")[0]
    .trim()
    .toLowerCase();

  const map = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg"
  };

  return map[normalized] || "";
}

// ==================================================
// URLから拡張子を取得
// ==================================================

function getExtensionFromUrl(url) {
  try {
    const pathname =
      new URL(url).pathname;

    const extension =
      path.extname(pathname)
        .toLowerCase();

    if (extension === ".jpeg") {
      return ".jpg";
    }

    if (
      [
        ".png",
        ".jpg",
        ".gif",
        ".webp",
        ".svg"
      ].includes(extension)
    ) {
      return extension;
    }
  } catch {
    return "";
  }

  return "";
}

// ==================================================
// URLから画像ファイル名を作る
// ==================================================

function getImageFileName(
  imageUrl,
  fallbackName
) {
  try {
    const url = new URL(imageUrl);

    const originalName =
      path.basename(url.pathname);

    if (originalName) {
      return originalName;
    }
  } catch {
    // fallbackNameを使用
  }

  return `${fallbackName}.png`;
}

// ==================================================
// Node.js側で画像をダウンロード
// ==================================================

async function downloadImage(
  imageUrl,
  fallbackName
) {
  if (!imageUrl) {
    return "";
  }

  fs.mkdirSync(
    IMAGE_DIRECTORY,
    {
      recursive: true
    }
  );

  const response = await fetch(imageUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/150.0.0.0 Safari/537.36",

      "Referer":
        "https://yakkun.com/"
    }
  });

  if (!response.ok) {
    throw new Error(
      `画像取得失敗: ${response.status} ${imageUrl}`
    );
  }

  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  const extension =
    getExtensionFromMimeType(
      contentType
    ) ||
    getExtensionFromUrl(imageUrl) ||
    ".png";

  const originalFileName =
    getImageFileName(
      imageUrl,
      fallbackName
    );

  const originalExtension =
    path.extname(originalFileName);

  const fileName =
    originalExtension
      ? originalFileName
      : `${originalFileName}${extension}`;

  const outputPath =
    path.resolve(
      IMAGE_DIRECTORY,
      fileName
    );

  const arrayBuffer =
    await response.arrayBuffer();

  fs.writeFileSync(
    outputPath,
    Buffer.from(arrayBuffer)
  );

  return `images/${fileName}`;
}

// ==================================================
// 画像を取得する
// 個別失敗で全体を止めない
// ==================================================

async function safelyDownloadImage(
  imageUrl,
  fallbackName,
  label
) {
  if (!imageUrl) {
    return "";
  }

  try {
    const imagePath =
      await downloadImage(
        imageUrl,
        fallbackName
      );

    console.log(
      `${label}保存: ${imagePath}`
    );

    return imagePath;
  } catch (error) {
    console.error(
      `${label}取得失敗: ${error.message}`
    );

    return "";
  }
}

// ==================================================
// メイン処理
// ==================================================

async function scrape() {
  if (
    !fs.existsSync(
      POKEMON_JSON_PATH
    )
  ) {
    throw new Error(
      `${POKEMON_JSON_PATH} が見つかりません。`
    );
  }

  fs.mkdirSync(
    IMAGE_DIRECTORY,
    {
      recursive: true
    }
  );

  const oldPokemon =
    JSON.parse(
      fs.readFileSync(
        POKEMON_JSON_PATH,
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

    const foundUrls =
      await page.evaluate(() => {
        return [
          ...document.querySelectorAll(
            "a"
          )
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

    for (
      let index = 0;
      index < uniqueUrls.length;
      index += 1
    ) {
      const discoveredUrl =
        uniqueUrls[index];

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

      const url =
        old
          ? buildYakkunUrl(old)
          : discoveredUrl;

      const id =
        getIdFromUrl(url) ??
        discoveredId;

      console.log(
        `\n[${index + 1}/${uniqueUrls.length}] 開始: ${url}`
      );

      try {
        await page.goto(url, {
          waitUntil:
            "domcontentloaded",
          timeout: 60000
        });

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

        await sleep(700);

        const scraped =
          await page.evaluate(() => {
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

            function getImageUrl(
              image
            ) {
              return (
                image?.currentSrc ||
                image?.src ||
                image?.getAttribute(
                  "data-src"
                ) ||
                image?.getAttribute(
                  "data-original"
                ) ||
                image?.getAttribute(
                  "data-lazy-src"
                ) ||
                ""
              );
            }

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

            const allImages = [
              ...document.querySelectorAll(
                "img"
              )
            ];

            const normalImageElement =
              allImages.find(image =>
                normalizeText(
                  image.alt
                ).includes("通常色")
              ) ??
              allImages.find(image =>
                /\/sprites\/home\/n\d+[a-z]?\.png/i.test(
                  getImageUrl(image)
                )
              ) ??
              document.querySelector(
                "img[src*='icon96']"
              );

            const shinyImageElement =
              allImages.find(image =>
                normalizeText(
                  image.alt
                ).includes("色違い")
              ) ??
              allImages.find(image =>
                /\/sprites\/home\/n\d+[a-z]?_s\.png/i.test(
                  getImageUrl(image)
                )
              );

            const imageUrl =
              getImageUrl(
                normalImageElement
              );

            const shinyImageUrl =
              getImageUrl(
                shinyImageElement
              );

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
              shinyImageUrl
            };

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
                    ...(
                      cells[1]
                        ?.querySelectorAll(
                          "img"
                        ) ?? []
                    )
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

        const urlToken =
          String(url).match(
            /\/(n\d+[a-z]?)/
          )?.[1] ??
          `pokemon-${id}`;

        const downloadedImagePath =
          await safelyDownloadImage(
            scraped.imageUrl,
            urlToken,
            `${scraped.name} 通常色`
          );

        const downloadedShinyImagePath =
          await safelyDownloadImage(
            scraped.shinyImageUrl,
            `${urlToken}_s`,
            `${scraped.name} 色違い`
          );

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
            downloadedImagePath ||
            old?.imagePath ||
            old?.image ||
            "",

          image:
            downloadedImagePath ||
            old?.image ||
            old?.imagePath ||
            "",

          shinyImageUrl:
            scraped.shinyImageUrl ||
            old?.shinyImageUrl ||
            "",

          shinyImagePath:
            downloadedShinyImagePath ||
            old?.shinyImagePath ||
            old?.shinyImage ||
            "",

          shinyImage:
            downloadedShinyImagePath ||
            old?.shinyImage ||
            old?.shinyImagePath ||
            "",

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

          moves:
            scraped.moves.length > 0
              ? scraped.moves
              : old?.moves || [],

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

        console.log(
          `通常色: ${merged.imagePath || "なし"}`
        );

        console.log(
          `色違い: ${merged.shinyImagePath || "なし"}`
        );
      } catch (error) {
        console.error(
          `${url} 取得失敗: ${error.message}`
        );
      }
    }

    const mergedPokemon =
      uniqueById([
        ...oldPokemon,
        ...scrapedPokemon
      ]);

    fs.writeFileSync(
      POKEMON_JSON_PATH,
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

    console.log(
      `${scrapedPokemon.length}件を更新しました。`
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