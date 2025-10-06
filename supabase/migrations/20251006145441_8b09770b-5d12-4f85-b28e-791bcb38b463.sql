-- Renumerar IDs dos eventos em cascata
-- Evento 4 -> 1 e Evento 5 -> 2

-- Desabilitar temporariamente os triggers para evitar problemas de foreign key
SET session_replication_role = replica;

-- Primeiro, vamos usar IDs temporários para evitar conflitos
-- Evento 4 -> 9004 (temporário)
-- Evento 5 -> 9005 (temporário)

-- Atualizar events
UPDATE events SET id = 9004 WHERE id = 4;
UPDATE events SET id = 9005 WHERE id = 5;

-- Atualizar tabelas dependentes
UPDATE votes SET id_event = 9004 WHERE id_event = 4;
UPDATE votes SET id_event = 9005 WHERE id_event = 5;

UPDATE candidates SET id_event = 9004 WHERE id_event = 4;
UPDATE candidates SET id_event = 9005 WHERE id_event = 5;

UPDATE categories SET id_event = 9004 WHERE id_event = 4;
UPDATE categories SET id_event = 9005 WHERE id_event = 5;

UPDATE send_ranking SET id_event = 9004 WHERE id_event = 4;
UPDATE send_ranking SET id_event = 9005 WHERE id_event = 5;

-- Agora mudar dos IDs temporários para os finais
-- 9004 -> 1
-- 9005 -> 2

-- Atualizar events
UPDATE events SET id = 1 WHERE id = 9004;
UPDATE events SET id = 2 WHERE id = 9005;

-- Atualizar tabelas dependentes
UPDATE votes SET id_event = 1 WHERE id_event = 9004;
UPDATE votes SET id_event = 2 WHERE id_event = 9005;

UPDATE candidates SET id_event = 1 WHERE id_event = 9004;
UPDATE candidates SET id_event = 2 WHERE id_event = 9005;

UPDATE categories SET id_event = 1 WHERE id_event = 9004;
UPDATE categories SET id_event = 2 WHERE id_event = 9005;

UPDATE send_ranking SET id_event = 1 WHERE id_event = 9004;
UPDATE send_ranking SET id_event = 2 WHERE id_event = 9005;

-- Reabilitar os triggers
SET session_replication_role = DEFAULT;

-- Resetar a sequência para o próximo ID começar em 3
SELECT setval('events_id_seq', 2, true);