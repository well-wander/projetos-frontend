/* =========================================
   ORIENTAÇÃO A OBJETOS COM JAVASCRIPT

   Abstração: Lutador
   Herdeiras: Boxeador e Judoca
   Instâncias: tyler, marla e bob
========================================= */

// ---------- abstração ----------

// o que todo lutador tem, independente da modalidade
function Lutador(nome, idade, peso) {
    this.nome = nome;
    this.idade = idade;
    this.peso = peso;

    // encapsulamento: as vitórias só mudam pelos métodos abaixo
    let _vitorias = 0;

    this.getVitorias = function () {
        return _vitorias;
    };

    this.vencer = function () {
        _vitorias++;
    };

    this.apresentar = function () {
        return `${this.nome}, ${this.idade} anos, ${this.peso} kg — ${_vitorias} vitória(s)`;
    };

    // cada modalidade golpeia de um jeito (polimorfismo)
    this.golpear = function () {
        return `${this.nome} dá um golpe genérico.`;
    };
}

// ---------- herdeiras ----------

function Boxeador(nome, idade, peso, categoria) {
    Lutador.call(this, nome, idade, peso);

    this.categoria = categoria;

    this.golpear = function () {
        return `${this.nome} acerta um jab de direita!`;
    };

    // reaproveita a apresentação da classe pai e acrescenta a categoria
    const apresentarLutador = this.apresentar;
    this.apresentar = function () {
        return `${apresentarLutador.call(this)} | Boxe, peso ${this.categoria}`;
    };
}

function Judoca(nome, idade, peso, faixa) {
    Lutador.call(this, nome, idade, peso);

    this.faixa = faixa;

    this.golpear = function () {
        return `${this.nome} aplica um ippon-seoi-nage!`;
    };

    const apresentarLutador = this.apresentar;
    this.apresentar = function () {
        return `${apresentarLutador.call(this)} | Judô, faixa ${this.faixa}`;
    };
}

// ---------- instâncias ----------

const tyler = new Boxeador("Tyler", 35, 77, "médio");
const marla = new Judoca("Marla", 30, 57, "preta");
const bob = new Lutador("Bob", 48, 120);

tyler.vencer();
tyler.vencer();
marla.vencer();

const lutadores = [tyler, marla, bob];

// ---------- saída (console e página) ----------

const lista = document.querySelector("#lutadores");

lutadores.forEach(function (lutador) {
    console.log(lutador.apresentar());
    console.log(lutador.golpear());

    const item = document.createElement("li");
    item.innerHTML = `<strong>${lutador.apresentar()}</strong><br>${lutador.golpear()}`;
    lista.appendChild(item);
});

// o _vitorias é privado: não dá pra acessar nem alterar de fora
console.log(tyler._vitorias); // undefined
console.log(tyler.getVitorias()); // 2
