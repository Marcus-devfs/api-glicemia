/**
 * Seed da comunidade — posts e comentários iniciais:
 * node scripts/seed-forum.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../src/models/User");
const ForumPost = require("../src/models/ForumPost");
const ForumComment = require("../src/models/ForumComment");

const SEED_MARKER = "seed-forum-v1";

const SEED_USERS = [
  { key: "camila", name: "Camila R.", email: "seed.camila@gestaglic.local" },
  { key: "juliana", name: "Juliana M.", email: "seed.juliana@gestaglic.local" },
  { key: "fernanda", name: "Fernanda S.", email: "seed.fernanda@gestaglic.local" },
  { key: "patricia", name: "Patrícia L.", email: "seed.patricia@gestaglic.local" },
  { key: "amanda", name: "Amanda T.", email: "seed.amanda@gestaglic.local" },
];

const POSTS = [
  {
    slug: "lanche-tarde-sem-pico",
    author: "camila",
    category: "Alimentação",
    title: "Lanche da tarde que não estoura a glicemia",
    body: `Meninas, testei iogurte natural + morango + canela no meio da tarde e minha glicemia 1h depois ficou 112. Antes com biscoito subia fácil pra 150+.

Alguém tem outras ideias rápidas pra quando bate aquele desejo de doce?`,
    daysAgo: 1,
    likesFrom: ["juliana", "fernanda", "amanda"],
    comments: [
      {
        author: "juliana",
        body: "Amendoim com maçã funciona bem comigo! Só cuidado com a porção do amendoim 😅",
        hoursAfter: 2,
      },
      {
        author: "fernanda",
        body: "Mousse de cacau com iogurte — tem receita nas dicas do app. Salvou minha tarde!",
        hoursAfter: 5,
      },
    ],
  },
  {
    slug: "medo-na-primeira-consulta",
    author: "juliana",
    category: "Ansiedade",
    title: "Medo de errar nas medições na 1ª consulta pós diagnóstico",
    body: `Recebi o diagnóstico semana passada e fico com aquela sensação de "será que estou medindo certo?". Levo o PDF do GestaGlic na terça — alguém já levou? A médica costuma gostar?`,
    daysAgo: 2,
    likesFrom: ["camila", "patricia", "amanda", "fernanda"],
    comments: [
      {
        author: "patricia",
        body: "Levei na última consulta e minha obstetra elogiou! Disse que ficou muito mais claro que caderno.",
        hoursAfter: 3,
      },
      {
        author: "amanda",
        body: "Eu também tinha medo. O app ajuda porque você vê se está dentro da meta antes da consulta 💗",
        hoursAfter: 8,
      },
    ],
  },
  {
    slug: "7-dias-dentro-meta",
    author: "fernanda",
    category: "Vitórias",
    title: "7 dias seguidos dentro da meta 🎉",
    body: `Não é sobre perfeição — ontem tive um 134 pós-jantar — mas venho registrando tudo e hoje completei 7 dias com a maioria das medições ok.

Compartilhando porque essa semana foi difícil emocionalmente e ver a evolução no gráfico me deu força.`,
    daysAgo: 0,
    likesFrom: ["camila", "juliana", "patricia", "amanda"],
    comments: [
      {
        author: "camila",
        body: "Parabéns!! Isso é conquista demais 👏",
        hoursAfter: 1,
      },
    ],
  },
  {
    slug: "enjoo-jejum",
    author: "patricia",
    category: "Sintomas",
    title: "Enjoo no jejum — como vocês fazem?",
    body: `Estou no 2º trimestre e medir em jejum está difícil porque acordo enjoada. A nutri disse pra não pular, mas às vezes demoro 30 min pra conseguir comer algo leve.

Vocês medem antes ou depois de um chá/biscoito salgado?`,
    daysAgo: 3,
    likesFrom: ["juliana", "amanda"],
    comments: [
      {
        author: "juliana",
        body: "Perguntei minha obstetra e ela disse: jejum é 8h sem comer. Chá sem açúcar ok. Cada caso é um caso — vale confirmar com a sua!",
        hoursAfter: 4,
      },
    ],
  },
  {
    slug: "substituir-arroz",
    author: "amanda",
    category: "Alimentação",
    title: "O que vocês usam no lugar do arroz branco?",
    body: `Arroz branco sempre estoura meu pós-almoço. Testei quinoa (não curti) e purê de couve-flor (gostei!). Quais combinações funcionam pra vocês no dia a dia prático?`,
    daysAgo: 4,
    likesFrom: ["camila", "fernanda"],
    comments: [
      {
        author: "camila",
        body: "Batata-doce e salada grande antes do arroz — quando como salada primeiro como menos carboidrato.",
        hoursAfter: 6,
      },
      {
        author: "fernanda",
        body: "Arroz integral em porção menor + feijão + frango. Anoto tudo no app pra ver o que funciona.",
        hoursAfter: 10,
      },
    ],
  },
  {
    slug: "lembrete-salvou",
    author: "camila",
    category: "Vitórias",
    title: "Lembrete do app salvou meu pós-café hoje",
    body: `Esqueci completamente de medir após o café — chegou a notificação e consegui registrar na hora. Parece detalhe mas minha obstetra pediu horários certinhos.

Quem ainda não ativou, vale testar!`,
    daysAgo: 1,
    likesFrom: ["patricia", "juliana"],
    comments: [],
  },
  {
    slug: "ansiedade-numero",
    author: "juliana",
    category: "Ansiedade",
    title: "Como lidar com a ansiedade quando o número vem alto?",
    body: `Hoje pós-almoço veio 156 e me bateu um culpa terrível. Sei que um número não define tudo, mas fico remoendo...

Como vocês se acolhem depois de um valor fora da meta?`,
    daysAgo: 5,
    likesFrom: ["fernanda", "amanda", "patricia"],
    comments: [
      {
        author: "fernanda",
        body: "Respiro, registro o que comi, e lembro que amanhã é outro dia. Você está fazendo o melhor que pode 💗",
        hoursAfter: 2,
      },
      {
        author: "amanda",
        body: "Conversar aqui já ajuda. Não estamos sozinhas!",
        hoursAfter: 5,
      },
    ],
  },
  {
    slug: "pdf-consulta-dica",
    author: "patricia",
    category: "Vitórias",
    title: "Dica: gere o PDF 1 dia antes da consulta",
    body: `Comecei a gerar o relatório na véspera e reviso se falta alguma medição. Chego na consulta bem mais tranquila.

O PDF mostra média de jejum, pós-refeição e tabela por dia — minha médica disse que facilita muito.`,
    daysAgo: 6,
    likesFrom: ["camila", "juliana", "fernanda", "amanda"],
    comments: [
      {
        author: "juliana",
        body: "Boa! Vou fazer isso na consulta de terça.",
        hoursAfter: 12,
      },
    ],
  },
];

function daysAgoDate(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(10, 0, 0, 0);
  return d;
}

function hoursAfter(base, hours) {
  const d = new Date(base);
  d.setHours(d.getHours() + hours);
  return d;
}

async function ensureSeedUsers() {
  const map = {};
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash("seed-gestaglic", salt);

  for (const u of SEED_USERS) {
    let user = await User.findOne({ email: u.email });
    if (!user) {
      user = await User.create({
        name: u.name,
        email: u.email,
        password: hash,
      });
      console.log("  + usuária seed:", u.name);
    }
    map[u.key] = user._id;
  }
  return map;
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URL);
  console.log("Conectado ao MongoDB");

  const users = await ensureSeedUsers();

  for (const data of POSTS) {
    const authorId = users[data.author];
    const createdAt = daysAgoDate(data.daysAgo);

    const likeIds = (data.likesFrom || [])
      .map((k) => users[k])
      .filter(Boolean);

    let post = await ForumPost.findOne({
      title: data.title,
      userId: authorId,
    });

    if (!post) {
      post = await ForumPost.create({
        userId: authorId,
        title: data.title,
        body: data.body,
        category: data.category,
        likes: likeIds,
        likesCount: likeIds.length,
        commentsCount: 0,
        hidden: false,
        createdAt,
        updatedAt: createdAt,
      });
      console.log("✓ post:", data.title);
    } else {
      post.likes = likeIds;
      post.likesCount = likeIds.length;
      post.body = data.body;
      post.hidden = false;
      await post.save();
      console.log("↻ post atualizado:", data.title);
    }

    for (const c of data.comments || []) {
      const commentAuthor = users[c.author];
      const exists = await ForumComment.findOne({
        postId: post._id,
        userId: commentAuthor,
        body: c.body,
      });

      if (!exists) {
        const commentAt = hoursAfter(createdAt, c.hoursAfter);
        await ForumComment.create({
          postId: post._id,
          userId: commentAuthor,
          body: c.body,
          createdAt: commentAt,
          updatedAt: commentAt,
        });
      }
    }

    const commentCount = await ForumComment.countDocuments({
      postId: post._id,
      hidden: false,
    });
    post.commentsCount = commentCount;
    await post.save();
  }

  const total = await ForumPost.countDocuments({ hidden: false });
  console.log(`\nSeed concluído — ${total} posts visíveis na comunidade (${SEED_MARKER}).`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
