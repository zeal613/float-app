# FLOAT 🌊
### Know what you can spend. Every single day.

## Setup Instructions

### 1. Supabase Setup
1. Go to supabase.com and create a free project
2. Go to SQL Editor → New Query
3. Paste the entire contents of `supabase-setup.sql` and click Run
4. Go to Project Settings → API → copy your Project URL and anon key

### 2. Environment Variables
Create a `.env` file in the project root:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Locally
```bash
npm install
npm run dev
```
Open http://localhost:5173

### 4. Deploy to Vercel (for phone access)
1. Push to GitHub
2. Go to vercel.com → New Project → import your repo
3. Add environment variables in Vercel dashboard
4. Deploy → get your live URL

### 5. Install on Phone
1. Open your Vercel URL on your phone browser
2. Tap Share → "Add to Home Screen"
3. FLOAT installs like a native app

## Tech Stack
- React 18
- Supabase (auth + database + real-time)
- Recharts (charts)
- Vite
- Pure CSS (no Tailwind)

## Features
✅ Real Supabase authentication
✅ Live float calculation (updates in real-time)
✅ M-Pesa SMS import & parser
✅ Bill tracking
✅ Transaction history
✅ Insights & charts
✅ Safe Mode / Emergency Vault
✅ PWA installable on any phone
✅ Pure monochrome black & white design
