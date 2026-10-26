# Shop Studio AI — Servidor MCP (Cloudflare Workers)

Ferramentas: analisar_produto, gerar_prompt_video_json, gerar_prompt_imagem, gerar_conteudo_comercial.
Endpoint MCP: `https://SEU-WORKER.workers.dev/mcp`  ·  Termos: `/terms`  ·  Privacidade: `/privacy`

## PASSO A PASSO

### 1) GitHub (guardar o código) — https://github.com
1. Crie uma conta/entre. Clique em **New repository** → nome `shop-studio-mcp` → Create.
2. Clique em **uploading an existing file** e envie TODOS os arquivos desta pasta (mantendo a pasta `src/`). Commit.

### 2) Cloudflare (publicar numa URL) — https://dash.cloudflare.com
1. Entre na conta (a mesma do tik-tok-viral).
2. Menu **Workers & Pages** → **Create** → **Import a repository** (Connect to Git).
3. Autorize o GitHub e escolha `shop-studio-mcp`.
4. Nome do projeto: `shop-studio-mcp`. Build command: deixe vazio. Deploy command: `npx wrangler deploy`. Clique **Deploy**.
5. Ao terminar, copie a URL: `https://shop-studio-mcp.SEUUSUARIO.workers.dev`.
6. Teste no navegador: abra a URL (deve mostrar "Shop Studio AI") e `/terms`.

### 3) Portal da OpenAI — https://platform.openai.com
1. No seu app "Loja Studio AI", vá na aba **MCPs** e adicione o servidor:
   URL = `https://shop-studio-mcp.SEUUSUARIO.workers.dev/mcp` (sem autenticação).
2. Em Metadados, atualize: Site = URL base; Termos = URL base + `/terms`; Privacidade = URL base + `/privacy` (ou mantenha a do TermsFeed).
3. Envie o pacote de novo e clique em **Enviar para revisão**.

Se o portal mostrar a interface diferente, copie o texto da tela e me mande.
