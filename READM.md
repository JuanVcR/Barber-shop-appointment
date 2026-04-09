Visão geral

Esse projeto faz 3 coisas:

conecta no WhatsApp com whatsapp-web.js

sobe uma API com Fastify

deixa cada barbearia configurar:

dias de atendimento

horários disponíveis

duração do serviço

valores

mensagem de boas-vindas

________________________________________________________

AREA DO BARBEIRO 
AREA DO USUARIO

tabelas

Barbearia -> servicos
servicos -> relaciona com a tabela Profissionais
que vai listar os horarios



# 📚 Exemplos de Requisições da API

## 🔐 AUTENTICAÇÃO

### 1. Registrar Usuário
```bash
curl -X POST http://localhost:3333/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@email.com",
    "phone": "5581999999999",
    "password": "senha123"
  }'
```

**JSON:**
```json
{
  "name": "João Silva",
  "email": "joao@email.com",
  "phone": "5581999999999",
  "password": "senha123"
}
```

**Response (201):**
```json
{
  "id": "uuid-aqui",
  "name": "João Silva",
  "email": "joao@email.com",
  "phone": "5581999999999"
}
```

---

### 2. Login
```bash
curl -X POST http://localhost:3333/api/auth/login \
  -H "Content-Type: application/json" \ 
  -d '{
    "email": "joao@email.com",
    "password": "senha123"
  }'
```

**JSON:**
```json
{
  "email": "joao@email.com",
  "password": "senha123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0OTUwYjU3Ni1kOTNkLTQyNzgtOGIxOS0xYTUyYzQ1MjQ1NzIiLCJpYXQiOjE2Nzc2NjI4MzksImV4cCI6MTY3ODI2NzYzOX0.xyz123..."
}
```

---

### 3. Recuperar Senha - Usuário
```bash
curl -X POST http://localhost:3333/api/auth/forgot-password/user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@email.com"
  }'
```

**JSON:**
```json
{
  "email": "joao@email.com"
}
```

**Response (200):**
```json
{
  "message": "Token gerado com sucesso",
  "token": "550e8400-e29b-41d4-a716-446655440000",
  "resetUrl": "http://localhost:3333/reset-password?token=550e8400-e29b-41d4-a716-446655440000"
}
```

---

### 4. Recuperar Senha - Barbeiro
```bash
curl -X POST http://localhost:3333/api/auth/forgot-password/barber \
  -H "Content-Type: application/json" \
  -d '{
    "email": "carlos@barber.com"
  }'
```

**JSON:**
```json
{
  "email": "carlos@barber.com"
}
```

**Response (200):**
```json
{
  "message": "Token gerado com sucesso",
  "token": "550e8400-e29b-41d4-a716-446655440001",
  "resetUrl": "http://localhost:3333/reset-password?token=550e8400-e29b-41d4-a716-446655440001"
}
```

---

### 5. Redefinir Senha
```bash
curl -X POST http://localhost:3333/api/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "550e8400-e29b-41d4-a716-446655440000",
    "newPassword": "nova_senha123"
  }'
```

**JSON:**
```json
{
  "token": "550e8400-e29b-41d4-a716-446655440000",
  "newPassword": "nova_senha123"
}
```

**Response (200):**
```json
{
  "message": "Senha redefinida com sucesso"
}
```

---

### 6. Trocar Senha (Logado) ⭐ REQUER TOKEN
```bash
curl -X PATCH http://localhost:3333/api/auth/me/password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "currentPassword": "senha_antiga",
    "newPassword": "nova_senha"
  }'
```

**Headers:**
```
Authorization: Bearer {seu_token_aqui}
Content-Type: application/json
```

**JSON:**
```json
{
  "currentPassword": "senha_antiga",
  "newPassword": "nova_senha"
}
```

**Response (200):**
```json
{
  "message": "Senha alterada com sucesso"
}
```

---

## 🏪 BARBEARIAS

### 7. Listar Todas as Barbearias
```bash
curl -X GET http://localhost:3333/api/barbershops
```

