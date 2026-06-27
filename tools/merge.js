const fs = require("fs");

const oldData = JSON.parse(fs.readFileSync("./data/ice_pokemon.json", "utf-8"));
const masterData = JSON.parse(fs.readFileSync("./data/pokemon.json", "utf-8"));

const merged = oldData.map(oldPokemon => {
  const master = masterData.find(p =>
    String(p.id) === String(oldPokemon.no).replace(/^0+/, "") ||
    p.name === oldPokemon.name ||
    p.name.includes(oldPokemon.name) ||
    oldPokemon.name.includes(p.name)
  );

  if (!master) {
    return oldPokemon;
  }

  return {
    ...oldPokemon,

    id: master.id,
    name: master.name,
    types: master.types,

    stats: {
      HP: master.stats.hp,
      攻撃: master.stats.atk,
      防御: master.stats.def,
      特攻: master.stats.spa,
      特防: master.stats.spd,
      素早さ: master.stats.spe
    },

    abilities: master.abilities.map(name => ({
      name,
      description: ""
    })),

    analysis: master.analysis ?? {
      topKills: [],
      switchIn: []
    },

    memo: oldPokemon.memo ?? ""
  };
});

fs.writeFileSync(
  "./data/ice_pokemon_merged.json",
  JSON.stringify(merged, null, 2),
  "utf-8"
);

console.log("merge complete");