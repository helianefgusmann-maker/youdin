import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  BANCOS,
  CATEGORIAS,
  PAGAMENTOS,
  TIPOS,
  brl,
  dataHora,
  detectarCategoria,
} from "@/lib/financas";
import { useGastos, useMutateTable } from "@/lib/useFinancas";

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
  const [parcela, setParcela] = useState("");
  const [categoriaManual, setCategoriaManual] = useState<string | null>(null);

  const sugerida = useMemo(() => detectarCategoria(descricao), [descricao]);
  const categoria = categoriaManual ?? sugerida;

  const hoje = new Date();
  const gastosDoMes = gastos.filter((g) => {
    const d = new Date(g.data_compra);
    return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
  });
  const totalMes = gastosDoMes.reduce((s, g) => s + g.valor, 0);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const numero = Number(valor.replace(/\./g, "").replace(",", "."));
    if (!descricao.trim()) {
      toast.error("Escreva o que você comprou.");
      return;
    }
    if (!numero || numero <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }


    try {
      await insert.mutateAsync({
        descricao: descricao.trim(),
        categoria,
        banco,
        valor: numero,
        pagamento,
        tipo,
        parcela: parcela.trim() || null,
        pago: pagamento !== "Crédito",
        data_compra: new Date().toISOString(),
      });
      toast.success(`${brl(numero)} em ${categoria} registrado!`);
      setValor("");
      setDescricao("");
      setParcela("");
      setCategoriaManual(null);
    } catch {
      toast.error("Não consegui salvar. Tente de novo.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Controle de Gastos 2026
          </p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            <span className="text-gradient-brand">Registro rápido</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gastou? Lance aqui em 5 segundos — a categoria é detectada sozinha.
          </p>
        </div>
        <Link
          to="/planilha"
          className="rounded-xl border border-border bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold transition hover:border-primary hover:text-primary"
        >
          Abrir planilha →
        </Link>
      </header>

      <form onSubmit={salvar} className="panel p-5 sm:p-7">
        <div>
          <label className={rotulo} htmlFor="valor">
            Quanto foi?
          </label>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-[var(--surface-2)] px-4 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
            <span className="num text-2xl text-muted-foreground">R$</span>
            <input
              id="valor"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
              className="num w-full bg-transparent py-4 text-3xl font-semibold outline-none placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        <div className="mt-5">
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
          {descricao.trim() && (
            <p className="mt-2 text-xs text-muted-foreground">
              Categoria detectada:{" "}
              <span className="font-semibold text-primary">{categoria}</span>
            </p>
          )}
        </div>

        <div className="mt-5">
          <span className={rotulo}>Categoria</span>
          <div className="flex flex-wrap gap-2">
            {CATEGORIAS.map((c) => {
              const ativa = c === categoria;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategoriaManual(c)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    ativa
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-[var(--surface-2)] text-muted-foreground hover:border-primary/60 hover:text-foreground"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5">
          <span className={rotulo}>Banco / cartão</span>
          <div className="flex flex-wrap gap-2">
            {BANCOS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBanco(b)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  b === banco
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-[var(--surface-2)] text-muted-foreground hover:border-accent/60 hover:text-foreground"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
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
            <select
              id="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className={campo}
            >
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={rotulo} htmlFor="parcela">
              Parcela (opcional)
            </label>
            <input
              id="parcela"
              value={parcela}
              onChange={(e) => setParcela(e.target.value)}
              placeholder="ex: 03/12"
              className={campo}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={insert.isPending}
          className="mt-7 w-full rounded-xl bg-primary px-6 py-4 text-base font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
        >
          {insert.isPending ? "Salvando..." : "Registrar gasto"}
        </button>
      </form>

      <section className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-bold">Últimos lançamentos</h2>
          <span className="num text-sm text-muted-foreground">
            Este mês: <span className="font-semibold text-accent">{brl(totalMes)}</span>
          </span>
        </div>
        <ul className="space-y-2">
          {gastos.slice(0, 6).map((g) => (
            <li key={g.id} className="panel flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{g.descricao}</p>
                <p className="text-xs text-muted-foreground">
                  {g.categoria} · {g.banco} · {dataHora(g.data_compra)}
                </p>
              </div>
              <span className="num shrink-0 font-semibold">{brl(g.valor)}</span>
            </li>
          ))}
          {gastos.length === 0 && (
            <li className="panel px-4 py-6 text-center text-sm text-muted-foreground">
              Nenhum gasto registrado ainda.
            </li>
          )}
        </ul>
      </section>
    </main>
  );
}
