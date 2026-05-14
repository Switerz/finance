import { test as base, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

type E2EFixtures = {
  supabaseAdmin: SupabaseClient;
};

export const test = base.extend<E2EFixtures>({
  supabaseAdmin: async ({}, use) => {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    await use(client);
  },
});

export { expect };
