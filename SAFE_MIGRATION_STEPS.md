# 🔧 Safe Database Migration - Step by Step

## Run these SQL commands ONE AT A TIME in Supabase SQL Editor

### Step 1: Add category column
```sql
ALTER TABLE habits ADD COLUMN IF NOT EXISTS category VARCHAR(100);
```

### Step 2: Add is_archived column  
```sql
ALTER TABLE habits ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
```

### Step 3: Add category index
```sql
CREATE INDEX IF NOT EXISTS idx_habits_category ON habits(category);
```

### Step 4: Add archived index
```sql
CREATE INDEX IF NOT EXISTS idx_habits_archived ON habits(is_archived);
```

### Step 5: Verify the migration worked
```sql
SELECT id, title, category, is_archived FROM habits LIMIT 5;
```

## ✅ After Migration

Once you've run all steps successfully, your category filtering will work! The backend already supports:

- Filter by category: `GET /api/habits?category=Health`
- Filter by archived status: `GET /api/habits?is_archived=false`
- Get all categories: `GET /api/habits/categories`

## 🚨 Why This is Safe

- `ADD COLUMN IF NOT EXISTS` - Only adds if column doesn't exist
- `CREATE INDEX IF NOT EXISTS` - Only creates if index doesn't exist  
- No `DROP` or `DELETE` statements
- No data modification
- Existing data remains untouched