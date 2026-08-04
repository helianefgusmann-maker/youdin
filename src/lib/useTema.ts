import { useCallback, useSyncExternalStore } from "react";

export type Tema = "dark" | "light";

const CHAVE = "tema-financas";
const ouvintes = new Set<() => void>();

function ler(): Tema {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function inscrever(cb: () => void) {
  ouvintes.add(cb);
  return () => ouvintes.delete(cb);
}

export function useTema() {
  const tema = useSyncExternalStore<Tema>(inscrever, ler, () => "dark");

  const alternar = useCallback(() => {
    const proximo: Tema = ler() === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", proximo === "dark");
    try {
      localStorage.setItem(CHAVE, proximo);
    } catch {
      /* ignora */
    }
    ouvintes.forEach((cb) => cb());
  }, []);

  return { tema, alternar };
}
