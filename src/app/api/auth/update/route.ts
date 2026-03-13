import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateUser } from "@/lib/socialStore";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "ERR_UNAUTHORIZED: Mission node not identified." }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "ERR_BAD_REQUEST: Data packet corrupted." }, { status: 400 });
    }

    const { avatarUrl } = body;

    const updatedUser = await updateUser(user.id, {
      avatarUrl: avatarUrl?.trim() || null,
    });

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        avatarUrl: updatedUser.avatarUrl,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERR_INTERNAL: Node synchronization failed.";
    console.error('Update Profile Picture Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
