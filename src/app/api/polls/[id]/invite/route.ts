import { NextResponse } from "next/server";
import { redis, POLL_EXPIRY } from "@/lib/pollsStore";
import type { PollRecord } from "@/lib/socialStore";
import { getCurrentUser } from "@/lib/auth";
import { hydrateInvitees } from "@/lib/socialStore";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Get the poll from standard Redis
    const rawData = await redis.get(`poll:${id}`);
    if (!rawData) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    const poll = JSON.parse(rawData) as PollRecord;

    if (poll.ownerUserId !== user.id) {
      return NextResponse.json({ error: 'FORBIDDEN: Only the owner can invite users.' }, { status: 403 });
    }

    const alreadyInvited = poll.invitees.some((invitee) => invitee.userId === userId);
    if (alreadyInvited) {
      return NextResponse.json({ error: 'User already invited' }, { status: 400 });
    }

    const newInvitees = await hydrateInvitees([userId]);
    if (newInvitees.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Append new invitee
    poll.invitees.push(newInvitees[0]);

    // Save back to Redis
    await redis.set(`poll:${id}`, JSON.stringify(poll), "EX", POLL_EXPIRY);

    return NextResponse.json({ success: true, poll });
  } catch (error) {
    console.error('Error inviting user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
