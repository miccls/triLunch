import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { searchUsers } from "@/lib/socialStore";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";

  if (query.trim().length < 2) {
    return NextResponse.json({ users: [] });
  }

  const users = await searchUsers(query, user?.id);
  return NextResponse.json({ users });
}
