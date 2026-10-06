/* =========================================
   PERFIL DO GITHUB VIA AJAX (Fetch API + try/catch)

   O usuário pode ser trocado pela URL, com um query parameter:
   index.html?usuario=ogiansouza
========================================= */

const USUARIO_PADRAO = "well-wander";
const API_GITHUB = "https://api.github.com/users/";

const elementos = {
    perfil: document.querySelector("#perfil"),
    avatar: document.querySelector("#avatar"),
    nome: document.querySelector("#nome"),
    usuario: document.querySelector("#usuario"),
    repositorios: document.querySelector("#repositorios"),
    seguidores: document.querySelector("#seguidores"),
    seguindo: document.querySelector("#seguindo"),
    link: document.querySelector("#link"),
    erro: document.querySelector("#erro")
};

// lê o usuário do query parameter "?usuario=" (ou usa o padrão)
function pegaUsuarioDaUrl() {
    const parametros = new URLSearchParams(window.location.search);
    const usuario = parametros.get("usuario");

    return usuario ? usuario.trim() : USUARIO_PADRAO;
}

// traduz o status code da resposta HTTP numa mensagem para quem está usando a página
function mensagemDeErro(status, usuario) {
    if (status === 404) {
        return `Não encontramos o usuário "${usuario}" no GitHub.`;
    }

    if (status === 403) {
        return "O limite de consultas à API do GitHub foi atingido. Tente novamente em alguns minutos.";
    }

    if (status >= 500) {
        return "O GitHub está com instabilidade no momento. Tente novamente mais tarde.";
    }

    return `Não foi possível carregar o perfil (erro ${status}).`;
}

function preenchePerfil(dados) {
    // nem todo usuário preenche o nome; nesse caso usamos o login
    const nome = dados.name || dados.login;

    elementos.avatar.src = dados.avatar_url;
    elementos.avatar.alt = `Foto de perfil de ${nome}`;
    elementos.nome.innerText = nome;
    elementos.usuario.innerText = `@${dados.login}`;
    elementos.repositorios.innerText = dados.public_repos;
    elementos.seguidores.innerText = dados.followers;
    elementos.seguindo.innerText = dados.following;
    elementos.link.href = dados.html_url;

    document.title = `${nome} (@${dados.login}) · Meu Github`;
}

function mostraErro(mensagem) {
    elementos.nome.innerText = "Ops!";
    elementos.usuario.innerHTML = "&nbsp;";
    elementos.erro.innerText = mensagem;
    elementos.erro.hidden = false;
}

async function carregaPerfil() {
    const usuario = pegaUsuarioDaUrl();

    try {
        const resposta = await fetch(`${API_GITHUB}${encodeURIComponent(usuario)}`);

        // o fetch só rejeita em falha de rede: um 404 ou 500 chega aqui como resposta normal,
        // então lançamos a exceção nós mesmos quando o status não é de sucesso (2xx)
        if (!resposta.ok) {
            throw new Error(mensagemDeErro(resposta.status, usuario));
        }

        const dados = await resposta.json();

        preenchePerfil(dados);
    } catch (erro) {
        // TypeError = o fetch nem conseguiu falar com o servidor (sem internet, por exemplo)
        if (erro.name === "TypeError") {
            mostraErro("Não foi possível conectar ao GitHub. Verifique sua conexão com a internet.");
        } else {
            mostraErro(erro.message);
        }

        console.error(`${erro.name}: ${erro.message}`);
    } finally {
        // com sucesso ou com erro, o carregamento terminou
        elementos.perfil.setAttribute("aria-busy", "false");
    }
}

carregaPerfil();
