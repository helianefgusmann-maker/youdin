import { z } from "zod";

export const entradaConselhoSchema = z.object({
  mes: z.string(),
  entradas: z.number(),
  totalGasto: z.number(),
  credito: z.number(),
  aVista: z.number(),
  categorias: z.array(z.object({ nome: z.string(), total: z.number() })).max(20),
  bancos: z.array(z.object({ nome: z.string(), total: z.number() })).max(20),
  maiores: z.array(z.object({ descricao: z.string(), valor: z.number() })).max(10),
});

export type EntradaConselho = z.infer<typeof entradaConselhoSchema>;

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export async function gerarConselho(dados: EntradaConselho, apiKey: string): Promise<string> {
  const resumo = [
    `Mês: ${dados.mes}`,
    `Entradas: ${brl(dados.entradas)}`,
    `Total gasto: ${brl(dados.totalGasto)} (crédito ${brl(dados.credito)} / à vista ${brl(dados.aVista)})`,
    `Por categoria: ${dados.categorias.map((c) => `${c.nome} ${brl(c.total)}`).join(", ") || "nenhuma"}`,
    `Por banco: ${dados.bancos.map((b) => `${b.nome} ${brl(b.total)}`).join(", ") || "nenhum"}`,
    `Maiores compras: ${dados.maiores.map((m) => `${m.descricao} ${brl(m.valor)}`).join(", ") || "nenhuma"}`,
  ].join("\n");

  const resposta = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.6-flash",
      messages: [
        {
          role: "system",
          content: `Você é um consultor financeiro pessoal brasileiro, direto e amigável, que fala com "você".
Analise os números do mês e responda em markdown simples e curto (máximo 220 palavras), nesta ordem:
**Onde você mais gastou** — 2 a 3 frases com números reais.
**O que dá pra cortar** — 3 bullets objetivos com estimativa de economia em R$.
**Alerta** — 1 frase sobre a fatura do crédito ou o saldo, se fizer sentido.
Nunca invente dados além dos fornecidos. Sem enrolação, sem introduções.`,
        },
        { role: "user", content: resumo },
      ],
    }),
  });

  if (!resposta.ok) {
    const texto = await resposta.text();
    throw new Error(`Falha na análise (${resposta.status}): ${texto.slice(0, 200)}`);
  }

  const json = (await resposta.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content?.trim() || "Não consegui gerar a análise agora.";
}
