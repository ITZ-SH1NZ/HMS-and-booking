const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Connection string with your password
const connectionString = "postgres://postgres.ekurxcwuriltcrsrcfqo:TeamNEURON123!@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";

const client = new Client({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false,
  }
});

async function main() {
  try {
    console.log("Attempting database connection...");
    await client.connect();
    console.log("Connected to Supabase database successfully!");

    const sqlPath = path.join(__dirname, "../supabase/hms_messaging_migration.sql");
    console.log("Reading SQL file from:", sqlPath);
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log("Executing SQL migration...");
    await client.query(sql);
    console.log("Migration executed successfully!");
  } catch (err) {
    console.error("Database connection/execution failed:");
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
