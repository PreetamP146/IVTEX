# CRM Sales Management API

A RESTful backend that takes a company's sales process from lead generation through qualification, conversion to a customer, deal management and closure.

## Technologies

- Node.js 18+ and Express 4
- MongoDB with Mongoose 8 (transactions, aggregation pipelines)
- Zod for request validation
- JWT access tokens plus rotating refresh tokens in HTTP-only cookies
- bcryptjs, helmet, cors, express-rate-limit
- Swagger UI (OpenAPI 3) for documentation

## Project structure

```
src/
├── config/          environment parsing, database connection
├── constants/       roles, enums, timeline actions
├── controllers/     HTTP layer, no business logic
├── docs/            OpenAPI specification
├── domain/          pure business rules (lead workflow, deal policy)
├── middleware/      authenticate, authorize, validate, error handling, rate limiting
├── models/          Mongoose schemas and indexes
├── repositories/    all database access
├── routes/          route definitions and role guards
├── services/        business logic and access scoping
├── utils/           ApiError, response helpers, token and password helpers
├── validators/      Zod schemas
├── container.js     composition root that wires dependencies
├── app.js           Express application
└── server.js        entry point
scripts/seed.js      creates the admin, a manager and two executives
```

Each request flows `route -> validation -> controller -> service -> repository -> model`. Services depend on repositories and collaborators passed in through their constructors, and `container.js` is the only place that builds the object graph.

## Installation

```bash
npm install
cp .env.example .env
```

Edit `.env` and set real values for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.

## Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `NODE_ENV` | `development`, `production` or `test` | `development` |
| `PORT` | HTTP port | `5000` |
| `MONGO_URI` | MongoDB connection string (replica set required) | none |
| `JWT_ACCESS_SECRET` | Signing secret for access tokens | none |
| `JWT_REFRESH_SECRET` | Signing secret for refresh tokens | none |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifetime | `15m` |
| `REFRESH_TOKEN_TTL_DAYS` | Refresh token lifetime in days | `7` |
| `BCRYPT_SALT_ROUNDS` | bcrypt cost factor | `12` |
| `CORS_ORIGINS` | Comma separated list of allowed origins | `http://localhost:3000` |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | Global rate limit | 15 min / 300 |
| `AUTH_RATE_LIMIT_MAX` | Limit for login, register and refresh | `20` |
| `SEED_ADMIN_*` | Credentials used by the seed script | see `.env.example` |

## Database setup

Lead conversion uses MongoDB transactions, which need a replica set. Pick one:

**Docker (local)**

```bash
docker compose up -d
```

This starts a single-node replica set on `localhost:27017`. The default `MONGO_URI` in `.env.example` points at it.

**MongoDB Atlas**

Create a free cluster and use its connection string as `MONGO_URI`. Atlas clusters are replica sets already.

Then create the first users:

```bash
npm run seed
```

