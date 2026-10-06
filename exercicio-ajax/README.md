# Meu Github — Exercício de Ajax e Exceções

Exercício do módulo **Ajax e Exceções** do curso de Engenheiro Front-End da [EBAC](https://ebaconline.com.br).

O projeto base exibia um perfil do GitHub com os dados fixos no HTML. Nesta versão, todos os dados são **preenchidos via requisição Ajax** à API pública do GitHub.

## O que foi feito

- **Requisição Ajax com a Fetch API** (`async`/`await`) para `https://api.github.com/users/{usuario}`, preenchendo foto, nome, usuário, repositórios, seguidores, seguindo e o link do perfil.
- **Tratamento de exceções com `try`/`catch`/`finally`:**
  - o `fetch` só falha sozinho em erro de rede, então quando o **status code** não é de sucesso (`2xx`) a exceção é lançada com `throw new Error(...)`;
  - mensagens específicas para **404** (usuário não encontrado), **403** (limite de consultas da API) e **5xx** (instabilidade do GitHub);
  - falha de conexão é identificada pelo `erro.name` (`TypeError`);
  - o erro aparece na página para quem está usando, e o `name` e a `message` vão para o console.
- **Estado de carregamento** com `aria-busy` e uma imagem provisória (o `via.placeholder.com` do projeto original saiu do ar).
- **Query parameter** para trocar o usuário pela URL.

## Como testar

Abra o `index.html` no navegador (ou com um servidor local, como o Live Server).

| URL | Resultado |
|---|---|
| `index.html` | perfil padrão (`well-wander`) |
| `index.html?usuario=ogiansouza` | perfil de outro usuário |
| `index.html?usuario=usuario-que-nao-existe` | mensagem de erro 404 tratada no `catch` |

## Tecnologias

HTML · CSS · JavaScript (Fetch API, `try`/`catch`, `URLSearchParams`)
