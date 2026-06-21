const axios = require("axios");
const fs = require("fs");

async function test() {

  const url =
    "https://gamewith.jp/pokemon-champions/553891";

  const res = await axios.get(url);

  fs.writeFileSync(
    "page.html",
    res.data
  );

  console.log("保存完了");
}

test();