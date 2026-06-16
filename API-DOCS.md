# Documentacao API - Barbearia ChatBoot

Base URL local: `http://localhost:3333`

Todas as rotas protegidas usam:

```http
Authorization: Bearer TOKEN
Content-Type: application/json
```

No frontend:

```js
import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:3333',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
```

## Health

```http
GET /health
```

Resposta:

```json
{ "ok": true }
```

## Auth

### Criar cliente

```http
POST /api/auth/register
```

Body:

```json
{
  "name": "Joao Silva",
  "email": "joao@email.com",
  "password": "123456",
  "phone": "11999999999",
  "cpf": "12345678900"
}
```

### Login

```http
POST /api/auth/login
```

Body:

```json
{
  "email": "joao@email.com",
  "password": "123456"
}
```

Resposta esperada:

```json
{
  "token": "jwt_token",
  "refreshToken": "refresh_token",
  "account": {
    "id": "uuid",
    "email": "joao@email.com",
    "role": "CLIENT"
  }
}
```

### Usuario logado

```http
GET /api/auth/me
```

### Trocar senha

```http
PATCH /api/auth/me/password
```

Body:

```json
{
  "currentPassword": "123456",
  "newPassword": "654321"
}
```

### Refresh token

```http
POST /api/auth/refresh-token
```

Body:

```json
{
  "refreshToken": "refresh_token"
}
```

### Logout

```http
DELETE /api/auth/logout
```

### Esqueci senha

```http
POST /api/auth/forgot-password/user
POST /api/auth/forgot-password/barber
```

Body:

```json
{
  "email": "user@email.com"
}
```

### Redefinir senha

```http
POST /api/auth/reset-password
```

Body:

```json
{
  "token": "token_recebido",
  "newPassword": "nova_senha"
}
```

### Aceitar convite de barbeiro

```http
POST /api/auth/barber-invites/accept
```

Body:

```json
{
  "token": "token_convite",
  "password": "123456"
}
```

## Barbearias

### Listar barbearias

```http
GET /api/barbershops
```

### Detalhe por slug

```http
GET /api/barbershops/:slug
```

### Listar servicos de uma barbearia

```http
GET /api/barbershops/:barbershopId/services
```

## Servicos

### Detalhe de servico

```http
GET /api/services/:serviceId
```

## Agendamentos

Status possiveis:

```txt
SCHEDULED = marcado
CANCELLED = cancelado
COMPLETED = concluido
```

### Consultar horarios disponiveis

```http
GET /api/availability?barberId=UUID&serviceId=UUID&day=YYYY-MM-DD
```

Para varios servicos:

```http
GET /api/availability?barberId=UUID&serviceIds=UUID,UUID&day=YYYY-MM-DD
```

Resposta:

```json
["09:00", "09:30", "10:00"]
```

### Criar agendamento autenticado

```http
POST /api/bookings
```

Body com um servico:

```json
{
  "barbershopId": "uuid",
  "barberId": "uuid",
  "serviceId": "uuid",
  "day": "2026-05-15",
  "startTime": "09:00"
}
```

Body com varios servicos:

```json
{
  "barbershopId": "uuid",
  "barberId": "uuid",
  "serviceIds": ["uuid-1", "uuid-2"],
  "day": "2026-05-15",
  "startTime": "09:00"
}
```

### Criar agendamento sem login

```http
POST /api/bookings/guest
```

Body:

```json
{
  "barbershopId": "uuid",
  "barberId": "uuid",
  "serviceId": "uuid",
  "day": "2026-05-15",
  "startTime": "09:00",
  "client": {
    "name": "Cliente Sem Login",
    "phone": "11999999999",
    "email": "cliente@email.com"
  }
}
```

### Meus agendamentos

```http
GET /api/bookings/me
GET /api/bookings/me?day=2026-05-15
```

### Agenda da barbearia por dia

Rota para admin/super admin:

```http
GET /api/bookings/:barbershopId/:day
```

Exemplo:

```http
GET /api/bookings/uuid-barbershop/2026-05-15
```

### Detalhe do agendamento

```http
GET /api/bookings/:bookingId
```

Resposta inclui:

```json
{
  "id": "uuid",
  "day": "2026-05-15",
  "startTime": "09:00",
  "endTime": "09:30",
  "totalDuration": 30,
  "status": "SCHEDULED",
  "cancellationReason": null,
  "cancelledAt": null,
  "completedAt": null
}
```

### Reagendar

```http
PATCH /api/bookings/:bookingId/reschedule
```

Body:

```json
{
  "day": "2026-05-16",
  "startTime": "10:00"
}
```

### Atualizar status

```http
PATCH /api/bookings/:bookingId/status
```

Marcar como concluido:

```json
{
  "status": "COMPLETED"
}
```

Marcar como cancelado:

```json
{
  "status": "CANCELLED",
  "cancellationReason": "Cliente pediu cancelamento"
}
```

Reabrir como marcado:

```json
{
  "status": "SCHEDULED"
}
```

### Cancelar agendamento

Esta rota nao apaga do banco. Ela marca o status como `CANCELLED`.

```http
DELETE /api/bookings/:bookingId
```

Body opcional:

```json
{
  "cancellationReason": "Cliente nao podera comparecer"
}
```

### Registrar pagamento

```http
PATCH /api/bookings/:bookingId/payment
```

Body:

```json
{
  "paymentMethod": "PIX",
  "amountPaid": 50
}
```

Metodos aceitos:

```txt
DEBIT
CREDIT
PIX
CASH
```

## Cliente

### Perfil do cliente

