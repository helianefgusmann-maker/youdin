import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Cofrinho, Entrada, Gasto } from "./financas";

export function useGastos() {
  return useQuery({
    queryKey: ["gastos"],
    queryFn: async (): Promise<Gasto[]> => {
      const { data, error } = await supabase
        .from("gastos")
        .select("*")
        .order("data_compra", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((g) => ({ ...g, valor: Number(g.valor) })) as Gasto[];
    },
  });
}

export function useEntradas() {
  return useQuery({
    queryKey: ["entradas"],
    queryFn: async (): Promise<Entrada[]> => {
      const { data, error } = await supabase
        .from("entradas")
        .select("*")
        .order("data_ref", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((e) => ({ ...e, valor: Number(e.valor) })) as Entrada[];
    },
  });
}

export function useCofrinhos() {
  return useQuery({
    queryKey: ["cofrinhos"],
    queryFn: async (): Promise<Cofrinho[]> => {
      const { data, error } = await supabase.from("cofrinhos").select("*").order("created_at");
      if (error) throw error;
      return (data ?? []).map((c) => ({
        ...c,
        meta: Number(c.meta),
        guardado: Number(c.guardado),
      })) as Cofrinho[];
    },
  });
}

export function useInvalidate() {
  const qc = useQueryClient();
  return (key: string) => qc.invalidateQueries({ queryKey: [key] });
}

export function useMutateTable(table: "gastos" | "entradas" | "cofrinhos") {
  const invalidate = useInvalidate();

  const insert = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const { error } = await supabase.from(table).insert(values as never);
      if (error) throw error;
    },
    onSuccess: () => invalidate(table),
  });

  const update = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, unknown> }) => {
      const { error } = await supabase.from(table).update(values as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(table),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(table),
  });

  return { insert, update, remove };
}