**Response (200):**
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Barbearia Alpha",
    "slug": "barbearia-alpha",
    "phoneOwner": "5581999999999",
    "createdAt": "2026-03-26T15:20:30.000Z",
    "services": [
      {
        "id": "223e4567-e89b-12d3-a456-426614174001",
        "name": "Corte",
        "price": 35,
        "duration": 40,
        "barbershopId": "123e4567-e89b-12d3-a456-426614174000",
        "createdAt": "2026-03-26T15:20:30.000Z",
        "barbers": [
          {
            "barberId": "323e4567-e89b-12d3-a456-426614174002",
            "serviceId": "223e4567-e89b-12d3-a456-426614174001",
            "barber": {
              "id": "323e4567-e89b-12d3-a456-426614174002",
              "name": "Carlos",
              "email": "carlos@barber.com",
              "phone": "5581888888888",
              "barbershopId": "123e4567-e89b-12d3-a456-426614174000",
              "createdAt": "2026-03-26T15:20:30.000Z"
            }
          }
        ]
      }
    ]
  }
]
```

---

### 8. Buscar Barbearia por Slug
```bash
curl -X GET http://localhost:3333/api/barbershops/barbearia-alpha
```

**Response (200):**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Barbearia Alpha",
  "slug": "barbearia-alpha",
  "phoneOwner": "5581999999999",
  "createdAt": "2026-03-26T15:20:30.000Z",
  "services": [
    {
      "id": "223e4567-e89b-12d3-a456-426614174001",
      "name": "Corte",
      "price": 35,
      "duration": 40,
      "barbershopId": "123e4567-e89b-12d3-a456-426614174000",
      "createdAt": "2026-03-26T15:20:30.000Z",
      "barbers": [
        {
          "barberId": "323e4567-e89b-12d3-a456-426614174002",
          "serviceId": "223e4567-e89b-12d3-a456-426614174001",
          "barber": {
            "id": "323e4567-e89b-12d3-a456-426614174002",
            "name": "Carlos",
            "email": "carlos@barber.com",
            "phone": "5581888888888",
            "barbershopId": "123e4567-e89b-12d3-a456-426614174000",
            "createdAt": "2026-03-26T15:20:30.000Z"
          }
        }
      ]
    }
  ]
}
```

---

## 📅 AGENDAMENTOS

### 9. Listar Horários Disponíveis
```bash
curl -X GET "http://localhost:3333/api/availability?barberId=323e4567-e89b-12d3-a456-426614174002&serviceId=223e4567-e89b-12d3-a456-426614174001&day=2026-03-30"
```

**Query Parameters:**
```
barberId: 323e4567-e89b-12d3-a456-426614174002
serviceId: 223e4567-e89b-12d3-a456-426614174001
day: 2026-03-30
```

**Response (200):**
```json
[
  "09:00",
  "10:00",
  "11:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00"
]
```

---

### 10. Criar Agendamento ⭐ REQUER TOKEN
```bash
curl -X POST http://localhost:3333/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "barberId": "323e4567-e89b-12d3-a456-426614174002",
    "serviceId": "223e4567-e89b-12d3-a456-426614174001",
    "barbershopId": "123e4567-e89b-12d3-a456-426614174000",
    "day": "2026-03-30",
    "time": "10:00"
  }'
```

**Headers:**
```
Authorization: Bearer {seu_token_aqui}
Content-Type: application/json
```

**JSON:**
```json
{
  "barberId": "323e4567-e89b-12d3-a456-426614174002",
  "serviceId": "223e4567-e89b-12d3-a456-426614174001",
  "barbershopId": "123e4567-e89b-12d3-a456-426614174000",
  "day": "2026-03-30",
  "time": "10:00"
}
```

