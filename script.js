let allPokemon = [];
let selectedPokemon = null;
let selectedCard = null;

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

  <p class="category">
    ${pokemon.category || ""}
  </p>

<p class="type-container">
  ${pokemon.types.map(type =>
      `<span class="type type-${type}">
      ${type}
    </span>`
    ).join(" ")}
</p>

<p class="rank-line">
  HP:<span class="${getRankClass(pokemon.stats.hp)}">${getRank(pokemon.stats.hp)}</span>
  攻:<span class="${getRankClass(pokemon.stats.atk)}">${getRank(pokemon.stats.atk)}</span>
  防:<span class="${getRankClass(pokemon.stats.def)}">${getRank(pokemon.stats.def)}</span>
  特攻:<span class="${getRankClass(pokemon.stats.spa)}">${getRank(pokemon.stats.spa)}</span>
  特防:<span class="${getRankClass(pokemon.stats.spd)}">${getRank(pokemon.stats.spd)}</span>
  素早:<span class="${getRankClass(pokemon.stats.spe)}">${getRank(pokemon.stats.spe)}</span>
</p>
    `;

    card.onclick = () => showPokemon(pokemon, card);

    list.appendChild(card);
  });
}

function showPokemon(pokemon, card) {

  const result = document.getElementById("result");

  if (selectedCard) {
    selectedCard.classList.remove("selected");
  }

  if (selectedPokemon === pokemon.name) {

    result.innerHTML = "";

    selectedPokemon = null;
    selectedCard = null;

    return;
  }

  card.classList.add("selected");

  selectedCard = card;
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
            ${pokemon.types.map(type =>
    `<span class="type type-${type}">
          ${type}
        </span>`

  ).join(" ")}
          </p>

          <h3>種族値</h3>

          <div>

            HP ${pokemon.stats.hp}
            <div class="stat-bar">
              <div
                class="stat-fill"
                style="width:${pokemon.stats.hp / 255 * 100}%">
              </div>
            </div>

            A ${pokemon.stats.atk}
            <div class="stat-bar">
              <div
                class="stat-fill"
                style="width:${pokemon.stats.atk / 255 * 100}%">
              </div>
            </div>

            B ${pokemon.stats.def}
            <div class="stat-bar">
              <div
                class="stat-fill"
                style="width:${pokemon.stats.def / 255 * 100}%">
              </div>
            </div>

            C ${pokemon.stats.spa}
            <div class="stat-bar">
              <div
                class="stat-fill"
                style="width:${pokemon.stats.spa / 255 * 100}%">
              </div>
            </div>

            D ${pokemon.stats.spd}
            <div class="stat-bar">
              <div
                class="stat-fill"
                style="width:${pokemon.stats.spd / 255 * 100}%">
              </div>
            </div>

            S ${pokemon.stats.spe}
            <div class="stat-bar">
              <div
                class="stat-fill"
                style="width:${pokemon.stats.spe / 255 * 100}%">
              </div>
            </div>

          </div>

          <h3>特性</h3>

          <ul>
            ${pokemon.abilities.map(a => `<li>${a}</li>`).join("")}
          </ul>

        </div>
    `;
  result.scrollIntoView({
    behavior: "smooth"
  });
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

function getRank(value) {
  if (value >= 130) return "S";
  if (value >= 100) return "A";
  if (value >= 80) return "B";
  if (value >= 50) return "C";
  if (value >= 30) return "D";
  return "E";
}

function getRankClass(value) {
  if (value >= 130) return "rank-s";
  if (value >= 100) return "rank-a";
  if (value >= 80) return "rank-b";
  if (value >= 50) return "rank-c";
  if (value >= 30) return "rank-d";
  return "rank-e";
}