| Email | Password | Role |
| --- | --- | --- |
| `admin@crm.local` | `Admin@12345` | admin |
| `manager@crm.local` | `Password@123` | sales_manager |
| `executive1@crm.local` | `Password@123` | sales_executive (in the manager's team) |
| `executive2@crm.local` | `Password@123` | sales_executive (in the manager's team) |

## Running the server

```bash
npm run dev     # nodemon
npm start       # plain node
```

Swagger UI is served at `http://localhost:5000/api-docs` and a health check at `/health`. All API routes live under `/api/v1`.

## Authentication

- `POST /auth/login` returns `{ user, accessToken }`. Send the token as `Authorization: Bearer <token>`.
- A refresh token is set as an `HttpOnly`, `SameSite=Strict` cookie scoped to `/api/v1/auth` (and `Secure` in production). Only its SHA-256 hash is stored in the database.
- `POST /auth/refresh` rotates both tokens. A refresh token can be used once. Reusing an old one is rejected.
- `POST /auth/logout` revokes the stored refresh token and clears the cookie.
- Changing a password or deactivating a user revokes their refresh token. Deactivated users are also rejected on every request because the user is loaded from the database by the authentication middleware.
- Passwords are hashed with bcrypt and never returned. The password and token hash fields are `select: false` and stripped from JSON output.
- Public registration always creates a `sales_executive`. Only an admin can create managers and admins.

## Roles and permissions

| Capability | Admin | Sales Manager | Sales Executive |
| --- | --- | --- | --- |
| Manage users | yes | no | no |
| List assignable team members (`/users/team`) | all executives | own team | no |
| View leads, customers, deals | all | own team plus unassigned | assigned to them |
| Create and update leads, customers, deals | yes | yes | yes, within their scope |
| Assign or reassign leads and deals | any active executive | executives in own team | no |
| Delete leads, customers, deals | yes | yes (closed deals: admin only) | no |
| Convert qualified leads | yes | yes | yes |
| Create activities and notes | yes | yes | yes |
| Dashboard stats and pipeline | everything | own team | own records |
| Team performance | all executives | own team | no |

A manager's team is the set of sales executives whose `manager` field points at them. Admins set this when creating or updating a user.

## API overview

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `GET /auth/me`, `PATCH /auth/change-password` |
| Users | `POST /users`, `GET /users`, `GET /users/team`, `GET/PATCH/DELETE /users/:id`, `PATCH /users/:id/status` |
| Leads | `POST /leads`, `GET /leads`, `GET/PATCH/DELETE /leads/:id`, `PATCH /leads/:id/status`, `PATCH /leads/:id/assign`, `POST /leads/:id/convert`, `GET /leads/:id/timeline` |
| Customers | `POST /customers`, `GET /customers`, `GET/PATCH/DELETE /customers/:id`, `GET /customers/:id/timeline` |
| Deals | `POST /deals`, `GET /deals`, `GET/PATCH/DELETE /deals/:id`, `PATCH /deals/:id/stage`, `PATCH /deals/:id/assign`, `GET /deals/:id/timeline` |
| Activities | `POST /activities`, `GET /activities`, `GET/PATCH/DELETE /activities/:id`, `PATCH /activities/:id/complete` |
| Dashboard | `GET /dashboard/stats`, `/dashboard/pipeline`, `/dashboard/team-performance` |

The full request and response reference, including error responses and the roles allowed on each route, is in Swagger UI at `/api-docs`.

### Listing, filtering and pagination

Every list endpoint accepts `page`, `limit` (max 100), `sortBy`, `order` and `search`, plus module specific filters that can be combined freely.

```
GET /api/v1/leads?status=qualified&priority=high&source=website&assignedTo=<id>&createdFrom=2026-01-01&createdTo=2026-03-31&search=acme&sortBy=createdAt&order=desc&page=1&limit=20
GET /api/v1/deals?stage=negotiation&minAmount=10000&maxAmount=50000&closingFrom=2026-11-01&closingTo=2026-12-31
GET /api/v1/activities?status=overdue&assignedTo=<id>
```

A date-only `*To` value covers the whole day.

### Response format

```json
{
  "success": true,
  "message": "Leads fetched successfully",
  "data": [],
  "meta": {
    "pagination": { "currentPage": 1, "pageSize": 10, "totalRecords": 42, "totalPages": 5 }
  }
}
```

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "email", "message": "Must be a valid email address" }]
}
```

### Sample requests

Login

```http
POST /api/v1/auth/login
{ "email": "manager@crm.local", "password": "Password@123" }
```
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { "_id": "665f...", "name": "Maya Manager", "email": "manager@crm.local", "role": "sales_manager", "isActive": true },
    "accessToken": "eyJhbGciOi..."
  }
}
```

Create a lead

```http
POST /api/v1/leads
Authorization: Bearer <token>
{ "name": "Priya Sharma", "email": "priya@acme.com", "phone": "+919812345678", "company": "Acme Corp", "source": "website", "priority": "high" }
```

Assign it

```http
PATCH /api/v1/leads/<leadId>/assign
{ "assignedTo": "<executiveId>" }
```

Move it to qualified, then convert

```http
PATCH /api/v1/leads/<leadId>/status
{ "status": "qualified" }

POST /api/v1/leads/<leadId>/convert
{
  "customer": { "address": { "city": "Mumbai", "country": "India" } },
  "deal": { "name": "Acme annual licence", "value": 25000, "expectedClosingDate": "2027-03-31" }
}
```
```json
{
  "success": true,
  "message": "Lead converted successfully",
  "data": {
    "lead": { "status": "converted", "customer": "<customerId>", "deal": "<dealId>" },
    "customer": { "name": "Priya Sharma", "lead": "<leadId>" },
    "deal": { "stage": "qualification", "value": 25000, "probability": 10, "expectedRevenue": 2500 }
  }
}
```

Close a deal as lost

```http
PATCH /api/v1/deals/<dealId>/stage
{ "stage": "lost", "lostReason": "Customer chose a competitor" }
```

Create a follow-up on a lead

```http
POST /api/v1/activities
{ "type": "follow_up", "title": "Call back about pricing", "dueDate": "2027-01-15T10:00:00Z", "relatedType": "lead", "relatedId": "<leadId>" }
```

Errors

```json
{ "success": false, "message": "Lead has already been converted" }
{ "success": false, "message": "You do not have access to this lead" }
```

## Important business rules

**Leads**
- Status transitions are validated (`new -> contacted -> qualified`, and so on). `converted` can only be reached through the convert endpoint and is terminal.
- Only qualified leads convert, and only once. Conversion needs an assigned executive.
- Converted leads cannot be edited, re-statused or deleted.
- Priority changes, status changes and assignment changes are written to the timeline with previous and new values.

**Assignment**
- Assignees must exist, be active and be sales executives. Managers can only assign inside their own team. Executives cannot change assignments.
- Resources outside a user's scope respond with `403`.

