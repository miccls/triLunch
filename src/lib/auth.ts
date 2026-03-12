import { cookies } from "next/headers";
import { deleteSession, getUserBySessionToken } from "@/lib/socialStore";

export const SESSION_COOKIE = "triLunchSession";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  return getUserBySessionToken(token);
}

export async function clearCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await deleteSession(token);
  }
}
