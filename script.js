let allPokemon = [];
let selectedPokemon = null;

async function loadPokemon() {

  const response = await fetch("data/pokemon.json");

  allPokemon = await response.json();

  displayPokemon(allPokemon);
}

function displayPokemon(pokemonList) {
  const list = document.getElementById("pokemon-list");

  list.innerHTML = "";

  pokemonList.forEach(pokemon => {

    const card = document.createElement("div");

    card.className = "card";

    card.innerHTML = `

  <img
    src="${pokemon.image}"
    width="100"
  >

  <h2>${pokemon.name}</h2>

          <p>
            ${pokemon.types.join(" / ")}
          </p>

          <p>
            HP:${pokemon.stats.hp}
            A:${pokemon.stats.atk}
            B:${pokemon.stats.def}
          </p>

          <p>
            C:${pokemon.stats.spa}
            D:${pokemon.stats.spd}
            S:${pokemon.stats.spe}
          </p>
          `;

    card.onclick = () => showPokemon(pokemon);

    list.appendChild(card);
  });
}

function showPokemon(pokemon) {

  const result = document.getElementById("result");

  // 同じポケモンを再クリック
  if (selectedPokemon === pokemon.name) {

    result.innerHTML = "";

    selectedPokemon = null;

    return;
  }

  selectedPokemon = pokemon.name;

  result.innerHTML = `
    <div class="result-box">

      <img
        src="${pokemon.image}"
        class="pokemon-image"
        alt="${pokemon.name}"
      >

      <h2>${pokemon.name}</h2>

      <p>
        タイプ：
        ${pokemon.types.join(" / ")}
      </p>

      <h3>種族値</h3>

      <table>
        <tr><td>HP</td><td>${pokemon.stats.hp}</td></tr>
        <tr><td>A</td><td>${pokemon.stats.atk}</td></tr>
        <tr><td>B</td><td>${pokemon.stats.def}</td></tr>
        <tr><td>C</td><td>${pokemon.stats.spa}</td></tr>
        <tr><td>D</td><td>${pokemon.stats.spd}</td></tr>
        <tr><td>S</td><td>${pokemon.stats.spe}</td></tr>
      </table>

      <h3>特性</h3>

      <ul>
        ${pokemon.abilities.map(a => `<li>${a}</li>`).join("")}
      </ul>

    </div>
  `;
}

// document.getElementById("search")
//   .addEventListener("input", (e) => {

//     const keyword = e.target.value;

//     const filtered = allPokemon.filter(p =>
//       p.name.includes(keyword)
//     );

//     displayPokemon(filtered);
//   });

function sortByHp() {

  const sorted = [...allPokemon];

  sorted.sort((a, b) =>
    b.stats.hp - a.stats.hp
  );

  displayPokemon(sorted);
}

function sortByAtk() {

  const sorted = [...allPokemon];

  sorted.sort((a, b) =>
    b.stats.atk - a.stats.atk
  );

  displayPokemon(sorted);
}

function sortByDefense() {

  const sorted = [...allPokemon];

  sorted.sort((a, b) =>
    b.stats.def - a.stats.def
  );

  displayPokemon(sorted);
}

function sortBySpAtk() {

  const sorted = [...allPokemon];

  sorted.sort((a, b) =>
    b.stats.spa - a.stats.spa
  );

  displayPokemon(sorted);
}

function sortBySpDefense() {

  const sorted = [...allPokemon];

  sorted.sort((a, b) =>
    b.stats.spd - a.stats.spd
  );

  displayPokemon(sorted);
}

function sortBySpeed() {

  const sorted = [...allPokemon];

  sorted.sort((a, b) =>
    b.stats.spe - a.stats.spe
  );

  displayPokemon(sorted);
}

function showMegaOnly() {

  const filtered =
    allPokemon.filter(p =>
      p.name.includes("メガ")
    );

  displayPokemon(filtered);
}

loadPokemon();