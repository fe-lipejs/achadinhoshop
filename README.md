# 🛍️ Vitrine de Afiliados (Shopee + Mercado Livre)

Landing page/vitrine para o link da bio do TikTok e Kwai, com painel admin.

- **Vitrine** (`/`): busca por nome **ou pelo número do vídeo** (#12), filtros por loja e categoria, destaques, preço "de/por" com % OFF.
- **Admin** (`/admin`): cadastrar/editar/excluir produtos, enviar imagens, categorias, destaque, ocultar e relatório de cliques.

## 1. Supabase

1. Crie um projeto em https://supabase.com
2. Abra **SQL Editor**, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e rode.
3. Em **Authentication → Users → Add user**, crie seu usuário (e-mail + senha, marque "Auto confirm").
4. Rode no SQL Editor (trocando o e-mail):
   ```sql
   insert into public.admins(user_id)
   select id from auth.users where email = 'seu@email.com';
   ```
5. (Recomendado) Em **Authentication → Providers → Email**, desative **"Allow new users to sign up"**.

## 2. Rodar local

```bash
cp .env.example .env   # preencha URL e anon key (Project Settings → API)
npm install
npm run dev
```

- Vitrine: http://localhost:5173
- Admin: http://localhost:5173/admin/login

## 3. Publicar

Vercel ou Netlify (grátis). Build: `npm run build`, pasta: `dist`. Cadastre as mesmas variáveis do `.env` no painel da hospedagem.

## Links da bio (rastreados)

| Rede | Link |
|---|---|
| TikTok | `https://seusite.com/?src=tiktok` |
| Kwai | `https://seusite.com/?src=kwai` |
| Produto específico | `https://seusite.com/?src=tiktok&p=12` |

No vídeo fale: **"procura o número 12 na vitrine do link do perfil"**. A busca encontra pelo número.

## Por que não tem checkout próprio?

Os programas de afiliados da Shopee e do Mercado Livre **não** oferecem API de checkout para afiliados. A comissão só conta quando a compra acontece no site/app da loja depois do clique no seu link. Por isso o botão "Comprar" leva **direto** (1 clique) ao link de afiliado, que abre o app da loja no celular, onde o cliente já está logado e tem o cartão salvo.
