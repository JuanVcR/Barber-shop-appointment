# AI Agent Guide for Projeto-ChatBoot

**Project:** Barbershop Appointment Management System  
**Tech Stack:** Fastify, Prisma ORM, TypeScript, PostgreSQL, Vitest

---

## Quick Start Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server with hot-reload (tsx) |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run compiled production build |
| `npm test` | Run test suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:migrate` | Create and apply database migrations |
| `npm run prisma:deploy` | Deploy existing migrations to production |
| `npm run seed` | Seed database with initial data |

---

## Architecture

### Core Layers (MVC-like Pattern)

```
Routes → Controllers → Services → Repositories → Database (Prisma)
         ↓
       Middleware (auth, validation)
         ↓
       Error Handler (AppError)
```

### Directory Structure

- **`src/routes/`** - Fastify route handlers; import controllers; one file per domain (e.g., `auth-routes.ts`, `booking-routes.ts`)
- **`src/controllers/`** - Request/response handling; call services; validate inputs
- **`src/services/`** - Business logic; orchestrate multiple repositories; handle transactions
- **`src/repositories/`** - Database access layer; thin Prisma wrappers; one per model
- **`src/config/`** - Configuration: environment variables, data stores
- **`src/middlewares/`** - Fastify hooks: `auth.ts` for JWT validation
- **`src/domain/`** - Type definitions for domain enums/constants (e.g., `AccountRole`)
- **`src/errors/`** - Custom error handling (`AppError` class)
- **`src/utils/`** - Utilities: date helpers, password generation
- **`src/lib/`** - External integrations: `mailer.ts` for email

### Domain Model

**Key Entities & Roles:**
- **Account** (base) → email, password, JWT token; has role: `SUPER_ADMIN | BARBERSHOP_ADMIN | BARBER | CLIENT`
- **Client** - extends Account; has bookings, phone, CPF
- **Barber** - extends Account; works for a Barbershop; has availability blocks
- **Barbershop** - owner entity; has admins, barbers, services, bookings, working hours
- **BarbershopAdmin** - manages barbershop; linked Account + Barbershop
- **Booking** - appointment; Client + Barber + Service + Barbershop + status (SCHEDULED/CANCELLED/COMPLETED)
- **Service** - barber service (haircut, shave); has duration, price
- **BarberInvite** - invite flow for barbers to join barbershop

---

## Key Conventions

### File Naming
- Controllers: `*-controller.ts`
- Services: `*-service.ts`
- Repositories: `*-repository.ts`
- Routes: `*-routes.ts`
- Tests: `*.test.ts` (same directory as source)
- Types in file: use inline types; export to `types.ts` if reusable

### Error Handling
- Use `AppError` class for all business errors: `throw new AppError('message', statusCode)`
- Error handler in `src/app.ts` catches `AppError` and returns JSON with message + status
- Validation errors should use 400 status; auth errors use 401; not found uses 404

### Database & Migrations
- Prisma schema: `prisma/schema.prisma`
- Migrations auto-generated: `prisma migrate dev --name <description>`
- Enums in schema (roles, statuses) → typed in TypeScript (see `domain/account-role.ts`)
- Use relations efficiently; include related data only when needed (see `findByIdWithRelations` pattern)

### Authentication
- JWT tokens stored in database (`Account.refreshToken`)
- Middleware: `authMiddleware` validates Bearer token in Authorization header
- User context attached to `req.user` (id, role)
- Protect routes with middleware; check role if needed

### Testing
- Framework: Vitest (globals enabled)
- Config: `vitest.config.ts`, setup: `vitest.setup.ts`
- Place tests in same directory as source (e.g., `auth-routes.test.ts`)
- Use `vi.mock()` for mocking; mocks auto-cleared between tests

### Request/Response Pattern
- All responses (success/error) are JSON
- Success: `{ data: { ... } }` or resource directly
- Error: `{ message: 'error text' }` (handled by error handler)
- Status codes: 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 404 (Not Found), 500 (Server Error)

---

## Common Patterns

### Repository Pattern
```typescript
export const myRepository = {
  findById(id: string) {
    return prisma.myModel.findUnique({ where: { id } });
  },
  create(data: CreateInput) {
    return prisma.myModel.create({ data });
  },
};
```

### Service Pattern
```typescript
export const myService = {
  async doSomething(input: InputType) {
    const existing = await myRepository.findById(input.id);
    if (!existing) {
      throw new AppError('Not found', 404);
    }
    // business logic
    return result;
  },
};
```

### Controller Pattern
```typescript
export const myController = {
  async handler(req: FastifyRequest, reply: FastifyReply) {
    const result = await myService.doSomething(req.body);
    return reply.status(200).send(result);
  },
};
```

### Route Registration
```typescript
async function myRoutes(app: FastifyInstance) {
  app.post('/endpoint', async (req, reply) => {
    return myController.handler(req, reply);
  });
}
```

---

## Pitfalls & Best Practices

1. **Database Queries**
   - Always use `findUnique` with indexed fields (email, slug, phone, CPF)
   - Use `include/select` to fetch relations; avoid N+1 queries
   - Eager-load related data in service if needed for business logic

2. **Authorization**
   - Check `req.user.role` before operations; use role-based access patterns
   - Never trust client input for role; always verify from JWT payload

3. **Validation**
   - Use Zod schemas (imported in several files; add validation layer if needed)
   - Validate in controllers before calling services

4. **Email/Notifications**
   - Async operations via `notificationService` in `src/services/notification-service.ts`
   - Don't block request on email sends; fire-and-forget pattern

5. **Type Safety**
   - Enable strict TypeScript settings (`tsconfig.json`)
   - Use inferred types from Prisma (don't manually type what Prisma provides)
   - Export domain types for reuse across layers

6. **Testing**
   - Mock Prisma calls; test service/controller logic in isolation
   - Use setup files for common test utilities

---

## Debugging Tips

- **Dev Server:** `npm run dev` logs requests/errors via Fastify logger
- **Database:** Check `prisma/migrations/` for schema evolution
- **JWT Issues:** Verify token in [jwt.io](https://jwt.io); check `JWT_SECRET` env var
- **Tests Failing:** Run `npm run test:watch` for incremental feedback

---

## External Resources

- [Fastify Docs](https://www.fastify.io/)
- [Prisma Docs](https://www.prisma.io/docs/)
- [Vitest Docs](https://vitest.dev/)
- [JWT.io](https://jwt.io/)

---

## When Adding New Features

1. **New Endpoint?**
   - Create/update route in `src/routes/*-routes.ts`
   - Add controller in `src/controllers/*-controller.ts` (if not reusing)
   - Add service in `src/services/*-service.ts` for business logic
   - Add/update repository in `src/repositories/*-repository.ts` if new DB access needed

2. **New Database Entity?**
   - Update `prisma/schema.prisma`
   - Run `npm run prisma:migrate` and name the migration
   - Create repository in `src/repositories/*-repository.ts`
   - Update services that interact with it

3. **New Authorization Rule?**
   - Add check in controller or middleware
   - Consider service-level validation if complex
   - Sync role checks with `domain/account-role.ts`

4. **New Error Scenario?**
   - Throw `AppError` with appropriate status code
   - Let error handler in `src/app.ts` catch it
   - Test that error response is sent correctly

---

## Code Review Focus Areas

- Correct layer separation (routes → controllers → services → repositories)
- Proper error handling with `AppError`
- Authorization checks for role-based access
- Efficient database queries (joins, includes)
- Type safety (no `any` unless unavoidable)
- Test coverage for services and key controllers
