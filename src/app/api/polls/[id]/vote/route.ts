import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { POLL_EXPIRY } from '@/lib/pollsStore';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { restaurantId } = body;

    // Get the poll from persistent store
    const poll: any = await kv.get(`poll:${id}`);

    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    const optionIndex = poll.options.findIndex((o: any) => o.id === restaurantId);
    if (optionIndex === -1) {
      return NextResponse.json({ error: 'Restaurant not found in poll' }, { status: 400 });
    }

    // Update the vote count in the data object
    poll.options[optionIndex].votes += 1;

    // Save the updated poll back to the persistent store
    // Also reset the 24-hour expiration so a poll stays active while people are still using it
    await kv.set(`poll:${id}`, poll, { ex: POLL_EXPIRY });

    return NextResponse.json({ success: true, poll });
  } catch (error) {
    console.error('Error voting:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const poll = await kv.get(`poll:${id}`);
    
    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    return NextResponse.json(poll);
  } catch (error) {
    console.error('Error fetching poll:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
