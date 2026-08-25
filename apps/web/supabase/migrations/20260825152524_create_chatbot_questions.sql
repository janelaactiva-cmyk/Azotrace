-- apps/web/supabase/migrations/[timestamp]_create_chatbot_questions.sql

CREATE TABLE chatbot_questions (
  id BIGSERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT 'Geral',
  order_position INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX idx_chatbot_questions_active ON chatbot_questions(is_active);
CREATE INDEX idx_chatbot_questions_order ON chatbot_questions(order_position);

-- Ativar Row Level Security
ALTER TABLE chatbot_questions ENABLE ROW LEVEL SECURITY;

-- Política para leitura pública (qualquer um pode ver perguntas ativas)
CREATE POLICY "Enable read access for all users" ON chatbot_questions
  FOR SELECT
  USING (is_active = true);

-- Política para gestão apenas por administradores (ajustar conforme necessário)
CREATE POLICY "Enable all access for authenticated users" ON chatbot_questions
  FOR ALL
  USING (auth.role() = 'authenticated');