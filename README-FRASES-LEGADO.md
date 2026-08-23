# Phrase Muse

A nossa ideia é criar um mural que gera frases. Tudo vai tá pré-constituído já dentro do código, milhões de frases, entendeu? Você já vai gerar e vai deixar um espaço pra mim adicionar mais milhões de frases, sempre que for preciso, entendeu? Um local lá onde já vai tá de cada categoria criada, entendeu? Vai ser um gerador de frases, entendeu? Ééé de, entendeu? Essa é a nossa lógica, nós vamo criar e vai ter a modalidade ali dentro. Eu vou te passar aqui e você também já pode finalizar. E não esqueça da parte da monetização, tem que deixar tudo certinho. Finalize 100%, não me peça nada de credencial nem nada, entendeu? É, eu quero 100% o código dele, entendeu? Pra rodar dentro ali, só pra ser um gerador de frases, entendeu? E a gente vai lucrar com essa ideia. E também coloca uns, uns, um, tipo, um lugar de biblioteca, aonde a gente vai colocar links de afiliado de livro, entendeu? E coloca um script aonde ele lê diretamente do Supabase, que eu vou usar Supabase, aí quando cê coloca lá o link, ele já lê e já cria a página, entendeu, como que eu quero? Só isso que vai ter de diferente. Vai ser um lugarzinho separado, escondido ali. Não escondido, vai tá separado, né? É, tipo: "Você gosta de ler? Clique na nossa biblioteca e adquira um livro", entendeu? Tipo, um anúncio assim, mas em uma aba separada, entendeu? Tipo, lá jun-- tem-- cê tá entendendo, né? Tipo, como se fosse um a-um anúncio. Coloca lá como vai ter os anúncios do, do Google, tem que ter um, um lugar de anúncio só meu, pessoal, entendeu? E é isso que eu quero. Daí também deixa os nu-- os anúncio do Google. E aí foca 100% nas ordens que eu mandei.<!DOCTYPE html>

<html lang="pt-BR">

<head>

  <meta charset="UTF-8">

  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>pracinha.online | Frases, Legendas e Status</title>

  <meta name="description" content="Encontre e copie as melhores frases para Reels, fotos, versículos bíblicos, cantadas e motivação no pracinha.online!">

  <!-- Tailwind CSS via CDN -->

  <script src="https://cdn.tailwindcss.com"></script>

  <style>

    /* Estilização da barra de rolagem */

    ::-webkit-scrollbar { width: 6px; }

    ::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); }

    ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 10px; }

  </style>

</head>

