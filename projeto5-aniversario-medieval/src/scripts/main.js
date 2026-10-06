import AOS from "aos";
import "aos/dist/aos.css";

// once: false → entra ao descer e sai ao subir a página (animação reversa)
// mirror: false → não some ao passar por ele descendo (os cards ficam presos na tela)
AOS.init({
    duration: 800,
    once: false,
    mirror: false
});


/* =========================================
   CONTAGEM REGRESSIVA ATÉ A FESTA
   A festa é todo 28 de junho, às 20h (horário de Brasília).
   Depois que a festa termina, o contador passa a mirar o próximo ano.
========================================= */

const DURACAO_DA_FESTA_EM_MS = 1000 * 60 * 60 * 8; // 20h até 4h da manhã

function dataDaFesta(ano) {
    // fuso fixo de Brasília, para todo visitante contar até o mesmo instante
    return new Date(`${ano}-06-28T20:00:00-03:00`);
}

function proximaFesta() {
    const agora = new Date().getTime();
    const anoAtual = new Date().getFullYear();
    const festaDesteAno = dataDaFesta(anoAtual);

    if (agora > festaDesteAno.getTime() + DURACAO_DA_FESTA_EM_MS) {
        return dataDaFesta(anoAtual + 1);
    }

    return festaDesteAno;
}

const festa = proximaFesta();
const timeStampDaFesta = festa.getTime();

document.querySelectorAll(".js-ano-festa").forEach(function (elemento) {
    elemento.textContent = festa.getFullYear();
});

const contador = document.getElementById("contador");
const mensagem = document.getElementById("contador-mensagem");
const numeros = {
    dias: contador.querySelector('[data-unidade="dias"]'),
    horas: contador.querySelector('[data-unidade="horas"]'),
    minutos: contador.querySelector('[data-unidade="minutos"]'),
    segundos: contador.querySelector('[data-unidade="segundos"]')
};

const diaEmMs = 1000 * 60 * 60 * 24;
const horaEmMs = 1000 * 60 * 60;
const minutoEmMs = 1000 * 60;

function doisDigitos(numero) {
    return String(numero).padStart(2, "0");
}

function atualizaContador() {
    const distanciaAteAFesta = timeStampDaFesta - new Date().getTime();

    if (distanciaAteAFesta <= 0) {
        clearInterval(intervaloDoContador);
        contador.hidden = true;
        mensagem.hidden = false;
        return;
    }

    numeros.dias.textContent = Math.floor(distanciaAteAFesta / diaEmMs);
    numeros.horas.textContent = doisDigitos(Math.floor((distanciaAteAFesta % diaEmMs) / horaEmMs));
    numeros.minutos.textContent = doisDigitos(Math.floor((distanciaAteAFesta % horaEmMs) / minutoEmMs));
    numeros.segundos.textContent = doisDigitos(Math.floor((distanciaAteAFesta % minutoEmMs) / 1000));
}

const intervaloDoContador = setInterval(atualizaContador, 1000);
atualizaContador();


/* =========================================
   RESERVA DE CONVITE (simulada)
========================================= */

document.querySelectorAll(".js-reservar").forEach(function (botao) {
    botao.addEventListener("click", function () {
        document.querySelectorAll(".js-reservar").forEach(function (outro) {
            outro.classList.remove("ticket__button--reserved");
            outro.textContent = "Quero este";
        });

        botao.classList.add("ticket__button--reserved");
        botao.textContent = "Convite reservado ✓";
    });
});


/* =========================================
   SEÇÕES EM CARDS EMPILHADOS
   --stick-top: onde cada card para. Se o card é mais alto que a tela,
                ele só para depois de mostrar o conteúdo inteiro.
   --cover:     de 0 a 1, quanto o card já foi coberto pelo próximo.
========================================= */

const cards = Array.from(document.querySelectorAll(".stack-card"));

function medeCards() {
    const alturaDaTela = window.innerHeight;

    cards.forEach(function (card) {
        const paradaNoTopo = Math.min(0, alturaDaTela - card.offsetHeight);
        card.style.setProperty("--stick-top", `${paradaNoTopo}px`);
    });
}

function atualizaCards() {
    const alturaDaTela = window.innerHeight;

    cards.forEach(function (card, indice) {
        const proximo = cards[indice + 1];
        let cobertura = 0;

        // o rodapé sobe por cima, mas não faz o card anterior recuar
        // (ele é baixo, e os convites terminariam a página escurecidos)
        if (proximo && proximo.dataset.stackRecuo !== "nao") {
            const topoDoProximo = proximo.getBoundingClientRect().top;
            cobertura = Math.min(Math.max(1 - topoDoProximo / alturaDaTela, 0), 1);
        }

        card.style.setProperty("--cover", cobertura.toFixed(3));
    });
}

// requestAnimationFrame: no máximo uma atualização por quadro, mesmo rolando rápido
let quadroAgendado = false;

function agendaAtualizacao() {
    if (quadroAgendado) return;

    quadroAgendado = true;

    requestAnimationFrame(function () {
        atualizaCards();
        quadroAgendado = false;
    });
}

window.addEventListener("scroll", agendaAtualizacao, { passive: true });

window.addEventListener("resize", function () {
    medeCards();
    agendaAtualizacao();
});

// a altura dos cards muda quando imagens e fontes terminam de carregar
const observadorDeTamanho = new ResizeObserver(function () {
    medeCards();
    agendaAtualizacao();
});

cards.forEach(function (card) {
    observadorDeTamanho.observe(card);
});

medeCards();
atualizaCards();
