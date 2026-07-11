/**
 * Seed inicial de artigos — rode uma vez:
 * node scripts/seed-articles.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Article = require("../src/models/Article");

const ARTICLES = [
  {
    title: "Substitutos do açúcar seguros na gestação",
    slug: "substitutos-acucar-gestacao",
    category: "Alimentação",
    readMinutes: 4,
    excerpt: "Adoçantes permitidos e o que evitar quando você tem diabetes gestacional.",
    body: `Ter diabetes gestacional não significa abrir mão de tudo doce — mas exige escolhas mais conscientes.

**Opções geralmente seguras (com orientação médica):**
- **Stevia** e **sucralose** em quantidades moderadas
- Frutas inteiras (com proteína ou gordura boa para reduzir picos)
- Iogurte natural com canela e morangos

**Evite ou use com cuidado:**
- Mel, açúcar de coco e xarope de agave (ainda elevam glicemia)
- “Doces zero” em excesso — o paladar doce pode aumentar desejos
- Receitas da internet sem contagem de carboidratos

**Dica prática:** anote no GestaGlic como sua glicemia responde após cada experimento. Cada gestante reage de um jeito.

> Este conteúdo é informativo. Sempre confirme com sua obstetra ou nutricionista.`,
    published: true,
    publishedAt: new Date(),
  },
  {
    title: "Como medir a glicemia corretamente",
    slug: "como-medir-glicemia-corretamente",
    category: "Medição",
    readMinutes: 3,
    excerpt: "Passo a passo para evitar erros comuns que distorcem o resultado.",
    body: `Uma medição errada pode parecer que sua glicemia “explodiu” — quando na verdade foi técnica.

**Antes de furar:**
1. Lave e seque bem as mãos (restos de comida alteram o valor!)
2. Use lanceta e tira nova
3. Massageie levemente o dedo se necessário

**Durante:**
- Deixe a gota formar naturalmente — não aperte demais
- Encoste a tira no sangue, não esfregue

**Quando medir:**
- **Jejum:** 8h+ sem comer, ao acordar
- **Pós-refeição:** 1h ou 2h após a primeira mordida (siga o que sua médica pediu)

**Erros comuns:**
- Medir logo após escovar dentes com menta
- Usar álcool gel e furar imediatamente
- Registrar no app horas depois (anote na hora!)

Use o GestaGlic para registrar cada medição com período correto — seu relatório PDF fica muito mais útil na consulta.`,
    published: true,
    publishedAt: new Date(),
  },
  {
    title: "Doce fake para o desejo da tarde",
    slug: "doce-fake-desejo-tarde",
    category: "Receitas",
    readMinutes: 3,
    excerpt: "Mousse de cacau com iogurte — rápido, cremoso e amigo da glicemia.",
    body: `Aquele desejo de doce às 16h é real. Esta receita simples costuma ser bem tolerada:

**Ingredientes (1 porção):**
- 1 pote iogurte natural (170g)
- 1 colher de sopa cacau 100%
- 1 colher de chá essência de baunilha
- Adoçante permitido pela sua nutricionista (a gosto)
- Morangos picados (opcional)

**Modo de preparo:**
1. Misture tudo até ficar cremoso
2. Leve à geladeira por 20 min
3. Coma devagar, saboreando

**Por que funciona?**
Proteína do iogurte + gordura do cacau ajudam a suavizar a resposta glicêmica.

**Importante:** meça 1h ou 2h depois e registre no app. Se sua glicemia subir, ajuste a porção ou o horário com sua equipe de saúde.

> Receita sugestiva — não substitui plano alimentar individualizado.`,
    published: true,
    publishedAt: new Date(),
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URL);
  for (const data of ARTICLES) {
    await Article.findOneAndUpdate({ slug: data.slug }, data, { upsert: true });
    console.log("✓", data.title);
  }
  console.log("Seed concluído.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
