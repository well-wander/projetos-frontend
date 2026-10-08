# Clube da Luta — Exercício de Orientação a Objetos

Exercício do módulo **Orientação a objetos com JavaScript** do curso de Engenheiro Front-End da [EBAC](https://ebaconline.com.br).

## O que foi feito

- **Abstração:** a classe `Lutador` reúne o que todo lutador tem (nome, idade, peso, vitórias) e o que todo lutador faz (`apresentar`, `golpear`, `vencer`).
- **Herança:** `Boxeador` e `Judoca` herdam de `Lutador` com `Lutador.call(this, ...)` e acrescentam o próprio atributo (`categoria` e `faixa`).
- **Polimorfismo:** cada herdeira reescreve o `golpear()` e complementa o `apresentar()` da classe pai.
- **Encapsulamento:** as vitórias ficam numa variável privada (`_vitorias`), lida só pelo `getVitorias()` e alterada só pelo `vencer()`.
- **Instâncias:** `tyler` (Boxeador), `marla` (Judoca) e `bob` (Lutador).

## Como testar

Abra o `index.html` no navegador. Os lutadores aparecem na página e no console (F12).
