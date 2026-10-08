# A Prova de Valfenda — Exercício de Recursos do ES6+

Exercício do módulo **Recursos do ES6+** do curso de Engenheiro Front-End da [EBAC](https://ebaconline.com.br).

Os membros da Sociedade do Anel fizeram uma prova em Valfenda. Quem tirou 6 ou mais segue na jornada.

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

Abra o `index.html` no navegador. A página mostra quem passou e quem ficou, e o console (F12) mostra os dois arrays.
