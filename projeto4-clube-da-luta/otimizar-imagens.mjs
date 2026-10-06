import imagemin from "imagemin";
import imageminWebp from "imagemin-webp";

// Fotos: converte os PNGs originais em WebP (bem mais leve) direto na pasta img/
await imagemin(
    [
        "img-original/*.png",
        "!img-original/splash.png",
        "!img-original/x-mark.png",
        "!img-original/tape.png",
        "!img-original/note.png"
    ],
    {
        destination: "img",
        plugins: [
            imageminWebp({ quality: 75 })
        ]
    }
);

// Decorações: redimensiona para 2x o maior tamanho em que aparecem na tela
// (nítido em telas retina, sem carregar pixels que nunca são exibidos)
const decoracoes = [
    { arquivo: "splash.png", largura: 660, altura: 440 },  // aparece com até 330px
    { arquivo: "x-mark.png", largura: 300, altura: 200 },  // aparece com até 150px
    { arquivo: "tape.png", largura: 420, altura: 140 },    // aparece com até 210px
    { arquivo: "note.png", largura: 440, altura: 293 }     // aparece com até 220px
];

for (const { arquivo, largura, altura } of decoracoes) {
    await imagemin([`img-original/${arquivo}`], {
        destination: "img",
        plugins: [
            imageminWebp({
                quality: 80,
                resize: { width: largura, height: altura }
            })
        ]
    });
}

console.log("Imagens otimizadas com sucesso.");
