import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      // Supabase Storage (photos uploaded via the wizard) — any project subdomain.
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      // hotel.image_url is arbitrary, manager/seed-supplied, and can point at any
      // external host (e.g. images.unsplash.com, plus.unsplash.com, …). Allow all
      // HTTPS hosts so a listing image never crashes the page. Long term, once all
      // images are uploaded to Supabase Storage, tighten this back to the line above.
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
