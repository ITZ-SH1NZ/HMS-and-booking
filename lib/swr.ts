// Shared SWR fetcher + the manager API keys, so SWRConfig and hover-preloading
// use the exact same function and keys (preload only warms the cache when the
// key + fetcher match what the component later requests).
export const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Request failed");
    return r.json();
  });

// Maps a manager nav route to the API endpoint that page reads, for preloading.
export function managerApiForRoute(href: string): string | null {
  if (href.startsWith("/manager/hotels")) return "/api/manager/hotels";
  if (href.startsWith("/manager/manage")) return "/api/manager/manage";
  if (href.startsWith("/manager/staff")) return "/api/manager/staff";
  return null;
}
