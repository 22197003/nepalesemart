# Nepali Ghar Australia

A Next.js / TypeScript full-stack store for Nepali food, groceries and cultural products, with PostgreSQL, Prisma, Tailwind and Stripe payments in AUD.

## What is implemented

- Responsive storefront with editable, ordered homepage sections; hero and promo banners; product cards and category links.
- Search, sorting and pagination; product details, variants, prices, ingredients, allergens, stock and approved reviews.
- Registration, login, logout, verification email, password reset and session invalidation after resets or access changes.
- Persistent guest and customer carts, guest-cart transfer after sign-in, coupons and wishlists.
- Delivery or enabled pickup checkout; server-calculated prices, GST, coupon eligibility, shipping and stock reservations; Stripe Payment Element; payment status and order timelines.
- Customer profiles, saved addresses, order history, shipment tracking and verified-purchase review submissions.
- Permission-checked admin dashboard: products and variants; stock adjustments with a ledger; order fulfilment; tracking; customers; reviews; coupons; delivery zones, methods and rates; banners; homepage sections; page content; brand/GST/cold-delivery settings; payment refunds; analytics; admin roles and permissions; audit log.
- Resend email adapter and retryable notification outbox. Optional presigned POST image uploads to AWS S3 or an endpoint supporting the same API.
- Signed Stripe webhooks, transactional event processing, duplicate-event protection, paid-item cart clearing, stock-restoration protection and an authenticated maintenance endpoint.
- Unit and database integration tests, Docker database configuration and step-by-step setup below.

## Verification and limits

The production build, schema validation, TypeScript checks and 22 unit/integration checks pass. Database checks used an isolated PostgreSQL-compatible PGlite instance; they should also be run against your target PostgreSQL database before launch. Integration payment calls are mocked, while business transactions use the actual database. Browser checks also passed for homepage sections, search, guest cart, registration, cart transfer, customer/admin access, product creation, all admin routes and mobile width.

External card charging, webhook forwarding, Resend delivery and S3 uploads require your service credentials and a final end-to-end test.

`npm run lint` performs TypeScript checking; this project does not configure ESLint.

The included banner/product images and sample reviews are demo placeholders. Publish your actual product photography, business information and policy content before accepting real customers. Domain connection and hosting are not performed by this ZIP.

## Step 1 — Open the updated project

Extract this archive into a new folder and open `nepali-ghar` in PhpStorm. If you copy the changes over an existing project, keep your existing `.env` and back up your database first. This archive excludes `.env`, `node_modules`, `.next` and editor caches.

Use Node.js 22 or 24. From the project folder:

```bash
npm ci
cp .env.example .env
openssl rand -base64 48
```

Paste the generated value into `AUTH_SECRET`. Set your database URLs in `.env`. Never commit `.env`.

## Step 2 — Start PostgreSQL

For a local database, install/start Docker Desktop, then:

```bash
docker compose up -d db
```

The example database URLs already match this local Docker setup. Alternatively, use PostgreSQL from your chosen database provider; set `DATABASE_URL` to its pooled connection and `DIRECT_URL` to its direct connection. Do not use the local demo password in a hosted database.

## Step 3 — Apply migrations and sample products

For a local demo:

