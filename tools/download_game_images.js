const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

// ==============================
// 保存対象
// ==============================

const targets = [
  {
    name: "ガブリアス",
    url: "https://yakkun.com/ch/zukan/n445",
    filename: "garchomp.png"
  },
  {
    name: "メガカイリュー",
    url: "https://yakkun.com/ch/zukan/n149m",
    filename: "mega-dragonite.png"
  }
];

// ==============================
// 保存先
// ==============================

const imageDirectory = path.resolve(
  __dirname,
  "../images"
);

if (!fs.existsSync(imageDirectory)) {
  fs.mkdirSync(imageDirectory, {
    recursive: true
  });
}

// ==============================
// 画像URLの補正
// ==============================

function normalizeUrl(src, pageUrl) {
  if (!src) {
    return null;
  }

  if (src.startsWith("//")) {
    return `https:${src}`;
  }

  if (
    src.startsWith("http://") ||
    src.startsWith("https://")
  ) {
    return src;
  }

  return new URL(src, pageUrl).href;
}

// ==============================
// 画像保存
// ==============================

function downloadImage(url, savePath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https:")
      ? https
      : http;

    const request = client.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
            "AppleWebKit/537.36 Chrome/150 Safari/537.36",

          Referer: "https://yakkun.com/"
        }
      },
      response => {
        if (
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          response.resume();

          const redirectUrl = normalizeUrl(
            response.headers.location,
            url
          );

          downloadImage(
            redirectUrl,
            savePath
          )
            .then(resolve)
            .catch(reject);

          return;
        }

        if (response.statusCode !== 200) {
          response.resume();

          reject(
            new Error(
              `画像取得失敗：HTTP ${response.statusCode}`
            )
          );

          return;
        }

        const file = fs.createWriteStream(savePath);

        response.pipe(file);

        file.on("finish", () => {
          file.close(resolve);
        });

        file.on("error", error => {
          file.close();

          if (fs.existsSync(savePath)) {
            fs.unlinkSync(savePath);
          }

          reject(error);
        });
      }
    );

    request.on("error", reject);
  });
}

// ==============================
// ページから画像を探す
// ==============================

async function findPokemonImage(
  page,
  pokemonName,
  pageUrl
) {
  await page.goto(pageUrl, {
    waitUntil: "networkidle2",
    timeout: 60000
  });

  await page.waitForSelector("img", {
    timeout: 30000
  });

  const imageData = await page.evaluate(
    pokemonName => {
      const images = Array.from(
        document.querySelectorAll("img")
      );

      const candidates = images
        .map(image => {
          const alt =
            image.getAttribute("alt") || "";

          const src =
            image.currentSrc ||
            image.getAttribute("src") ||
            image.getAttribute("data-src") ||
            image.getAttribute("data-original") ||
            "";

          const width =
            image.naturalWidth ||
            Number(image.getAttribute("width")) ||
            0;

          const height =
            image.naturalHeight ||
            Number(image.getAttribute("height")) ||
            0;

          let score = 0;

          if (alt === pokemonName) {
            score += 100;
          }

          if (alt.includes(pokemonName)) {
            score += 60;
          }

          if (
            alt.includes("通常色") &&
            alt.includes(pokemonName)
          ) {
            score -= 40;
          }

          if (alt.includes("色違い")) {
            score -= 100;
          }

          if (
            src.includes("/p/") ||
            src.includes("zukan") ||
            src.includes("pokemon")
          ) {
            score += 15;
          }

          if (width >= 100 && height >= 100) {
            score += 10;
          }

          if (width >= 200 && height >= 200) {
            score += 10;
          }

          return {
            alt,
            src,
            width,
            height,
            score
          };
        })
        .filter(image => {
          return (
            image.src &&
            image.score > 0 &&
            !image.src.includes("icon") &&
            !image.src.includes("logo") &&
            !image.src.includes("banner")
          );
        })
        .sort((a, b) => {
          if (b.score !== a.score) {
            return b.score - a.score;
          }

          return (
            b.width * b.height -
            a.width * a.height
          );
        });

      return candidates[0] || null;
    },
    pokemonName
  );

  if (!imageData?.src) {
    throw new Error(
      `${pokemonName}の画像が見つかりませんでした。`
    );
  }

  return {
    ...imageData,
    src: normalizeUrl(
      imageData.src,
      pageUrl
    )
  };
}

// ==============================
// メイン処理
// ==============================

async function main() {
  const browser = await puppeteer.launch({
    headless: true,

    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox"
    ]
  });

  try {
    const page = await browser.newPage();

    await page.setViewport({
      width: 1280,
      height: 1000
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 Chrome/150 Safari/537.36"
    );

    for (const target of targets) {
      console.log(
        `\n取得開始：${target.name}`
      );

      const image = await findPokemonImage(
        page,
        target.name,
        target.url
      );

      console.log(
        `alt：${image.alt}`
      );

      console.log(
        `画像URL：${image.src}`
      );

      const savePath = path.join(
        imageDirectory,
        target.filename
      );

      await downloadImage(
        image.src,
        savePath
      );

      console.log(
        `保存完了：${savePath}`
      );
    }

    console.log(
      "\nゲーム用画像の取得が完了しました。"
    );
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(
    "\nスクレイピング失敗：",
    error
  );

  process.exit(1);
});