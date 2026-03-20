# myWash

Tu auto, tu estilo, tu wash. On-site car wash service for office and residential buildings in Mexico.

## Tech Stack

- **Frontend**: Next.js 16, TypeScript, Tailwind CSS v4, shadcn/ui v4
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime, Edge Functions)
- **Payments**: Stripe + MercadoPago + Cash
- **Hosting**: Vercel
- **i18n**: next-intl (Spanish + English)

## Getting Started

```bash
npm install
cp .env.example .env.local
# Fill in your Supabase and Stripe credentials
npm run dev
supabase db push --dns-resolver https
```

## Setup Admin User

1. Sign up at the app
2. Go to Supabase Dashboard > SQL Editor
3. Run: `SELECT promote_to_admin('your@email.com');`

## License

Private — All rights reserved.
