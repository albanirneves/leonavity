-- Criar índices para otimizar queries do Dashboard
-- Estes índices vão acelerar significativamente as consultas mais comuns

-- Índice composto para votos por evento e status de pagamento
CREATE INDEX IF NOT EXISTS idx_votes_event_payment_status 
ON votes(id_event, payment_status);

-- Índice composto para votos por evento, categoria e candidato
CREATE INDEX IF NOT EXISTS idx_votes_event_category_candidate 
ON votes(id_event, id_category, id_candidate) 
WHERE payment_status = 'approved';

-- Índice para filtrar votos por data de criação
CREATE INDEX IF NOT EXISTS idx_votes_created_at 
ON votes(created_at DESC);

-- Índice composto para votos por evento e data (para gráficos)
CREATE INDEX IF NOT EXISTS idx_votes_event_created_at 
ON votes(id_event, created_at DESC) 
WHERE payment_status = 'approved';

-- Índice para candidatos por evento e categoria
CREATE INDEX IF NOT EXISTS idx_candidates_event_category 
ON candidates(id_event, id_category);

-- Índice para categorias por evento
CREATE INDEX IF NOT EXISTS idx_categories_event 
ON categories(id_event, id_category);