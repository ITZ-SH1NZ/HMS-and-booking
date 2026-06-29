import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// 1. Manually parse .env.local to avoid requiring dotenv dependency
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      process.env[key] = value.trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");
  process.exit(1);
}

// Initialize Supabase Client with Service Role Key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// 2. Sourced distinct Unsplash image IDs by category (10 per category)
const IMAGE_RESOURCES: Record<string, string[]> = {
  exterior: [
    "photo-1566073771259-6a8506099945",
    "photo-1540541338287-41700207dee6",
    "photo-1520250497591-112f2f40a3f4",
    "photo-1484154218962-a197022b5858",
    "photo-1571896349842-33c89424de2d",
    "photo-1596394516093-501ba68a0ba6",
    "photo-1551882547-ff40c63fe5fa",
    "photo-1582719508461-905c673771fd",
    "photo-1445019980597-93fa8acb246c",
    "photo-1529290130-4ca3753253ae"
  ],
  bedroom: [
    "photo-1618773928121-c32242e63f39",
    "photo-1590490360182-c33d57733427",
    "photo-1566665797739-1674de7a421a",
    "photo-1591088398332-8a7791972843",
    "photo-1505691938895-1758d7feb511",
    "photo-1540518614846-7eded433c457",
    "photo-1582719478250-c89cae4dc85b",
    "photo-1598928506311-c55ded91a20c",
    "photo-1578683010236-d716f9a3f461",
    "photo-1560185007-cde436f6a4d0"
  ],
  bathroom: [
    "photo-1584622650111-993a426fbf0a",
    "photo-1552321554-5fefe8c9ef14",
    "photo-1620626011161-997c51447357",
    "photo-1604014237800-1c9102c219da",
    "photo-1584622781564-1d987f7333c1",
    "photo-1600566753376-12c8ab7fb75b",
    "photo-1600566753190-17f0baa2a6c3",
    "photo-1584622650115-6c178229c173",
    "photo-1507652313519-d4e9174996dd",
    "photo-1543783207-ec64e4d95325"
  ],
  lounge: [
    "photo-1560448204-e02f11c3d0e2",
    "photo-1497366216548-37526070297c",
    "photo-1521207418485-99c705420785",
    "photo-1600585154526-990dced4db0d",
    "photo-1618221195710-dd6b41faaea6",
    "photo-1615529182904-14819c35db37",
    "photo-1600607687920-4e2a09cf159d",
    "photo-1600210492486-724fe5c67fb0",
    "photo-1507652313519-d4e9174996dd",
    "photo-1600585154340-be6161a56a0c"
  ],
  dining: [
    "photo-1544025162-d76694265947",
    "photo-1550966871-3ed3cdb5ed0c",
    "photo-1517248135467-4c7edcad34c4",
    "photo-1559339352-11d035aa65de",
    "photo-1555396273-367ea4eb4db5",
    "photo-1514933651103-005eec06c04b",
    "photo-1552566626-52f8b828add9",
    "photo-1414235077428-338989a2e8c0",
    "photo-1537047902294-62a40c20a6ae",
    "photo-1504674900247-0877df9cc836"
  ]
};

