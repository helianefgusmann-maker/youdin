import { z } from "zod";
import { CATEGORIAS, BANCOS, PAGAMENTOS } from "./financas";

export const entradaNotaSchema = z.object({
  imagem: z.string().min(20),
  mime: z.string().default("image/jpeg"),
});

export type NotaLida = {
  descricao: string;
  valor: number;
  categoria: string;
  banco: string | null;
  pagamento: string | null;
  parcelas: number;
  data: string | null;
};

const PROMPT = `Você lê fotos de notas fiscais, cupons e comprovantes de pagamento brasileiros.
Responda SOMENTE com um JSON válido, sem markdown, no formato:
{"descricao":"","valor":0,"categoria":"","banco":null,"pagamento":null,"parcelas":1,"data":null}

Regras:
- "valor": total pago em reais, número com ponto decimal (ex: 129.90).
- "descricao": nome do estabelecimento ou do que foi comprado, curto.
- "categoria": escolha uma de: ${CATEGORIAS.join(", ")}.
- "banco": um de ${BANCOS.join(", ")} se identificar o cartão/banco, senão null.
- "pagamento": um de ${PAGAMENTOS.join(", ")} se identificar, senão null.
- "parcelas": número de parcelas (1 se à vista).
- "data": data da compra no formato YYYY-MM-DDTHH:mm, ou null se não achar.
Se não conseguir ler nada, use valor 0 e descricao "".`;

export async function extrairNota(
  imagem: string,
  mime: string,
  apiKey: string,
): Promise<NotaLida> {
  const url = imagem.startsWith("data:") ? imagem : `data:${mime};base64,${imagem}`;

  const resposta = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.6-flash",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            { type: "image_url", image_url: { url } },
          ],
        },
      ],
    }),
  });

  if (!resposta.ok) {
    const texto = await resposta.text();
    throw new Error(`Falha ao ler a nota (${resposta.status}): ${texto.slice(0, 300)}`);
  }

  const json = (await resposta.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const conteudo = json.choices?.[0]?.message?.content ?? "";
  const bruto = conteudo.replace(/```json|```/g, "").trim();
  const inicio = bruto.indexOf("{");
  const fim = bruto.lastIndexOf("}");
  if (inicio === -1 || fim === -1) throw new Error("Não consegui entender a nota.");

  const dados = JSON.parse(bruto.slice(inicio, fim + 1)) as Partial<NotaLida>;

  return {
    descricao: String(dados.descricao ?? "").slice(0, 80),
    valor: Number(dados.valor) || 0,
    categoria: (CATEGORIAS as readonly string[]).includes(String(dados.categoria))
      ? String(dados.categoria)
      : "Outros",
    banco: (BANCOS as readonly string[]).includes(String(dados.banco))
      ? String(dados.banco)
      : null,
    pagamento: (PAGAMENTOS as readonly string[]).includes(String(dados.pagamento))
      ? String(dados.pagamento)
      : null,
    parcelas: Math.max(1, Math.min(48, Number(dados.parcelas) || 1)),
    data: dados.data ? String(dados.data).slice(0, 16) : null,
  };
}
