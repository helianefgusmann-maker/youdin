import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { brl } from "@/lib/financas";
import { useTema } from "@/lib/useTema";

function paleta(escuro: boolean) {
  return escuro
    ? {
        cores: [
          "oklch(0.82 0.15 200)",
          "oklch(0.72 0.19 305)",
          "oklch(0.8 0.16 165)",
          "oklch(0.83 0.16 78)",
          "oklch(0.7 0.19 20)",
        ],
        eixo: "oklch(0.72 0.024 258)",
        grade: "oklch(0.32 0.035 266)",
        fundo: "oklch(0.21 0.028 266)",
        texto: "oklch(0.96 0.008 250)",
      }
    : {
        cores: [
          "oklch(0.58 0.16 235)",
          "oklch(0.55 0.2 300)",
          "oklch(0.62 0.15 165)",
          "oklch(0.7 0.17 60)",
          "oklch(0.6 0.19 20)",
        ],
        eixo: "oklch(0.52 0.024 262)",
        grade: "oklch(0.9 0.012 258)",
        fundo: "oklch(1 0 0)",
        texto: "oklch(0.22 0.03 265)",
      };
}

function usePaleta() {
  const { tema } = useTema();
  return paleta(tema === "dark");
}

function estiloTooltip(p: ReturnType<typeof paleta>) {
  return {
    contentStyle: {
      background: p.fundo,
      border: `1px solid ${p.grade}`,
      borderRadius: 12,
      fontSize: 12,
      color: p.texto,
    },
    labelStyle: { color: p.texto },
    itemStyle: { color: p.texto },
    formatter: (v: number | string) => brl(Number(v)),
  } as const;
}

export function GraficoCategorias({
  dados,
}: {
  dados: Array<{ categoria: string; total: number }>;
}) {
  const p = usePaleta();
  if (dados.length === 0) {
    return <p className="py-8 text-center text-xs text-muted-foreground">Sem gastos neste mês.</p>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={dados}
            dataKey="total"
            nameKey="categoria"
            innerRadius="55%"
            outerRadius="82%"
            paddingAngle={3}
            stroke="transparent"
          >
            {dados.map((d, i) => (
              <Cell key={d.categoria} fill={p.cores[i % p.cores.length]} />
            ))}
          </Pie>
          <Tooltip {...estiloTooltip(p)} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: p.eixo }}
            iconType="circle"
            formatter={(v: string) => <span style={{ color: p.eixo }}>{v}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GraficoBancos({ dados }: { dados: Array<{ banco: string; total: number }> }) {
  const p = usePaleta();
  if (dados.length === 0) {
    return <p className="py-8 text-center text-xs text-muted-foreground">Sem faturas neste mês.</p>;
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <XAxis
            dataKey="banco"
            tick={{ fontSize: 10, fill: p.eixo }}
            axisLine={{ stroke: p.grade }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: p.eixo }}
            axisLine={false}
            tickLine={false}
            width={54}
          />
          <Tooltip {...estiloTooltip(p)} cursor={{ fill: p.grade, opacity: 0.25 }} />
          <Bar dataKey="total" radius={[6, 6, 0, 0]}>
            {dados.map((d, i) => (
              <Cell key={d.banco} fill={p.cores[i % p.cores.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GraficoAnual({
  dados,
}: {
  dados: Array<{ nome: string; ent: number; gasto: number }>;
}) {
  const p = usePaleta();

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={dados} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="gEnt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={p.cores[0]} stopOpacity={0.55} />
              <stop offset="100%" stopColor={p.cores[0]} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gGasto" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={p.cores[1]} stopOpacity={0.55} />
              <stop offset="100%" stopColor={p.cores[1]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="nome"
            tickFormatter={(v: string) => v.slice(0, 3)}
            tick={{ fontSize: 10, fill: p.eixo }}
            axisLine={{ stroke: p.grade }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: p.eixo }}
            axisLine={false}
            tickLine={false}
            width={54}
          />
          <Tooltip {...estiloTooltip(p)} />
          <Legend wrapperStyle={{ fontSize: 11, color: p.eixo }} iconType="circle" />
          <Area
            type="monotone"
            dataKey="ent"
            name="Entradas"
            stroke={p.cores[0]}
            strokeWidth={2}
            fill="url(#gEnt)"
          />
          <Area
            type="monotone"
            dataKey="gasto"
            name="Gastos"
            stroke={p.cores[1]}
            strokeWidth={2}
            fill="url(#gGasto)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
