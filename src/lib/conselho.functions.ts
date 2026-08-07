import { createServerFn } from "@tanstack/react-start";
import { entradaConselhoSchema, gerarConselho } from "./conselho.server";

export const pedirConselho = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => entradaConselhoSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");
    return { texto: await gerarConselho(data, apiKey) };
  });
