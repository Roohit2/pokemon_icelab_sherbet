const fs = require("fs");

const path = "./data/pokemon.json";

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
  478: "ゆきぐにポケモン"
};

const pokemonList = JSON.parse(fs.readFileSync(path, "utf8"));

for (const pokemon of pokemonList) {
  if (knownCategories[pokemon.id]) {
    pokemon.category = knownCategories[pokemon.id];
  }

  if (!pokemon.analysis) {
    pokemon.analysis = {
      topKills: [],
      switchIn: []
    };
  }
}

fs.writeFileSync(path, JSON.stringify(pokemonList, null, 2), "utf8");

console.log("pokemon.json を補修しました");