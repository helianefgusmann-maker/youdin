export const CATEGORIAS = [
  "Alimentação",
  "Transporte",
  "Lazer",
  "Saúde",
  "Reforma",
  "Roupa",
  "Eletrônicos",
  "Presente",
  "Assinatura",
  "Mercado",
  "Casa",
  "Educação",
  "Pet",
  "Outros",
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

export const BANCOS = ["NUBANK", "MERCADOPAGO", "INTER", "ITAU", "PICPAY", "C6", "CAIXA", "DINHEIRO"] as const;
export const PAGAMENTOS = ["Crédito", "Débito", "Pix", "Dinheiro", "Boleto"] as const;
export const TIPOS = ["VARIÁVEL", "FIXO"] as const;

export const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const REGRAS: Array<[Categoria, string[]]> = [
  [
    "Alimentação",
    ["ifood", "lanche", "almoco", "almoço", "jantar", "restaurante", "pizza", "hamburguer", "hambúrguer",
      "padaria", "cafe", "café", "acai", "açaí", "sorvete", "bar ", "cerveja", "delivery", "burger", "sushi",
      "coxinha", "salgado", "marmita", "food"],
  ],
  [
    "Mercado",
    ["mercado", "supermercado", "atacad", "feira", "hortifruti", "assai", "assaí", "carrefour", "extra",
      "pao de acucar", "compras do mes", "compras do mês"],
  ],
  [
    "Transporte",
    ["uber", "99", "gasolina", "combustivel", "combustível", "etanol", "onibus", "ônibus", "metro", "metrô",
      "passagem", "pedagio", "pedágio", "estacionamento", "taxi", "táxi", "mecanic", "pneu", "oficina", "ipva",
      "moto", "carro"],
  ],
  [
    "Saúde",
    ["farmacia", "farmácia", "remedio", "remédio", "medico", "médico", "dentista", "exame", "consulta",
      "plano de saude", "psicolog", "academia", "vitamina", "hospital", "drogaria"],
  ],
  [
    "Lazer",
    ["cinema", "show", "viagem", "passeio", "parque", "jogo", "game", "steam", "bilhete", "festa", "balada",
      "hotel", "airbnb", "praia", "role", "rolê"],
  ],
  [
    "Assinatura",
    ["netflix", "spotify", "prime", "disney", "hbo", "max ", "youtube", "assinatura", "plano", "icloud",
      "google one", "chatgpt", "canva", "adobe", "internet", "telefone", "celular", "claro", "vivo", "tim "],
  ],
  [
    "Eletrônicos",
    ["celular", "iphone", "notebook", "monitor", "mouse", "teclado", "fone", "tv", "computador", "pc ",
      "ssd", "hd ", "carregador", "cabo", "console", "playstation", "xbox", "eletronico", "eletrônico"],
  ],
  [
    "Reforma",
    ["reforma", "tinta", "cimento", "obra", "pedreiro", "armario", "armário", "persiana", "moveis", "móveis",
      "porta", "piso", "eletricista", "encanador", "material de construcao", "material de construção"],
  ],
  [
    "Roupa",
    ["roupa", "tenis", "tênis", "camisa", "calca", "calça", "sapato", "blusa", "vestido", "shorts", "meia",
      "jaqueta", "bermuda", "moda", "shein", "renner", "riachuelo"],
  ],
  [
    "Presente",
    ["presente", "flores", "aniversario", "aniversário", "lembranca", "lembrança", "natal", "dia das maes",
      "dia das mães", "dia dos pais"],
  ],
  [
    "Casa",
    ["luz", "energia", "agua", "água", "gas", "gás", "aluguel", "condominio", "condomínio", "faxina",
      "limpeza", "iptu", "casa", "cama", "utensilio", "utensílio"],
  ],
  [
    "Educação",
    ["curso", "faculdade", "livro", "escola", "apostila", "mensalidade", "aula", "udemy", "alura"],
  ],
  ["Pet", ["pet", "racao", "ração", "veterinario", "veterinário", "cachorro", "gato", "petshop"]],
];

const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/** Detecta a categoria a partir da descrição da compra. */
export function detectarCategoria(descricao: string): Categoria {
  const texto = ` ${normalizar(descricao)} `;
  for (const [categoria, palavras] of REGRAS) {
    for (const palavra of palavras) {
      if (texto.includes(normalizar(palavra))) return categoria;
    }
  }
  return "Outros";
}

export const brl = (valor: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor || 0);

export const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export type Gasto = {
  id: string;
  descricao: string;
  categoria: string;
  banco: string;
  valor: number;
  pagamento: string;
  tipo: string;
  parcela: string | null;
  pago: boolean;
  observacao: string | null;
  data_compra: string;
};

export type Entrada = {
  id: string;
  descricao: string;
  tipo: string;
  valor: number;
  data_ref: string;
};

export type Cofrinho = {
  id: string;
  nome: string;
  meta: number;
  guardado: number;
};

export type Lembrete = {
  id: string;
  titulo: string;
  valor: number;
  vence_em: string | null;
  concluido: boolean;
  created_at: string;
};

/** Início da semana (segunda-feira) para a data informada. */
export function inicioDaSemana(base = new Date()) {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  const diaSemana = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diaSemana);
  return d;
}

/** Converte uma Date para o formato aceito por <input type="datetime-local">. */
export function paraInputLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

