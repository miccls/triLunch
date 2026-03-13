import { NextResponse } from "next/server";
import { redis, POLL_EXPIRY } from "@/lib/pollsStore";
import type { PollRecord } from "@/lib/socialStore";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { restaurantId } = body;

    // Get the poll from standard Redis
    const rawData = await redis.get(`poll:${id}`);
    if (!rawData) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    const poll = JSON.parse(rawData) as PollRecord;

    const votedUserIds = poll.votedUserIds || [];
    if (votedUserIds.includes(user.id)) {
      return NextResponse.json({ error: 'User has already voted' }, { status: 400 });
    }

    const optionIndex = poll.options.findIndex((option) => option.id === restaurantId);
    if (optionIndex === -1) {
      return NextResponse.json({ error: 'Restaurant not found in poll' }, { status: 400 });
    }

    // Update the vote count and mark user as voted
    poll.options[optionIndex].votes += 1;
    poll.votedUserIds = [...votedUserIds, user.id];

    // Save back to Redis
    await redis.set(`poll:${id}`, JSON.stringify(poll), "EX", POLL_EXPIRY);

    return NextResponse.json({ success: true, poll });
  } catch (error) {
    console.error('Error voting:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const rawData = await redis.get(`poll:${id}`);
    
    if (!rawData) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    return NextResponse.json(JSON.parse(rawData));
  } catch (error) {
    console.error('Error fetching poll:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
