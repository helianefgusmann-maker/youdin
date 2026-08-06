import { createServerFn } from "@tanstack/react-start";
import { entradaNotaSchema, extrairNota } from "./nota.server";

export const lerNota = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => entradaNotaSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");
    return await extrairNota(data.imagem, data.mime, apiKey);
  });
