// Shop Studio AI — servidor MCP (Streamable HTTP, sem estado) para Cloudflare Workers.
// Ferramentas determinísticas: não chamam IA externa, não geram vídeo/imagem, não pesquisam na internet.

const PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const SERVER = { name: "shop-studio-ai", version: "1.0.0" };

const str = (d) => ({ type: "string", description: d });
const strArr = (d) => ({ type: "array", items: { type: "string" }, description: d });
const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

const TOOLS = [
  {
    name: "analisar_produto",
    title: "Analisar produto",
    description: "Use quando o usuário quiser uma análise estruturada de um produto a partir do que é visível na referência e uma triagem preliminar e qualitativa de risco comercial. Não consulta a internet nem garante aprovação.",
    inputSchema: {
      type: "object",
      properties: {
        produto: str("Nome ou tipo do produto identificado."),
        categoria: str("Categoria (ex.: calçado, cosmético, eletrônico, brinquedo)."),
        detalhes_visiveis: strArr("Cores, materiais, formato, inscrições, acessórios e embalagem visíveis."),
        alegacoes_pretendidas: strArr("Alegações que o anunciante pretende usar (opcional).")
      },
      required: ["produto"]
    },
    annotations: RO
  },
  {
    name: "gerar_prompt_video_json",
    title: "Gerar prompt de vídeo em JSON",
    description: "Use quando o usuário quiser um prompt de vídeo em JSON (português) para um produto. Apenas cria o texto do prompt; não gera nem publica vídeos.",
    inputSchema: {
      type: "object",
      properties: {
        produto: str("Produto identificado."),
        detalhes_visiveis: strArr("Detalhes visíveis que devem ser preservados."),
        plataforma_destino: str("Ex.: Flow/Veo, Gemini ou outra."),
        duracao_segundos: { type: "integer", minimum: 4, maximum: 60, description: "Duração exata. Padrão: 8." },
        narracao: { type: "string", enum: ["persuasiva", "natural", "animada", "calma", "personalizada", "sem_fala"], description: "Tipo de narração. Padrão: natural." },
        texto_fala: str("Texto exato da fala, obrigatório se narracao = personalizada."),
        cenario: str("Cenário desejado (opcional).")
      },
      required: ["produto"]
    },
    annotations: RO
  },
  {
    name: "gerar_prompt_imagem",
    title: "Gerar prompt de imagem",
    description: "Use quando o usuário quiser um prompt de imagem fiel ao produto de referência, para usar em outra ferramenta.",
    inputSchema: {
      type: "object",
      properties: {
        produto: str("Produto identificado."),
        detalhes_visiveis: strArr("Detalhes visíveis a preservar."),
        cenario: str("Cenário ou estilo desejado."),
        formato: str("Ex.: 9:16, 1:1, 4:5. Padrão: 9:16.")
      },
      required: ["produto"]
    },
    annotations: RO
  },
  {
    name: "gerar_conteudo_comercial",
    title: "Gerar descrição, hashtags e headline",
    description: "Use quando o usuário quiser descrição curta, até cinco hashtags e uma headline. Só usa informações fornecidas; não inventa preço, promoção ou benefício.",
    inputSchema: {
      type: "object",
      properties: {
        produto: str("Produto identificado."),
        informacoes_confirmadas: strArr("Fatos confirmados sobre o produto (benefícios, materiais, etc.)."),
        tom: str("Ex.: natural, animado, direto. Padrão: natural.")
      },
      required: ["produto"]
    },
    annotations: RO
  }
];

// ---------- lógica das ferramentas ----------
const arr = (v) => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);
const RISCO = [
  [/(suplement|emagrec|medicament|rem[eé]dio|cura|anvisa|cosm[eé]tic|creme|sérum|serum)/i, "alto", "Categoria regulada (saúde/cosméticos): alegações exigem comprovação e registro."],
  [/(faca|canivete|arma|airsoft|taser|spray de pimenta|fogos|isqueiro|vape|cigarro)/i, "muito alto", "Produto potencialmente perigoso ou restrito pelas plataformas."],
  [/(brinquedo|infantil|beb[eê]|crian)/i, "moderado", "Público infantil: certificação (ex.: Inmetro) e segurança costumam ser exigidas."],
  [/(carregador|bateria|el[eé]tric|eletr[oô]nic|fone|bluetooth|power ?bank)/i, "moderado", "Eletroeletrônico: pode exigir homologação (Anatel/Inmetro)."],
  [/(original|nike|adidas|apple|samsung|gucci|louis vuitton|marca famosa|réplica|replica)/i, "alto", "Menção a marca registrada: risco de falsificação/propriedade intelectual."]
];

