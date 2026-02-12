# Deploying ChiefOfStaff to Vercel

This guide walks through deploying the ChiefOfStaff app to Vercel while keeping the backend on Supabase Edge Functions.

## Architecture Overview

**Frontend (Vercel):**
- React 18 + Vite SPA
- shadcn/ui components
- Tailwind CSS v4

**Backend (Supabase):**
- Hono server on Edge Functions
- KV-store data layer
- Storage buckets for attachments

## Prerequisites

1. Vercel account: https://vercel.com/signup
2. Vercel CLI (optional): `npm i -g vercel`
3. Supabase project (already configured)
4. GitHub repo (already created)

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/new
   - Sign in with your GitHub account

2. **Import Your Repository**
   - Click "Add New..." → "Project"
   - Select your GitHub account
   - Import the `ChiefOfStaff` repository

3. **Configure Build Settings**

   Vercel should auto-detect the Vite project. Verify these settings:

   - **Framework Preset:** Vite
   - **Root Directory:** `./` (leave as default)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

4. **Add Environment Variables**

   Click "Environment Variables" and add:

   ```
   VITE_SUPABASE_URL=https://ctmrnprvkyxvsjkbxyyv.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0bXJucHJ2a3l4dnNqa2J4eXl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NTcxMDMsImV4cCI6MjA3NjUzMzEwM30.HXd0nkDlPP0rCXz7HiEXlcvVMBF5xtgxcpdClnE278M
   ```

   **Note:** Check if your app uses these env vars in the code. If not, they may not be needed.

5. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete (~2-3 minutes)
   - You'll get a URL like: `https://chief-of-staff-xyz.vercel.app`

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (from project directory)
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? [Your account]
# - Link to existing project? No
# - Project name? ChiefOfStaff
# - Directory? ./
# - Override settings? No

# After successful deployment, deploy to production:
vercel --prod
```

## Post-Deployment Configuration

### 1. Update CORS Settings (Supabase)

If you encounter CORS errors, update your Supabase Edge Function to allow your Vercel domain:

In `src/supabase/functions/server/index.tsx`, the CORS middleware is already configured with:
```typescript
app.use('*', cors());
```

This allows all origins. For production, you may want to restrict this:
```typescript
app.use('*', cors({
  origin: [
    'https://chief-of-staff-xyz.vercel.app',
    'http://localhost:5173'
  ]
}));
```

### 2. Update API Endpoint (if needed)

Check `src/utils/api.ts` to ensure it's pointing to the correct Supabase Edge Function URL.

### 3. Custom Domain (Optional)

1. Go to your project settings on Vercel
2. Navigate to "Domains"
3. Add your custom domain
4. Update DNS records as instructed by Vercel

## Environment Variables Reference

If your app uses environment variables, create a `.env.example` file:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://ctmrnprvkyxvsjkbxyyv.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# API Base URL (if different from Supabase URL)
VITE_API_BASE_URL=https://ctmrnprvkyxvsjkbxyyv.supabase.co/functions/v1
```

## Troubleshooting

### Build Fails

**Error: Cannot find module 'X'**
- Solution: Run `npm install` locally to ensure package.json is correct
- Check that all dependencies are listed in `dependencies` (not just `devDependencies`)

**TypeScript errors**
- Solution: Add TypeScript to devDependencies: `npm i -D typescript`
- Ensure `tsconfig.json` exists

### Runtime Errors

**API calls failing**
- Check browser console for CORS errors
- Verify Supabase Edge Function is deployed and accessible
- Test the API directly: `curl https://ctmrnprvkyxvsjkbxyyv.supabase.co/functions/v1/make-server-5053ecf8/health`

**White screen / No content**
- Check browser console for JavaScript errors
- Verify the build output in Vercel deployment logs
- Ensure `dist` folder is being generated correctly

### Performance Issues

**Slow initial load**
- Enable Vercel's compression and caching
- Consider code splitting for large bundles
- Optimize images and assets

## Vercel Configuration File

A `vercel.json` file has been created for additional configuration:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

This ensures client-side routing works correctly (SPA fallback to index.html).

## Continuous Deployment

Vercel automatically sets up continuous deployment:

- **Production:** Every push to `main` branch triggers a production deployment
- **Preview:** Every pull request gets a unique preview URL
- **Rollback:** Easy rollback to previous deployments in Vercel dashboard

## Monitoring & Analytics

1. **Vercel Analytics**
   - Enable in project settings → Analytics
   - Get insights on page views, performance, and Web Vitals

2. **Logs**
   - View real-time logs in Vercel dashboard
   - Function logs for serverless functions (if you migrate backend later)

## Next Steps: Migrating Backend to Vercel (Optional)

If you want to consolidate hosting and move the Hono backend from Supabase Edge Functions to Vercel Serverless Functions:

1. Convert Edge Function code to Vercel Serverless Function format
2. Update API routes from `/functions/v1/make-server-5053ecf8/*` to `/api/*`
3. Configure Vercel serverless functions in `api/` directory
4. Update environment variables for Supabase client
5. Redeploy

This is more complex and can be tackled later if needed.

## Resources

- **Vercel Documentation:** https://vercel.com/docs
- **Vite Deployment Guide:** https://vite.dev/guide/static-deploy.html#vercel
- **Vercel CLI Reference:** https://vercel.com/docs/cli
- **Supabase Edge Functions:** https://supabase.com/docs/guides/functions
