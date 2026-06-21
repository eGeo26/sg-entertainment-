# Staging Branch Setup Instructions

This document explains how to set up a staging branch for preview deployments isolated from production.

## Overview

The staging branch will:
- Have its own separate preview URL (Netlify/Vercel deploy preview)
- Use Hubtel sandbox environment by default
- Allow safe payment testing before merging to main
- Be completely isolated from the live production site

## Step 1: Create the Staging Branch

```bash
# From your project root
git checkout -b staging
git push -u origin staging
```

## Step 2: Configure Deploy Preview Platform

### Option A: Using Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings → Git
3. Under "Deploy Hooks", ensure "Preview Deployments" are enabled
4. Add `staging` to your protected branches (Settings → Git → Protected Branches)
5. Vercel will automatically create preview URLs for every push to staging

### Option B: Using Netlify

1. Go to your Netlify site dashboard
2. Navigate to Site Settings → Build & Deploy → Deploy contexts
3. Add `staging` branch to "Branch deploy contexts"
4. Set a custom subdomain for staging (e.g., `staging-sg-studio-booking.netlify.app`)
5. Enable "Deploy previews" for all branches

## Step 3: Configure Environment Variables for Staging

In your deployment platform (Vercel/Netlify), add these environment variables for the staging context:

```
HUBTEL_ENV=sandbox
HUBTEL_SANDBOX_CLIENT_ID=your_sandbox_client_id
HUBTEL_SANDBOX_CLIENT_SECRET=your_sandbox_client_secret
HUBTEL_SANDBOX_MERCHANT_ACCOUNT_NUMBER=your_sandbox_merchant_account
HUBTEL_WEBHOOK_SECRET=your_webhook_secret
```

**Important**: Do NOT set production Hubtel credentials in staging. Only use sandbox credentials.

## Step 4: Test the Staging Deployment

1. Push changes to staging:
   ```bash
   git checkout staging
   git pull origin staging
   # Make your changes
   git add .
   git commit -m "Your changes"
   git push origin staging
   ```

2. Wait for the preview deployment to complete
3. Test the booking flow on the staging URL
4. Verify Hubtel sandbox payments work correctly

## Step 5: Merge to Production

Once staging is verified working:

1. Merge staging to main:
   ```bash
   git checkout main
   git pull origin main
   git merge staging
   git push origin main
   ```

2. In your deployment platform, set production environment variables:
   ```
   HUBTEL_ENV=production
   HUBTEL_CLIENT_ID=your_production_client_id
   HUBTEL_CLIENT_SECRET=your_production_client_secret
   HUBTEL_MERCHANT_ACCOUNT_NUMBER=your_production_merchant_account
   ```

3. Production will deploy automatically on main branch push

## Workflow Summary

```
Development → Staging (sandbox testing) → Production (live payments)
     ↓              ↓                            ↓
  local machine   preview URL              live site
  (HUBTEL_ENV=   (HUBTEL_ENV=              (HUBTEL_ENV=
   sandbox)       sandbox)                   production)
```

## Safety Checks

- **Never** set `HUBTEL_ENV=production` in staging
- **Always** test payments in staging before merging to main
- **Always** use sandbox credentials in staging
- **Only** set production credentials in the production context