```bash
npx prisma validate
npm run db:deploy
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

Local demo logins:

- Owner: `owner@example.com`
- Staff: `staff@example.com`
- Customer: `aarav@example.com`

`SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` override the owner credentials for a new seed. Re-running the demo seed does not change existing user passwords; it does refresh seeded brand/GST settings. Do not run the demo seed against a live shop.

For an empty production database, apply migrations, choose a unique owner email/password in `.env`, and use:

```bash
npm run db:admin
```

This creates an owner without inserting demo orders/customers. An existing account is left unchanged. Add categories, delivery zones/methods/rates, products, banners and homepage sections through admin.

## Step 4 — Add and manage products

Sign in as owner and open `/admin/products`. Create a category first if needed.

1. Enter the name, SKU, category, description, price in cents, initial stock and food details.
2. Paste an HTTPS image URL, or configure the optional image bucket to enable uploads.
3. Select `ACTIVE` to show the product in the shop. Featured/bestseller flags control matching homepage sections.
4. Edit a product to add or manage size/pack variants. Use `/admin/inventory` for later stock adjustments and provide a reason.

Products are archived by changing their status to `ARCHIVED`; historical order snapshots remain intact. Inactive categories and variants are excluded from their public listings.

## Step 5 — Configure delivery and site content

- `/admin/delivery`: edit/create zones, postcode ranges, delivery methods, rates, weight limits and free-delivery thresholds. Enable pickup only when you have actual collection instructions.
- `/admin/settings`: brand, support details, ABN, GST and supported cold-delivery states. By default, frozen/refrigerated delivery is blocked until you configure supported states. State-level cold coverage assumes your service covers the relevant delivery zones in those states; use shipping zones/rates to restrict destinations further.
- `/admin/banners`: hero and promotional banners.
- `/admin/content`: enable/order homepage sections and edit About, FAQ, delivery, returns, privacy and terms pages.
- `/admin/admins`: assign staff roles and permissions. Staff defaults can manage orders and inventory, but cannot change prices or refund payments.

## Step 6 — Enable Stripe test payments

Set all three Stripe variables in `.env`:

```text
STRIPE_SECRET_KEY=your_test_secret_key
STRIPE_PUBLISHABLE_KEY=your_test_publishable_key
STRIPE_WEBHOOK_SECRET=your_webhook_signing_secret
```

Restart the development server after changing environment variables. Using the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Use the signing secret printed by that command. Subscribe to `payment_intent.succeeded`, `payment_intent.payment_failed` and `charge.refunded` in production. The confirmation screen waits for the signed webhook; a browser return URL never marks an order paid.

Test with Stripe's test card `4242 4242 4242 4242`, a future expiry and any valid test CVC. Test unsuccessful payments, duplicate webhook deliveries and a refund. Switch to live keys only after the full flow works with your deployed domain.

Orders reserve stock at checkout. Repeated requests from the same checkout form reuse its request key. If payment creation has an uncertain network outcome, the reservation is kept until the maintenance process reconciles the original Stripe request; it is not released while a charge might exist. Fully refunded orders are restocked automatically only before shipping. For returned shipped goods, add stock through Inventory after receipt/inspection.

## Step 7 — Email, images and maintenance

Development email links appear in the server terminal. For real email, set `EMAIL_PROVIDER=resend`, `EMAIL_API_KEY` and an `EMAIL_FROM` sender verified with Resend. Test verification and reset links on the deployed domain. Emails are stored in the notification outbox and retried by maintenance; stable provider idempotency keys reduce duplicate sends.

For optional direct image uploads, use AWS S3 or an endpoint supporting S3 presigned POST policies. Configure the bucket variables, a public HTTPS host, and bucket CORS allowing your site origin to POST uploads. Policies restrict image types and sizes to 5 MB. Cloudflare R2 and other endpoints that do not support this POST flow can still supply image URLs; their direct uploader needs a provider-specific adapter.

Set a random `CRON_SECRET`. Call:

```text
GET /api/cron/expire-orders
Authorization: Bearer YOUR_CRON_SECRET
```

Orders become eligible for cancellation after 30 minutes unpaid. **The bundled Vercel schedule runs once daily**, so it does not promise release exactly at 30 minutes. For prompt expiry, configure a scheduler to call this endpoint every five minutes (and use a hosting plan that supports that frequency). The endpoint also retries queued/failed email. Failed cancellation/reconciliation leaves stock reserved for review.

For distributed throttling, configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Otherwise limits are in memory and apply only per server instance.

## Step 8 — Validate and deploy

```bash
npm run check
npm run build
npm run start
```

`npm run test` runs five unit checks and skips the database suite unless `TEST_DATABASE_URL` is set. For all 22 checks, prepare a **separate migrated and seeded test database** and run:

```bash
TEST_DATABASE_URL='postgresql://your-test-database-url' npm run test:integration
```

Never point integration tests at production. The script routes database access to the supplied test URL.

For hosting: connect this project to your preferred Next.js host, configure the environment variables, apply `npm run db:deploy` to the production database, create your owner, set `NEXT_PUBLIC_SITE_URL` to your actual HTTPS domain, and add the Stripe webhook endpoint. Do not place live secrets into source code or expose them using `NEXT_PUBLIC_` names.

Before launch, test the payment/email/image services using your own accounts, set real delivery rules and support details, replace sample images and content, and configure database backups and monitoring.

## Sample photography

The demo includes local sample photos for all 15 seeded products and 19 categories/subcategories. These are representative photos and serving suggestions, not actual supplier packaging. Attribution and individual image licences are listed at `/image-credits` and in `public/images/demo/CREDITS.md`. Replace them with your own product photos before launch.

For an existing development database, run `npm run db:images`. This replaces only placeholder or missing images on the known demo records, preserves custom images, and does not reseed accounts, orders, prices or inventory. It is safe to rerun. A fresh `npm run db:seed` already uses the photos.
