const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const GLACEON_URL =
  "https://yakkun.com/ch/zukan/n471";

const OUTPUT_HTML_PATH = path.resolve(
  __dirname,
  "../glaceon.html"
);

const OUTPUT_DEBUG_PATH = path.resolve(
  __dirname,
  "../glaceon-move-debug.json"
);

const OUTPUT_IMAGE_DIRECTORY = path.resolve(
  __dirname,
  "../images"
);

// ==========================================
// 待機
// ==========================================

function sleep(milliseconds) {
  return new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });
}

// ==========================================
// ファイル名として使えない文字を除去
// ==========================================

function sanitizeFileName(value) {
  return String(value || "")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .trim();
}

// ==========================================
// MIMEタイプから拡張子を取得
// ==========================================

function getExtensionFromMimeType(mimeType) {
  const normalizedMimeType =
    String(mimeType || "")
      .split(";")[0]
      .trim()
      .toLowerCase();

  const extensionMap = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg"
  };

  return extensionMap[normalizedMimeType] || "";
}

// ==========================================
// URLから拡張子を取得
// ==========================================

function getExtensionFromUrl(url) {
  try {
    const pathname =
      new URL(url).pathname;

    const extension =
      path.extname(pathname)
        .toLowerCase();

    if (
      [
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".webp",
        ".svg"
      ].includes(extension)
    ) {
      return extension === ".jpeg"
        ? ".jpg"
        : extension;
    }
  } catch (error) {
    return "";
  }

  return "";
}

// ==========================================
// 画像をダウンロード
// ==========================================

async function downloadImage(
  page,
  imageUrl,
  baseFileName
) {
  if (!imageUrl) {
    return null;
  }

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
      `画像取得失敗: ${response.status} ${response.statusText}`
    );
  }

  const arrayBuffer =
    await response.arrayBuffer();

  const contentType =
    response.headers.get("content-type") || "";

  const extension =
    getExtensionFromMimeType(contentType) ||
    getExtensionFromUrl(imageUrl) ||
    ".png";

  const fileName =
    `${sanitizeFileName(baseFileName)}${extension}`;

  const outputPath =
    path.resolve(
      OUTPUT_IMAGE_DIRECTORY,
      fileName
    );

  fs.writeFileSync(
    outputPath,
    Buffer.from(arrayBuffer)
  );

  return {
    fileName,
    outputPath,
    relativePath:
      `images/${fileName}`,
    contentType
  };
}

// ==========================================
// メイン処理
// ==========================================

