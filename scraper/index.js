const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const https = require("https");

const listUrl = "https://yakkun.com/ch/zukan/search/?type=14";

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function downloadImage(url, filePath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);

    https.get(url, response => {
      response.pipe(file);

      file.on("finish", () => {
        file.close(resolve);
      });
    }).on("error", err => {
      fs.unlink(filePath, () => { });
      reject(err);
    });
  });
}

function safeFileName(name) {
  return name
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "_");
}

async function getPokemonUrls(page) {
  await page.goto(listUrl, { waitUntil: "networkidle2" });

  const urls = await page.$$eval('a[href^="/ch/zukan/n"]', links =>
    [...new Set(links.map(a => a.href))]
  );

  return urls;
}

async function getPokemonImageUrl(page, pokemonName) {
  return await page.$$eval("img", (imgs, name) => {
    const candidates = imgs.map(img => ({
      src: img.src,
      alt: img.alt || "",
      width: img.naturalWidth,
      height: img.naturalHeight
    }));

    const hit = candidates.find(img =>
      img.alt.includes(name) &&
      img.width >= 80 &&
      img.height >= 80
    );

    return hit ? hit.src : "";
  }, pokemonName).catch(() => "");
}

async function scrapePokemon(page, url) {
  await page.goto(url, { waitUntil: "networkidle2" });

  const rows = await page.$$eval("tr", rows =>
    rows.map(row =>
      [...row.querySelectorAll("th,td")].map(cell =>
        cell.innerText.trim().replace(/\u00a0/g, " ")
      )
    ).filter(cols => cols.length)
  );

  const pokemon = {
    url,
    name: "",
    no: "",
    height: "",
    weight: "",
    englishName: "",
    imageUrl: "",
    imagePath: "",
    stats: {},
    abilities: [],
    hiddenAbilities: [],
    moves: []
  };

  let section = "";
  let currentMoveName = "";
  let currentMoveGames = [];

  for (const cols of rows) {
    const first = cols[0];

    if (!pokemon.name && cols.length === 1 && first && !first.startsWith("◆")) {
      pokemon.name = first;
    }

    if (first === "全国No.") pokemon.no = cols[1];
    if (first === "高さ") pokemon.height = cols[1];
    if (first === "重さ") pokemon.weight = cols[1].split("\n")[0].trim();
    if (first === "英語名") pokemon.englishName = cols[1];

    if (first.includes("種族値")) {
      section = "stats";
      continue;
    }

    if (first.includes("特性(とくせい)")) {
      section = "abilities";
      continue;
    }

    if (first.includes("隠れ特性")) {
      section = "hiddenAbilities";
      continue;
    }

    if (first.includes("覚える技")) {
      section = "moves";
      continue;
    }

    if (first.includes("没収された技")) {
      break;
    }

    if (section === "stats") {
      const stats = ["HP", "攻撃", "防御", "特攻", "特防", "素早"];

      if (stats.includes(first)) {
        pokemon.stats[first] = parseInt(cols[1].match(/\d+/)?.[0]) || 0;
      }
    }

    if (section === "abilities" && cols.length === 2) {
      pokemon.abilities.push({
        name: cols[0],
        description: cols[1]
      });
    }

    if (section === "hiddenAbilities" && cols.length === 2) {
      pokemon.hiddenAbilities.push({
        name: cols[0].replace("*", ""),
        description: cols[1]
      });
    }

    if (section === "moves" && cols.length === 2 && cols[0] === "") {
      const lines = cols[1].split("\n").map(v => v.trim()).filter(Boolean);

      currentMoveName = lines[0]
        .replace("人気", "")
        .replace("ダブル", "");

      currentMoveGames = lines.slice(1);
      continue;
    }

    if (
      section === "moves" &&
      cols.length === 7 &&
      ["物理", "特殊", "変化"].includes(cols[1])
    ) {
      pokemon.moves.push({
        name: currentMoveName,
        games: currentMoveGames,
        type: cols[0],
        category: cols[1],
        power: cols[2],
        accuracy: cols[3],
        pp: cols[4],
        contact: cols[5],
        description: cols[6]
      });

      currentMoveName = "";
      currentMoveGames = [];
    }
  }

  pokemon.imageUrl = await getPokemonImageUrl(page, pokemon.name);

  return pokemon;
}

async function scrape() {
  if (!fs.existsSync("images")) {
    fs.mkdirSync("images");
  }

  const browser = await puppeteer.launch({
    headless: false
  });

  const page = await browser.newPage();

  console.log("氷タイプ一覧取得中...");
  const urls = await getPokemonUrls(page);
  console.log(`${urls.length}件取得`);

  const allPokemon = [];

  for (let i = 0; i < urls.length; i++) {
    console.log(`${i + 1}/${urls.length}: ${urls[i]}`);

    try {
      const pokemon = await scrapePokemon(page, urls[i]);

      if (pokemon.imageUrl && pokemon.name) {
        const fileName = `${safeFileName(pokemon.englishName || pokemon.name)}.png`;
        const filePath = path.join("images", fileName);

        await downloadImage(pokemon.imageUrl, filePath);

        pokemon.imagePath = filePath.replace(/\\/g, "/");

        console.log("画像保存:", pokemon.imagePath);
      } else {
        console.log("画像URLなし:", pokemon.name);
      }

      allPokemon.push(pokemon);

      console.log("完了:", pokemon.name);
      await sleep(1000);
    } catch (e) {
      console.error("失敗:", urls[i]);
      console.error(e.message);
    }
  }

  fs.writeFileSync(
    "ice_pokemon.json",
    JSON.stringify(allPokemon, null, 2),
    "utf8"
  );

  console.log("保存完了:", allPokemon.length, "件");
  await browser.close();
}

scrape().catch(console.error);