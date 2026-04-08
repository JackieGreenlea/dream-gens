import "server-only";

import { cookies } from "next/headers";
import { User } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/config";

export async function createClient() {
  const cookieStore = await cookies();
  type CookieToSet = {
    name: string;
    value: string;
    options?: Parameters<typeof cookieStore.set>[2];
  };

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot always write cookies; middleware handles refresh.
        }
      },
    },
  });
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function getCurrentUserIdFast(): Promise<string | null> {
  const supabase = await createClient();
  const claimsResult = await supabase.auth.getClaims();
  const userId =
    claimsResult.data && "claims" in claimsResult.data && typeof claimsResult.data.claims?.sub === "string"
      ? claimsResult.data.claims.sub
      : null;

  if (userId) {
    return userId;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}
