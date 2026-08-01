import { supabase } from "@/lib/supabase";

const PROCESSING_API_URL = process.env.NEXT_PUBLIC_PROCESSING_API_URL;

export async function callProcessingApi(
  endpoint: "retell" | "format",
  bookId: string
): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Not authenticated");
  }

  return fetch(`${PROCESSING_API_URL}/api/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ bookId }),
  });
}