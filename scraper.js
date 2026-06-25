const axios = require("axios");
const fs = require("fs");

async function main() {

  const url =
    "https://gamewith.jp/pokemon-champions/553384";

  const res = await axios.get(url);

  fs.writeFileSync(
    "glaceon.html",
    res.data
  );

  console.log("保存完了");
}

main();