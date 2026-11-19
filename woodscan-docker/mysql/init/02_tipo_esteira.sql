-- =====================================================================
-- WoodScan - tipo de maquina de cada esteira (usado no polimorfismo do Python)
-- Rode UMA VEZ no MySQL Workbench.
-- =====================================================================
USE woodscan;

-- serra = serra circular | guilhotina = guilhotina | laminadora = torno laminador
ALTER TABLE esteiras
  ADD COLUMN tipo VARCHAR(20) NOT NULL DEFAULT 'serra';

-- tipos das 5 esteiras que ja existem (pode mudar a vontade)
UPDATE esteiras SET tipo = 'serra'      WHERE codigo IN ('esteira1', 'esteira2');
UPDATE esteiras SET tipo = 'guilhotina' WHERE codigo IN ('esteira3', 'esteira4');
UPDATE esteiras SET tipo = 'laminadora' WHERE codigo = 'esteira5';

SELECT codigo, nome, tipo, em_manutencao FROM esteiras ORDER BY codigo;