**Response (201):**
```json
{
  "id": "423e4567-e89b-12d3-a456-426614174003",
  "day": "2026-03-30",
  "time": "10:00",
  "userId": "4950b576-d93d-4278-8b19-1a52c4524572",
  "barberId": "323e4567-e89b-12d3-a456-426614174002",
  "serviceId": "223e4567-e89b-12d3-a456-426614174001",
  "barbershopId": "123e4567-e89b-12d3-a456-426614174000",
  "createdAt": "2026-03-30T15:20:30.000Z",
  "user": {
    "id": "4950b576-d93d-4278-8b19-1a52c4524572",
    "name": "João Silva",
    "email": "joao@email.com",
    "phone": "5581999999999",
    "createdAt": "2026-03-30T15:20:30.000Z"
  },
  "barber": {
    "id": "323e4567-e89b-12d3-a456-426614174002",
    "name": "Carlos",
    "email": "carlos@barber.com",
    "phone": "5581888888888",
    "barbershopId": "123e4567-e89b-12d3-a456-426614174000",
    "createdAt": "2026-03-26T15:20:30.000Z"
  },
  "service": {
    "id": "223e4567-e89b-12d3-a456-426614174001",
    "name": "Corte",
    "price": 35,
    "duration": 40,
    "barbershopId": "123e4567-e89b-12d3-a456-426614174000",
    "createdAt": "2026-03-26T15:20:30.000Z"
  },
  "barbershop": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Barbearia Alpha",
    "slug": "barbearia-alpha",
    "phoneOwner": "5581999999999",
    "createdAt": "2026-03-26T15:20:30.000Z"
  }
}
```

---

### 11. Listar Agendamentos por Dia
```bash
curl -X GET "http://localhost:3333/api/bookings/123e4567-e89b-12d3-a456-426614174000/2026-03-30"
```

**Path Parameters:**
```
barbershopId: 123e4567-e89b-12d3-a456-426614174000
day: 2026-03-30
```

**Response (200):**
```json
[
  {
    "id": "423e4567-e89b-12d3-a456-426614174003",
    "day": "2026-03-30",
    "time": "10:00",
    "userId": "4950b576-d93d-4278-8b19-1a52c4524572",
    "barberId": "323e4567-e89b-12d3-a456-426614174002",
    "serviceId": "223e4567-e89b-12d3-a456-426614174001",
    "barbershopId": "123e4567-e89b-12d3-a456-426614174000",
    "createdAt": "2026-03-30T15:20:30.000Z",
    "user": {
      "id": "4950b576-d93d-4278-8b19-1a52c4524572",
      "name": "João Silva",
      "email": "joao@email.com",
      "phone": "5581999999999",
      "createdAt": "2026-03-30T15:20:30.000Z"
    },
    "barber": {
      "id": "323e4567-e89b-12d3-a456-426614174002",
      "name": "Carlos",
      "email": "carlos@barber.com",
      "phone": "5581888888888",
      "barbershopId": "123e4567-e89b-12d3-a456-426614174000",
      "createdAt": "2026-03-26T15:20:30.000Z"
    },
    "service": {
      "id": "223e4567-e89b-12d3-a456-426614174001",
      "name": "Corte",
      "price": 35,
      "duration": 40,
      "barbershopId": "123e4567-e89b-12d3-a456-426614174000",
      "createdAt": "2026-03-26T15:20:30.000Z"
    }
  }
]
```

---

## 📋 DADOS DE TESTE (Seed)

**Barbearia:**
- ID: (gerado no seed)
- Slug: `barbearia-alpha`
- Nome: `Barbearia Alpha`
- Telefone: `5581999999999`

**Usuário (Cliente):**
- Email: `cliente@teste.com`
- Senha: `123456`
- Telefone: `5581999999999`
- Nome: `Cliente Teste`

**Barbeiro (Profissional):**
- Email: `carlos@barber.com`
- Senha: `123456`
- Telefone: `5581888888888`
- Nome: `Carlos`

**Serviço:**
- Nome: `Corte`
- Preço: `R$ 35,00`
- Duração: `40 minutos`

---

## 🎯 FLUXO COMPLETO

1. **Login** → Obter token
   ```json
   {
     "email": "cliente@teste.com",
     "password": "123456"
   }
   ```

2. **Listar Barbearias** → Copiar IDs

3. **Listar Disponibilidade**
   ```
   ?barberId=...&serviceId=...&day=2026-03-30
   ```

4. **Criar Agendamento** (com token)
   ```json
   {
     "barberId": "...",
     "serviceId": "...",
     "barbershopId": "...",
     "day": "2026-03-30",
     "time": "10:00"
   }
   ```

---

## ⚠️ ERROS COMUNS

**401 - Token não informado:**
```json
{
  "message": "Token nao informado"
}
```

**400 - Erro na validação:**
```json
{
  "message": "Email ja cadastrado"
}
```

**404 - Recurso não encontrado:**
```json
{
  "message": "Barbearia nao encontrada"
}
```