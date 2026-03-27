import type { Metadata } from "next";
import { AuthHeader } from "@/components/auth/auth-header";
import { createClient } from "@/lib/supabase/server";
import { ensureDatabaseUser } from "@/lib/user-sync";
import "./globals.css";

export const metadata: Metadata = {
  title: "Everplot",
  description: "Create. Explore. Play.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const identity = user ? await ensureDatabaseUser(user) : null;

  return (
    <html lang="en">
      <body>
        <AuthHeader
          user={user}
          identity={
            identity
              ? {
                  username: identity.username,
                  email: identity.email,
                }
              : null
          }
        />
        {children}
      </body>
    </html>
  );
}
