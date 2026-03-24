import type { Metadata } from "next";
import { AuthHeader } from "@/components/auth/auth-header";
import { createClient } from "@/lib/supabase/server";
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

  return (
    <html lang="en">
      <body>
        <AuthHeader user={user} />
        {children}
      </body>
    </html>
  );
}
