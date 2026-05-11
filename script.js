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

      <h3>上から倒せる相手</h3>

      <ul>
        ${pokemon.topKills.map(x => `<li>${x}</li>`).join("")}
      </ul>

      <h3>後出し可能</h3>

      <ul>
        ${pokemon.switchIn.map(x => `<li>${x}</li>`).join("")}
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