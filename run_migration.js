require('dotenv').config();
const fs = require('fs');
const supabase = require('./config/database');

async function runMigration() {
    try {
        console.log('🔄 Adding category and archive columns to habits table...');

        // Read the migration SQL
        const migrationSQL = fs.readFileSync('./add_category_columns.sql', 'utf8');

        // Execute the migration
        const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

        if (error) {
            console.error('❌ Migration failed:', error.message);
            console.log('\n📝 Try running this SQL manually in your Supabase SQL editor:');
            console.log(migrationSQL);
        } else {
            console.log('✅ Migration completed successfully!');

            // Test the new columns
            const { data, error: testError } = await supabase
                .from('habits')
                .select('category, is_archived')
                .limit(1);

            if (testError) {
                console.log('⚠️  Migration may have failed:', testError.message);
            } else {
                console.log('✅ Category filtering is now available!');
            }
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('\n📝 Manual SQL to run in Supabase:');
        console.log(`
-- Add missing columns to existing habits table
ALTER TABLE habits 
ADD COLUMN IF NOT EXISTS category VARCHAR(100),
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_habits_category ON habits(category);
CREATE INDEX IF NOT EXISTS idx_habits_archived ON habits(is_archived);

-- Update existing habits to have is_archived = false if null
UPDATE habits SET is_archived = false WHERE is_archived IS NULL;
        `);
    }

    process.exit(0);
}

runMigration();