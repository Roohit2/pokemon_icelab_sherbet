const puppeteer = require("puppeteer");
const fs = require("fs");

const SEARCH_URL = "https://yakkun.com/ch/zukan/search/?type=14";
const MAX_POKEMON = 999;

function getIdFromUrl(url) {
  const match = url.match(/\/n(\d+)([a-z])?(?:$|[/?#])/);
  if (!match) return null;

  const no = Number(match[1]);
  const form = match[2] ?? "";

  if (form === "m") return Number(`${no}1`);
  if (form) return Number(`${no}${form.charCodeAt(0)}`);

  return no;
}

function uniqueById(list) {
  const map = new Map();

  for (const p of list) {
    if (!p.id) continue;
    map.set(p.id, {
      ...map.get(p.id),
      ...p
    });
  }

  return [...map.values()];
}

async function scrape() {
  const oldPokemon = JSON.parse(
    fs.readFileSync("./data/pokemon.json", "utf8")
  );

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  console.log("氷タイプ一覧を取得中...");

  await page.goto(SEARCH_URL, {
    waitUntil: "domcontentloaded",
    timeout: 60000
  });

  const urls = await page.evaluate(() => {
    return [...document.querySelectorAll("a")]
      .map(a => a.href)
      .filter(href => /\/ch\/zukan\/n\d+[a-z]?$/.test(href));
  });

  const uniqueUrls = [...new Set(urls)].slice(0, MAX_POKEMON);

  console.log(`${uniqueUrls.length}件取得`);

  const scrapedPokemon = [];

  for (const url of uniqueUrls) {
    const id = getIdFromUrl(url);
    const old = oldPokemon.find(p => p.id === id);

    console.log(`開始: ${url}`);

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    //ここから：ページ内データ取得
    const pokemon = await page.evaluate(() => {
      const baseTable =
        document.querySelector("table[summary='基本データ']") ??
        document.querySelector("#base_anchor table");

      const rawName =
        baseTable?.querySelector("tr.head th")?.innerText ??
        document.querySelector("h1")?.innerText ??
        "";

      const name = rawName
        .replace(/-.*$/, "")
        .replace(/｜.*$/, "")
        .replace(/ポケモン図鑑.*$/, "")
        .trim();

      const img = document.querySelector("img[src*='icon96']")?.src ?? "";

      const rows = [...document.querySelectorAll("tr")].map(tr =>
        [...tr.querySelectorAll("th,td")].map(td =>
          td.innerText.replace(/\s+/g, " ").trim()
        )
      );

      const pokemon = {
        name,
        no: "",
        category: "",
        height: "",
        weight: "",
        types: ["こおり"],
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
        imageUrl: img,
        imagePath: img
          ? `images/${img.split("/").pop().replace(".gif", ".png")}`
          : "",
        analysis: {
          topKills: [],
          switchIn: []
        }
      };

      for (const cols of rows) {
        const first = cols[0] ?? "";
        const value = cols.slice(1).join(" ");

        if (first.includes("全国No")) {
          pokemon.no = value.match(/\d+/)?.[0] ?? "";
        }

        if (first.includes("高さ")) {
          pokemon.height = value.match(/\d+(\.\d+)?m/)?.[0] ?? "";
        }

        if (first.includes("重さ")) {
          pokemon.weight = value.match(/\d+(\.\d+)?kg/)?.[0] ?? "";
        }
      }

      const baseText = baseTable?.innerText.replace(/\s+/g, " ") ?? "";
      const categoryMatch = baseText.match(/[ぁ-んァ-ヶー一-龠]+ポケモン/);
      pokemon.category = categoryMatch?.[0] ?? "";

      const statText = [...document.querySelectorAll("table")]
        .map(table => table.innerText.replace(/\s+/g, " "))
        .find(text =>
          text.includes("種族値") &&
          text.includes("HP") &&
          text.includes("攻撃") &&
          text.includes("防御")
        ) ?? "";

      const statMap = {
        hp: /HP\s+(\d+)/,
        atk: /攻撃\s+(\d+)/,
        def: /防御\s+(\d+)/,
        spa: /特攻\s+(\d+)/,
        spd: /特防\s+(\d+)/,
        spe: /素早\s+(\d+)/
      };

      for (const [key, regex] of Object.entries(statMap)) {
        pokemon.stats[key] = Number(statText.match(regex)?.[1] ?? 0);
      }

      const abilityLinks = [
        ...document.querySelectorAll(
          "a[href*='tokusei=']"
        )
      ];

      for (const link of abilityLinks) {
        const tr = link.closest("tr");
        if (!tr) continue;

        const cells = tr.querySelectorAll("td");

        const ability = {
          name: link.innerText.trim(),
          description:
            cells[1]?.innerText
              .replace(/\s+/g, " ")
              .trim() ?? ""
        };

        // 夢特性判定
        const prevText =
          tr.previousElementSibling?.innerText ?? "";

        if (
          prevText.includes("隠れ") ||
          prevText.includes("夢")
        ) {
          pokemon.hiddenAbilities.push(ability);
        } else {
          pokemon.abilities.push(ability);
        }
      }

      return pokemon;
    });

    const merged = {
      ...old,

      id,
      url,
      no: pokemon.no || old?.no || "",
      name: pokemon.name || old?.name || "",

      category: pokemon.category || old?.category || "",
      height: pokemon.height || old?.height || "",
      weight: pokemon.weight || old?.weight || "",

      imageUrl: old?.imageUrl || pokemon.imageUrl,
      imagePath: old?.imagePath || pokemon.imagePath,

      types: old?.types || ["こおり"],
      stats: Object.values(pokemon.stats).some(v => v > 0)
        ? pokemon.stats
        : old?.stats || {
          hp: 0,
          atk: 0,
          def: 0,
          spa: 0,
          spd: 0,
          spe: 0
        },
      abilities:
        pokemon.abilities.length > 0
          ? pokemon.abilities
          : old?.abilities || [],

      hiddenAbilities:
        pokemon.hiddenAbilities.length > 0
          ? pokemon.hiddenAbilities
          : old?.hiddenAbilities || [],
      analysis: old?.analysis || {
        topKills: [],
        switchIn: []
      }
    };

    scrapedPokemon.push(merged);

    console.log({
      id: merged.id,
      name: merged.name,
      category: merged.category,
      height: merged.height,
      weight: merged.weight,
      stats: merged.stats,
      abilities: merged.abilities,
      hiddenAbilities: merged.hiddenAbilities
    });

    console.log(`${merged.name} 更新完了`);
  }

  const mergedPokemon = uniqueById([
    ...oldPokemon,
    ...scrapedPokemon
  ]);

  fs.writeFileSync(
    "./data/pokemon.json",
    JSON.stringify(mergedPokemon, null, 2),
    "utf8"
  );

  await browser.close();

  console.log("完了");
}

scrape();