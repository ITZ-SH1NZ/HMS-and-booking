const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// List of common Supabase AWS regions
const REGIONS = [
  "ap-south-1",      // Mumbai
  "ap-southeast-1",  // Singapore
  "us-east-1",       // N. Virginia
  "us-east-2",       // Ohio
  "us-west-1",       // N. California
  "us-west-2",       // Oregon
  "eu-central-1",    // Frankfurt
  "eu-west-1",       // Ireland
  "eu-west-2",       // London
  "eu-west-3",       // Paris
  "ap-northeast-1",  // Tokyo
  "ap-northeast-2",  // Seoul
  "ap-southeast-2",  // Sydney
  "ca-central-1",    // Canada
  "sa-east-1"        // São Paulo
];

const password = "TeamNEURON123!";
const projectRef = "ekurxcwuriltcrsrcfqo";
const sqlPath = path.join(__dirname, "../supabase/hms_messaging_migration.sql");
const sql = fs.readFileSync(sqlPath, 'utf8');

async function tryRegion(region) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  const connectionString = `postgres://postgres.${projectRef}:${password}@${host}:6543/postgres`;
  
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000, // 5s timeout
  });

  try {
    console.log(`Checking region: ${region} (${host})...`);
    await client.connect();
    console.log(`\n🎉 SUCCESS! Connected to region: ${region}`);
    console.log("Executing SQL migration...");
    await client.query(sql);
    console.log("Migration executed successfully!");
    await client.end();
    return true;
  } catch (err) {
    // If it's a tenant not found error, it means we connected to the port, but this is the wrong region.
    if (err.message && err.message.includes("tenant/user")) {
      // Wrong region, silenty continue
    } else {
      console.log(`Region ${region} failed with error: ${err.message}`);
    }
    try {
      await client.end();
    } catch {}
    return false;
  }
}

async function main() {
  console.log("Starting automated Supabase region scan...");
  for (const region of REGIONS) {
    const success = await tryRegion(region);
    if (success) {
      console.log("\nScan complete. Migration successfully applied!");
      process.exit(0);
    }
  }
  console.log("\n❌ Scan complete. Could not connect to any region. Please double-check your password.");
  process.exit(1);
}

main();
