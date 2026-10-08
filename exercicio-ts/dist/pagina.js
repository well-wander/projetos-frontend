"use strict";
/* =========================================
   PÁGINA: FÁBRICA DE CLONES DE KAMINO

   Usa as funções de funcoes.ts nos dois formulários.
========================================= */
// casting: o querySelector não sabe qual elemento vem, então informamos o tipo
const formClones = document.querySelector("#form-clones");
const campoLotes = document.querySelector("#lotes");
const campoPorLote = document.querySelector("#por-lote");
const resultadoClones = document.querySelector("#resultado-clones");
const formSaudacao = document.querySelector("#form-saudacao");
const campoNome = document.querySelector("#nome");
const resultadoSaudacao = document.querySelector("#resultado-saudacao");
formClones.addEventListener("submit", (evento) => {
    evento.preventDefault();
    // valueAsNumber já entrega o campo como number, sem precisar converter
    const total = multiplicar(campoLotes.valueAsNumber, campoPorLote.valueAsNumber);
    resultadoClones.textContent = `${total.toLocaleString("pt-BR")} clones prontos para a batalha.`;
});
formSaudacao.addEventListener("submit", (evento) => {
    evento.preventDefault();
    resultadoSaudacao.textContent = `${saudar(campoNome.value.trim())}!`;
});
