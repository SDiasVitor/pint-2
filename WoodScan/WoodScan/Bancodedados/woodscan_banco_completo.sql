-- =====================================================================
-- WoodScan - BANCO COMPLETO (versao atual, tudo em um arquivo so)
--
-- Junta tudo que foi feito ate agora:
--   * banco woodscan
--   * tabela usuarios  (perfis: operador e manutencao, senha em SHA-256)
--   * tabela esteiras  (cadastro + parada para manutencao)
--   * as 5 esteiras
--   * usuario operador de teste e usuario da manutencao
--
-- Contagem, temperatura, umidade, resumo de turnos, manutencoes e paradas
-- NAO ficam aqui: ficam nos arquivos CSV em C:\woodscan (regra do professor).
--
-- Como rodar no MySQL Workbench: abra este arquivo e clique no raio (Execute).
-- Pode rodar de novo sem medo: nada e duplicado.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS woodscan
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE woodscan;

-- ---------------------------------------------------------------------
-- usuarios: login do sistema
--   operador   = usa o painel (ver producao, parar esteira)
--   manutencao = entra na area Manutencao (registrar e liberar esteiras)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nome        VARCHAR(100) NOT NULL,
  login       VARCHAR(50)  NOT NULL UNIQUE,
  senha_hash  VARCHAR(255) NOT NULL,
  perfil      ENUM('operador', 'manutencao') NOT NULL DEFAULT 'operador',
  criado_em   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- esteiras: cadastro das maquinas (poucas linhas, muda pouco)
--   em_manutencao = TRUE quando alguem aperta "Parar para manutencao"
--   parada_em     = quando a parada comecou (vazio enquanto produz)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS esteiras (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  codigo         VARCHAR(20) NOT NULL UNIQUE,   -- ex: 'esteira1' (usado na API e no CSV)
  nome           VARCHAR(50) NOT NULL,          -- ex: 'Esteira 1'
  ativa          BOOLEAN     NOT NULL DEFAULT TRUE,
  em_manutencao  BOOLEAN     NOT NULL DEFAULT FALSE,
  parada_em      DATETIME    NULL,
  criado_em      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Dados iniciais
-- ---------------------------------------------------------------------
INSERT IGNORE INTO esteiras (codigo, nome) VALUES
  ('esteira1', 'Esteira 1'),
  ('esteira2', 'Esteira 2'),
  ('esteira3', 'Esteira 3'),
  ('esteira4', 'Esteira 4'),
  ('esteira5', 'Esteira 5');

-- Operador de teste (o mesmo que existia antes): login teste1 / senha 123456
INSERT IGNORE INTO usuarios (nome, login, senha_hash, perfil)
VALUES ('Teste', 'teste1', SHA2('123456', 256), 'operador');

-- Manutencao: login manutencao1 / senha 1234
-- (troque a senha depois, se quiser:
--  UPDATE usuarios SET senha_hash = SHA2('NOVA_SENHA', 256) WHERE login = 'manutencao1';)
INSERT IGNORE INTO usuarios (nome, login, senha_hash, perfil)
VALUES ('Vitor', 'manutencao1', SHA2('1234', 256), 'manutencao');

-- ---------------------------------------------------------------------
-- Conferencia
-- ---------------------------------------------------------------------
SELECT id, nome, login, perfil, criado_em FROM usuarios ORDER BY perfil, nome;
SELECT codigo, nome, em_manutencao, parada_em FROM esteiras ORDER BY codigo;
