import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  BANCOS,
  CATEGORIAS,
  PAGAMENTOS,
  TIPOS,
  brl,
  dataHora,
  detectarCategoria,
  inicioDaSemana,
  mascaraMoeda,
  numeroParaMascara,
  paraInputLocal,
  valorNumerico,
} from "@/lib/financas";
import { useGastos, useMutateTable } from "@/lib/useFinancas";
import { lerNota } from "@/lib/nota.functions";
import { tocarSomDinheiro } from "@/lib/somDinheiro";
import { ToggleTema } from "@/components/ToggleTema";


export const Route = createFileRoute("/")({
  component: RegistroRapido,
  head: () => ({
    meta: [
      { title: "Registro Rápido — Controle de Gastos 2026" },
      {
        name: "description",
        content:
          "Lance uma compra em segundos: valor, descrição e banco. A categoria é detectada automaticamente e vai direto para a planilha.",
      },
      { property: "og:title", content: "Registro Rápido — Controle de Gastos 2026" },
      {
        property: "og:description",
        content: "Lance uma compra em segundos e veja tudo organizado na sua planilha financeira.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const campo =
  "w-full rounded-lg border border-border bg-[var(--surface-2)] px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary";
const rotulo = "mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground";

function RegistroRapido() {
  const { data: gastos = [] } = useGastos();
  const { insert } = useMutateTable("gastos");

  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [banco, setBanco] = useState<string>("NUBANK");
  const [pagamento, setPagamento] = useState<string>("Crédito");
  const [tipo, setTipo] = useState<string>("VARIÁVEL");
  const [parcelas, setParcelas] = useState("1");
  const [quando, setQuando] = useState(() => paraInputLocal(new Date()));
  const [categoriaManual, setCategoriaManual] = useState<string | null>(null);
  const [lendoNota, setLendoNota] = useState(false);
  const [notaDetectada, setNotaDetectada] = useState<string | null>(null);
  const inputArquivo = useRef<HTMLInputElement | null>(null);
  const executarLerNota = useServerFn(lerNota);

  const sugerida = useMemo(() => detectarCategoria(descricao), [descricao]);
  const categoria = categoriaManual ?? sugerida;
  const categoriasOrdenadas = useMemo(
    () => [...CATEGORIAS].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [],
  );
  const bancosOrdenados = useMemo(() => [...BANCOS].sort((a, b) => a.localeCompare(b, "pt-BR")), []);

  const numero = valorNumerico(valor);

  const qtdParcelas = Math.max(1, Math.min(48, Number(parcelas) || 1));
  const valorParcela = numero / qtdParcelas;

  const hoje = new Date();
  const totalMes = gastos
    .filter((g) => {
      const d = new Date(g.data_compra);
      return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
    })
    .reduce((s, g) => s + g.valor, 0);

  const comecoSemana = inicioDaSemana(hoje);
  const totalSemana = gastos
    .filter((g) => new Date(g.data_compra) >= comecoSemana)
    .reduce((s, g) => s + g.valor, 0);

  const seteDias = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentes = gastos.filter((g) => new Date(g.data_compra) >= seteDias);

  async function escanearNota(arquivo: File) {
    setLendoNota(true);
    setNotaDetectada(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onload = () => resolve(String(leitor.result));
        leitor.onerror = () => reject(new Error("falha ao ler arquivo"));
        leitor.readAsDataURL(arquivo);
      });

      const lida = await executarLerNota({
        data: { imagem: dataUrl, mime: arquivo.type || "image/jpeg" },
      });

      if (!lida.valor && !lida.descricao) {
        toast.error("Não consegui identificar os dados dessa nota. Tente outra foto.");
        return;
      }

      if (lida.valor) setValor(numeroParaMascara(lida.valor));
      if (lida.descricao) setDescricao(lida.descricao);
      setCategoriaManual(lida.categoria);
      if (lida.banco) setBanco(lida.banco);
      if (lida.pagamento) setPagamento(lida.pagamento);
      setParcelas(String(lida.parcelas));
      if (lida.data && !Number.isNaN(new Date(lida.data).getTime())) {
        setQuando(paraInputLocal(new Date(lida.data)));
      }
      setNotaDetectada(
        `${lida.descricao || "Compra"} · ${brl(lida.valor)}${lida.parcelas > 1 ? ` · ${lida.parcelas}x` : ""}`,
      );
      toast.success("Nota lida! Confira os dados antes de confirmar.");
    } catch {
      toast.error("Não consegui ler a nota. Tente novamente.");
    } finally {
      setLendoNota(false);
    }
  }


  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!descricao.trim()) {
      toast.error("Escreva o que você comprou.");
      return;
    }
    if (!numero || numero <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }

    const data = quando ? new Date(quando) : new Date();

    try {
      await insert.mutateAsync({
        descricao: descricao.trim(),
        categoria,
        banco,
        valor: numero,
        pagamento,
        tipo,
        parcela: qtdParcelas > 1 ? `01/${String(qtdParcelas).padStart(2, "0")}` : null,
        pago: pagamento !== "Crédito",
        data_compra: data.toISOString(),
      });
      tocarSomDinheiro();
      toast.success(
        qtdParcelas > 1
          ? `${brl(numero)} em ${categoria} — ${qtdParcelas}x de ${brl(valorParcela)}`
          : `${brl(numero)} em ${categoria} registrado!`,
      );
      setValor("");
      setDescricao("");
      setParcelas("1");
      setQuando(paraInputLocal(new Date()));
      setCategoriaManual(null);
    } catch {
      toast.error("Não consegui salvar. Tente de novo.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-3 pb-16 pt-5 sm:px-5 sm:pt-8">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            Controle de Gastos 2026
          </p>
          <h1 className="truncate text-xl font-bold sm:text-2xl">
            <span className="text-gradient-brand">Registro rápido</span>
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ToggleTema />
          <Link
            to="/planilha"
            className="rounded-xl border border-border bg-[var(--surface)] px-3 py-2 text-xs font-semibold transition hover:border-primary hover:text-primary"
          >
            Planilha →
          </Link>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="panel p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Esta semana
          </p>
          <p className="num mt-1 truncate text-base font-bold text-primary sm:text-lg">
            {brl(totalSemana)}
          </p>
        </div>
        <div className="panel p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Este mês
          </p>
          <p className="num mt-1 truncate text-base font-bold text-accent sm:text-lg">
            {brl(totalMes)}
          </p>
        </div>
      </div>

      <form onSubmit={salvar} className="panel mt-3 p-4">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-[var(--surface-2)] px-3 focus-within:border-primary">
          <span className="num text-lg text-muted-foreground">R$</span>
          <input
            id="valor"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0,00"
            aria-label="Valor"
            className="num w-full bg-transparent py-2.5 text-2xl font-semibold outline-none placeholder:text-muted-foreground/50"
          />
        </div>

        <div className="mt-3">
          <label className={rotulo} htmlFor="descricao">
            O que você comprou?
          </label>
          <input
            id="descricao"
            value={descricao}
            onChange={(e) => {
              setDescricao(e.target.value);
              setCategoriaManual(null);
            }}
            placeholder="Ex: iFood, gasolina, tênis novo..."
            className={campo}
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <label className={rotulo} htmlFor="categoria">
              Categoria {categoriaManual === null && descricao.trim() ? "(auto)" : ""}
            </label>
            <select
              id="categoria"
              value={categoria}
              onChange={(e) => setCategoriaManual(e.target.value)}
              className={campo}
            >
              {categoriasOrdenadas.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={rotulo} htmlFor="banco">
              Banco / cartão
            </label>
            <select
              id="banco"
              value={banco}
              onChange={(e) => setBanco(e.target.value)}
              className={campo}
            >
              {bancosOrdenados.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={rotulo} htmlFor="pagamento">
              Pagamento
            </label>
            <select
              id="pagamento"
              value={pagamento}
              onChange={(e) => setPagamento(e.target.value)}
              className={campo}
            >
              {PAGAMENTOS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={rotulo} htmlFor="tipo">
              Tipo
            </label>
            <select id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className={campo}>
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={rotulo} htmlFor="parcelas">
              Parcelas
            </label>
            <select
              id="parcelas"
              value={parcelas}
              onChange={(e) => setParcelas(e.target.value)}
              className={`${campo} num`}
            >
              {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}x
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={rotulo} htmlFor="quando">
              Data e hora
            </label>
            <input
              id="quando"
              type="datetime-local"
              value={quando}
              onChange={(e) => setQuando(e.target.value)}
              className={`${campo} num`}
            />
          </div>
        </div>

        {qtdParcelas > 1 && numero > 0 && (
          <p className="num mt-3 rounded-lg border border-border bg-[var(--surface-2)] px-3 py-2 text-center text-xs">
            <span className="font-bold text-primary">
              {qtdParcelas}x de {brl(valorParcela)}
            </span>{" "}
            <span className="text-muted-foreground">· total {brl(numero)}</span>
          </p>
        )}

        <button
          type="submit"
          disabled={insert.isPending}
          className="mt-4 w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
        >
          {insert.isPending ? "Salvando..." : "Registrar gasto"}
        </button>
      </form>

      <section className="mt-5">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-bold">Últimos 7 dias</h2>
          <span className="num text-xs text-muted-foreground">
            <span className="font-semibold text-accent">
              {brl(recentes.reduce((s, g) => s + g.valor, 0))}
            </span>
          </span>
        </div>

        <ul className="space-y-1.5">
          {recentes.map((g) => {
            const partes = g.parcela?.split("/");
            const total = partes && partes.length === 2 ? Number(partes[1]) : 1;
            return (
              <li key={g.id} className="panel flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{g.descricao}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {g.categoria} · {g.banco} · {dataHora(g.data_compra)}
                  </p>
                </div>
                <span className="shrink-0 text-right">
                  <span className="num block text-sm font-semibold">{brl(g.valor)}</span>
                  {total > 1 && (
                    <span className="num block text-[10px] text-muted-foreground">
                      {total}x {brl(g.valor / total)}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
          {recentes.length === 0 && (
            <li className="panel px-4 py-5 text-center text-xs text-muted-foreground">
              Nenhum gasto nos últimos 7 dias.
            </li>
          )}
        </ul>
      </section>
    </main>
  );
}
