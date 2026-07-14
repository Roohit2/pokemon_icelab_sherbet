const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const GLACEON_URL =
  "https://yakkun.com/ch/zukan/n471";

const OUTPUT_PATH = path.resolve(
  __dirname,
  "../glaceon.html"
);

async function saveGlaceonHtml() {
  const browser = await puppeteer.launch({
    headless: false
  });

  const page = await browser.newPage();

  try {
    console.log(
      `グレイシアのページを開きます: ${GLACEON_URL}`
    );

    await page.goto(GLACEON_URL, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    // JavaScriptによる表示を少し待つ
    await new Promise(resolve =>
      setTimeout(resolve, 3000)
    );

    const html = await page.content();

    fs.writeFileSync(
      OUTPUT_PATH,
      html,
      "utf8"
    );

    console.log("HTMLを保存しました。");
    console.log(OUTPUT_PATH);

    // 技に関係しそうなリンクも確認
    const moveInfo = await page.evaluate(() => {
      const links = [
        ...document.querySelectorAll("a")
      ]
        .filter(link => {
          const href =
            link.getAttribute("href") ?? "";

          const text =
            link.innerText
              .replace(/\s+/g, " ")
              .trim();

          return (
            href.includes("move") ||
            href.includes("waza") ||
            text.includes("れいとう") ||
            text.includes("まもる")
          );
        })
        .slice(0, 30)
        .map(link => ({
          text: link.innerText
            .replace(/\s+/g, " ")
            .trim(),

          href:
            link.getAttribute("href") ?? "",

          parentRow:
            link.closest("tr")
              ?.innerText
              ?.replace(/\s+/g, " ")
              .trim() ??
            ""
        }));

      const tables = [
        ...document.querySelectorAll("table")
      ]
        .map((table, index) => ({
          index,

          text: table.innerText
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 1000),

          html: table.outerHTML.slice(
            0,
            2000
          )
        }))
        .filter(table =>
          table.text.includes("威力") ||
          table.text.includes("命中") ||
          table.text.includes("覚える技")
        );

      return {
        links,
        tables
      };
    });

    fs.writeFileSync(
      path.resolve(
        __dirname,
        "../glaceon-move-debug.json"
      ),
      JSON.stringify(
        moveInfo,
        null,
        2
      ),
      "utf8"
    );

    console.log(
      "技の調査データも保存しました。"
    );

    console.log(
      path.resolve(
        __dirname,
        "../glaceon-move-debug.json"
      )
    );
  } catch (error) {
    console.error(
      "保存に失敗しました:",
      error.message
    );

    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

saveGlaceonHtml();