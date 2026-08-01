CREATE TABLE public.gastos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao text NOT NULL,
  categoria text NOT NULL DEFAULT 'Outros',
  banco text NOT NULL DEFAULT 'NUBANK',
  valor numeric(12,2) NOT NULL DEFAULT 0,
  pagamento text NOT NULL DEFAULT 'Crédito',
  tipo text NOT NULL DEFAULT 'VARIÁVEL',
  parcela text,
  pago boolean NOT NULL DEFAULT false,
  observacao text,
  data_compra timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gastos TO anon, authenticated;
GRANT ALL ON public.gastos TO service_role;
ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gastos_public_all" ON public.gastos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.entradas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao text NOT NULL DEFAULT 'Entrada',
  tipo text NOT NULL DEFAULT 'Salário',
  valor numeric(12,2) NOT NULL DEFAULT 0,
  data_ref date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entradas TO anon, authenticated;
GRANT ALL ON public.entradas TO service_role;
ALTER TABLE public.entradas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entradas_public_all" ON public.entradas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.cofrinhos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  meta numeric(12,2) NOT NULL DEFAULT 0,
  guardado numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cofrinhos TO anon, authenticated;
GRANT ALL ON public.cofrinhos TO service_role;
ALTER TABLE public.cofrinhos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cofrinhos_public_all" ON public.cofrinhos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO public.cofrinhos (nome, meta, guardado) VALUES
  ('🚨 Emergência', 0, 0),
  ('🏖️ Viagem', 0, 0),
  ('🎁 Presentes', 0, 0),
  ('💊 Saúde', 0, 0),
  ('📦 Outros', 0, 0);

INSERT INTO public.gastos (descricao, categoria, banco, valor, pagamento, tipo, parcela, pago, data_compra) VALUES
  ('MONITOR/MOUSE', 'Eletrônicos', 'ITAU', 106.26, 'Crédito', 'VARIÁVEL', '12/12', true, '2026-01-12T10:00:00Z'),
  ('Iphone 13', 'Eletrônicos', 'MERCADOPAGO', 103.51, 'Crédito', 'VARIÁVEL', '10/18', true, '2026-01-10T10:00:00Z'),
  ('Persiana', 'Reforma', 'MERCADOPAGO', 37.36, 'Crédito', 'VARIÁVEL', '06/08', true, '2026-01-08T10:00:00Z'),
  ('Armario', 'Reforma', 'MERCADOPAGO', 46.39, 'Crédito', 'VARIÁVEL', '02/11', true, '2026-01-08T10:00:00Z'),
  ('Presente mãe', 'Presente', 'MERCADOPAGO', 36.11, 'Crédito', 'VARIÁVEL', '02/08', true, '2026-01-05T10:00:00Z'),
  ('Tênis Novo', 'Roupa', 'NUBANK', 70.08, 'Crédito', 'VARIÁVEL', '04/10', true, '2026-01-04T10:00:00Z'),
  ('Flores', 'Presente', 'NUBANK', 12.99, 'Crédito', 'VARIÁVEL', '04/06', true, '2026-01-04T10:00:00Z'),
  ('Passeios com amor', 'Lazer', 'NUBANK', 240.00, 'Crédito', 'VARIÁVEL', NULL, true, '2026-01-15T10:00:00Z'),
  ('Almoço barra', 'Lazer', 'INTER', 110.00, 'Crédito', 'VARIÁVEL', NULL, true, '2026-01-18T10:00:00Z');

INSERT INTO public.entradas (descricao, tipo, valor, data_ref) VALUES
  ('Saldo Anterior', 'Saldo Anterior', 762.70, '2026-01-01');