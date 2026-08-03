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
  const categoriasOrdenadas = useMemo(
    () => [...CATEGORIAS].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [],
  );
  const bancosOrdenados = useMemo(() => [...BANCOS].sort((a, b) => a.localeCompare(b, "pt-BR")), []);


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
        <Link
          to="/planilha"
          className="shrink-0 rounded-xl border border-border bg-[var(--surface)] px-3 py-2 text-xs font-semibold transition hover:border-primary hover:text-primary"
        >
          Planilha →
        </Link>
      </header>

      <form onSubmit={salvar} className="panel mt-4 p-4">
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
          <div className="col-span-2">
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
          className="mt-4 w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
        >
          {insert.isPending ? "Salvando..." : "Registrar gasto"}
        </button>
      </form>

      <section className="mt-5">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-bold">Últimos lançamentos</h2>
          <span className="num text-xs text-muted-foreground">
            Mês: <span className="font-semibold text-accent">{brl(totalMes)}</span>
          </span>
        </div>

        <ul className="space-y-1.5">
          {gastos.slice(0, 6).map((g) => (
            <li key={g.id} className="panel flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{g.descricao}</p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {g.categoria} · {g.banco} · {dataHora(g.data_compra)}
                </p>
              </div>
              <span className="num shrink-0 text-sm font-semibold">{brl(g.valor)}</span>
            </li>
          ))}
          {gastos.length === 0 && (
            <li className="panel px-4 py-5 text-center text-xs text-muted-foreground">
              Nenhum gasto registrado ainda.
            </li>
          )}

        </ul>
      </section>
    </main>
  );
}
