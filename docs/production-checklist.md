# Checklist de Producao

- Subir PostgreSQL gerenciado ou servidor com backup.
- Definir `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `APP_URL`, `FRONTEND_URL`, SMTP e `SENTRY_DSN`.
- Rodar `npm run prisma:deploy`.
- Rodar `npm run email:check`.
- Configurar HTTPS no proxy reverso.
- Instalar cron de backup e lembretes.
- Testar fluxo completo: cliente agenda, barbeiro ve, admin gerencia, email chega, upload logo/capa funciona.
- Rodar smoke test:
  `SMOKE_API_URL=https://api.seudominio.com SMOKE_SUPER_ADMIN_EMAIL=email SMOKE_SUPER_ADMIN_PASSWORD=senha npm run smoke:production`
