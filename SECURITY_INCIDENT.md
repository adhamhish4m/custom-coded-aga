# 🔒 Security Incident - API Keys Exposed

## What Happened
Your `.env` file was accidentally pushed to Git, exposing sensitive API keys and credentials.

## What I've Done
✅ Created `.gitignore` to prevent future accidental commits
✅ Removed `.env` from Git tracking
✅ Removed `.env` from entire Git history
✅ Force pushed cleaned history to remote

## ⚠️ CRITICAL: Rotate All Exposed Credentials

Even though the file is removed from Git history, **anyone who pulled the repository before the fix can still see the old credentials**. You MUST rotate all exposed keys immediately:

---

## 1. Supabase Keys (HIGH PRIORITY)

Your Supabase **Service Role Key** was exposed. This is the most critical key to rotate.

### Steps:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `erxxyzvsmjkyubdxqcfd`
3. Navigate to **Settings** → **API**
4. Click **"Reset service_role key"**
5. Copy the new service role key
6. Update your local `.env` file with the new key
7. Update the key in Railway (when you deploy)

**Note**: The anon key is less sensitive (it's meant to be public), but you can rotate it too if you want to be extra safe.

---

## 2. OpenRouter API Key (MEDIUM PRIORITY)

Your OpenRouter key was exposed: `sk-or-v1-251215e4...` (full key redacted)

### Steps:
1. Go to [OpenRouter Dashboard](https://openrouter.ai/keys)
2. Find the exposed key (it likely has a name or date)
3. **Delete** the old key
4. **Generate** a new API key
5. Copy the new key
6. Update your local `.env`: `OPENROUTER_API_KEY=sk-or-v1-NEW_KEY_HERE`
7. Update the key in Railway (when you deploy)

---

## 3. Perplexity API Key (MEDIUM PRIORITY)

Your Perplexity key was exposed: `pplx-kWONOe...` (full key redacted)

### Steps:
1. Go to [Perplexity API Settings](https://www.perplexity.ai/settings/api)
2. Find the exposed key
3. **Revoke** the old key
4. **Generate** a new API key
5. Copy the new key
6. Update your local `.env`: `PERPLEXITY_API_KEY=pplx-NEW_KEY_HERE`
7. Update the key in Railway (when you deploy)

---

## 4. Slack Webhook URL (LOW PRIORITY)

Your Slack webhook was exposed: `https://hooks.slack.com/services/T09PLQM42DA/...` (full URL redacted)

Webhook URLs are less critical but can be abused to spam your channel.

### Steps:
1. Go to your Slack workspace
2. Navigate to **Apps** → **Incoming Webhooks**
3. Find the webhook for your channel
4. **Delete** the old webhook
5. **Create** a new incoming webhook for the same channel
6. Copy the new webhook URL
7. Update your local `.env`: `SLACK_WEBHOOK_URL=https://hooks.slack.com/services/NEW_URL_HERE`
8. Update the URL in Railway (when you deploy)

---

## 5. Supabase Database Password (MEDIUM PRIORITY)

Your database direct connection password was exposed (redacted)

### Steps:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **Database**
4. Click **"Reset Database Password"**
5. Copy the new password
6. Update your local `.env`: `SUPABASE_DB_PASSWORD=NEW_PASSWORD_HERE`
7. Update the password in Railway (when you deploy)

**Note**: This is only needed if you're connecting directly to the PostgreSQL database. Your backend uses the Supabase client which uses the Service Role Key, not this password.

---

## Priority Order

Do these in order:

1. **🔴 URGENT**: Supabase Service Role Key
2. **🟡 IMPORTANT**: OpenRouter API Key
3. **🟡 IMPORTANT**: Perplexity API Key
4. **🟡 IMPORTANT**: Supabase Database Password
5. **🟢 OPTIONAL**: Slack Webhook URL

---

## After Rotating Keys

### Update Your Local Environment
1. Open `/Users/adham/Desktop/custom-coded-aga/.env`
2. Replace all the old keys with new ones
3. Open `/Users/adham/Desktop/custom-coded-aga/backend/.env`
4. Replace all the old keys with new ones

### When You Deploy to Railway
1. Go to Railway dashboard
2. Navigate to **Variables**
3. Update all the rotated keys with new values
4. Railway will automatically redeploy with new keys

### Test Everything
After rotating keys, test your app locally to ensure:
- ✅ Supabase connection works
- ✅ OpenRouter API works for personalization
- ✅ Perplexity API works for research
- ✅ Slack notifications work

---

## Prevention for the Future

✅ **Already Fixed**: Added `.gitignore` to prevent this
✅ **Already Fixed**: Removed `.env` from Git history

### Best Practices Going Forward:
1. **Never** commit `.env` files (now protected by `.gitignore`)
2. Always use `.env.example` with placeholder values for documentation
3. When sharing code, always use `.env.example` as a template
4. Store production keys ONLY in Railway/Vercel dashboards, never in Git
5. Use different API keys for development and production
6. Regularly rotate keys every 90 days as a security practice

---

## Questions?

If you're unsure about any step or encounter issues while rotating keys, stop and ask for help before proceeding.

The most critical key to rotate immediately is the **Supabase Service Role Key** as it has full admin access to your database.
