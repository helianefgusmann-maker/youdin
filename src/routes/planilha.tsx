import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { BANCOS, CATEGORIAS, MESES, brl, dataHora } from "@/lib/financas";
import { useCofrinhos, useEntradas, useGastos, useMutateTable } from "@/lib/useFinancas";

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
    ],
  }),
});

const rotulo = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground";
const campo =
  "w-full rounded-lg border border-border bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-primary";

function Card({ titulo, valor, cor }: { titulo: string; valor: string; cor?: string }) {
  return (
    <div className="panel p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{titulo}</p>
      <p className={`num mt-2 text-2xl font-bold ${cor ?? ""}`}>{valor}</p>
    </div>
  );
}

function Planilha() {
  const agora = new Date();
  const [ano, setAno] = useState(agora.getFullYear());
  const [mes, setMes] = useState(agora.getMonth());

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
          credito: lista.filter((g) => g.pagamento === "Crédito").reduce((s, g) => s + g.valor, 0),
          outros: lista.filter((g) => g.pagamento !== "Crédito").reduce((s, g) => s + g.valor, 0),
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
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Controle de Gastos {ano}
          </p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            <span className="text-gradient-brand">Minha planilha</span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <Link
            to="/"
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:brightness-110"
          >
            + Novo gasto
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card titulo="Entradas do mês" valor={brl(totalEntradas)} cor="text-primary" />
        <Card titulo="Total gasto" valor={brl(totalMes)} cor="text-accent" />
        <Card titulo="Crédito / Débito-Pix" valor={`${brl(credito)} · ${brl(debito)}`} />
        <Card
          titulo="Saldo do mês"
          valor={brl(saldo)}
          cor={saldo < 0 ? "text-destructive" : "text-primary"}
        />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="panel p-5 lg:col-span-2">
          <h2 className="mb-4 text-lg font-bold">📋 Registro de gastos — {MESES[mes]}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2 pr-3">Data / hora</th>
                  <th className="pb-2 pr-3">Descrição</th>
                  <th className="pb-2 pr-3">Categoria</th>
                  <th className="pb-2 pr-3">Banco</th>
                  <th className="pb-2 pr-3">Pgto</th>
                  <th className="pb-2 pr-3">Parc.</th>
                  <th className="pb-2 pr-3 text-right">Valor</th>
                  <th className="pb-2 pr-3">✔</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {doMes.map((g) => (
                  <tr key={g.id} className="border-t border-border/60">
                    <td className="num whitespace-nowrap py-2.5 pr-3 text-xs text-muted-foreground">
                      {dataHora(g.data_compra)}
                    </td>
                    <td className="py-2.5 pr-3 font-medium">{g.descricao}</td>
                    <td className="py-2.5 pr-3">
                      <span className="rounded-full border border-border px-2 py-0.5 text-xs">
                        {g.categoria}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-xs">{g.banco}</td>
                    <td className="py-2.5 pr-3 text-xs">{g.pagamento}</td>
                    <td className="num py-2.5 pr-3 text-xs">{g.parcela ?? "—"}</td>
                    <td className="num py-2.5 pr-3 text-right font-semibold">{brl(g.valor)}</td>
                    <td className="py-2.5 pr-3">
                      <button
                        type="button"
                        onClick={() =>
                          gastosTable.update.mutate({ id: g.id, values: { pago: !g.pago } })
                        }
                        className={g.pago ? "text-primary" : "text-muted-foreground"}
                        aria-label="Marcar como pago"
                      >
                        {g.pago ? "✅" : "⬜"}
                      </button>
                    </td>
                    <td className="py-2.5">
                      <button
                        type="button"
                        onClick={() => gastosTable.remove.mutate(g.id)}
                        className="text-xs text-muted-foreground transition hover:text-destructive"
                        aria-label="Excluir gasto"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!isLoading && doMes.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum gasto em {MESES[mes]} de {ano}.
              </p>
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="panel p-5">
            <h2 className="mb-4 text-lg font-bold">📊 Gastos por categoria</h2>
            <ul className="space-y-3">
              {porCategoria.map((l) => (
                <li key={l.categoria}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{l.categoria}</span>
                    <span className="num font-semibold">{brl(l.total)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${totalMes ? (l.total / totalMes) * 100 : 0}%` }}
                    />
                  </div>
                </li>
              ))}
              {porCategoria.length === 0 && (
                <li className="text-sm text-muted-foreground">Sem gastos neste mês.</li>
              )}
            </ul>
          </section>

          <section className="panel p-5">
            <h2 className="mb-4 text-lg font-bold">💳 Fatura por banco</h2>
            <ul className="space-y-2 text-sm">
              {porBanco.map((b) => (
                <li key={b.banco} className="flex justify-between border-b border-border/50 pb-2">
                  <span>{b.banco}</span>
                  <span className="num font-semibold">{brl(b.total)}</span>
                </li>
              ))}
              {porBanco.length === 0 && (
                <li className="text-muted-foreground">Sem faturas neste mês.</li>
              )}
            </ul>
          </section>

          <section className="panel p-5">
            <h2 className="mb-4 text-lg font-bold">📥 Entradas de {MESES[mes]}</h2>
            <ul className="mb-4 space-y-2 text-sm">
              {entradasMes.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{e.descricao}</span>
                  <span className="flex items-center gap-2">
                    <span className="num font-semibold text-primary">{brl(e.valor)}</span>
                    <button
                      type="button"
                      onClick={() => entradasTable.remove.mutate(e.id)}
                      className="text-xs text-muted-foreground hover:text-destructive"
                      aria-label="Excluir entrada"
                    >
                      ✕
                    </button>
                  </span>
                </li>
              ))}
              {entradasMes.length === 0 && (
                <li className="text-muted-foreground">Nenhuma entrada.</li>
              )}
            </ul>
            <form onSubmit={addEntrada} className="flex gap-2">
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
                className={`${campo} num w-28`}
              />
              <button
                type="submit"
                className="rounded-lg bg-primary px-3 text-sm font-bold text-primary-foreground"
              >
                +
              </button>
            </form>
          </section>
        </div>
      </div>

      <section className="panel mt-6 p-5">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-lg font-bold">🪙 Cofrinhos</h2>
          <span className="num text-sm text-muted-foreground">
            Guardado: <span className="font-semibold text-accent">{brl(guardado)}</span>
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {cofrinhos.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-[var(--surface-2)] p-4">
              <p className="mb-3 font-semibold">{c.nome}</p>
              <label className={rotulo}>Meta</label>
              <input
                defaultValue={c.meta}
                inputMode="decimal"
                onBlur={(e) =>
                  cofrinhosTable.update.mutate({
                    id: c.id,
                    values: { meta: Number(e.target.value.replace(",", ".")) || 0 },
                  })
                }
                className={`${campo} num mb-3`}
              />
              <label className={rotulo}>Guardado</label>
              <input
                defaultValue={c.guardado}
                inputMode="decimal"
                onBlur={(e) =>
                  cofrinhosTable.update.mutate({
                    id: c.id,
                    values: { guardado: Number(e.target.value.replace(",", ".")) || 0 },
                  })
                }
                className={`${campo} num`}
              />
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--surface)]">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${c.meta ? Math.min(100, (c.guardado / c.meta) * 100) : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel mt-6 p-5">
        <h2 className="mb-4 text-lg font-bold">📅 Resumo anual {ano}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                <th className="pb-2">Mês</th>
                <th className="pb-2 text-right">Entradas</th>
                <th className="pb-2 text-right">Total gasto</th>
                <th className="pb-2 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {resumoAnual.map((l, i) => (
                <tr
                  key={l.nome}
                  className={`border-t border-border/60 ${i === mes ? "bg-[var(--surface-2)]" : ""}`}
                >
                  <td className="py-2">{l.nome}</td>
                  <td className="num py-2 text-right text-primary">{brl(l.ent)}</td>
                  <td className="num py-2 text-right text-accent">{brl(l.gasto)}</td>
                  <td
                    className={`num py-2 text-right font-semibold ${l.saldo < 0 ? "text-destructive" : ""}`}
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
    </main>
  );
}
