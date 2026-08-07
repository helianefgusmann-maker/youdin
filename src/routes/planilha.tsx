import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  BANCOS,
  CATEGORIAS,
  MESES,
  brl,
  dataHora,
  inicioDaSemana,
  mascaraMoeda,
  numeroParaMascara,
  paraInputData,

  valorNumerico,
} from "@/lib/financas";

import {
  useCofrinhos,
  useEntradas,
  useGastos,
  useLembretes,
  useMutateTable,
} from "@/lib/useFinancas";
import { pedirConselho } from "@/lib/conselho.functions";
import { PAGAMENTOS } from "@/lib/financas";
import { ToggleTema } from "@/components/ToggleTema";
import { GraficoAnual, GraficoBancos, GraficoCategorias } from "@/components/Graficos";



export const Route = createFileRoute("/planilha")({
  component: Planilha,
  head: () => ({
    meta: [
      { title: "Planilha Financeira 2026 — Visão Mensal e Anual" },
      {
        name: "description",
        content:
          "Sua planilha de controle de gastos: resumo mensal, faturas por banco, gastos por categoria, entradas e cofrinhos.",
      },
      { property: "og:title", content: "Planilha Financeira 2026" },
      {
        property: "og:description",
        content: "Resumo mensal, faturas por banco, gastos por categoria, entradas e cofrinhos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const campo =
  "w-full rounded-lg border border-border bg-[var(--surface-2)] px-2.5 py-1.5 text-xs outline-none focus:border-primary";

const ABAS = [
  { id: "resumo", label: "Resumo" },
  { id: "gastos", label: "Gastos" },
  { id: "ia", label: "🤖 IA" },
  { id: "entradas", label: "Entradas" },
  { id: "cofrinhos", label: "Cofrinhos" },
  { id: "lembretes", label: "Lembretes" },
  { id: "anual", label: "Anual" },
] as const;


type Aba = (typeof ABAS)[number]["id"];

function Stat({ titulo, valor, cor }: { titulo: string; valor: string; cor?: string }) {
  return (
    <div className="panel min-w-0 p-3">
      <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {titulo}
      </p>
      <p className={`num mt-1 truncate text-base font-bold sm:text-lg ${cor ?? ""}`}>{valor}</p>
    </div>
  );
}

function Planilha() {
  const agora = new Date();
  const [ano, setAno] = useState(agora.getFullYear());
  const [mes, setMes] = useState(agora.getMonth());
  const [aba, setAba] = useState<Aba>("resumo");

  const { data: gastos = [], isLoading } = useGastos();
  const { data: entradas = [] } = useEntradas();
  const { data: cofrinhos = [] } = useCofrinhos();
  const { data: lembretes = [] } = useLembretes();

  const gastosTable = useMutateTable("gastos");
  const entradasTable = useMutateTable("entradas");
  const cofrinhosTable = useMutateTable("cofrinhos");
  const lembretesTable = useMutateTable("lembretes");

  const [novaEntradaDesc, setNovaEntradaDesc] = useState("");
  const [novaEntradaValor, setNovaEntradaValor] = useState("");
  const [novaEntradaData, setNovaEntradaData] = useState(() => paraInputData(new Date()));

  const [novoCofrinho, setNovoCofrinho] = useState("");
  const [novoCofrinhoMeta, setNovoCofrinhoMeta] = useState("");
  const [novoLembrete, setNovoLembrete] = useState("");
  const [novoLembreteValor, setNovoLembreteValor] = useState("");
  const [novoLembreteData, setNovoLembreteData] = useState("");

  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroBanco, setFiltroBanco] = useState("todos");
  const [filtroPagamento, setFiltroPagamento] = useState("todos");

  const [conselho, setConselho] = useState<string | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const executarConselho = useServerFn(pedirConselho);

  const doAno = gastos.filter((g) => new Date(g.data_compra).getFullYear() === ano);
  const doMes = doAno.filter((g) => new Date(g.data_compra).getMonth() === mes);
  const entradasMes = entradas.filter((e) => {
    const d = new Date(`${e.data_ref}T12:00:00`);
    return d.getFullYear() === ano && d.getMonth() === mes;
  });

  const totalMes = doMes.reduce((s, g) => s + g.valor, 0);
  const comecoSemana = inicioDaSemana(agora);
  const totalSemana = gastos
    .filter((g) => new Date(g.data_compra) >= comecoSemana)
    .reduce((s, g) => s + g.valor, 0);
  const totalEntradas = entradasMes.reduce((s, e) => s + e.valor, 0);
  const credito = doMes.filter((g) => g.pagamento === "Crédito").reduce((s, g) => s + g.valor, 0);
  /** Gastos que já saíram do bolso agora (Pix, débito, dinheiro, boleto). */
  const debito = totalMes - credito;
  const guardado = cofrinhos.reduce((s, c) => s + c.guardado, 0);
  /** O crédito só é pago no fim do mês, então não entra no saldo disponível. */
  const saldo = totalEntradas - debito;
  const saldoAposFatura = saldo - credito;
  const pendentes = lembretes.filter((l) => !l.concluido);

  const gastosFiltrados = useMemo(
    () =>
      doMes.filter(
        (g) =>
          (filtroCategoria === "todas" || g.categoria === filtroCategoria) &&
          (filtroBanco === "todos" || g.banco === filtroBanco) &&
          (filtroPagamento === "todos" || g.pagamento === filtroPagamento),
      ),
    [doMes, filtroCategoria, filtroBanco, filtroPagamento],
  );
  const totalFiltrado = gastosFiltrados.reduce((s, g) => s + g.valor, 0);

  async function analisar() {
    setAnalisando(true);
    try {
      const r = await executarConselho({
        data: {
          mes: `${MESES[mes]} de ${ano}`,
          entradas: totalEntradas,
          totalGasto: totalMes,
          credito,
          aVista: debito,
          categorias: porCategoria.slice(0, 20).map((c) => ({ nome: c.categoria, total: c.total })),
          bancos: porBanco.slice(0, 20).map((b) => ({ nome: b.banco, total: b.total })),
          maiores: [...doMes]
            .sort((a, b) => b.valor - a.valor)
            .slice(0, 10)
            .map((g) => ({ descricao: g.descricao, valor: g.valor })),
        },
      });
      setConselho(r.texto);
    } catch {
      toast.error("Não consegui analisar agora. Tente de novo.");
    } finally {
      setAnalisando(false);
    }
  }


  /** Ordem fixa para os cofrinhos não trocarem de posição ao editar. */
  const cofrinhosOrdenados = useMemo(
    () => [...cofrinhos].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR") || a.id.localeCompare(b.id)),
    [cofrinhos],
  );




  const porCategoria = useMemo(
    () =>
      CATEGORIAS.map((c) => ({
        categoria: c,
        total: doMes.filter((g) => g.categoria === c).reduce((s, g) => s + g.valor, 0),
      }))
        .filter((l) => l.total > 0)
        .sort((a, b) => b.total - a.total),
    [doMes],
  );

  const porBanco = useMemo(
    () =>
      BANCOS.map((b) => {
        const lista = doMes.filter((g) => g.banco === b);
        return {
          banco: b,
          total: lista.reduce((s, g) => s + g.valor, 0),
        };
      }).filter((l) => l.total > 0),
    [doMes],
  );

  const resumoAnual = MESES.map((nome, i) => {
    const lista = doAno.filter((g) => new Date(g.data_compra).getMonth() === i);
    const ent = entradas
      .filter((e) => {
        const d = new Date(`${e.data_ref}T12:00:00`);
        return d.getFullYear() === ano && d.getMonth() === i;
      })
      .reduce((s, e) => s + e.valor, 0);
    const gasto = lista.reduce((s, g) => s + g.valor, 0);
    return { nome, ent, gasto, saldo: ent - gasto };
  });

  async function addEntrada(e: React.FormEvent) {
    e.preventDefault();
    const numero = valorNumerico(novaEntradaValor);
    if (!numero) {
      toast.error("Informe o valor da entrada.");
      return;
    }
    const dia = novaEntradaData || paraInputData(new Date());
    await entradasTable.insert.mutateAsync({
      descricao: novaEntradaDesc.trim() || "Entrada",
      tipo: "Entrada",
      valor: numero,
      data_ref: dia,
    });
    setNovaEntradaDesc("");
    setNovaEntradaValor("");
    toast.success("Entrada adicionada.");
  }

  async function addCofrinho(e: React.FormEvent) {
    e.preventDefault();
    if (!novoCofrinho.trim()) {
      toast.error("Dê um nome ao cofrinho.");
      return;
    }
    await cofrinhosTable.insert.mutateAsync({
      nome: novoCofrinho.trim(),
      meta: valorNumerico(novoCofrinhoMeta),
      guardado: 0,
    });
    setNovoCofrinho("");
    setNovoCofrinhoMeta("");
    toast.success("Cofrinho criado.");
  }

  async function addLembrete(e: React.FormEvent) {
    e.preventDefault();
    if (!novoLembrete.trim()) {
      toast.error("Escreva o lembrete.");
      return;
    }
    await lembretesTable.insert.mutateAsync({
      titulo: novoLembrete.trim(),
      valor: valorNumerico(novoLembreteValor),
      vence_em: novoLembreteData || null,
    });
    setNovoLembrete("");
    setNovoLembreteValor("");
    setNovoLembreteData("");
    toast.success("Lembrete criado.");
  }



  return (
    <main className="mx-auto w-full max-w-5xl px-3 pb-16 pt-5 sm:px-5 sm:pt-8">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            Controle {ano}
          </p>
          <h1 className="truncate text-xl font-bold sm:text-2xl">
            <span className="text-gradient-brand">Minha planilha</span>
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ToggleTema />
          <Link
            to="/"
            className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition hover:brightness-110"
          >
            + Gasto
          </Link>
        </div>
      </header>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className={campo}>
          {MESES.map((m, i) => (
            <option key={m} value={i}>
              {m}
            </option>
          ))}
        </select>
        <select value={ano} onChange={(e) => setAno(Number(e.target.value))} className={campo}>
          {[agora.getFullYear() - 1, agora.getFullYear(), agora.getFullYear() + 1].map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <nav className="-mx-3 mt-4 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
        <div className="flex w-max gap-1.5 rounded-xl border border-border bg-[var(--surface)] p-1">
          {ABAS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAba(a.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                aba === a.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </nav>

      {aba === "resumo" && (
        <section className="mt-4 space-y-4">
          {pendentes.length > 0 && (
            <button
              type="button"
              onClick={() => setAba("lembretes")}
              className="panel flex w-full items-center justify-between gap-2 p-3 text-left text-xs"
            >
              <span className="truncate">
                🔔 <span className="font-semibold">{pendentes.length}</span> pendência(s):{" "}
                <span className="text-muted-foreground">
                  {pendentes.map((l) => l.titulo).join(", ")}
                </span>
              </span>
              <span className="shrink-0 font-semibold text-primary">ver →</span>
            </button>
          )}
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Stat titulo="Entradas" valor={brl(totalEntradas)} cor="text-primary" />
            <Stat titulo="Gasto à vista" valor={brl(debito)} cor="text-accent" />
            <Stat
              titulo="Saldo disponível"
              valor={brl(saldo)}
              cor={saldo < 0 ? "text-destructive" : "text-primary"}
            />
            <Stat titulo="Fatura do crédito" valor={brl(credito)} cor="text-destructive" />
            <Stat titulo="Gasto na semana" valor={brl(totalSemana)} cor="text-accent" />
            <Stat titulo="Gasto total do mês" valor={brl(totalMes)} cor="text-accent" />
            <Stat
              titulo="Sobra após a fatura"
              valor={brl(saldoAposFatura)}
              cor={saldoAposFatura < 0 ? "text-destructive" : "text-primary"}
            />
            <Stat titulo="Guardado" valor={brl(guardado)} cor="text-accent" />
          </div>

          <p className="panel p-3 text-[11px] leading-relaxed text-muted-foreground">
            O <span className="font-semibold text-foreground">saldo disponível</span> desconta só o
            que já saiu do bolso (Pix, débito, dinheiro, boleto). A{" "}
            <span className="font-semibold text-foreground">fatura do crédito</span> fica separada
            porque você paga no fim do mês.
          </p>


          <div className="grid gap-4 lg:grid-cols-2">
            <div className="panel panel-glow p-4">
              <h2 className="mb-1 text-sm font-bold">Gastos por categoria</h2>
              <GraficoCategorias dados={porCategoria} />
              <ul className="mt-3 space-y-2.5">
                {porCategoria.map((l) => (
                  <li key={l.categoria}>
                    <div className="mb-1 flex justify-between gap-2 text-xs">
                      <span className="truncate">{l.categoria}</span>
                      <span className="num shrink-0 font-semibold">{brl(l.total)}</span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${totalMes ? (l.total / totalMes) * 100 : 0}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="panel p-4">
              <h2 className="mb-1 text-sm font-bold">Fatura por banco</h2>
              <GraficoBancos dados={porBanco} />
              <ul className="mt-3 space-y-2 text-xs">

                {porBanco.map((b) => (
                  <li
                    key={b.banco}
                    className="flex justify-between gap-2 border-b border-border/50 pb-2 last:border-0"
                  >
                    <span className="truncate">{b.banco}</span>
                    <span className="num shrink-0 font-semibold">{brl(b.total)}</span>
                  </li>
                ))}
                {porBanco.length === 0 && (
                  <li className="text-muted-foreground">Sem faturas neste mês.</li>
                )}
              </ul>
              <div className="mt-3 flex justify-between border-t border-border pt-3 text-xs">
                <span className="text-muted-foreground">Crédito · Débito/Pix</span>
                <span className="num font-semibold">
                  {brl(credito)} · {brl(debito)}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {aba === "gastos" && (
        <section className="mt-4 space-y-2">
          <div className="panel space-y-2 p-3">
            <div className="grid grid-cols-3 gap-2">
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                aria-label="Filtrar por categoria"
                className={campo}
              >
                <option value="todas">Toda categoria</option>
                {[...CATEGORIAS]
                  .sort((a, b) => a.localeCompare(b, "pt-BR"))
                  .map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
              </select>
              <select
                value={filtroBanco}
                onChange={(e) => setFiltroBanco(e.target.value)}
                aria-label="Filtrar por banco"
                className={campo}
              >
                <option value="todos">Todo banco</option>
                {[...BANCOS]
                  .sort((a, b) => a.localeCompare(b, "pt-BR"))
                  .map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
              </select>
              <select
                value={filtroPagamento}
                onChange={(e) => setFiltroPagamento(e.target.value)}
                aria-label="Filtrar por forma de pagamento"
                className={campo}
              >
                <option value="todos">Todo pagamento</option>
                {PAGAMENTOS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-muted-foreground">
                {gastosFiltrados.length} lançamento(s)
                {(filtroCategoria !== "todas" ||
                  filtroBanco !== "todos" ||
                  filtroPagamento !== "todos") && (
                  <button
                    type="button"
                    onClick={() => {
                      setFiltroCategoria("todas");
                      setFiltroBanco("todos");
                      setFiltroPagamento("todos");
                    }}
                    className="ml-2 font-semibold text-primary underline"
                  >
                    limpar filtros
                  </button>
                )}
              </span>
              <span className="num font-bold text-accent">{brl(totalFiltrado)}</span>
            </div>
          </div>

          {gastosFiltrados.map((g) => {
            const partes = g.parcela?.split("/");
            const totalParcelas = partes && partes.length === 2 ? Number(partes[1]) || 1 : 1;
            return (
            <article key={g.id} className="panel p-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{g.descricao}</p>
                  <p className="num mt-0.5 text-[10px] text-muted-foreground">
                    {dataHora(g.data_compra)}
                  </p>
                </div>
                <p className="shrink-0 text-right">
                  <span className="num block text-sm font-bold text-accent">{brl(g.valor)}</span>
                  {totalParcelas > 1 && (
                    <span className="num block text-[10px] text-muted-foreground">
                      {totalParcelas}x {brl(g.valor / totalParcelas)}
                    </span>
                  )}
                </p>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                <span className="rounded-full border border-border px-2 py-0.5">{g.categoria}</span>
                <span className="rounded-full border border-border px-2 py-0.5">{g.banco}</span>
                <span className="rounded-full border border-border px-2 py-0.5">{g.pagamento}</span>
                {g.parcela && (
                  <span className="num rounded-full border border-border px-2 py-0.5">
                    {g.parcela}
                  </span>
                )}
              </div>

              <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                <button
                  type="button"
                  onClick={() => gastosTable.update.mutate({ id: g.id, values: { pago: !g.pago } })}
                  className={`rounded-xl px-3 py-2.5 text-xs font-bold transition ${
                    g.pago
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-[var(--surface-2)] text-muted-foreground hover:border-primary hover:text-primary"
                  }`}
                >
                  {g.pago ? "✅ Pago" : "Marcar como pago"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Excluir "${g.descricao}"?`)) gastosTable.remove.mutate(g.id);
                  }}
                  className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-muted-foreground transition hover:border-destructive hover:text-destructive"
                  aria-label={`Excluir ${g.descricao}`}
                >
                  Excluir
                </button>
              </div>

            </article>
            );
          })}

          {!isLoading && doMes.length === 0 && (
            <p className="panel p-6 text-center text-xs text-muted-foreground">
              Nenhum gasto em {MESES[mes]} de {ano}.
            </p>
          )}
        </section>
      )}

      {aba === "entradas" && (
        <section className="panel mt-4 p-4">
          <h2 className="mb-3 text-sm font-bold">Entradas de {MESES[mes]}</h2>
          <ul className="mb-4 space-y-2 text-xs">
            {entradasMes.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-2 border-b border-border/50 pb-2 last:border-0"
              >
                <span className="min-w-0">
                  <span className="block truncate">{e.descricao}</span>
                  <span className="num block text-[10px] text-muted-foreground">
                    recebido em {new Date(`${e.data_ref}T12:00:00`).toLocaleDateString("pt-BR")}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="num font-semibold text-primary">{brl(e.valor)}</span>
                  <button
                    type="button"
                    onClick={() => entradasTable.remove.mutate(e.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Excluir entrada"
                  >
                    ✕
                  </button>
                </span>
              </li>
            ))}
            {entradasMes.length === 0 && <li className="text-muted-foreground">Nenhuma entrada.</li>}
          </ul>
          <form onSubmit={addEntrada} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_6rem_9rem_auto]">
            <input
              value={novaEntradaDesc}
              onChange={(ev) => setNovaEntradaDesc(ev.target.value)}
              placeholder="Salário"
              className={campo}
            />
            <input
              value={novaEntradaValor}
              onChange={(ev) => setNovaEntradaValor(mascaraMoeda(ev.target.value))}
              inputMode="numeric"
              placeholder="0,00"
              className={`${campo} num`}
            />
            <input
              type="date"
              value={novaEntradaData}
              onChange={(ev) => setNovaEntradaData(ev.target.value)}
              aria-label="Dia em que recebi"
              className={`${campo} num`}
            />
            <button
              type="submit"
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground"
            >
              +
            </button>
          </form>
        </section>
      )}

      {aba === "cofrinhos" && (
        <section className="mt-4 space-y-3">
          <div className="panel flex items-center justify-between p-3 text-xs">
            <span className="text-muted-foreground">Total guardado</span>
            <span className="num font-bold text-accent">{brl(guardado)}</span>
          </div>
          <form onSubmit={addCofrinho} className="panel grid grid-cols-[minmax(0,1fr)_6rem_auto] gap-2 p-3">
            <input
              value={novoCofrinho}
              onChange={(ev) => setNovoCofrinho(ev.target.value)}
              placeholder="Novo cofrinho (ex: Viagem)"
              className={campo}
            />
            <input
              value={novoCofrinhoMeta}
              onChange={(ev) => setNovoCofrinhoMeta(mascaraMoeda(ev.target.value))}
              inputMode="numeric"
              placeholder="Meta"
              className={`${campo} num`}
            />
            <button
              type="submit"
              className="rounded-lg bg-primary px-3 text-sm font-bold text-primary-foreground"
            >
              +
            </button>
          </form>
          <div className="space-y-3">
            {cofrinhosOrdenados.map((c) => {
              const pct = c.meta > 0 ? (c.guardado / c.meta) * 100 : 0;
              return (
                <div key={c.id} className="panel p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{c.nome}</p>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="num text-sm font-bold text-accent">
                        {pct.toFixed(0)}%
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Remover o cofrinho "${c.nome}"?`))
                            cofrinhosTable.remove.mutate(c.id);
                        }}
                        className="text-muted-foreground transition hover:text-destructive"
                        aria-label={`Remover cofrinho ${c.nome}`}
                      >
                        ✕
                      </button>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Meta
                      <input
                        key={`meta-${c.id}`}
                        defaultValue={numeroParaMascara(c.meta)}
                        inputMode="numeric"
                        onChange={(e) => {
                          e.target.value = mascaraMoeda(e.target.value);
                        }}
                        onBlur={(e) =>
                          cofrinhosTable.update.mutate({
                            id: c.id,
                            values: { meta: valorNumerico(e.target.value) },
                          })
                        }
                        className={`${campo} num mt-1`}
                      />
                    </label>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Guardado
                      <input
                        key={`guardado-${c.id}`}
                        defaultValue={numeroParaMascara(c.guardado)}
                        inputMode="numeric"
                        onChange={(e) => {
                          e.target.value = mascaraMoeda(e.target.value);
                        }}
                        onBlur={(e) =>
                          cofrinhosTable.update.mutate({
                            id: c.id,
                            values: { guardado: valorNumerico(e.target.value) },
                          })
                        }
                        className={`${campo} num mt-1`}
                      />
                    </label>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
                      <div
                        className="h-full rounded-full bg-accent transition-[width]"
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      />
                    </div>
                    <span className="num shrink-0 text-[10px] text-muted-foreground">
                      {brl(c.guardado)} / {brl(c.meta)}
                    </span>
                  </div>
                </div>
              );
            })}
            {cofrinhosOrdenados.length === 0 && (
              <p className="panel p-6 text-center text-xs text-muted-foreground">
                Nenhum cofrinho ainda.
              </p>
            )}
          </div>

        </section>
      )}

      {aba === "lembretes" && (
        <section className="panel mt-4 p-4">
          <h2 className="mb-1 text-sm font-bold">Lembretes e pendências</h2>
          <p className="mb-3 text-[10px] text-muted-foreground">
            {pendentes.length} pendente(s) de {lembretes.length}
          </p>
          <form onSubmit={addLembrete} className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_6rem_9rem_auto]">
            <input
              value={novoLembrete}
              onChange={(ev) => setNovoLembrete(ev.target.value)}
              placeholder="Ex: pagar fatura do Nubank"
              className={campo}
            />
            <input
              value={novoLembreteValor}
              onChange={(ev) => setNovoLembreteValor(mascaraMoeda(ev.target.value))}
              inputMode="numeric"

              placeholder="Valor"
              className={`${campo} num`}
            />
            <input
              type="date"
              value={novoLembreteData}
              onChange={(ev) => setNovoLembreteData(ev.target.value)}
              className={`${campo} num`}
            />
            <button
              type="submit"
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground"
            >
              +
            </button>
          </form>

          <ul className="space-y-2 text-xs">
            {lembretes.map((l) => {
              const atrasado =
                !l.concluido && !!l.vence_em && new Date(`${l.vence_em}T23:59:59`) < agora;
              return (
                <li
                  key={l.id}
                  className="flex items-center gap-2 border-b border-border/50 pb-2 last:border-0"
                >
                  <button
                    type="button"
                    onClick={() =>
                      lembretesTable.update.mutate({
                        id: l.id,
                        values: { concluido: !l.concluido },
                      })
                    }
                    className={l.concluido ? "text-primary" : "text-muted-foreground"}
                    aria-label="Marcar como concluído"
                  >
                    {l.concluido ? "✅" : "⬜"}
                  </button>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate ${l.concluido ? "text-muted-foreground line-through" : "font-semibold"}`}
                    >
                      {l.titulo}
                    </span>
                    {l.vence_em && (
                      <span
                        className={`num block text-[10px] ${atrasado ? "text-destructive" : "text-muted-foreground"}`}
                      >
                        vence {new Date(`${l.vence_em}T12:00:00`).toLocaleDateString("pt-BR")}
                        {atrasado ? " · atrasado" : ""}
                      </span>
                    )}
                  </span>
                  {l.valor > 0 && (
                    <span className="num shrink-0 font-semibold text-accent">{brl(l.valor)}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => lembretesTable.remove.mutate(l.id)}
                    className="shrink-0 text-muted-foreground transition hover:text-destructive"
                    aria-label="Excluir lembrete"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
            {lembretes.length === 0 && (
              <li className="text-muted-foreground">Nenhum lembrete por aqui.</li>
            )}
          </ul>
        </section>
      )}



      {aba === "anual" && (
        <section className="panel panel-glow mt-4 p-4">
          <h2 className="mb-1 text-sm font-bold">Resumo anual {ano}</h2>
          <GraficoAnual dados={resumoAnual} />
          <div className="mt-4 overflow-x-auto">

            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2">Mês</th>
                  <th className="pb-2 text-right">Entradas</th>
                  <th className="pb-2 text-right">Gasto</th>
                  <th className="pb-2 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {resumoAnual.map((l, i) => (
                  <tr
                    key={l.nome}
                    className={`border-t border-border/60 ${i === mes ? "bg-[var(--surface-2)]" : ""}`}
                  >
                    <td className="py-1.5">{l.nome.slice(0, 3)}</td>
                    <td className="num py-1.5 text-right text-primary">{brl(l.ent)}</td>
                    <td className="num py-1.5 text-right text-accent">{brl(l.gasto)}</td>
                    <td
                      className={`num py-1.5 text-right font-semibold ${l.saldo < 0 ? "text-destructive" : ""}`}
                    >
                      {brl(l.saldo)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-border font-bold">
                  <td className="py-2">TOTAL</td>
                  <td className="num py-2 text-right text-primary">
                    {brl(resumoAnual.reduce((s, l) => s + l.ent, 0))}
                  </td>
                  <td className="num py-2 text-right text-accent">
                    {brl(resumoAnual.reduce((s, l) => s + l.gasto, 0))}
                  </td>
                  <td className="num py-2 text-right">
                    {brl(resumoAnual.reduce((s, l) => s + l.saldo, 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