```http
GET /api/clients/me
PATCH /api/clients/me
```

Body do update:

```json
{
  "name": "Joao Silva",
  "phone": "11999999999",
  "email": "joao@email.com",
  "cpf": "12345678900"
}
```

### Barbearias favoritas

```http
GET /api/clients/me/barbershops
POST /api/clients/me/barbershops/:barbershopId
DELETE /api/clients/me/barbershops/:barbershopId
```

## Barbeiro

### Perfil do barbeiro

```http
GET /api/barbers/me
PATCH /api/barbers/me
```

Body do update:

```json
{
  "name": "Barbeiro",
  "phone": "11999999999"
}
```

### Detalhe publico de barbeiro

```http
GET /api/barbers/:barberId
```

### Disponibilidade semanal

```http
PATCH /api/barbers/me/availability
```

Body:

```json
{
  "availability": [
    {
      "weekDay": 1,
      "startTime": "09:00",
      "endTime": "18:00"
    },
    {
      "weekDay": 2,
      "startTime": "09:00",
      "endTime": "18:00"
    }
  ]
}
```

`weekDay`:

```txt
0 = domingo
1 = segunda
2 = terca
3 = quarta
4 = quinta
5 = sexta
6 = sabado
```

### Bloqueios e folgas especificas

Listar bloqueios de um dia:

```http
GET /api/barbers/me/blocks?day=2026-05-15
```

Criar bloqueio parcial:

```http
POST /api/barbers/me/blocks
```

Body:

```json
{
  "day": "2026-05-15",
  "startTime": "12:00",
  "endTime": "14:00",
  "reason": "Almoco"
}
```

Criar folga no dia inteiro:

```json
{
  "day": "2026-05-15",
  "reason": "Folga"
}
```

Excluir bloqueio:

```http
DELETE /api/barbers/me/blocks/:blockId
```

## Admin

### Barbearias do admin

```http
GET /api/admin/barbershops
```

### Criar barbearia

```http
POST /api/admin/barbershops
```

Body:

```json
{
  "name": "Barbearia Central",
  "slug": "barbearia-central",
  "cnpj": "12345678000199",
  "address": "Rua A, 123",
  "phoneOwner": "11999999999",
  "plan": "BASIC"
}
```

### Setup inicial da barbearia

```http
PATCH /api/admin/barbershops/:barbershopId/setup
```

Body:

```json
{
  "workingHours": [
    {
      "weekDay": 1,
      "startTime": "09:00",
      "endTime": "18:00"
    }
  ],
  "services": [
    {
      "name": "Corte",
      "price": 50,
      "duration": 30
    }
  ]
}
```

### Servicos da barbearia

```http
POST /api/admin/barbershops/:barbershopId/services
PUT /api/admin/barbershops/:barbershopId/services/:serviceId
DELETE /api/admin/barbershops/:barbershopId/services/:serviceId
```

Body create:

```json
{
  "name": "Corte",
  "price": 50,
  "duration": 30,
  "barberIds": ["uuid-barbeiro"]
}
```

Body update:

```json
{
  "name": "Corte Masculino",
  "price": 60,
  "duration": 40
}
```

### Horario de funcionamento da barbearia

```http
GET /api/admin/barbershops/:barbershopId/working-hours
PUT /api/admin/barbershops/:barbershopId/working-hours
```

Body:

```json
{
  "workingHours": [
    {
      "weekDay": 1,
      "startTime": "09:00",
      "endTime": "18:00"
    },
    {
      "weekDay": 2,
      "startTime": "09:00",
      "endTime": "18:00"
    }
  ]
}
```

### Convidar barbeiro

```http
POST /api/admin/barbershops/:barbershopId/barber-invites
```

Body:

```json
{
  "name": "Carlos",
  "email": "carlos@email.com",
  "phone": "11988888888",
  "serviceIds": ["uuid-servico"]
}
```

Resposta:

```json
{
  "id": "uuid-convite",
  "token": "token-do-convite",
  "inviteUrl": "http://localhost:5173/#/auth/barber-invite?token=token-do-convite",
  "emailSent": false,
  "message": "Convite criado. O email nao foi enviado; compartilhe o link manualmente."
}
```

Quando o SMTP estiver configurado, `emailSent` retorna `true`. Caso contrario,
o administrador pode copiar e compartilhar `inviteUrl`.

### Convites pendentes

```http
GET /api/admin/barbershops/:barbershopId/barber-invites
DELETE /api/admin/barbershops/:barbershopId/barber-invites/:inviteId
```

### Listagens administrativas

```http
GET /api/admin/barbershops/:barbershopId/admins
GET /api/admin/barbershops/:barbershopId/barbers
DELETE /api/admin/barbershops/:barbershopId/admins/:adminId
DELETE /api/admin/barbershops/:barbershopId/barbers/:barberId
```

## Relatorios

```http
GET /api/barbers/me/dashboard
GET /api/admin/barbers/:barberId/stats
GET /api/admin/barbershops/:barbershopId/stats
```

## Checklist para o frontend

- Salvar `token` retornado no login.
- Enviar `Authorization: Bearer TOKEN` em todas as rotas protegidas.
- Usar `/api/auth/login`, nao `/login`.
- Usar `/api/auth/register`, nao `/register`.
- Ao criar/cancelar bloqueio de barbeiro, recarregar `/api/availability`.
- Ao cancelar agendamento, atualizar a UI para `CANCELLED`.
- Ao concluir agendamento, atualizar a UI para `COMPLETED`.
- Ao reagendar, recarregar detalhe e lista de agendamentos.
