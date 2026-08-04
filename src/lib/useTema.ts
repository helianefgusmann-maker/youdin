import { useCallback, useEffect, useState } from "react";

export type Tema = "dark" | "light";

const CHAVE = "tema-financas";

function aplicar(tema: Tema) {
  const raiz = document.documentElement;
  raiz.classList.toggle("dark", tema === "dark");
  raiz.style.colorScheme = tema;
}

export function useTema() {
  const [tema, setTema] = useState<Tema>("dark");

  useEffect(() => {
    const salvo = (localStorage.getItem(CHAVE) as Tema | null) ?? "dark";
    setTema(salvo);
    aplicar(salvo);
  }, []);

  const alternar = useCallback(() => {
    setTema((atual) => {
      const proximo: Tema = atual === "dark" ? "light" : "dark";
      localStorage.setItem(CHAVE, proximo);
      aplicar(proximo);
      return proximo;
    });
  }, []);

  return { tema, alternar };
}
