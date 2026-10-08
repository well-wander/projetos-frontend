# Provas de Hogwarts — Exercício de Recursos do ES6+

Exercício do módulo **Recursos do ES6+** do curso de Engenheiro Front-End da [EBAC](https://ebaconline.com.br).

![Aquarela do castelo de Hogwarts](img/hogwarts.jpg)

Os alunos de Hogwarts fizeram as provas de fim de ano. Quem tirou 6 ou mais foi aprovado.

## O que foi feito

- **Array de objetos** com o `nome` e a `nota` de cada aluno.
- **Função `filtraAprovados`**, que retorna apenas os alunos com nota maior ou igual a 6.
- Recursos do ES6+ usados:
  - `const` no lugar de `var`;
  - **arrow functions** nos callbacks do `filter` e do `map`;
  - **parâmetro com valor padrão** (`notaMinima = 6`);
  - **desestruturação** direto nos parâmetros (`({ nota }) => ...`);
  - **template literals** para montar os textos;
  - **métodos de array encadeados** (`map` + `join`) para montar a lista na página.

## Como testar

Abra o `index.html` no navegador. A página mostra quem foi aprovado e quem vai refazer a prova, e o console (F12) mostra os dois arrays.
