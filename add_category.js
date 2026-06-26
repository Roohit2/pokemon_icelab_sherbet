const fs = require("fs");

const pokemonList = JSON.parse(
  fs.readFileSync("./data/ice_pokemon_merged.json", "utf-8")
);

const categoryMap = {
  "038": "きつねポケモン",
  "351": "てんきポケモン",
  "362": "がんめんポケモン",
  "460": "じゅひょうポケモン",
  "461": "かぎづめポケモン",
  "471": "しんせつポケモン",
  "473": "2ほんキバポケモン",
  "478": "ゆきぐにポケモン"
};

const updatedPokemonList = pokemonList.map(pokemon => {
  const no = String(pokemon.no || pokemon.id).replace(/^0+/, "");

  return {
    ...pokemon,
    category: categoryMap[no.padStart(3, "0")] || pokemon.category || ""
  };
});

fs.writeFileSync(
  "./data/ice_pokemon_with_category.json",
  JSON.stringify(updatedPokemonList, null, 2),
  "utf-8"
);

console.log("category追加完了");