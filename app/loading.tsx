import { PageLoader } from "@/components/PageLoader";

// Global fallback loader for routes without their own loading.tsx skeleton.
// Routes with a closer loading.tsx (e.g. /hotels) use that instead.
export default function RootLoading() {
  return <PageLoader />;
}