async function saveGlaceonHtml() {
  fs.mkdirSync(
    OUTPUT_IMAGE_DIRECTORY,
    {
      recursive: true
    }
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
      `グレイシアのページを開きます: ${GLACEON_URL}`
    );

    await page.goto(GLACEON_URL, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    await sleep(3000);

    // lazy-load画像を読み込ませるため、
    // ページの下までスクロールする
    await page.evaluate(async () => {
      await new Promise(resolve => {
        let totalHeight = 0;

        const distance = 500;

        const timer = setInterval(() => {
          const pageHeight =
            document.body.scrollHeight;

          window.scrollBy(
            0,
            distance
          );

          totalHeight += distance;

          if (
            totalHeight >= pageHeight
          ) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });

    await sleep(1500);

    const html =
      await page.content();

    fs.writeFileSync(
      OUTPUT_HTML_PATH,
      html,
      "utf8"
    );

    console.log("HTMLを保存しました。");
    console.log(OUTPUT_HTML_PATH);

    // ========================================
    // 通常色・色違い画像を調査
    // ========================================

    const pokemonImageInfo =
      await page.evaluate(() => {
        function normalizeText(value) {
          return String(value || "")
            .replace(/\s+/g, " ")
            .trim();
        }

        function getImageUrl(image) {
          return (
            image.currentSrc ||
            image.src ||
            image.getAttribute(
              "data-src"
            ) ||
            image.getAttribute(
              "data-original"
            ) ||
            image.getAttribute(
              "data-lazy-src"
            ) ||
            ""
          );
        }

        const allImages = [
          ...document.querySelectorAll(
            "img"
          )
        ].map((image, index) => ({
          index,
          alt:
            normalizeText(
              image.alt
            ),
          title:
            normalizeText(
              image.title
            ),
          src:
            getImageUrl(image),
          className:
            image.className || "",
          width:
            image.naturalWidth ||
            image.width ||
            0,
          height:
            image.naturalHeight ||
            image.height ||
            0,
          parentText:
            normalizeText(
              image.parentElement
                ?.innerText
            ).slice(0, 200)
        }));

        // altに「通常色」「色違い」がある画像を優先
        let normalImage =
          allImages.find(image =>
            image.alt.includes(
              "グレイシアの通常色"
            )
          );

        let shinyImage =
          allImages.find(image =>
            image.alt.includes(
              "グレイシアの色違い"
            )
          );

        // 名前を含まない場合にも対応
        if (!normalImage) {
          normalImage =
            allImages.find(image =>
              image.alt.includes(
                "通常色"
              )
            );
        }

        if (!shinyImage) {
          shinyImage =
            allImages.find(image =>
              image.alt.includes(
                "色違い"
              )
            );
        }

        // 「色違い」という見出し周辺も取得
        const shinyHeading = [
          ...document.querySelectorAll(
            "h2, h3, h4, div, th"
          )
        ].find(element => {
          const text =
            normalizeText(
              element.innerText
            );

          return (
            text.includes(
              "グレイシアの色違い"
            ) ||
            text === "色違い"
          );
        });

        const nearbyImages = [];

        if (shinyHeading) {
          let container =
            shinyHeading.parentElement;

          for (
            let depth = 0;
            container && depth < 5;
            depth += 1
          ) {
            const images = [
              ...container.querySelectorAll(
                "img"
              )
            ];

            if (images.length >= 2) {
              nearbyImages.push(
                ...images.map(image => ({
                  alt:
                    normalizeText(
                      image.alt
                    ),
                  title:
                    normalizeText(
                      image.title
                    ),
                  src:
                    getImageUrl(image)
                }))
              );

              break;
            }

            container =
              container.parentElement;
          }
        }

        return {
          normalImage,
          shinyImage,
          nearbyImages,

          // デバッグ用に色違い関連画像を保存
          relatedImages:
            allImages.filter(image => {
              const searchText =
                [
                  image.alt,
                  image.title,
                  image.parentText,
                  image.src
                ].join(" ");

              return (
                searchText.includes(
                  "通常色"
                ) ||
                searchText.includes(
                  "色違い"
                ) ||
                searchText
                  .toLowerCase()
                  .includes("shiny")
              );
            })
        };
      });

    console.log(
      "通常色画像URL:",
      pokemonImageInfo
        .normalImage
        ?.src || "見つかりません"
    );

    console.log(
      "色違い画像URL:",
      pokemonImageInfo
        .shinyImage
        ?.src || "見つかりません"
    );

    // ========================================
    // 通常色・色違い画像を保存
    // ========================================

    let normalImageFile = null;
    let shinyImageFile = null;

    if (
      pokemonImageInfo
        .normalImage
        ?.src
    ) {
      normalImageFile =
        await downloadImage(
          page,
          pokemonImageInfo
            .normalImage
            .src,
          "glaceon-normal"
        );

      console.log(
        "通常色画像を保存しました。"
      );

      console.log(
        normalImageFile.outputPath
      );
    }

    if (
      pokemonImageInfo
        .shinyImage
        ?.src
    ) {
      shinyImageFile =
        await downloadImage(
          page,
          pokemonImageInfo
            .shinyImage
            .src,
          "glaceon-shiny"
        );

      console.log(
        "色違い画像を保存しました。"
      );

      console.log(
        shinyImageFile.outputPath
      );
    } else {
      console.log(
        "色違い画像が見つかりませんでした。"
      );
    }

    // ========================================
    // 技関連の調査
    // ========================================

    const moveInfo =
      await page.evaluate(() => {
        const links = [
          ...document.querySelectorAll(
            "a"
          )
        ]
          .filter(link => {
            const href =
              link.getAttribute(
                "href"
              ) ?? "";

            const text =
              link.innerText
                .replace(/\s+/g, " ")
                .trim();

            return (
              href.includes("move") ||
              href.includes("waza") ||
              text.includes(
                "れいとう"
              ) ||
              text.includes(
                "まもる"
              )
            );
          })
          .slice(0, 30)
          .map(link => ({
            text:
              link.innerText
                .replace(/\s+/g, " ")
                .trim(),

            href:
              link.getAttribute(
                "href"
              ) ?? "",

            parentRow:
              link.closest("tr")
                ?.innerText
                ?.replace(
                  /\s+/g,
                  " "
                )
                .trim() ??
              ""
          }));

        const tables = [
          ...document.querySelectorAll(
            "table"
          )
        ]
          .map((table, index) => ({
            index,

            text:
              table.innerText
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 1000),

            html:
              table.outerHTML.slice(
                0,
                2000
              )
          }))
          .filter(table =>
            table.text.includes(
              "威力"
            ) ||
            table.text.includes(
              "命中"
            ) ||
            table.text.includes(
              "覚える技"
            )
          );

        return {
          links,
          tables
        };
      });

    // ========================================
    // 調査結果をJSONへ保存
    // ========================================

    const debugData = {
      pageUrl: GLACEON_URL,

      images: {
        normal:
          pokemonImageInfo
            .normalImage ||
          null,

        shiny:
          pokemonImageInfo
            .shinyImage ||
          null,

        nearby:
          pokemonImageInfo
            .nearbyImages,

        related:
          pokemonImageInfo
            .relatedImages
      },

      savedFiles: {
        normal:
          normalImageFile,

        shiny:
          shinyImageFile
      },

      moves:
        moveInfo
    };

    fs.writeFileSync(
      OUTPUT_DEBUG_PATH,
      JSON.stringify(
        debugData,
        null,
        2
      ),
      "utf8"
    );

    console.log(
      "画像・技の調査データを保存しました。"
    );

    console.log(
      OUTPUT_DEBUG_PATH
    );

    if (shinyImageFile) {
      console.log(
        "\npokemon.jsonへ追加する値:"
      );

      console.log(
        JSON.stringify(
          {
            shinyImageUrl:
              pokemonImageInfo
                .shinyImage
                .src,

            shinyImagePath:
              shinyImageFile
                .relativePath,

            shinyImage:
              shinyImageFile
                .relativePath
          },
          null,
          2
        )
      );
    }
  } catch (error) {
    console.error(
      "保存に失敗しました:",
      error
    );

    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

saveGlaceonHtml();