**Conversion**
- Runs in one MongoDB transaction: the lead is claimed with a conditional update (`status: qualified -> converted`), the customer and deal are created, the lead is linked to both, and three timeline entries are written. Any failure rolls everything back, and the conditional update makes concurrent double conversion impossible.
- Customer references the lead (unique sparse index) and the deal references both customer and lead.

**Deals**
- `value` must be greater than zero, `probability` between 0 and 100.
- `expectedRevenue` is always calculated by the server as `value x probability / 100`. Clients cannot set it.
- Without an explicit probability, each stage applies a default: qualification 10, discovery 25, proposal 50, negotiation 75.
- Expected closing date cannot be in the past or more than five years ahead.
- Allowed moves: qualification -> discovery -> proposal -> negotiation, one step back or forward between active stages, and any active stage -> lost. Won is only reachable from proposal or negotiation.
- Won deals are checked for value, closing date and customer, and get probability 100. Lost deals require a reason and get probability and expected revenue of 0.
- Won and lost deals are closed: they cannot be edited, reassigned or moved back.

**Activities**
- Stored status is `pending` or `completed`. `overdue` is derived at read time from `status = pending` and `dueDate < now`, and the `status=overdue` filter uses the same condition, so no background job is needed.
- Activities may relate to a lead, customer, deal or user, and the caller must have access to that entity. Notes, follow-ups and their completion are recorded on the related entity's timeline.
- Completed activities cannot be edited. Executives can delete only activities they created.

**Users**
- Users with assigned records cannot be deleted. Deactivate them instead. Admins cannot deactivate, delete or change the role of their own account.

## Database design

Collections: `users`, `leads`, `customers`, `deals`, `activities`, `timelines`.

```
User ──< Lead (assignedTo, createdBy)
User ──< Customer (assignedTo)
User ──< Deal (assignedTo)
User ──< Activity (assignedTo, createdBy)
User ──< User (manager -> team of executives)
Lead ──1 Customer (customer.lead, unique)
Customer ──< Deal (deal.customer)
Lead ──< Deal (deal.lead)
Activity ──> Lead | Customer | Deal | User (relatedType + relatedId)
Timeline ──> Lead | Customer | Deal (entityType + entityId)
```

References are used instead of embedding because every entity is queried and updated on its own and has an unbounded set of related records. Activities and timeline entries carry a polymorphic `relatedType`/`entityType` plus id so one collection serves all entities. The lead stores `customer` and `deal` back-references to make the converted chain readable from either end.

### Indexes

| Collection | Indexes | Serves |
| --- | --- | --- |
| users | `email` (unique), `{role, isActive}`, `{manager, role}`, `name`, `createdAt` | login, role and status filters, team lookup |
| leads | `{assignedTo, status, createdAt}`, `{status, createdAt}`, `source`, `priority`, `email`, `createdAt` | scoped lists, status and source filters, date ranges |
| customers | `email` (unique), `lead` (unique, sparse), `{assignedTo, status, createdAt}`, `status`, `createdAt` | duplicate protection, one customer per lead, scoped lists |
| deals | `{assignedTo, stage}`, `{stage, expectedClosingDate}`, `customer`, `lead`, `value`, `createdAt` | pipeline and filters, amount ranges, customer detail |
| activities | `{assignedTo, status, dueDate}`, `{status, dueDate}`, `{relatedType, relatedId, dueDate}`, `createdBy`, `createdAt` | overdue and pending queries, per-entity lookups |
| timelines | `{entityType, entityId, createdAt}`, `{performedBy, createdAt}` | entity timelines |

Other performance choices: list queries use `lean()`, counts run in parallel with the page query, populated user fields are limited with `select`, and dashboard metrics come from `$group` aggregations instead of loading documents. Search uses escaped, case-insensitive regular expressions on a small set of fields.

## Security

Helmet headers, CORS restricted to `CORS_ORIGINS`, a global rate limit with a stricter one on auth routes, a 100 KB body limit, Zod validation on every body, query and parameter (unknown fields are stripped, so clients cannot set fields like `role` or `expectedRevenue` through ordinary updates), centralized error handling that hides stack traces and database details in production, and no request bodies in logs.

## Assumptions

- Teams are modelled with a `manager` field on each executive. Executives without a manager are visible to admins only.
- Managers also see unassigned leads, customers and deals so that they can distribute them.
- Customers are unique by email. Converting a lead whose email already belongs to a customer returns `409`.
- Public registration is open and creates executives only, which is how a candidate can try the API without an admin. Disable the route if that is not wanted.
- "CRM configuration" is not modelled as a separate resource. Admin control is covered by user management and the role model.
- Timeline entries are kept when the underlying lead, customer or deal is deleted, as an audit record.

## Deployment

The service needs a Node.js host and a MongoDB replica set. A typical setup is MongoDB Atlas for the database and Render, Railway or similar for the app with `npm install` as the build command, `npm start` as the start command, and the variables above set in the dashboard (`NODE_ENV=production`, `CORS_ORIGINS` set to the frontend origin).

Deployed link: _add the URL here after deploying_
