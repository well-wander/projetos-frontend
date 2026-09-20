const form = document.getElementById('form-contato');
const nome = document.getElementById('nome');
const telefone = document.getElementById('telefone');
const listaContatos = document.getElementById('lista-contatos');

const erroNome = document.getElementById('erro-nome');
const erroTelefone = document.getElementById('erro-telefone');


// Validação do nome enquanto o usuário digita
nome.addEventListener('input', function () {

    if (nome.value.trim() !== '') {
        erroNome.style.display = 'none';
    }
});


// Máscara do telefone
telefone.addEventListener('input', function () {

    let valor = telefone.value.replace(/\D/g, '');

    // Limita a 11 números
    valor = valor.substring(0, 11);

    if (valor.length === 1) {

        valor = '(' + valor;

    } else if (valor.length === 2) {

        valor = '(' + valor + ')';

    } else if (valor.length <= 7) {

        valor =
            '(' +
            valor.substring(0, 2) +
            ') ' +
            valor.substring(2);

    } else {

        valor =
            '(' +
            valor.substring(0, 2) +
            ') ' +
            valor.substring(2, 7) +
            '-' +
            valor.substring(7);
    }

    telefone.value = valor;

    // Esconde o erro quando o telefone estiver completo
    if (telefone.value.replace(/\D/g, '').length === 11) {
        erroTelefone.style.display = 'none';
    }
});


// Cadastro do contato
form.addEventListener('submit', function (event) {

    event.preventDefault();

    const nomePreenchido = nome.value.trim() !== '';
    const quantidadeNumeros = telefone.value.replace(/\D/g, '').length;

    const telefoneCompleto = quantidadeNumeros === 11;


    // Validação do nome
    if (!nomePreenchido) {

        erroNome.style.display = 'block';

    } else {

        erroNome.style.display = 'none';
    }


    // Validação do telefone
    if (!telefoneCompleto) {

        erroTelefone.style.display = 'block';

    } else {

        erroTelefone.style.display = 'none';
    }


    // Impede o cadastro se houver algum erro
    if (!nomePreenchido || !telefoneCompleto) {

        if (!nomePreenchido) {
            nome.focus();
        } else {
            telefone.focus();
        }

        return;
    }


    // Cria uma nova linha
    const novaLinha = document.createElement('tr');


    // Cria a coluna do nome
    const colunaNome = document.createElement('td');
    colunaNome.textContent = nome.value.trim();


    // Cria a coluna do telefone
    const colunaTelefone = document.createElement('td');
    colunaTelefone.textContent = telefone.value;


    // Adiciona as colunas à linha
    novaLinha.appendChild(colunaNome);
    novaLinha.appendChild(colunaTelefone);


    // Adiciona a linha à tabela
    listaContatos.appendChild(novaLinha);


    // Limpa o formulário
    form.reset();


    // Esconde as mensagens
    erroNome.style.display = 'none';
    erroTelefone.style.display = 'none';


    // Volta o foco para o nome
    nome.focus();
});