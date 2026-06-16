# Deploy no Railway

## Servicos

1. Crie um projeto no Railway.
2. Adicione PostgreSQL.
3. Adicione um servico a partir do GitHub: `JuanVcR/Barber-shop-appointment`.
4. Configure as variaveis usando `.env.production.example`.

## Variaveis principais

- `DATABASE_URL`: vem do PostgreSQL do Railway.
- `JWT_SECRET` e `JWT_REFRESH_SECRET`: gere com `npm run secrets:generate`.
- `APP_URL`: URL do backend no Railway.
- `FRONTEND_URL`: URL do frontend na Vercel.
- SMTP: dados reais do Brevo/Gmail/SendGrid.
- `UPLOAD_DIR=uploads`.

## Depois do deploy

- Rode `npm run email:check` no ambiente de producao.
- Rode `npm run smoke:production` com as variaveis `SMOKE_*`.
- Configure cron para `npm run db:backup` e `npm run notifications:reminders`.
