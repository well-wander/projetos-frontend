/* =========================================
   ORIENTAÇÃO A OBJETOS COM JAVASCRIPT

   Abstração: Pokemon
   Herdeiras: Charmander, Charmeleon e Charizard
   Instâncias: charmander, charmeleon e charizard
========================================= */

// ---------- abstração ----------

// o que todo Pokémon tem, independente da espécie
function Pokemon(nome, tipo, nivel) {
    this.nome = nome;
    this.tipo = tipo;
    this.nivel = nivel;

    // encapsulamento: a experiência só muda pelos métodos abaixo
    let _experiencia = 0;

    this.getExperiencia = function () {
        return _experiencia;
    };

    this.treinar = function (pontos) {
        _experiencia += pontos;
    };

    this.apresentar = function () {
        return `${this.nome} — tipo ${this.tipo}, nível ${this.nivel}, ${_experiencia} de experiência`;
    };

    // cada espécie ataca de um jeito (polimorfismo)
    this.atacar = function () {
        return `${this.nome} usa Investida!`;
    };
}

// ---------- herdeiras (a linha evolutiva) ----------

function Charmander(nivel) {
    Pokemon.call(this, "Charmander", "Fogo", nivel);

    this.evoluiPara = "Charmeleon";

    this.atacar = function () {
        return `${this.nome} usa Brasas!`;
    };

    // reaproveita a apresentação da classe pai e acrescenta a evolução
    const apresentarPokemon = this.apresentar;
    this.apresentar = function () {
        return `${apresentarPokemon.call(this)} | evolui para ${this.evoluiPara} no nível 16`;
    };
}

function Charmeleon(nivel) {
    Pokemon.call(this, "Charmeleon", "Fogo", nivel);

    this.evoluiPara = "Charizard";

    this.atacar = function () {
        return `${this.nome} usa Lança-Chamas!`;
    };

    const apresentarPokemon = this.apresentar;
    this.apresentar = function () {
        return `${apresentarPokemon.call(this)} | evolui para ${this.evoluiPara} no nível 36`;
    };
}

function Charizard(nivel) {
    Pokemon.call(this, "Charizard", "Fogo/Voador", nivel);

    this.atacar = function () {
        return `${this.nome} usa Explosão de Fogo!`;
    };

    // só o Charizard voa
    this.voar = function () {
        return `${this.nome} abre as asas e levanta voo!`;
    };

    const apresentarPokemon = this.apresentar;
    this.apresentar = function () {
        return `${apresentarPokemon.call(this)} | evolução final`;
    };
}

// ---------- instâncias ----------

const charmander = new Charmander(5);
const charmeleon = new Charmeleon(16);
const charizard = new Charizard(36);

charmander.treinar(120);
charmeleon.treinar(800);
charizard.treinar(2500);

const pokemons = [charmander, charmeleon, charizard];

// ---------- saída (console e página) ----------

const lista = document.querySelector("#pokemons");

pokemons.forEach(function (pokemon) {
    console.log(pokemon.apresentar());
    console.log(pokemon.atacar());

    const item = document.createElement("li");
    item.innerHTML = `<strong>${pokemon.apresentar()}</strong><br>${pokemon.atacar()}`;
    lista.appendChild(item);
});

console.log(charizard.voar());

// a _experiencia é privada: não dá pra acessar nem alterar de fora
console.log(charmander._experiencia); // undefined
console.log(charmander.getExperiencia()); // 120
