/* =========================================
   PÁGINA: FÁBRICA DE CLONES DE KAMINO

   Usa as funções de funcoes.ts nos dois formulários.
========================================= */

// casting: o querySelector não sabe qual elemento vem, então informamos o tipo
const formClones = document.querySelector("#form-clones") as HTMLFormElement;
const campoLotes = document.querySelector("#lotes") as HTMLInputElement;
const campoPorLote = document.querySelector("#por-lote") as HTMLInputElement;
const resultadoClones = document.querySelector("#resultado-clones") as HTMLParagraphElement;

const formSaudacao = document.querySelector("#form-saudacao") as HTMLFormElement;
const campoNome = document.querySelector("#nome") as HTMLInputElement;
const resultadoSaudacao = document.querySelector("#resultado-saudacao") as HTMLParagraphElement;

formClones.addEventListener("submit", (evento: SubmitEvent) => {
    evento.preventDefault();

    // valueAsNumber já entrega o campo como number, sem precisar converter
    const total: number = multiplicar(campoLotes.valueAsNumber, campoPorLote.valueAsNumber);

    resultadoClones.textContent = `${total.toLocaleString("pt-BR")} clones prontos para a batalha.`;
});

formSaudacao.addEventListener("submit", (evento: SubmitEvent) => {
    evento.preventDefault();

    resultadoSaudacao.textContent = `${saudar(campoNome.value.trim())}!`;
});
