/* =========================================
   RECURSOS DO ES6+

   Os alunos de Hogwarts fizeram as provas de fim de ano.
   Quem tirou 6 ou mais foi aprovado.
========================================= */

const NOTA_MINIMA = 6;

// array de objetos com o nome e a nota de cada aluno
const alunos = [
    { nome: "Hermione Granger", nota: 10 },
    { nome: "Harry Potter", nota: 7.5 },
    { nome: "Rony Weasley", nota: 6 },
    { nome: "Luna Lovegood", nota: 9 },
    { nome: "Neville Longbottom", nota: 6.5 },
    { nome: "Draco Malfoy", nota: 8 },
    { nome: "Simas Finnigan", nota: 5.5 },
    { nome: "Vincent Crabbe", nota: 3 },
    { nome: "Gregory Goyle", nota: 2.5 }
];

// retorna apenas os alunos com nota maior ou igual à mínima (6, se nada for passado)
const filtraAprovados = (listaDeAlunos, notaMinima = NOTA_MINIMA) =>
    listaDeAlunos.filter(({ nota }) => nota >= notaMinima);

// o contrário, para mostrar também quem vai ter que refazer a prova
const filtraReprovados = (listaDeAlunos, notaMinima = NOTA_MINIMA) =>
    listaDeAlunos.filter(({ nota }) => nota < notaMinima);

const aprovados = filtraAprovados(alunos);
const reprovados = filtraReprovados(alunos);

// ---------- saída (console e página) ----------

console.log("Aprovados:", aprovados);
console.log("Reprovados:", reprovados);

// transforma cada aluno num item de lista (métodos encadeados: map + join)
const montaLista = (listaDeAlunos) =>
    listaDeAlunos
        .map(({ nome, nota }) => `<li>${nome} <span>${nota.toFixed(1)}</span></li>`)
        .join("");

document.querySelector("#aprovados").innerHTML = montaLista(aprovados);
document.querySelector("#reprovados").innerHTML = montaLista(reprovados);
document.querySelector("#resumo").textContent =
    `${aprovados.length} de ${alunos.length} alunos tiraram ${NOTA_MINIMA} ou mais e foram aprovados.`;
