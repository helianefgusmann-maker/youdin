import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { BANCOS, CATEGORIAS, MESES, brl, dataHora } from "@/lib/financas";
import { useCofrinhos, useEntradas, useGastos, useMutateTable } from "@/lib/useFinancas";
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
  { id: "entradas", label: "Entradas" },
  { id: "cofrinhos", label: "Cofrinhos" },
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

  const gastosTable = useMutateTable("gastos");
  const entradasTable = useMutateTable("entradas");
  const cofrinhosTable = useMutateTable("cofrinhos");

  const [novaEntradaDesc, setNovaEntradaDesc] = useState("");
  const [novaEntradaValor, setNovaEntradaValor] = useState("");

  const doAno = gastos.filter((g) => new Date(g.data_compra).getFullYear() === ano);
  const doMes = doAno.filter((g) => new Date(g.data_compra).getMonth() === mes);
  const entradasMes = entradas.filter((e) => {
    const d = new Date(`${e.data_ref}T12:00:00`);
    return d.getFullYear() === ano && d.getMonth() === mes;
  });

  const totalMes = doMes.reduce((s, g) => s + g.valor, 0);
  const totalEntradas = entradasMes.reduce((s, e) => s + e.valor, 0);
  const credito = doMes.filter((g) => g.pagamento === "Crédito").reduce((s, g) => s + g.valor, 0);
  const debito = totalMes - credito;
  const guardado = cofrinhos.reduce((s, c) => s + c.guardado, 0);
  const saldo = totalEntradas - totalMes;

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
    const numero = Number(novaEntradaValor.replace(/\./g, "").replace(",", "."));
    if (!numero) {
      toast.error("Informe o valor da entrada.");
      return;
    }
    await entradasTable.insert.mutateAsync({
      descricao: novaEntradaDesc.trim() || "Entrada",
      tipo: "Entrada",
      valor: numero,
      data_ref: `${ano}-${String(mes + 1).padStart(2, "0")}-01`,
    });
    setNovaEntradaDesc("");
    setNovaEntradaValor("");
    toast.success("Entrada adicionada.");
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
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Stat titulo="Entradas" valor={brl(totalEntradas)} cor="text-primary" />
            <Stat titulo="Total gasto" valor={brl(totalMes)} cor="text-accent" />
            <Stat titulo="Saldo" valor={brl(saldo)} cor={saldo < 0 ? "text-destructive" : "text-primary"} />
            <Stat titulo="Guardado" valor={brl(guardado)} cor="text-accent" />
          </div>

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
          {doMes.map((g) => (
            <article key={g.id} className="panel p-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{g.descricao}</p>
                  <p className="num mt-0.5 text-[10px] text-muted-foreground">
                    {dataHora(g.data_compra)}
                  </p>
                </div>
                <p className="num shrink-0 text-sm font-bold text-accent">{brl(g.valor)}</p>
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
                <span className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => gastosTable.update.mutate({ id: g.id, values: { pago: !g.pago } })}
                    className={g.pago ? "text-primary" : "text-muted-foreground"}
                    aria-label="Marcar como pago"
                  >
                    {g.pago ? "✅" : "⬜"}
                  </button>
                  <button
                    type="button"
                    onClick={() => gastosTable.remove.mutate(g.id)}
                    className="text-muted-foreground transition hover:text-destructive"
                    aria-label="Excluir gasto"
                  >
                    ✕
                  </button>
                </span>
              </div>
            </article>
          ))}
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
                <span className="truncate">{e.descricao}</span>
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
          <form onSubmit={addEntrada} className="grid grid-cols-[minmax(0,1fr)_5rem_auto] gap-2">
            <input
              value={novaEntradaDesc}
              onChange={(ev) => setNovaEntradaDesc(ev.target.value)}
              placeholder="Salário"
              className={campo}
            />
            <input
              value={novaEntradaValor}
              onChange={(ev) => setNovaEntradaValor(ev.target.value)}
              inputMode="decimal"
              placeholder="0,00"
              className={`${campo} num`}
            />
            <button
              type="submit"
              className="rounded-lg bg-primary px-3 text-sm font-bold text-primary-foreground"
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cofrinhos.map((c) => (
              <div key={c.id} className="panel p-3">
                <p className="mb-2 truncate text-sm font-semibold">{c.nome}</p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Meta
                    <input
                      defaultValue={c.meta}
                      inputMode="decimal"
                      onBlur={(e) =>
                        cofrinhosTable.update.mutate({
                          id: c.id,
                          values: { meta: Number(e.target.value.replace(",", ".")) || 0 },
                        })
                      }
                      className={`${campo} num mt-1`}
                    />
                  </label>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Guardado
                    <input
                      defaultValue={c.guardado}
                      inputMode="decimal"
                      onBlur={(e) =>
                        cofrinhosTable.update.mutate({
                          id: c.id,
                          values: { guardado: Number(e.target.value.replace(",", ".")) || 0 },
                        })
                      }
                      className={`${campo} num mt-1`}
                    />
                  </label>
                </div>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${c.meta ? Math.min(100, (c.guardado / c.meta) * 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
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
