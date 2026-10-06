const form = document.querySelector(".find__form");

form.addEventListener("submit", function (event) {

    event.preventDefault();

    const input = document.querySelector("#location");

    if (input.value.trim() !== "") {

        input.value = "";
        input.placeholder = "NÓS ENCONTRAMOS VOCÊ.";

    }

});

const copyButton = document.querySelector(".footer__copy");

copyButton.addEventListener("click", function () {

    navigator.clipboard.writeText("fightclub666.onion");

    copyButton.textContent = "✓";

    setTimeout(function () {
        copyButton.textContent = "⧉";
    }, 1500);

});
