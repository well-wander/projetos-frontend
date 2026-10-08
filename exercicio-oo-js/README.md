# Linha evolutiva do Charmander — Exercício de Orientação a Objetos

Exercício do módulo **Orientação a objetos com JavaScript** do curso de Engenheiro Front-End da [EBAC](https://ebaconline.com.br).

## O que foi feito

- **Abstração:** a classe `Pokemon` reúne o que todo Pokémon tem (nome, tipo, nível, experiência) e o que todo Pokémon faz (`apresentar`, `atacar`, `treinar`).
- **Herança:** `Charmander`, `Charmeleon` e `Charizard` herdam de `Pokemon` com `Pokemon.call(this, ...)` e acrescentam o que é só deles (a próxima evolução e, no caso do Charizard, o método `voar()`).
- **Polimorfismo:** cada herdeira reescreve o `atacar()` (Brasas, Lança-Chamas, Explosão de Fogo) e complementa o `apresentar()` da classe pai.
- **Encapsulamento:** a experiência fica numa variável privada (`_experiencia`), lida só pelo `getExperiencia()` e alterada só pelo `treinar()`.
- **Instâncias:** `charmander`, `charmeleon` e `charizard`.

## Como testar

Abra o `index.html` no navegador. Os Pokémon aparecem na página e no console (F12).
