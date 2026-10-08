/* =========================================
   RECURSOS DO ES6+

   Os alunos da Sociedade do Anel fizeram a prova
   de Valfenda. Quem tirou 6 ou mais segue na jornada.
========================================= */

const NOTA_MINIMA = 6;

// array de objetos com o nome e a nota de cada aluno
const alunos = [
    { nome: "Frodo", nota: 9.5 },
    { nome: "Sam", nota: 8 },
    { nome: "Merry", nota: 6 },
    { nome: "Pippin", nota: 4.5 },
    { nome: "Aragorn", nota: 10 },
    { nome: "Legolas", nota: 9 },
    { nome: "Gimli", nota: 7 },
    { nome: "Boromir", nota: 5.5 },
    { nome: "Gollum", nota: 2 }
];

// retorna apenas os alunos com nota maior ou igual à mínima (6, se nada for passado)
const filtraAprovados = (listaDeAlunos, notaMinima = NOTA_MINIMA) =>
    listaDeAlunos.filter(({ nota }) => nota >= notaMinima);

// o contrário, para mostrar também quem ficou em Valfenda
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
    `${aprovados.length} de ${alunos.length} alunos tiraram ${NOTA_MINIMA} ou mais e seguem na jornada.`;
