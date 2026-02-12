# ChiefOfStaff

A modern task and project management application built with React, Hono, and Supabase.

## Features

- ✅ Task management with status tracking (open/done)
- 📅 Date-based task organization (Today, This Week, Next Week, Longer Term)
- 🎯 Work Focus section for personal priorities
- 📚 To Read section for articles and documentation
- 🏷️ Project categorization with color coding
- 📎 File attachments support
- 🔄 Real-time sync via polling
- 📱 Responsive design with shadcn/ui components

## Tech Stack

**Frontend:**
- React 18
- Vite
- TypeScript
- Tailwind CSS v4
- shadcn/ui components

**Backend:**
- Hono (Edge Runtime)
- Supabase Edge Functions
- Supabase Storage (attachments)
- KV-store data layer (JSONB)

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase project (already configured)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at http://localhost:5173

### Build for Production

```bash
npm run build
```

Output will be in the `dist/` directory.

## Project Structure

```
ChiefOfStaff/
├── src/
│   ├── components/        # React components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── TaskCard.tsx
│   │   ├── TaskSection.tsx
│   │   └── ...
│   ├── supabase/
│   │   └── functions/
│   │       └── server/   # Hono backend
│   ├── utils/           # Utilities and API client
│   ├── App.tsx          # Main application
│   └── main.tsx         # Entry point
├── CLAUDE.md            # Project documentation for Claude
├── DATABASE.md          # Database structure documentation
├── VERCEL_DEPLOYMENT.md # Vercel deployment guide
└── vercel.json          # Vercel configuration
```

## Deployment

### Deploy to Vercel

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed deployment instructions.

**Quick deploy:**
1. Push to GitHub (already done)
2. Import project in Vercel dashboard
3. Add environment variables (if needed)
4. Deploy!

### Backend (Supabase)

The backend runs on Supabase Edge Functions and is already deployed.

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Comprehensive project overview for AI assistants
- **[DATABASE.md](./DATABASE.md)** - Detailed database structure and API documentation
- **[VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)** - Vercel deployment guide

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production

### Key Files

- `src/App.tsx` - Main application orchestrator
- `src/utils/api.ts` - API client for backend
- `src/utils/types.ts` - TypeScript type definitions
- `src/supabase/functions/server/index.tsx` - Hono backend server
- `src/supabase/functions/server/kv_store.tsx` - KV store implementation

## Repository

GitHub: https://github.com/rcsandza/ChiefOfStaff

## License

Private project
