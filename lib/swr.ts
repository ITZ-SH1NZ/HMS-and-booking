// Shared SWR fetcher + the manager API keys, so SWRConfig and hover-preloading
// use the exact same function and keys (preload only warms the cache when the
// key + fetcher match what the component later requests).
export const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Request to ${url} failed with status ${r.status}`);
    return r.json();
  });

// Maps a manager nav route to the API endpoint that page reads, for preloading.
export function managerApiForRoute(href: string): string | null {
  if (href.startsWith("/manager/hotels")) return "/api/manager/hotels";
  if (href.startsWith("/manager/manage")) return "/api/manager/manage";
  if (href.startsWith("/manager/staff")) return "/api/manager/staff";
  return null;
}

// Maps an admin nav route to the API endpoint that page reads, for preloading.
export function adminApiForRoute(href: string): string | null {
  if (href.startsWith("/admin/dashboard")) return "/api/admin/overview";
  if (href.startsWith("/admin/verifications")) return "/api/admin/verifications?status=pending";
  if (href.startsWith("/admin/listings")) return "/api/admin/listings?status=pending";
  if (href.startsWith("/admin/users")) return "/api/admin/users?q=&role=all";
  return null;
}

