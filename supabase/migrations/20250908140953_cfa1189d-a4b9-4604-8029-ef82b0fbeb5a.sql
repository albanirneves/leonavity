-- Tornar os emails especificados administradores
-- Primeiro, verificar se existem usuários com esses emails e torná-los admin
DO $$
BEGIN
  -- Adicionar role admin para albanirneves@gmail.com se existir
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'albanirneves@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    SELECT id, 'admin'::app_role
    FROM auth.users 
    WHERE email = 'albanirneves@gmail.com'
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- Adicionar role admin para mauriciocardosovieira@gmail.com se existir
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'mauriciocardosovieira@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    SELECT id, 'admin'::app_role
    FROM auth.users 
    WHERE email = 'mauriciocardosovieira@gmail.com'
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- Adicionar coluna id_account nas tabelas para permitir segregação por conta
-- Isso permitirá que usuários comuns vejam apenas dados da sua conta

-- Adicionar id_account à tabela user_roles para associar usuários a contas específicas
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS id_account bigint REFERENCES public.accounts(id);

-- Criar index para melhor performance nas consultas por conta
CREATE INDEX IF NOT EXISTS idx_user_roles_account ON public.user_roles(id_account);

-- Atualizar RLS policies para eventos - usuários comuns só veem eventos da sua conta
DROP POLICY IF EXISTS "Authenticated users can view active events" ON public.events;

CREATE POLICY "Authenticated users can view events based on role"
ON public.events
FOR SELECT
TO authenticated
USING (
  -- Admins podem ver todos os eventos
  has_role(auth.uid(), 'admin'::app_role) OR
  -- Usuários comuns podem ver apenas eventos ativos da sua conta
  (
    active = true AND
    id_account IN (
      SELECT ur.id_account 
      FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.id_account IS NOT NULL
    )
  )
);

-- Atualizar RLS policies para candidatas - usuários comuns só veem candidatas dos eventos da sua conta
DROP POLICY IF EXISTS "Users can view candidates for active events" ON public.candidates;

CREATE POLICY "Users can view candidates based on role"
ON public.candidates
FOR SELECT
TO authenticated
USING (
  -- Admins podem ver todas as candidatas
  has_role(auth.uid(), 'admin'::app_role) OR
  -- Usuários comuns podem ver apenas candidatas de eventos ativos da sua conta
  (
    EXISTS (
      SELECT 1 
      FROM public.events e
      JOIN public.user_roles ur ON ur.id_account = e.id_account
      WHERE e.id = candidates.id_event 
      AND e.active = true
      AND ur.user_id = auth.uid()
      AND ur.id_account IS NOT NULL
    )
  )
);

-- Atualizar RLS policies para categorias - usuários comuns só veem categorias dos eventos da sua conta
DROP POLICY IF EXISTS "Users can view categories for active events" ON public.categories;

CREATE POLICY "Users can view categories based on role"
ON public.categories
FOR SELECT
TO authenticated
USING (
  -- Admins podem ver todas as categorias
  has_role(auth.uid(), 'admin'::app_role) OR
  -- Usuários comuns podem ver apenas categorias de eventos ativos da sua conta
  (
    EXISTS (
      SELECT 1 
      FROM public.events e
      JOIN public.user_roles ur ON ur.id_account = e.id_account
      WHERE e.id = categories.id_event 
      AND e.active = true
      AND ur.user_id = auth.uid()
      AND ur.id_account IS NOT NULL
    )
  )
);

-- Atualizar RLS policies para votos - usuários comuns só veem votos dos eventos da sua conta
DROP POLICY IF EXISTS "Authenticated users can view votes" ON public.votes;

CREATE POLICY "Users can view votes based on role"
ON public.votes
FOR SELECT
TO authenticated
USING (
  -- Admins podem ver todos os votos
  has_role(auth.uid(), 'admin'::app_role) OR
  -- Usuários comuns podem ver apenas votos de eventos da sua conta
  (
    EXISTS (
      SELECT 1 
      FROM public.events e
      JOIN public.user_roles ur ON ur.id_account = e.id_account
      WHERE e.id = votes.id_event
      AND ur.user_id = auth.uid()
      AND ur.id_account IS NOT NULL
    )
  )
);

-- Permitir que usuários comuns insiram votos apenas em eventos da sua conta
DROP POLICY IF EXISTS "Authenticated users can insert votes" ON public.votes;

CREATE POLICY "Users can insert votes based on role"
ON public.votes
FOR INSERT
TO authenticated
WITH CHECK (
  -- Admins podem inserir votos em qualquer evento
  has_role(auth.uid(), 'admin'::app_role) OR
  -- Usuários comuns podem inserir votos apenas em eventos da sua conta
  (
    EXISTS (
      SELECT 1 
      FROM public.events e
      JOIN public.user_roles ur ON ur.id_account = e.id_account
      WHERE e.id = votes.id_event
      AND ur.user_id = auth.uid()
      AND ur.id_account IS NOT NULL
    )
  )
);