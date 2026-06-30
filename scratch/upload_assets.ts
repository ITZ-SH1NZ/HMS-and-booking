import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Manually parse .env.local to avoid dependency issues
const env: Record<string, string> = {};
try {
  const envContent = fs.readFileSync(".env.local", "utf8");
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      env[key] = value;
    }
  });
} catch (e) {
  console.error("Failed to read .env.local:", e);
  process.exit(1);
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const BUCKET_NAME = "public_assets";

const IMAGES_TO_UPLOAD = [
  {
    name: "hero-room.jpg",
    url: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "lobby.jpg",
    url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
  },
];

async function main() {
  console.log("Ensuring bucket exists...");
  
  // Create bucket if not exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error("Error listing buckets:", listError);
    process.exit(1);
  }

  const exists = buckets.some((b) => b.name === BUCKET_NAME);
  if (!exists) {
    console.log(`Creating public bucket: ${BUCKET_NAME}...`);
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      allowedMimeTypes: ["image/png", "image/jpeg"],
    });
    if (createError) {
      console.error("Error creating bucket:", createError);
      process.exit(1);
    }
  } else {
    console.log(`Bucket ${BUCKET_NAME} already exists.`);
  }

  // 1. Upload local logo-mark.png
  const logoPath = path.join(process.cwd(), "public", "logo-mark.png");
  if (fs.existsSync(logoPath)) {
    console.log("Uploading local logo-mark.png...");
    const fileBody = fs.readFileSync(logoPath);
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload("logo-mark.png", fileBody, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Error uploading logo-mark.png:", uploadError);
    } else {
      console.log("Successfully uploaded logo-mark.png!");
    }
  } else {
    console.warn(`Local logo-mark.png not found at ${logoPath}`);
  }

  // 2. Fetch and upload external images
  for (const img of IMAGES_TO_UPLOAD) {
    try {
      console.log(`Fetching ${img.name} from Unsplash...`);
      const res = await fetch(img.url);
      if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`);
      
      const buffer = Buffer.from(await res.arrayBuffer());
      console.log(`Uploading ${img.name} to Supabase...`);
      
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(img.name, buffer, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        console.error(`Error uploading ${img.name}:`, uploadError);
      } else {
        console.log(`Successfully uploaded ${img.name}!`);
      }
    } catch (err) {
      console.error(`Failed to process ${img.name}:`, err);
    }
  }

  console.log("\n--- Public URLs for your templates ---");
  console.log(`Logo Mark:  ${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/logo-mark.png`);
  console.log(`Hero Room:  ${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/hero-room.jpg`);
  console.log(`Lobby:      ${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/lobby.jpg`);
}

main().catch(console.error);
