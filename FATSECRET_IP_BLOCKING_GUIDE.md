# FatSecret API IP Blocking Issue - Troubleshooting Guide

## Problem
FatSecret API returns error code 21: "Invalid IP address detected: '54.226.219.65'"

This happens because **FatSecret blocks unknown IPs by default** for their OAuth proxy server. Your server IP needs to be explicitly whitelisted.

---

## Quick Fix Checklist

### ✅ Step 1: Whitelist Your IP at FatSecret
1. Go to https://platform.fatsecret.com/api/
2. Find your application in the dashboard
3. Look for **"Allowed IP Ranges"** or **"IP Whitelist"** settings
4. Add your server IP in CIDR notation:
   ```
   54.226.219.65/32
   ```
   (The `/32` means a single IP address; `/24` would allow a range)

5. Save settings and wait 1-2 minutes for changes to propagate

### ✅ Step 2: Test the Connection
After whitelisting, run the diagnostic endpoint:
```bash
curl http://localhost:3000/api/fatsecret-diagnostics
```

**Expected response** (healthy):
```json
{
  "status": "healthy",
  "diagnostics": {
    "credentialsConfigured": true,
    "tokenAttempt": { "success": true, "tokenLength": 1234 },
    "searchAttempt": { "success": true, "resultsCount": 50 },
    "errors": []
  }
}
```

**Unhealthy response** (IP still blocked):
```json
{
  "status": "unhealthy",
  "diagnostics": {
    "errors": [
      "Search failed: FatSecret IP not whitelisted",
      "💡 ACTION REQUIRED: Whitelist your IP at https://platform.fatsecret.com/api/"
    ]
  }
}
```

---

## Understanding Error Code 21

From FatSecret's documentation:

> **Error Code 21: "Invalid IP address detected"**
> 
> Your request IP is not whitelisted in your FatSecret app settings. This is a security restriction that applies to:
> - Premium Free tier ✅ Can whitelist IPs
> - PREMIER tier ✅ Can whitelist IP ranges (CIDR notation)
> - Enterprise tier ✅ Fully customizable

---

## Network Context

Your current environment:
- **Server IP**: 54.226.219.65 (appears to be AWS/cloud)
- **Error**: Code 21 (IP blocking)
- **Location**: Likely AWS region (Codespaces environment)

If running in a CI/CD pipeline or Codespaces, the IP may change between deployments. In that case:

### Option A: Whitelist a Range (Better for Cloud)
```
54.226.0.0/16   # Entire AWS region (example)
```

### Option B: Whitelist Multiple IPs
Add multiple single IPs:
```
54.226.219.65/32
54.226.219.66/32
54.226.219.67/32
```

### Option C: Request Dynamic Whitelisting
Contact FatSecret support for dynamic IP support on Premium plans.

---

## Improved Error Handling (Now Deployed)

The code now includes better diagnostics:

1. **Error Code 21 Detection** - Specifically identifies IP blocking
2. **Helpful Messages** - Points to FatSecret app settings
3. **Diagnostic Endpoint** - `/api/fatsecret-diagnostics` for easy testing
4. **Graceful Fallback** - Uses Gemini macros when FatSecret fails (as shown in your logs)

**Log examples:**
```
❌ IP BLOCKING ERROR (code 21) for "apple": Invalid IP address detected: '54.226.219.65'
⚠️ Your IP is not whitelisted at FatSecret
💡 Fix: Add your IP range to FatSecret app settings at https://platform.fatsecret.com/api/
🔄 Fallback: Using Gemini macros instead
```

---

## Workarounds While Waiting for Whitelisting

### 1. Use VPN/Proxy (Temporary Testing)
Route requests through a whitelisted IP temporarily.

### 2. Rely on Gemini Fallback (Current State)
Your app is already **gracefully falling back to Gemini for nutrition macros** when FatSecret fails. This is working:
```
⚠️ "Tostadas de Avena...": Using Gemini macros (FatSecret failed)
```

### 3. Use Local Database Only
If FatSecret remains unavailable, the app will use the local Firestore ingredient database (which has 119 items loaded).

### 4. Contact FatSecret Support
Email: support@fatsecret.com
- Include: Your app ID, IP range, use case
- Request: IP whitelisting (usually processed in 24-48 hours)

---

## Verification Checklist After Whitelisting

- [ ] IP added to FatSecret app settings
- [ ] Waited 2+ minutes for propagation
- [ ] Ran `/api/fatsecret-diagnostics` 
- [ ] Status shows `"healthy"`
- [ ] `tokenAttempt.success` = `true`
- [ ] `searchAttempt.success` = `true`
- [ ] Logs no longer show error code 21

---

## FatSecret Plan Details

| Tier | Cost | Rate Limit | IP Whitelisting |
|------|------|-----------|-----------------|
| Premium Free | Free | 100 req/hr | ✅ Yes |
| PREMIER | Paid | 1000+ req/hr | ✅ Yes (CIDR) |
| Enterprise | Custom | Unlimited | ✅ Full control |

Your current plan: **Premium Free**
- Limit: 100 requests/hour
- Can whitelist: Individual IPs or ranges

---

## Monitoring FatSecret Health

Add to your application health checks:

```typescript
// In your health check endpoint
import { checkFatSecretConnection } from '@/lib/api/utils/fatsecret';

const diagnostics = await checkFatSecretConnection();
if (diagnostics.errors.length > 0) {
  logger.warn('FatSecret is degraded', diagnostics.errors);
  // Alert team or fall back to local DB only
}
```

---

## Next Steps

1. **Whitelist your IP** at FatSecret dashboard
2. **Test with** `/api/fatsecret-diagnostics`
3. **Monitor logs** for error code 21 resolution
4. **Verify** nutrition enrichment works for new recipes

Once whitelisted, FatSecret searches should return `✅ Search successful` in logs.
