let allPokemon = [];

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

  result.innerHTML = `

    <div class="result-box">

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

document.getElementById("search")
  .addEventListener("input", (e) => {

    const keyword = e.target.value;

    const filtered = allPokemon.filter(p =>
      p.name.includes(keyword)
    );

    displayPokemon(filtered);
  });

loadPokemon();