# Google Calendar Connection Troubleshooting Guide

## Issue: Calendar works locally but fails after deployment

### Step 1: Check Environment Variables

First, verify that all required environment variables are set in your production environment:

**Required Variables:**
- `NEXTAUTH_URL` - Your production domain (e.g., `https://yourdomain.com`)
- `GOOGLE_CLIENT_ID` - Your Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Your Google OAuth client secret

**How to check:**
1. Visit `/api/calendar/debug` in your production app
2. Look for the environment variable status in the response

### Step 2: Verify Google OAuth Configuration

**In Google Cloud Console:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" > "Credentials"
3. Edit your OAuth 2.0 Client ID
4. Under "Authorized redirect URIs", ensure you have:
   - `http://localhost:3000/api/calendar/callback` (for local development)
   - `https://yourdomain.com/api/calendar/callback` (for production)

**Common Issues:**
- Missing production redirect URI
- Wrong domain in redirect URI
- HTTP vs HTTPS mismatch

### Step 3: Check Database Connection

The calendar tokens are stored in your database. Ensure:

1. Your production database is accessible
2. The `DATABASE_URL` environment variable is correctly set
3. Database migrations have been run: `npx prisma db push`

### Step 4: Debug the OAuth Flow

**Check the debug endpoint:**
```bash
curl https://yourdomain.com/api/calendar/debug
```

**Expected response:**
```json
{
  "hasNextAuthUrl": true,
  "nextAuthUrl": "https://yourdomain.com",
  "hasGoogleClientId": true,
  "hasGoogleClientSecret": true,
  "hasDatabaseConnection": true,
  "hasStoredTokens": false,
  "redirectUri": "https://yourdomain.com/api/calendar/callback"
}
```

### Step 5: Check Production Logs

Look for these specific error patterns in your production logs:

**Environment Variable Issues:**
```
Missing required environment variables for Google Calendar OAuth
```

**OAuth Flow Issues:**
```
OAuth callback called
Request URL: https://yourdomain.com/api/calendar/callback?code=...
```

**Token Exchange Issues:**
```
Error exchanging code for tokens: [error details]
```

### Step 6: Common Solutions

#### Issue: "Invalid redirect_uri" error
**Solution:** Add your production domain to Google OAuth authorized redirect URIs

#### Issue: "No session found" error
**Solution:** Check that `NEXTAUTH_SECRET` is set in production

#### Issue: "User not found" error
**Solution:** Ensure the user exists in your production database

#### Issue: "Token exchange failed" error
**Solution:** Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct

### Step 7: Testing the Connection

1. **Test OAuth URL generation:**
   ```bash
   curl "https://yourdomain.com/api/calendar?action=auth"
   ```

2. **Test calendar sync:**
   ```bash
   curl -X POST "https://yourdomain.com/api/calendar" \
     -H "Content-Type: application/json" \
     -d '{"action":"sync-milestone","milestoneId":"test","goalId":"test","goalTitle":"Test","milestoneTitle":"Test","dueDate":"2024-01-01"}'
   ```

### Step 8: Deployment Platform Specific Issues

#### Vercel
- Ensure environment variables are set in Vercel dashboard
- Check that the domain is properly configured
- Verify that the function timeout is sufficient

#### Netlify
- Set environment variables in Netlify dashboard
- Ensure redirects are configured for Next.js

#### Railway/Render
- Check that environment variables are set
- Verify database connection

### Step 9: Security Considerations

1. **HTTPS Required:** Google OAuth requires HTTPS in production
2. **Domain Verification:** Ensure your domain is verified in Google Cloud Console
3. **API Quotas:** Check if you've hit Google Calendar API quotas

### Step 10: Advanced Debugging

If the issue persists, enable detailed logging by checking:

1. **Network tab** in browser dev tools during OAuth flow
2. **Production logs** for detailed error messages
3. **Google Cloud Console** > "APIs & Services" > "OAuth consent screen" for domain verification

### Quick Fix Checklist

- [ ] Environment variables set in production
- [ ] Google OAuth redirect URI includes production domain
- [ ] Database connection working
- [ ] HTTPS enabled in production
- [ ] Domain verified in Google Cloud Console
- [ ] API quotas not exceeded

### Getting Help

If you're still having issues:

1. Check the debug endpoint: `/api/calendar/debug`
2. Review production logs for specific error messages
3. Verify Google Cloud Console configuration
4. Test with a fresh OAuth connection

The debug endpoint will help identify exactly which part of the OAuth flow is failing. 