function analisar({ produto, categoria = "", detalhes_visiveis, alegacoes_pretendidas }) {
  const texto = `${produto} ${categoria} ${arr(alegacoes_pretendidas).join(" ")}`;
  const hits = RISCO.filter(([re]) => re.test(texto));
  const ordem = ["baixo", "moderado", "alto", "muito alto"];
  const nivel = hits.length ? hits.map((h) => h[1]).sort((a, b) => ordem.indexOf(b) - ordem.indexOf(a))[0] : "indeterminado";
  return {
    produto_identificado: produto,
    categoria: categoria || "não informada",
    detalhes_visiveis: arr(detalhes_visiveis),
    analise_de_risco_comercial: {
      nivel_qualitativo: nivel,
      motivos_observaveis: hits.map((h) => h[2]),
      dados_ou_documentos_faltantes: ["Confirmar regras atuais da plataforma de venda e da categoria", "Documentos/certificações aplicáveis, se houver"],
      acao_recomendada: "Revisar as políticas oficiais da plataforma antes de publicar.",
      aviso: "Triagem preliminar por palavras-chave. Nenhuma fonte externa foi consultada e não há garantia de aprovação."
    },
    proximos_passos: ["Gerar prompt de imagem", "Gerar prompt de vídeo em JSON", "Gerar descrição, hashtags e headline"]
  };
}

function sequencia(dur, produto) {
  const n = Math.max(2, Math.min(5, Math.round(dur / 2.5)));
  const fases = [
    `Apresentação do ${produto} em enquadramento estável, mostrando a forma geral`,
    "Aproximação suave de câmera para os detalhes visíveis (materiais, acabamento)",
    "Movimento natural e discreto que mostra o uso ou a proporção do produto",
    "Visão de conjunto com o produto em destaque",
    "Fechamento com o produto centralizado e estável"
  ].slice(0, n);
  const passo = dur / n;
  return fases.map((f, i) => ({
    inicio_s: +(i * passo).toFixed(1),
    fim_s: +((i + 1) * passo).toFixed(1),
    acao: f
  }));
}

function promptVideo(a) {
  const dur = Number.isInteger(a.duracao_segundos) ? a.duracao_segundos : 8;
  const narr = a.narracao || "natural";
  if (narr === "personalizada" && !a.texto_fala) {
    return { erro: "Narração personalizada exige 'texto_fala' com o texto exato." };
  }
  return {
    titulo: `Vídeo de produto — ${a.produto}`,
    plataforma_destino: a.plataforma_destino || "Flow/Veo",
    configuracao_video: { formato: "9:16", duracao_segundos: dur, camera: "estável", zoom: false, cortes: false, texto_sobreposto: false, marca_dagua: false },
    identificacao_do_produto: { produto: a.produto, detalhes_visiveis: arr(a.detalhes_visiveis) },
    cenario: a.cenario || "Cenário coerente com o produto, iluminação natural e fundo limpo",
    movimento: "Movimentos discretos e plausíveis; cenário estável",
    narracao: narr === "sem_fala"
      ? { tipo: "sem_fala" }
      : { tipo: narr, voz: "feminina brasileira", texto: narr === "personalizada" ? a.texto_fala : "A definir conforme o tipo escolhido, sem inventar benefícios, preços ou promoções." },
    sequencia_cronologica: sequencia(dur, a.produto),
    fidelidade_absoluta: "Preservar forma, proporções, cores, materiais, texturas, inscrições, logotipos e componentes exatamente como na referência.",
    regras_obrigatorias: [
      "Não redesenhar, substituir, duplicar ou deformar o produto",
      "Não inventar componentes, funções, especificações, preços ou certificações",
      "Sequência cobre toda a duração escolhida"
    ],
    negative_prompt: "produto deformado, componentes extras, logotipos inventados, texto na tela, marca-d'água, cortes bruscos, movimentos irreais",
    resultado_esperado: `Vídeo vertical 9:16 de ${dur}s com o produto fiel à referência.`,
    aviso: "Este é apenas um prompt. Nenhum vídeo foi gerado ou testado."
  };
}

function promptImagem(a) {
  const det = arr(a.detalhes_visiveis);
  return {
    prompt: `Imagem fotorrealista do produto "${a.produto}" fiel à referência${det.length ? `, preservando: ${det.join(", ")}` : ""}. Cenário: ${a.cenario || "coerente com o produto, iluminação natural"}. Escala, perspectiva, sombras e iluminação coerentes entre produto e cenário. Formato ${a.formato || "9:16"}.`,
    negative_prompt: "produto redesenhado, componentes extras, logotipos inventados, texto, marca-d'água, deformações",
    aviso: "Apenas o texto do prompt; nenhuma imagem foi gerada."
  };
}