// 3. Helper to download an image as a Buffer
async function downloadImage(photoId: string): Promise<Buffer> {
  const url = `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=1000&q=80`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download image: ${url}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// 4. Helper to upload an image to Supabase Storage
async function uploadToStorage(filePath: string, buffer: Buffer): Promise<string> {
  const { error } = await supabase.storage
    .from("hotel-images")
    .upload(filePath, buffer, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from("hotel-images")
    .getPublicUrl(filePath);

  return data.publicUrl;
}

// 5. 50+ Real-world hotels across Kerala, Karnataka, Tamil Nadu, and Delhi
const HOTELS_SEED_DATA = [
  // Kerala
  { name: "Kumarakom Lake Resort", city: "Kumarakom", location: "Kumarakom, Kerala", lat: 9.5916, lng: 76.4222, type: "Resort", priceScale: 2.2 },
  { name: "The Raviz Ashtamudi", city: "Kollam", location: "Kollam, Kerala", lat: 8.9135, lng: 76.5828, type: "Resort", priceScale: 1.8 },
  { name: "Forte Kochi Hotel", city: "Kochi", location: "Fort Kochi, Kochi, Kerala", lat: 9.9688, lng: 76.2421, type: "Hotel", priceScale: 1.5 },
  { name: "Marari Beach Resort", city: "Alappuzha", location: "Mararikulam, Alappuzha, Kerala", lat: 9.5982, lng: 76.2995, type: "Resort", priceScale: 1.9 },
  { name: "Spice Village Thekkady", city: "Thekkady", location: "Kumily, Thekkady, Kerala", lat: 9.6094, lng: 77.1648, type: "Resort", priceScale: 1.6 },
  { name: "Fragrant Nature Munnar", city: "Munnar", location: "Pothamedu, Munnar, Kerala", lat: 10.0631, lng: 77.0425, type: "Resort", priceScale: 1.7 },
  { name: "Chithirapuram Palace Resort", city: "Munnar", location: "Chithirapuram, Munnar, Kerala", lat: 10.0542, lng: 77.0211, type: "Resort", priceScale: 1.3 },
  { name: "Aluva Riverdale Home", city: "Aluva", location: "Aluva, Ernakulam, Kerala", lat: 10.1076, lng: 76.3503, type: "Villa", priceScale: 0.9 },
  { name: "Trivandrum Heritage Palace", city: "Trivandrum", location: "Vellayambalam, Trivandrum, Kerala", lat: 8.5084, lng: 76.9589, type: "Hotel", priceScale: 1.2 },
  { name: "Kovalam Cliff Resort", city: "Kovalam", location: "Light House Beach, Kovalam, Kerala", lat: 8.3989, lng: 76.9782, type: "Resort", priceScale: 1.4 },
  { name: "Varkala Soul Beach Villa", city: "Varkala", location: "North Cliff, Varkala, Kerala", lat: 8.7338, lng: 76.7161, type: "Villa", priceScale: 1.1 },
  { name: "Wayanad Wild Edge Resort", city: "Wayanad", location: "Lakkidi, Wayanad, Kerala", lat: 11.5173, lng: 76.0272, type: "Resort", priceScale: 1.5 },
  { name: "Vythiri Rainforest Lodge", city: "Wayanad", location: "Vythiri, Wayanad, Kerala", lat: 11.5512, lng: 76.0384, type: "Resort", priceScale: 1.8 },
  { name: "Athirapally Rainland Resort", city: "Athirapally", location: "Athirapally, Thrissur, Kerala", lat: 10.2736, lng: 76.5684, type: "Resort", priceScale: 1.4 },
  { name: "Vembanad House", city: "Alappuzha", location: "Muhamma, Alappuzha, Kerala", lat: 9.6052, lng: 76.3592, type: "Villa", priceScale: 1.3 },
  { name: "Alleppey Houseboat Retreat", city: "Alappuzha", location: "Punnamada, Alappuzha, Kerala", lat: 9.5085, lng: 76.3488, type: "Villa", priceScale: 1.2 },
  { name: "Backwater Heritage Homestay", city: "Kottayam", location: "Kumarakom, Kottayam, Kerala", lat: 9.5891, lng: 76.4382, type: "Villa", priceScale: 0.8 },
  { name: "Kochi Harbour View Hotel", city: "Kochi", location: "Willingdon Island, Kochi, Kerala", lat: 9.9482, lng: 76.2731, type: "Hotel", priceScale: 1.3 },
  { name: "The Gateway Hotel Marine Drive", city: "Kochi", location: "Marine Drive, Kochi, Kerala", lat: 9.9805, lng: 76.2758, type: "Hotel", priceScale: 1.4 },
  { name: "Niraamaya Retreats Surya Samudra", city: "Kovalam", location: "Pulinkudi, Kovalam, Kerala", lat: 8.3748, lng: 77.0125, type: "Resort", priceScale: 2.5 },
  { name: "Elixir Hills Suites Resort", city: "Munnar", location: "Letchmi Estate, Munnar, Kerala", lat: 10.1252, lng: 77.0235, type: "Resort", priceScale: 1.6 },
  { name: "Aluva Riverview Residency", city: "Aluva", location: "ByPass Junction, Aluva, Kerala", lat: 10.1123, lng: 76.3456, type: "Apartment", priceScale: 0.8 },
  { name: "Ernakulam Town Suites", city: "Ernakulam", location: "Kaloor, Ernakulam, Kerala", lat: 9.9912, lng: 76.2948, type: "Apartment", priceScale: 0.9 },
  { name: "Kadavu Resort & Calicut", city: "Calicut", location: "NH 17 Bypass, Calicut, Kerala", lat: 11.1895, lng: 75.8612, type: "Resort", priceScale: 1.4 },
  { name: "Brunton Boatyard", city: "Kochi", location: "Fort Kochi, Kochi, Kerala", lat: 9.9698, lng: 76.2445, type: "Hotel", priceScale: 2.0 },

  // Bangalore (Karnataka)
  { name: "The Leela Palace Bengaluru", city: "Bangalore", location: "Old Airport Road, Bangalore, Karnataka", lat: 12.9606, lng: 77.6484, type: "Hotel", priceScale: 2.8 },
  { name: "ITC Gardenia Bengaluru", city: "Bangalore", location: "Residency Road, Bangalore, Karnataka", lat: 12.9673, lng: 77.5975, type: "Hotel", priceScale: 2.6 },
  { name: "Taj West End", city: "Bangalore", location: "Race Course Road, Bangalore, Karnataka", lat: 12.9829, lng: 77.5818, type: "Hotel", priceScale: 2.7 },
  { name: "The Ritz-Carlton Bangalore", city: "Bangalore", location: "Residency Road, Bangalore, Karnataka", lat: 12.9694, lng: 77.6012, type: "Hotel", priceScale: 2.9 },
  { name: "The Oberoi Bengaluru", city: "Bangalore", location: "M.G. Road, Bangalore, Karnataka", lat: 12.9739, lng: 77.6198, type: "Hotel", priceScale: 2.5 },
  { name: "Koramangala Boutique Suites", city: "Bangalore", location: "Koramangala 4th Block, Bangalore, Karnataka", lat: 12.9335, lng: 77.6244, type: "Apartment", priceScale: 1.0 },
  { name: "Indiranagar Garden Villa", city: "Bangalore", location: "Indiranagar, Bangalore, Karnataka", lat: 12.9718, lng: 77.6411, type: "Villa", priceScale: 1.4 },
  { name: "Whitefield Business Hotel", city: "Bangalore", location: "ITPL Main Road, Whitefield, Bangalore, Karnataka", lat: 12.9875, lng: 77.7382, type: "Hotel", priceScale: 1.1 },
  { name: "Mysore Palace Hotel", city: "Mysore", location: "Mirza Road, Mysore, Karnataka", lat: 12.3051, lng: 76.6551, type: "Hotel", priceScale: 1.2 },
  { name: "Coorg Wilderness Resort", city: "Coorg", location: "Madikeri, Coorg, Karnataka", lat: 12.4244, lng: 75.7382, type: "Resort", priceScale: 2.1 },
  { name: "Hampi Heritage Lodge", city: "Hampi", location: "Hampi, Bellary, Karnataka", lat: 15.3352, lng: 76.4612, type: "Hotel", priceScale: 1.3 },

  // Tamil Nadu
  { name: "Taj Connemara Chennai", city: "Chennai", location: "Binny Road, Chennai, Tamil Nadu", lat: 13.0612, lng: 80.2589, type: "Hotel", priceScale: 1.8 },
  { name: "ITC Grand Chola Chennai", city: "Chennai", location: "Guindy, Chennai, Tamil Nadu", lat: 13.0104, lng: 80.2205, type: "Hotel", priceScale: 2.4 },
  { name: "Le Meridien Coimbatore", city: "Coimbatore", location: "Avinashi Road, Coimbatore, Tamil Nadu", lat: 11.0412, lng: 77.0512, type: "Hotel", priceScale: 1.4 },
  { name: "Savoy - IHCL SeleQtions Ooty", city: "Ooty", location: "Sylks Road, Ooty, Tamil Nadu", lat: 11.4112, lng: 76.6952, type: "Resort", priceScale: 1.9 },
  { name: "Sherlock Hotel Ooty", city: "Ooty", location: "Tiger Hill Road, Ooty, Tamil Nadu", lat: 11.4198, lng: 76.7123, type: "Hotel", priceScale: 1.2 },
  { name: "The Carlton Kodaikanal", city: "Kodaikanal", location: "Lake Road, Kodaikanal, Tamil Nadu", lat: 10.2312, lng: 77.4912, type: "Resort", priceScale: 1.7 },
  { name: "Heritage Madurai", city: "Madurai", location: "Melakkal Road, Madurai, Tamil Nadu", lat: 9.9312, lng: 78.0912, type: "Resort", priceScale: 1.5 },
  { name: "Coimbatore Residency", city: "Coimbatore", location: "Avinashi Road, Coimbatore, Tamil Nadu", lat: 11.0023, lng: 76.9734, type: "Hotel", priceScale: 1.0 },
  { name: "Mahabalipuram Beach Resort", city: "Mahabalipuram", location: "East Coast Road, Mahabalipuram, Tamil Nadu", lat: 12.6231, lng: 80.1945, type: "Resort", priceScale: 1.6 },

  // Delhi NCR
  { name: "The Taj Mahal Hotel New Delhi", city: "Delhi", location: "Mansingh Road, New Delhi, Delhi", lat: 28.6052, lng: 77.2252, type: "Hotel", priceScale: 2.5 },
  { name: "The Lodhi New Delhi", city: "Delhi", location: "Lodhi Road, New Delhi, Delhi", lat: 28.5912, lng: 77.2389, type: "Hotel", priceScale: 3.0 },
  { name: "The Imperial New Delhi", city: "Delhi", location: "Janpath, New Delhi, Delhi", lat: 28.6212, lng: 77.2182, type: "Hotel", priceScale: 2.7 },
  { name: "The Leela Ambience Gurugram", city: "Gurugram", location: "Ambience Island, NH 8, Gurugram, Haryana", lat: 28.5032, lng: 77.0984, type: "Hotel", priceScale: 2.2 },
  { name: "Taj City Centre Gurugram", city: "Gurugram", location: "Sector 44, Gurugram, Haryana", lat: 28.4592, lng: 77.0725, type: "Hotel", priceScale: 1.9 },
  { name: "Noida Business Suites", city: "Noida", location: "Sector 62, Noida, Uttar Pradesh", lat: 28.6282, lng: 77.3761, type: "Apartment", priceScale: 0.9 },
  { name: "Connaught Place Grand", city: "Delhi", location: "Connaught Place, New Delhi, Delhi", lat: 28.6304, lng: 77.2177, type: "Hotel", priceScale: 1.5 },
  { name: "South Delhi Boutique Hotel", city: "Delhi", location: "Greater Kailash, New Delhi, Delhi", lat: 28.5482, lng: 77.2348, type: "Hotel", priceScale: 1.1 }
];

// Curated reviews comments
const GUEST_REVIEW_COMMENTS = [
  "Absolutely incredible stay! The hospitality was top-notch, and the views were breathtaking. Will definitely come back again.",
  "Very clean rooms and extremely polite staff. The food at the restaurant was delicious. Highly recommended!",
  "Great location, easy access to sightseeing spots. The pool area was lovely and very relaxing.",
  "An exquisite luxury experience. Every detail was perfect. The service exceeded all of our expectations.",
  "Had a wonderful time with family. The rooms were spacious and cozy, and the kids loved the gardens."
];

async function seed() {
  console.log("🚀 Starting database seeding...");

  const managerId = "f450fd06-5444-4edf-86d8-df4f8e406190";

  // 1. Clean up previously seeded hotels to avoid duplicates
  console.log("🧹 Cleaning up previously seeded hotels...");
  const keepHotels = new Set([
    "Grand Hyatt Kochi Bolgatty",
    "Hotel Nexus",
    "Ramada Resort by Wyndham Kochi",
    "Hotel Taj",
    "Crowne Plaza Kochi",
    "Hotel Nas"
  ]);

  const { data: existingHotels, error: fetchErr } = await supabase.from("hotels").select("id, name");
  if (fetchErr) {
    console.error("Error fetching existing hotels for cleanup:", fetchErr.message);
  } else if (existingHotels) {
    const toDelete = existingHotels.filter(h => !keepHotels.has(h.name)).map(h => h.id);
    if (toDelete.length > 0) {
      console.log(`Deleting ${toDelete.length} old seeded hotels...`);
      const { error: delErr } = await supabase.from("hotels").delete().in("id", toDelete);
      if (delErr) {
        console.error("Error deleting old hotels:", delErr.message);
      } else {
        console.log("Cleanup complete!");
      }
    } else {
      console.log("No old seeded hotels to clean up.");
    }
  }

  // 2. Create dummy guest profiles if they do not exist
  console.log("👤 Seeding guest profiles...");
  const dummyGuests = [
    { id: "e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1", full_name: "Ananthu Krishnan", role: "guest" },
    { id: "e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2", full_name: "Sneha Nair", role: "guest" },
    { id: "e3e3e3e3-e3e3-e3e3-e3e3-e3e3-e3e3e3e3", full_name: "Vikram Sen", role: "guest" },
    { id: "e4e4e4e4-e4e4-e4e4-e4e4-e4e4-e4e4e4e4", full_name: "Rohan Das", role: "guest" },
    { id: "e5e5e5e5-e5e5-e5e5-e5e5-e5e5-e5e5e5e5", full_name: "Nisha Patel", role: "guest" }
  ];

  for (const guest of dummyGuests) {
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: guest.id,
        full_name: guest.full_name,
        role: guest.role,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

    if (profileError) {
      console.warn(`Warning: Could not upsert profile ${guest.full_name}:`, profileError.message);
    }
  }

  // Pre-download all 25 images to memory to make uploads fast and prevent Unsplash request throttling
  console.log("📥 Pre-downloading 25 high-quality images from Unsplash...");
  const preDownloadedImages: Record<string, Buffer[]> = {};
  for (const category of Object.keys(IMAGE_RESOURCES)) {
    preDownloadedImages[category] = [];
    const photoIds = IMAGE_RESOURCES[category];
    for (let i = 0; i < photoIds.length; i++) {
      try {
        const buffer = await downloadImage(photoIds[i]);
        preDownloadedImages[category].push(buffer);
        console.log(`✓ Downloaded ${category} image [${i + 1}/${photoIds.length}]`);
      } catch (err: any) {
        console.error(`Error downloading ${category} image ${photoIds[i]}:`, err.message);
      }
    }
  }

  // Define category mapping for database check constraints
  const categoryMapping: Record<string, string> = {
    exterior: "exterior",
    bedroom: "rooms",
    bathroom: "bathroom",
    lounge: "lobby",
    dining: "restaurant"
  };

  // 3. Loop through and seed each hotel
  let hotelCount = 0;
  for (const hData of HOTELS_SEED_DATA) {
    hotelCount++;
    console.log(`🏨 [${hotelCount}/${HOTELS_SEED_DATA.length}] Seeding ${hData.name}...`);

    try {
      const hotelId = crypto.randomUUID();

      // Determine category images to upload (2 distinct images per category)
      const uploadedPhotos: { category: string; url: string }[] = [];
      let coverImageUrl = "";

      for (const category of Object.keys(IMAGE_RESOURCES)) {
        const buffers = preDownloadedImages[category];
        if (!buffers || buffers.length < 2) continue;

        // Select 2 buffers based on hotel index to make them distinct per hotel
        const idx1 = (hotelCount * 2) % buffers.length;
        const idx2 = (hotelCount * 2 + 1) % buffers.length;

        const path1 = `hotels/${hotelId}/${category}/${crypto.randomUUID()}.jpg`;
        const path2 = `hotels/${hotelId}/${category}/${crypto.randomUUID()}.jpg`;

        const url1 = await uploadToStorage(path1, buffers[idx1]);
        const url2 = await uploadToStorage(path2, buffers[idx2]);

        uploadedPhotos.push({ category, url: url1 });
        uploadedPhotos.push({ category, url: url2 });

        if (category === "exterior") {
          coverImageUrl = url1;
        }
      }

      // Generate rich details for each hotel
      const starRating = 3 + (hotelCount % 3); // 3, 4, or 5 star rating
      const shortDesc = `${hData.name} is a premier ${hData.type.toLowerCase()} situated in the scenic surroundings of ${hData.city}, offering unparalleled comfort and luxury.`;
      const detailedDesc = `<p>Welcome to <strong>${hData.name}</strong>, a premium ${hData.type.toLowerCase()} situated in the scenic surroundings of ${hData.location}.</p><p>We offer world-class hospitality, elegant accommodations, and a range of premium amenities designed to make your stay unforgettable. Enjoy our curated dining experiences, relax by the pool, or explore the local attractions nearby.</p><p>Our dedicated staff is available 24/7 to ensure your comfort and satisfaction. Whether you are traveling for business or leisure, ${hData.name} is the perfect destination for your stay.</p>`;
      
      const hotelAmenities = ["WiFi", "AC", "Pool", "Gym", "Restaurant", "Parking", "Spa", "Room Service", "Bar", "Conference Room"];
      // Include more amenities for higher scale hotels
      const selectedAmenities = hotelAmenities.slice(0, Math.min(4 + (hotelCount % 7), hotelAmenities.length));

      const highlights = ["Premium Location", "Excellent Service", "Clean Rooms", "24/7 Front Desk"];
      if (hData.type === "Resort") {
        highlights.push("Swimming Pool", "Ayurvedic Spa");
      } else if (hData.type === "Villa") {
        highlights.push("Private Garden", "Fully Equipped Kitchen");
      }
      
      const bestFor = ["Couples", "Families", "Leisure Travelers"];
      const languages = ["English", "Hindi", "Malayalam"];
      if (hData.city === "Delhi" || hData.city === "Bangalore") {
        languages.push("Kannada");
      }

      const nearbyPlaces = [
        { name: "City Center", distance_km: 2.5, type: "Shopping Mall" },
        { name: "Local Market", distance_km: 1.0, type: "Market" },
        { name: "Railway Station", distance_km: 3.2, type: "Railway Station" }
      ];

      // Insert Hotel
      const { error: hotelInsertError } = await supabase
        .from("hotels")
        .insert({
          id: hotelId,
          manager_id: managerId,
          name: hData.name,
          description: shortDesc,
          short_description: shortDesc,
          detailed_description: detailedDesc,
          location: hData.location,
          image_url: coverImageUrl || "https://images.unsplash.com/photo-1566073771259-6a8506099945",
          status: "approved",
          rating: Number((4.0 + Math.random() * 1.0).toFixed(1)),
          star_rating: starRating,
          amenities: selectedAmenities,
          property_type: hData.type,
          city: hData.city,
          latitude: hData.lat,
          longitude: hData.lng,
          cancellation_policy: hotelCount % 3 === 0 ? "flexible" : "moderate",
          gst_percent: 18,
          terms_accepted: true,
          check_in_time: "14:00",
          check_out_time: "11:00",
          languages_spoken: languages,
          highlights: highlights,
          best_for: bestFor,
          nearby_places: nearbyPlaces,
          pets_policy: "Pets allowed on request. Charges may apply.",
          smoking_policy: "Non-smoking rooms. Designated smoking areas available.",
          parties_policy: "No loud parties allowed after 10 PM.",
          payment_policy: hotelCount % 4 === 0 ? "pay_at_property" : hotelCount % 4 === 1 ? "advance" : "both"
        });

      if (hotelInsertError) throw hotelInsertError;

      // Insert Hotel Photos references in DB
      for (let i = 0; i < uploadedPhotos.length; i++) {
        const photo = uploadedPhotos[i];
        const dbCategory = categoryMapping[photo.category] || "other";
        const { error: photoError } = await supabase
          .from("hotel_photos")
          .insert({
            hotel_id: hotelId,
            url: photo.url,
            category: dbCategory,
            sort_order: i,
          });
        if (photoError) console.warn("Error inserting hotel photo:", photoError.message);
      }

      // Insert 2 Room Types per hotel (Price is directly in Rupees, NOT multiplied by 100!)
      const roomTypes = [
        { name: "Deluxe Double Room", basePrice: 3500, capacity: 2, adults: 2, children: 0 },
        { name: "Executive Suite", basePrice: 6500, capacity: 3, adults: 2, children: 1 },
      ];

      for (let i = 0; i < roomTypes.length; i++) {
        const rType = roomTypes[i];
        const roomId = crypto.randomUUID();
        const finalPrice = Math.round(rType.basePrice * hData.priceScale);

        const { error: roomError } = await supabase
          .from("rooms")
          .insert({
            id: roomId,
            hotel_id: hotelId,
            name: rType.name,
            price: finalPrice,
            capacity: rType.capacity,
            total_units: 5 + (hotelCount % 6),
            amenities: ["WiFi", "AC", "TV", "Minibar", "Safe", "Desk"],
            adults: rType.adults,
            children: rType.children,
            is_active: true,
            sort_order: i,
          });

        if (roomError) {
          console.warn("Error inserting room:", roomError.message);
          continue;
        }

        // Upload 2 room photos (selected from bedroom category)
        const bedroomBuffers = preDownloadedImages["bedroom"];
        if (bedroomBuffers && bedroomBuffers.length >= 2) {
          const bIdx1 = (hotelCount * 2 + i) % bedroomBuffers.length;
          const bIdx2 = (hotelCount * 2 + i + 1) % bedroomBuffers.length;

          const rPath1 = `hotels/${hotelId}/rooms/${roomId}/${crypto.randomUUID()}.jpg`;
          const rPath2 = `hotels/${hotelId}/rooms/${roomId}/${crypto.randomUUID()}.jpg`;

          const rUrl1 = await uploadToStorage(rPath1, bedroomBuffers[bIdx1]);
          const rUrl2 = await uploadToStorage(rPath2, bedroomBuffers[bIdx2]);

          await supabase.from("room_photos").insert([
            { room_id: roomId, url: rUrl1, sort_order: 0 },
            { room_id: roomId, url: rUrl2, sort_order: 1 }
          ]);
        }
      }

      // Insert 3-5 Guest Reviews
      const numReviews = 3 + (hotelCount % 3);
      for (let i = 0; i < numReviews; i++) {
        const reviewer = dummyGuests[i % dummyGuests.length];
        const comment = GUEST_REVIEW_COMMENTS[(hotelCount + i) % GUEST_REVIEW_COMMENTS.length];
        const rating = 4 + (i % 2); // 4 or 5 star reviews

        await supabase
          .from("reviews")
          .insert({
            hotel_id: hotelId,
            user_id: reviewer.id,
            rating,
            comment,
            created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
          });
      }

      console.log(`✓ Successfully seeded ${hData.name}`);
    } catch (err: any) {
      console.error(`❌ Failed to seed hotel ${hData.name}:`, err.message);
    }
  }

  // Clear Next.js Cache
  console.log("🧹 Clearing Next.js cache...");
  const cachePath = path.join(process.cwd(), ".next", "cache");
  if (fs.existsSync(cachePath)) {
    fs.rmSync(cachePath, { recursive: true, force: true });
    console.log("Next.js cache cleared successfully!");
  }

  console.log("🎉 Seeding completed successfully!");
}

seed();
