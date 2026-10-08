# Fábrica de Clones de Kamino — Exercício de TypeScript

Exercício do módulo **Conheça o TypeScript** do curso de Engenheiro Front-End da [EBAC](https://ebaconline.com.br).

## O que foi feito

As duas funções pedidas estão em [`src/funcoes.ts`](src/funcoes.ts), com o tipo de cada parâmetro e do retorno:

```ts
function multiplicar(a: number, b: number): number {
    return a * b;
}

function saudar(nome: string): string {
    return "Olá " + nome;
}
```

Para ilustrar, a página usa o universo de Star Wars:

- **Multiplicação:** quantos clones saem de X lotes com Y soldados cada.
- **Saudação:** uma homenagem ao *"Hello there!"* do Obi-Wan Kenobi.

O [`src/pagina.ts`](src/pagina.ts) liga as funções aos formulários, usando **casting** (`as HTMLInputElement`) para informar ao TypeScript o tipo de cada elemento do DOM.

## Estrutura

```
src/      código TypeScript (o que foi escrito)
dist/     JavaScript gerado pelo compilador (o que o navegador roda)
```

## Como rodar

```bash
npm install
npm run build
```

Depois, abra o `index.html` no navegador.
