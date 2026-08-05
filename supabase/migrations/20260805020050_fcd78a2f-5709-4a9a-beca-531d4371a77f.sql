CREATE TABLE public.lembretes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  vence_em date,
  concluido boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lembretes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lembretes TO authenticated;
GRANT ALL ON public.lembretes TO service_role;

ALTER TABLE public.lembretes ENABLE ROW LEVEL SECURITY;

CREATE POLICY lembretes_public_all ON public.lembretes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);