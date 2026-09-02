import type { NextConfig } from "next";

// BP-001's own file (`code:` glob `next.config.ts`). WO-001 step 3 and the
// file plan: typed config; `serverExternalPackages` for the Supabase admin
// client; no `ignoreBuildErrors` and no `ignoreDuringBuilds` — a build that
// hides a type error defeats the pins-first CI order BP-005's NFR budget
// states, so neither key is set (their default is `false`).
const nextConfig: NextConfig = {
  serverExternalPackages: ["@supabase/supabase-js"],
};

export default nextConfig;