function conteudo(a) {
  const fatos = arr(a.informacoes_confirmadas);
  const slug = String(a.produto).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9 ]/g, "").split(/\s+/).filter(Boolean);
  const tags = [...new Set([slug.join(""), ...slug.slice(0, 2), "achadinhos", "produtoreal"])].filter(Boolean).slice(0, 5).map((t) => "#" + t.toLowerCase());
  return {
    descricao: `${a.produto}${fatos.length ? ": " + fatos.join(", ") + "." : "."} Veja os detalhes no vídeo.`,
    hashtags: tags,
    headline: `Conheça: ${a.produto}`,
    aviso: "Texto criado só com as informações fornecidas. Hashtags são ideias criativas, não tendências verificadas."
  };
}

function runTool(name, args) {
  if (!args || typeof args.produto !== "string" || !args.produto.trim()) return { erro: "Informe o campo 'produto'." };
  switch (name) {
    case "analisar_produto": return analisar(args);
    case "gerar_prompt_video_json": return promptVideo(args);
    case "gerar_prompt_imagem": return promptImagem(args);
    case "gerar_conteudo_comercial": return conteudo(args);
    default: return null;
  }
}

// ---------- JSON-RPC / MCP ----------
const rpcOk = (id, result) => ({ jsonrpc: "2.0", id, result });
const rpcErr = (id, code, message) => ({ jsonrpc: "2.0", id, error: { code, message } });

function handle(msg) {
  const { id, method, params } = msg;
  if (id === undefined) return null; // notificação
  switch (method) {
    case "initialize": {
      const req = params?.protocolVersion;
      return rpcOk(id, {
        protocolVersion: PROTOCOLS.includes(req) ? req : PROTOCOLS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER,
        instructions: "Ferramentas para análise de produto, prompts de imagem/vídeo em JSON e conteúdo comercial. Não geram vídeo/imagem nem garantem aprovação."
      });
    }
    case "ping": return rpcOk(id, {});
    case "tools/list": return rpcOk(id, { tools: TOOLS });
    case "tools/call": {
      const out = runTool(params?.name, params?.arguments);
      if (out === null) return rpcErr(id, -32602, `Ferramenta desconhecida: ${params?.name}`);
      return rpcOk(id, {
        content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
        structuredContent: out,
        isError: Boolean(out.erro)
      });
    }
    default: return rpcErr(id, -32601, `Método não suportado: ${method}`);
  }
}

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
  "access-control-allow-headers": "content-type, mcp-protocol-version, mcp-session-id, authorization, accept",
  "access-control-expose-headers": "mcp-session-id"
};
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", ...CORS } });
const html = (title, body) => new Response(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="font-family:system-ui;max-width:680px;margin:2rem auto;padding:0 1rem;line-height:1.5">${body}</body></html>`, { headers: { "content-type": "text/html; charset=utf-8" } });

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    if (url.pathname === "/mcp") {
      if (request.method === "GET" || request.method === "DELETE") return new Response("Method Not Allowed", { status: 405, headers: { allow: "POST", ...CORS } });
      if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: CORS });
      let body;
      try { body = await request.json(); } catch { return json(rpcErr(null, -32700, "JSON inválido"), 400); }
      if (Array.isArray(body)) {
        const outs = body.map(handle).filter(Boolean);
        return outs.length ? json(outs) : new Response(null, { status: 202, headers: CORS });
      }
      const out = handle(body);
      return out ? json(out) : new Response(null, { status: 202, headers: CORS });
    }

    if (url.pathname === "/terms") return html("Termos de Serviço — Shop Studio AI", "<h1>Termos de Serviço — Shop Studio AI</h1><p>O Shop Studio AI gera textos (análises, prompts, descrições e hashtags) a partir das informações fornecidas pelo usuário. Não gera nem publica vídeos ou imagens, não garante aprovação comercial, viralização ou ausência de risco, e o usuário é responsável por revisar políticas das plataformas e leis aplicáveis antes de publicar.</p><p>Os serviços são fornecidos “como estão”, sem garantias.</p>");
    if (url.pathname === "/privacy") return html("Privacidade — Shop Studio AI", "<h1>Política de Privacidade — Shop Studio AI</h1><p>Este servidor processa em tempo real apenas os dados enviados em cada chamada e não os armazena, não usa cookies e não os compartilha com terceiros. Registros técnicos padrão da Cloudflare podem existir.</p>");
    if (url.pathname === "/") return html("Shop Studio AI", "<h1>Shop Studio AI</h1><p>Servidor MCP para análise de produtos, prompts de imagem e vídeo e conteúdo comercial.</p><p>Endpoint MCP: <code>/mcp</code> · <a href='/terms'>Termos</a> · <a href='/privacy'>Privacidade</a></p>");
    return new Response("Not found", { status: 404 });
  }
};
