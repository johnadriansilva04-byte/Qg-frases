import { Trophy, Target, TrendingUp, GraduationCap, Shield, Coins, Gamepad2, Users } from "lucide-react";

export const SEO_CONTENT = {
  sobrePracinha: (
    <>
      <section className="mb-6">
        <h3 className="text-lg font-bold text-foreground mb-3">Bem-vindo à Pracinha Online</h3>
        <p className="text-sm leading-relaxed mb-3">
          A Pracinha Online é uma comunidade virtual de jogos clássicos brasileiros, projetada para
          entreter, educar e conectar jogadores de todas as idades. Nossa plataforma combina
          nostalgia dos jogos de rua com tecnologia moderna, oferecendo uma experiência única
          de jogos online.
        </p>
        <p className="text-sm leading-relaxed">
          Aqui você encontra jogos como Futebol de Botão, Trilha, Jogo da Velha, Dado Virtual,
          Forca e Snake, todos desenvolvidos com foco em desenvolver raciocínio lógico,
          estratégia tática e gestão financeira de forma lúdica e divertida.
        </p>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <Trophy className="size-5 text-amber-400" />
          Modo Carreira
        </h3>
        <p className="text-sm leading-relaxed mb-3">
          No Modo Carreira do Futebol de Botão, você assume o comando de um clube de futebol
          e compete nos campeonatos brasileiros. Gerencie seu time, participe do Brasileirão
          nas divisões A, B e C, dispute a Copa do Brasil e conquiste títulos.
        </p>
        <p className="text-sm leading-relaxed">
          Cada vitória vale pontos, cada derrota custa posições na tabela. Suba de divisão,
          conquiste a Libertadores e torne-se uma lenda do futebol virtual.
        </p>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <Users className="size-5 text-emerald-400" />
          Comunidade e Competição
        </h3>
        <p className="text-sm leading-relaxed mb-3">
          Jogue contra a inteligência artificial ou desafie jogadores reais em tempo real.
          Nossos modos online permitem criar mesas, entrar em partidas em andamento e
          participar de campeonatos round-robin com até 8 participantes.
        </p>
        <p className="text-sm leading-relaxed">
          O ranking global mostra os melhores treinadores e jogadores da Pracinha.
          Suba no ranking, ganhe troféus e prove que você é o melhor.
        </p>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <Coins className="size-5 text-amber-400" />
          Economia da Soberania
        </h3>
        <p className="text-sm leading-relaxed mb-3">
          A Soberania é a moeda oficial da Pracinha Online. Você ganha soberania ao vencer
          partidas, conquistar campeonatos e completar desafios. Use sua soberania para
          personalizar seu time, desbloquear novos modos de jogo e mostrar suas conquistas.
        </p>
        <p className="text-sm leading-relaxed">
          O sistema econômico é justo e equilibrado, recompensando habilidade e dedicação.
          Quanto mais você joga, mais soberania acumula.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <GraduationCap className="size-5 text-sky-400" />
          Jogos Educativos
        </h3>
        <p className="text-sm leading-relaxed">
          Nossos jogos são desenvolvidos com propósito educativo. O Futebol de Botão ensina
          tática e estratégia, a Trilha desenvolve raciocínio lógico e planejamento,
          e o sistema de gestão financeira do modo carreira introduz conceitos de economia.
          Brinque aprendendo e evolua seu QI enquanto se diverte.
        </p>
      </section>
    </>
  ),

  comoJogar: (
    <>
      <section className="mb-6">
        <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <Gamepad2 className="size-5 text-primary" />
          Futebol de Botão - Como Jogar
        </h3>
        <p className="text-sm leading-relaxed mb-3">
          O Futebol de Botão é um jogo de estratégia onde você controla os botões do seu time
          usando física realista. Cada botão representa um jogador, e você deve arrastá-lo
          para trás e soltar para chutar a bola em direção ao gol adversário.
        </p>
        <h4 className="font-semibold text-foreground mb-2">Regras Básicas:</h4>
        <ul className="list-disc pl-5 text-sm leading-relaxed space-y-1 mb-3">
          <li>Arraste o botão para trás para definir força e direção do chute</li>
          <li>Solte para chutar a bola em direção ao gol</li>
          <li>O turno alterna entre você e o adversário</li>
          <li>Quem marcar mais gols ao final da partida vence</li>
          <li>No modo carreira, vitórias valem 3 pontos, empates 1 ponto</li>
        </ul>
        <h4 className="font-semibold text-foreground mb-2">Dicas:</h4>
        <ul className="list-disc pl-5 text-sm leading-relaxed space-y-1">
          <li>Observe a posição dos botões adversários antes de chutar</li>
          <li>Use a física a seu favor: ângulos rasantes são difíceis de defender</li>
          <li>No modo carreira, gerencie bem sua energia ao longo da temporada</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <Target className="size-5 text-amber-400" />
          Trilha - Como Jogar
        </h3>
        <p className="text-sm leading-relaxed mb-3">
          A Trilha é um jogo de estratégia clássico onde o objetivo é formar linhas de três
          peças (moinhos) para capturar peças do adversário. O jogo tem três fases:
          colocação, movimento e voo.
        </p>
        <h4 className="font-semibold text-foreground mb-2">Regras Básicas:</h4>
        <ul className="list-disc pl-5 text-sm leading-relaxed space-y-1 mb-3">
          <li>Fase 1: Cada jogador coloca 9 peças no tabuleiro, alternando turnos</li>
          <li>Fase 2: Mova suas peças para posições adjacentes</li>
          <li>Fase 3: Quando restar apenas 3 peças, você pode mover para qualquer posição</li>
          <li>Forme um moinho (linha de 3) para capturar uma peça adversária</li>
          <li>Vence quem deixar o adversário com menos de 3 peças ou sem movimentos</li>
        </ul>
        <h4 className="font-semibold text-foreground mb-2">Dicas:</h4>
        <ul className="list-disc pl-5 text-sm leading-relaxed space-y-1">
          <li>Bloqueie moinhos do adversário antes que ele os forme</li>
          <li>Planeje seus movimentos para criar múltiplas ameaças</li>
          <li>Controle o centro do tabuleiro para mais opções de movimento</li>
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <Shield className="size-5 text-emerald-400" />
          Outros Jogos
        </h3>
        <p className="text-sm leading-relaxed mb-3">
          <strong>Jogo da Velha:</strong> Clássico jogo de estratégia para dois jogadores.
          O objetivo é alinhar três símbolos (X ou O) horizontal, vertical ou diagonalmente.
        </p>
        <p className="text-sm leading-relaxed mb-3">
          <strong>Dado Virtual:</strong> Role o dado da sorte para gerar números aleatórios.
          Útil para jogos de tabuleiro, decisões ou simples diversão.
        </p>
        <p className="text-sm leading-relaxed">
          <strong>Snake:</strong> Relíquia da Nokia. Controle a cobra para comer frutas
          e crescer, evitando bater nas paredes ou em si mesma. Quanto mais comer,
          mais pontos ganha.
        </p>
      </section>
    </>
  ),

  soberania: (
    <>
      <section className="mb-6">
        <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <Coins className="size-5 text-amber-400" />
          O que é Soberania?
        </h3>
        <p className="text-sm leading-relaxed mb-3">
          Soberania é a moeda virtual da Pracinha Online. Ela representa seu progresso,
          conquistas e status na comunidade. Diferente de moedas reais, a soberania é
          ganha através de gameplay e habilidade, nunca por compra.
        </p>
        <p className="text-sm leading-relaxed">
          Cada vitória, cada campeonato conquistado e cada desafio completado adiciona
          soberania ao seu perfil. É uma forma de reconhecer e recompensar jogadores
          dedicados e habilidosos.
        </p>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <TrendingUp className="size-5 text-emerald-400" />
          Como Ganhar Soberania
        </h3>
        <h4 className="font-semibold text-foreground mb-2">Futebol de Botão:</h4>
        <ul className="list-disc pl-5 text-sm leading-relaxed space-y-1 mb-3">
          <li>Vitória em partida amistosa: +10 soberania</li>
          <li>Vitória em campeonato: +15 soberania</li>
          <li>Conquistar título de campeão: +100 a +200 soberania (depende da dificuldade)</li>
          <li>Gols marcados: +1 soberania por gol</li>
        </ul>
        <h4 className="font-semibold text-foreground mb-2">Trilha:</h4>
        <ul className="list-disc pl-5 text-sm leading-relaxed space-y-1 mb-3">
          <li>Vitória: +20 soberania</li>
          <li>Vitória em dificuldade alta: bônus adicional</li>
          <li>Sequência de vitórias: multiplicador de pontos</li>
        </ul>
        <h4 className="font-semibold text-foreground mb-2">Outros Jogos:</h4>
        <ul className="list-disc pl-5 text-sm leading-relaxed space-y-1">
          <li>Completar desafios diários: +5 a +15 soberania</li>
          <li>Participar de campeonatos online: +10 soberania por partida</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <Shield className="size-5 text-sky-400" />
          Usando a Soberania
        </h3>
        <p className="text-sm leading-relaxed mb-3">
          A soberania pode ser usada para personalizar sua experiência na Pracinha:
        </p>
        <ul className="list-disc pl-5 text-sm leading-relaxed space-y-1 mb-3">
          <li>Personalizar cores do seu time no Futebol de Botão</li>
          <li>Nomear os botões do seu time</li>
          <li>Desbloquear modos de jogo especiais</li>
          <li>Comprar itens cosméticos para seu perfil</li>
          <li>Participar de campeonatos exclusivos</li>
        </ul>
        <p className="text-sm leading-relaxed">
          A soberania não pode ser convertida em dinheiro real e não tem valor monetário.
          É puramente uma moeda de jogo para recompensar progresso e habilidade.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <Trophy className="size-5 text-amber-400" />
          Ranking e Liderança
        </h3>
        <p className="text-sm leading-relaxed mb-3">
          O ranking global da Pracinha mostra os jogadores com mais soberania.
          Subir no ranking é prova de habilidade e dedicação.
        </p>
        <p className="text-sm leading-relaxed">
          Os top 100 jogadores são exibidos publicamente. Competir pelo topo
          adiciona uma camada extra de desafio e motivação para os jogadores
          mais competitivos.
        </p>
      </section>
    </>
  ),
};
