import { NextResponse } from "next/server";
import { createSession, createUser } from "@/lib/socialStore";
import { SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await createUser({
      email: body.email ?? "",
      username: body.username ?? "",
      avatarUrl: body.avatarUrl ?? null,
    });

    const token = await createSession(user.id);
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
      },
    });

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
    const status =
      message === "INVALID_EMAIL" || message === "INVALID_USERNAME"
        ? 400
        : message === "EMAIL_TAKEN" || message === "USERNAME_TAKEN"
          ? 409
          : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
