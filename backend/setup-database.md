# Database Setup Instructions

## 🗄️ Setting Up Your Supabase Database

Your backend needs these tables in Supabase. Follow these steps:

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase project: https://erxxyzvsmjkyubdxqcfd.supabase.co
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run the Setup SQL

Copy the entire contents of `backend/database-setup.sql` and paste it into the SQL editor, then click **Run**.

**Or**, you can run it section by section if you prefer.

### Step 3: Verify Tables Were Created

After running the SQL, go to **Table Editor** in Supabase and verify you see:

- ✅ `campaigns`
- ✅ `campaign_leads`
- ✅ `Client Metrics`
- ✅ `AGA Runs Progress`

### Step 4: Test Backend Connection

Once tables are created, test the backend:

```bash
cd backend
npm run dev
```

Then in another terminal:

```bash
curl http://localhost:3001/api/health
```

You should see:
```json
{
  "status": "ok",
  "services": {
    "database": "operational"
  }
}
```

---

## 📋 Required Tables

The backend expects these exact tables:

### 1. campaigns
```sql
- id (UUID)
- name (VARCHAR)
- user_id (UUID → auth.users)
- completed_count (INTEGER)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### 2. campaign_leads
```sql
- id (UUID)
- campaign_id (UUID → campaigns)
- user_id (UUID → auth.users)
- lead_data (JSONB[])  ← Array of enriched leads
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### 3. Client Metrics
```sql
- user_auth_id (UUID → auth.users)
- num_personalized_leads (INTEGER)
- hours_saved (NUMERIC)
- money_saved (INTEGER)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### 4. AGA Runs Progress
```sql
- run_id (UUID)
- campaign_id (UUID → campaigns)
- status (VARCHAR)
- error_message (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

---

## 🔒 Security (RLS)

The SQL automatically:
- ✅ Enables Row Level Security on all tables
- ✅ Creates policies for user access
- ✅ Allows service role (backend) full access
- ✅ Sets up proper triggers

---

## ✅ Verification Checklist

After running the SQL:

- [ ] All 4 tables exist in Table Editor
- [ ] RLS is enabled on all tables
- [ ] Backend health check shows "operational"
- [ ] No errors in backend console

---

**Need help?** If you encounter any errors when running the SQL, copy the error message and let me know!