<body class="min-h-screen bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-700 text-slate-100 flex flex-col justify-between items-center p-3 md:p-6 antialiased selection:bg-pink-500 selection:text-white">

  <!-- TOP BANNER AD (Espaço Reservado para Anúncio de Topo) -->

  <div class="w-full max-w-3xl bg-black/40 backdrop-blur-md border border-white/10 text-slate-300 text-xs py-2 px-4 text-center rounded-xl mb-4 shadow-lg flex items-center justify-center min-h-[60px]">

    <span class="opacity-60">[ Espaço Reservado: Banner Topo / Google AdSense ]</span>

  </div>

  <!-- CONTAINER PRINCIPAL (Aba Preta no Meio) -->

  <main class="w-full max-w-3xl bg-slate-950/85 backdrop-blur-xl border border-white/10 rounded-3xl p-5 md:p-8 shadow-2xl my-auto">

    

    <!-- Cabeçalho -->

    <header class="text-center mb-6">

      <h1 class="text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-indigo-300">

        pracinha.online

      </h1>

      <p class="text-slate-400 text-sm md:text-base mt-2 font-medium">

        Encontre a legenda, frase ou mensagem perfeita em um clique

      </p>

    </header>

    <!-- BARRA DE PESQUISA (Digite o que precisa) -->

    <div class="relative mb-6">

      <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-pink-400">

        🔍

      </div>

      <input 

        type="text" 

        id="search-input" 

        oninput="handleSearch()"

        placeholder="Digite o que precisa (ex: Deus, praia, motivação, amor)..." 

        class="w-full pl-11 pr-4 py-3.5 bg-slate-900/90 border border-white/10 rounded-2xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition shadow-inner text-sm md:text-base"

      >

    </div>

    <!-- BOTÕES DE CATEGORIAS RÁPIDAS -->

    <div class="flex flex-wrap justify-center gap-2 mb-6" id="category-buttons">

      <button onclick="setCategory('biblia', this)" class="cat-btn active bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold py-2 px-4 rounded-full text-xs md:text-sm shadow-md hover:opacity-95 transition">📖 Bíblia</button>

      <button onclick="setCategory('legendas', this)" class="cat-btn bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-white/5 font-semibold py-2 px-4 rounded-full text-xs md:text-sm transition">📸 Legendas / Reels</button>

      <button onclick="setCategory('cantadas', this)" class="cat-btn bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-white/5 font-semibold py-2 px-4 rounded-full text-xs md:text-sm transition">😏 Cantadas</button>

      <button onclick="setCategory('motivacao', this)" class="cat-btn bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-white/5 font-semibold py-2 px-4 rounded-full text-xs md:text-sm transition">🚀 Motivação</button>

      <button onclick="setCategory('indiretas', this)" class="cat-btn bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-white/5 font-semibold py-2 px-4 rounded-full text-xs md:text-sm transition">🔥 Indiretas</button>

    </div>

    <!-- CAIXA DA FRASE EXIBIDA -->

    <div class="min-h-[150px] flex flex-col justify-center items-center p-6 bg-slate-900/60 rounded-2xl border border-white/5 mb-6 text-center shadow-inner relative group">

      <p id="phrase-display" class="text-lg md:text-2xl font-medium text-slate-100 leading-relaxed max-w-xl">

        Carregando frase...

      </p>

    </div>

    <!-- BOTÕES DE AÇÃO -->

    <div class="flex flex-col sm:flex-row gap-3 justify-center mb-6">

      <button onclick="getRandomPhrase()" class="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold py-3.5 px-6 rounded-xl transition shadow-lg shadow-pink-500/2 font-semibold text-sm flex items-center justify-center gap-2">

        🎲 Sortear Outra

      </button>

      <button onclick="copyPhrase()" class="bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 font-semibold py-3.5 px-6 rounded-xl transition text-sm flex items-center justify-center gap-2">

        📋 Copiar Frase

      </button>

    </div>

    

    <!-- NOTIFICAÇÃO DE COPIADO -->

    <div class="h-6 text-center">

      <span id="toast" class="text-emerald-400 font-medium text-xs md:text-sm opacity-0 transition-opacity duration-300">

        ✓ Frase copiada para a área de transferência!

      </span>

    </div>

    <!-- ESPAÇO DEDICADO PARA ANÚNCIO EM VÍDEO (15s a 30s / Outstream Video Ad) -->

    <div class="mt-4 pt-4 border-t border-white/5">

      <div class="w-full bg-slate-900/90 border border-pink-500/20 rounded-2xl p-3 text-center min-h-[180px] flex flex-col items-center justify-center relative overflow-hidden">

        <span class="text-xs font-semibold text-pink-400/80 mb-1">Destaque do Sponsor / Vídeo</span>

        <span class="text-slate-500 text-xs">[ Bloco preparado para Vídeos de Anúncio 15s-30s / Google VAST ]</span>

      </div>

    </div>

  </main>

  <!-- BOTTOM BANNER AD (Espaço Reservado para Anúncio de Rodapé) -->

  <div class="w-full max-w-3xl bg-black/40 backdrop-blur-md border border-white/10 text-slate-300 text-xs py-2 px-4 text-center rounded-xl mt-4 shadow-lg flex items-center justify-center min-h-[60px]">

    <span class="opacity-60">[ Espaço Reservado: Banner Rodapé / Google AdSense ]</span>

  </div>

  <!-- RODAPÉ -->

  <footer class="text-center text-slate-300/60 text-xs my-4">

    <p>© 2026 pracinha.online — Seu mural de frases rápidas.</p>

  </footer>

  <!-- SCRIPT DE LÓGICA E BANCO DE DADOS -->

  <script>

    // Banco de Frases Categorizado

    const database = {

      biblia: [

        "O Senhor é o meu pastor; nada me faltará. — Salmos 23:1",

        "Tudo posso naquele que me fortalece. — Filipenses 4:13",

        "Se Deus é por nós, quem será contra nós? — Romanos 8:31",

        "O amor é paciente, o amor é bondoso. — 1 Coríntios 13:4",

        "Lâmpada para os meus pés é tua palavra e luz, para o meu caminho. — Salmos 119:105"

      ],

      legendas: [

        "Vivendo momentos, criando memórias. ✨",

        "Menos rotina, mais liberdade e paz no coração. 🌿",

        "Silenciando o barulho de fora para ouvir o de dentro. 🤍",

        "Colecionando momentos e fotos na praia. 🌊",

        "A vida é curta demais para não postar essa foto."

      ],

      cantadas: [

        "Seu nome é Wi-Fi? Porque estou sentindo uma conexão muito forte.",

        "Você tem um mapa? Me perdi no brilho dos seus olhos.",

        "Não sou fotógrafo, mas consigo imaginar a gente junto perfeitamente.",

        "Se beleza fosse tempo, você seria a eternidade."

      ],

      motivacao: [

        "O segredo para progredir é ter a coragem de começar.",

        "Pequenos passos todos os dias geram grandes resultados amanhã.",

        "Sua única competição é quem você foi no dia de ontem.",

        "Foco no processo que o resultado vem com certeza!"

      ],

      indiretas: [

        "Tem gente que é tipo nuvem: quando some, o dia fica lindo.",

        "Quem muito fala, pouco faz. Ações valem mais que palavras.",

        "Atura ou surta, que a minha paz ninguém tira."

      ]

    };

    let currentCategory = 'biblia';

    function setCategory(cat, element) {

      currentCategory = cat;

      document.getElementById('search-input').value = ''; // Limpa a busca ao trocar de categoria

      

      // Estilização dos botões

      const buttons = document.querySelectorAll('#category-buttons button');

      buttons.forEach(btn => {

        btn.className = 'cat-btn bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-white/5 font-semibold py-2 px-4 rounded-full text-xs md:text-sm transition';

      });

      element.className = 'cat-btn active bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold py-2 px-4 rounded-full text-xs md:text-sm shadow-md hover:opacity-95 transition';

      getRandomPhrase();

    }

    function getRandomPhrase() {

      const phrases = database[currentCategory];

      const randomIndex = Math.floor(Math.random() * phrases.length);

      document.getElementById('phrase-display').innerText = phrases[randomIndex];

    }

    function handleSearch() {

      const query = document.getElementById('search-input').value.toLowerCase().trim();

      if (!query) {

        getRandomPhrase();

        return;

      }

      // Junta todas as frases para pesquisar no banco geral

      let allPhrases = [];

      Object.values(database).forEach(list => allPhrases = allPhrases.concat(list));

      const matches = allPhrases.filter(p => p.toLowerCase().includes(query));

      if (matches.length > 0) {

        const randomIndex = Math.floor(Math.random() * matches.length);

        document.getElementById('phrase-display').innerText = matches[randomIndex];

      } else {

        document.getElementById('phrase-display').innerText = 'Nenhuma frase encontrada para essa busca. Tente palavras como "Deus", "foco" ou "amor".';

      }

    }

    function copyPhrase() {

      const text = document.getElementById('phrase-display').innerText;

      navigator.clipboard.writeText(text).then(() => {

        const toast = document.getElementById('toast');

        toast.style.opacity = '1';

        setTimeout(() => toast.style.opacity = '0', 2500);

      });

    }

    // Inicializa com uma frase aleatória

    getRandomPhrase();

  </script>

</body>

</html>

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6f9c0015-4db0-4c1e-bf4f-ea3fb7f2dab4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
