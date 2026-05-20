# MesterAI

Az első magyar mesterember menedzsment platform.

## Struktúra

```
mesterai/
├── mobile/          # React Native + Expo SDK 54
├── web/             # Next.js 15 landing + dashboard
└── supabase/        # Migráció + Edge Functions
```

## Gyors start

### Mobil
```bash
cd mobile
npm install
npx expo start
```

### Web
```bash
cd web
npm install
npm run dev
```

### Supabase
```bash
npx supabase db push
npx supabase functions deploy
```

## Env változók

Másold le a `.env.example` fájlokat és töltsd ki az értékeket.

## Stack

- **Mobil**: React Native + Expo SDK 54, expo-router v4
- **Web**: Next.js 15 App Router, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + RLS + Edge Functions)
- **Fizetés**: Stripe
- **AI**: Claude API (Anthropic)
- **SMS**: Twilio
- **Deploy**: Vercel + EAS Build

## Árazás

| Csomag | Ár |
|--------|-----|
| Ingyenes | 0 Ft |
| Pro | 4.900 Ft/hó |
| Business | 9.900 Ft/hó |

14 napos Pro trial bankkártya nélkül.
