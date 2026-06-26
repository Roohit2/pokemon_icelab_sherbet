const puppeteer = require("puppeteer");

async function scrape() {

  const browser = await puppeteer.launch({
    headless: false
  });

  const page = await browser.newPage();

  await page.goto(
    "https://gamewith.jp/pokemon-champions/553361",
    {
      waitUntil: "networkidle2"
    }
  );

  console.log(await page.title());

  const html = await page.content();

  console.log(html.length);

  await browser.close();

}

scrape();