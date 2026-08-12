-- Adicionar colunas de estatísticas completas na tabela botao_usuarios
-- Isso permite rastrear campeonatos, gols, vitórias, derrotas e empates separadamente

-- Adicionar coluna de campeonatos ganhos
ALTER TABLE botao_usuarios 
ADD COLUMN IF NOT EXISTS campeonatos_ganhos INTEGER DEFAULT 0;

-- Adicionar coluna de gols feitos
ALTER TABLE botao_usuarios 
ADD COLUMN IF NOT EXISTS gols_feitos INTEGER DEFAULT 0;

-- Adicionar coluna de gols sofridos
ALTER TABLE botao_usuarios 
ADD COLUMN IF NOT EXISTS gols_sofridos INTEGER DEFAULT 0;

-- Adicionar coluna de vitórias
ALTER TABLE botao_usuarios 
ADD COLUMN IF NOT EXISTS vitorias INTEGER DEFAULT 0;

-- Adicionar coluna de derrotas
ALTER TABLE botao_usuarios 
ADD COLUMN IF NOT EXISTS derrotas INTEGER DEFAULT 0;

-- Adicionar coluna de empates
ALTER TABLE botao_usuarios 
ADD COLUMN IF NOT EXISTS empates INTEGER DEFAULT 0;

-- Criar índices para melhorar performance em consultas frequentes
CREATE INDEX IF NOT EXISTS idx_botao_usuarios_pontos_soberania ON botao_usuarios(pontos_soberania DESC);
CREATE INDEX IF NOT EXISTS idx_botao_usuarios_campeonatos ON botao_usuarios(campeonatos_ganhos DESC);
CREATE INDEX IF NOT EXISTS idx_botao_usuarios_vitorias ON botao_usuarios(vitorias DESC);

-- Adicionar comentários para documentação
COMMENT ON COLUMN botao_usuarios.campeonatos_ganhos IS 'Número de campeonatos/torneios ganhos pelo jogador';
COMMENT ON COLUMN botao_usuarios.gols_feitos IS 'Total de gols feitos em todas as partidas';
COMMENT ON COLUMN botao_usuarios.gols_sofridos IS 'Total de gols sofridos em todas as partidas';
COMMENT ON COLUMN botao_usuarios.vitorias IS 'Total de vitórias em todas as partidas';
COMMENT ON COLUMN botao_usuarios.derrotas IS 'Total de derrotas em todas as partidas';
COMMENT ON COLUMN botao_usuarios.empates IS 'Total de empates em todas as partidas';