-- ============================================================================
-- LASTRO · MIGRAÇÃO ÚNICA DO BANCO DE DADOS (SUPABASE / POSTGRESQL)
-- ============================================================================
-- Compatível com o schema atual de `auth.*` e `public.*`.
-- Este script é idempotente: pode ser executado mais de uma vez com segurança
-- no SQL Editor do Supabase.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. FUNÇÃO AUXILIAR DE TIMESTAMP
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_atualizado_em()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. PERFIS DE USUÁRIO E CONTROLE DE PAPÉIS NO BANCO (ADMIN / COMPRADOR)
-- ----------------------------------------------------------------------------
-- Todos os cadastros feitos pelo frontend começam obrigatoriamente como
-- 'Comprador'. A promoção para administrador / representante da loja é feita
-- exclusivamente no banco de dados (via SQL Editor ou Table Editor).
CREATE TABLE IF NOT EXISTS public.perfis_usuario (
  id text PRIMARY KEY,
  email text UNIQUE,
  nome text,
  role text NOT NULL DEFAULT 'Comprador' CHECK (
    lower(replace(replace(replace(trim(role), ' ', ''), '_', ''), '-', '')) IN (
      'comprador',
      'vendedor',
      'colecionador',
      'equipelastro',
      'representanteloja',
      'loja',
      'admin',
      'perito',
      'storerepresentative',
      'curadoria'
    )
  ),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_perfis_usuario_email
  ON public.perfis_usuario (lower(email));

CREATE INDEX IF NOT EXISTS idx_perfis_usuario_role
  ON public.perfis_usuario (role);

DROP TRIGGER IF EXISTS trg_perfis_usuario_atualizado_em ON public.perfis_usuario;
CREATE TRIGGER trg_perfis_usuario_atualizado_em
  BEFORE UPDATE ON public.perfis_usuario
  FOR EACH ROW
  EXECUTE FUNCTION public.set_atualizado_em();

-- Trigger automático: sempre que um usuário for criado em `auth.users`,
-- cria seu perfil correspondente em `public.perfis_usuario` como 'Comprador'.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfis_usuario (id, email, nome, role, criado_em, atualizado_em)
  VALUES (
    NEW.id::text,
    lower(NULLIF(trim(NEW.email), '')),
    COALESCE(
      NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
      NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
      'Usuário'
    ),
    'Comprador',
    COALESCE(NEW.created_at, now()),
    now()
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- Backfill: garante que usuários já existentes em `auth.users` tenham linha em
-- `public.perfis_usuario` sem sobrescrever papéis já configurados.
INSERT INTO public.perfis_usuario (id, email, nome, role, criado_em, atualizado_em)
SELECT
  u.id::text,
  lower(NULLIF(trim(u.email), '')),
  COALESCE(
    NULLIF(trim(u.raw_user_meta_data->>'name'), ''),
    NULLIF(split_part(COALESCE(u.email, ''), '@', 1), ''),
    'Usuário'
  ),
  'Comprador',
  COALESCE(u.created_at, now()),
  now()
FROM auth.users u
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. RASTREAMENTO DE CATEGORIAS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categorias_rastreadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  categoria text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categorias_rastreadas_user_categoria_key UNIQUE (user_id, categoria)
);

CREATE INDEX IF NOT EXISTS idx_categorias_rastreadas_user_id
  ON public.categorias_rastreadas (user_id);

CREATE INDEX IF NOT EXISTS idx_categorias_rastreadas_categoria
  ON public.categorias_rastreadas (categoria);

-- ----------------------------------------------------------------------------
-- 4. AJUSTES EM `public.pecas`
-- ----------------------------------------------------------------------------
-- Alinha os valores padrão com o fluxo de submissão em análise e curadoria.
ALTER TABLE public.pecas
  ALTER COLUMN status SET DEFAULT 'UNDER_VALIDATION',
  ALTER COLUMN expert_name SET DEFAULT 'Aguardando Curadoria';

CREATE INDEX IF NOT EXISTS idx_pecas_category ON public.pecas (category);
CREATE INDEX IF NOT EXISTS idx_pecas_status ON public.pecas (status);
CREATE INDEX IF NOT EXISTS idx_pecas_owner_id ON public.pecas (owner_id);
CREATE INDEX IF NOT EXISTS idx_pecas_passport_id ON public.pecas (passport_id);
CREATE INDEX IF NOT EXISTS idx_pecas_share_token ON public.pecas (share_token);

-- ----------------------------------------------------------------------------
-- 5. AJUSTES EM `public.notificacoes`
-- ----------------------------------------------------------------------------
-- Amplia a constraint `tipo` para aceitar os avisos do fluxo de submissão e
-- aprovação de peças ('peca_pendente', 'peca_aprovada', 'peca_cadastrada').
ALTER TABLE public.notificacoes
  DROP CONSTRAINT IF EXISTS notificacoes_tipo_check;

DO $$
DECLARE
  constraint_record record;
BEGIN
  FOR constraint_record IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'notificacoes'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ~* '\mtipo\M'
  LOOP
    EXECUTE format('ALTER TABLE public.notificacoes DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
  END LOOP;
END $$;

ALTER TABLE public.notificacoes
  ADD CONSTRAINT notificacoes_tipo_check
  CHECK (
    tipo = ANY (
      ARRAY[
        'primeiro_investimento'::text,
        'peca_compatível'::text,
        'laudo_concluido'::text,
        'lembrete_conservacao'::text,
        'alerta_generico'::text,
        'peca_pendente'::text,
        'peca_aprovada'::text,
        'peca_cadastrada'::text
      ]
    )
  );

CREATE INDEX IF NOT EXISTS idx_notificacoes_user_id ON public.notificacoes (user_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_user_lida ON public.notificacoes (user_id, lida);
CREATE INDEX IF NOT EXISTS idx_notificacoes_peca_id ON public.notificacoes (peca_id);

-- ----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) E POLÍTICAS DE ACESSO
-- ----------------------------------------------------------------------------
-- Em `perfis_usuario`:
-- - Leitura permitida para consulta de papel pelo backend.
-- - Inserção via API pública limitada exclusivamente a `role = 'Comprador'`.
-- - Nenhuma política de UPDATE/DELETE para `anon`/`authenticated`, impedindo
--   que um usuário comum altere o próprio papel via API do cliente.
ALTER TABLE public.perfis_usuario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "perfis_usuario_select_public" ON public.perfis_usuario;
CREATE POLICY "perfis_usuario_select_public"
  ON public.perfis_usuario
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "perfis_usuario_insert_comprador_only" ON public.perfis_usuario;
CREATE POLICY "perfis_usuario_insert_comprador_only"
  ON public.perfis_usuario
  FOR INSERT
  WITH CHECK (role = 'Comprador');

-- Demais tabelas utilizadas pela aplicação e pelo backend
ALTER TABLE public.pecas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pecas_select_all" ON public.pecas;
CREATE POLICY "pecas_select_all" ON public.pecas FOR SELECT USING (true);
DROP POLICY IF EXISTS "pecas_insert_all" ON public.pecas;
CREATE POLICY "pecas_insert_all" ON public.pecas FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "pecas_update_all" ON public.pecas;
CREATE POLICY "pecas_update_all" ON public.pecas FOR UPDATE USING (true) WITH CHECK (true);

ALTER TABLE public.categorias_rastreadas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categorias_rastreadas_all" ON public.categorias_rastreadas;
CREATE POLICY "categorias_rastreadas_all" ON public.categorias_rastreadas FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notificacoes_all" ON public.notificacoes;
CREATE POLICY "notificacoes_all" ON public.notificacoes FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.preferencias_notificacao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "preferencias_notificacao_all" ON public.preferencias_notificacao;
CREATE POLICY "preferencias_notificacao_all" ON public.preferencias_notificacao FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.listas_desejos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "listas_desejos_all" ON public.listas_desejos;
CREATE POLICY "listas_desejos_all" ON public.listas_desejos FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.itens_lista ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "itens_lista_all" ON public.itens_lista;
CREATE POLICY "itens_lista_all" ON public.itens_lista FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "eventos_all" ON public.eventos;
CREATE POLICY "eventos_all" ON public.eventos FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.atribuicoes_origem ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "atribuicoes_origem_all" ON public.atribuicoes_origem;
CREATE POLICY "atribuicoes_origem_all" ON public.atribuicoes_origem FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.lembretes_conservacao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lembretes_conservacao_all" ON public.lembretes_conservacao;
CREATE POLICY "lembretes_conservacao_all" ON public.lembretes_conservacao FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.avaliacoes_contraparte ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "avaliacoes_contraparte_all" ON public.avaliacoes_contraparte;
CREATE POLICY "avaliacoes_contraparte_all" ON public.avaliacoes_contraparte FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.transferencias_passaporte ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "transferencias_passaporte_all" ON public.transferencias_passaporte;
CREATE POLICY "transferencias_passaporte_all" ON public.transferencias_passaporte FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- COMO PROMOVER UMA CONTA A ADMIN / REPRESENTANTE DA LOJA
-- ============================================================================
-- 1. Cadastre a conta normalmente pela tela de registro do site (/register).
-- 2. Depois, execute o UPDATE abaixo no SQL Editor do Supabase (trocando o
--    e-mail pelo da sua conta de administrador), ou edite a coluna `role` na
--    tabela `perfis_usuario` pelo Table Editor:
--
-- UPDATE public.perfis_usuario
-- SET role = 'EquipeLastro', atualizado_em = now()
-- WHERE lower(email) = lower('seu-admin@email.com');
--
-- Outros papéis reconhecidos como administração/curadoria:
--   'Admin', 'RepresentanteLoja', 'Loja', 'Perito', 'Curadoria'
-- Papel padrão para clientes comuns:
--   'Comprador'
-- ============================================================================
