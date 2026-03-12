import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { redis, POLL_EXPIRY } from "@/lib/pollsStore";
import { createPollRecord, hydrateInvitees } from "@/lib/socialStore";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { restaurants, query, inviteeUserIds } = body;

    if (!restaurants || restaurants.length === 0) {
      return NextResponse.json({ error: 'No restaurants provided' }, { status: 400 });
    }

    const currentUser = await getCurrentUser();
    const pollId = randomUUID().slice(0, 8);
    const invitees = Array.isArray(inviteeUserIds)
      ? await hydrateInvitees(inviteeUserIds)
      : [];

    const pollData = await createPollRecord({
      id: pollId,
      query: query || "Lunch",
      restaurants,
      owner: currentUser,
      invitees,
    });

    await redis.set(`poll:${pollId}`, JSON.stringify(pollData), "EX", POLL_EXPIRY);

    return NextResponse.json({ id: pollId });
  } catch (error) {
    console.error('Error creating poll:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
