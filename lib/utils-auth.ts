import { redirect } from "next/navigation";

export function encodedRedirect(path: string, key: "error" | "message", value: string) {
  const searchParams = new URLSearchParams({
    [key]: value,
  });

  redirect(`${path}?${searchParams.toString()}`);
}
