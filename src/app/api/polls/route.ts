import { NextResponse } from 'next/server';
import { redis, POLL_EXPIRY } from '@/lib/pollsStore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { restaurants, query } = body;

    if (!restaurants || restaurants.length === 0) {
      return NextResponse.json({ error: 'No restaurants provided' }, { status: 400 });
    }

    const pollId = Math.random().toString(36).substring(2, 9);
    
    // Initialize votes for each restaurant
    const options = restaurants.map((r: any) => ({
      ...r,
      votes: 0
    }));

    const pollData = {
      id: pollId,
      query: query || 'Lunch',
      createdAt: new Date().toISOString(),
      options: options
    };

    // Store the poll persistently using standard Redis client
    await redis.set(`poll:${pollId}`, JSON.stringify(pollData), 'EX', POLL_EXPIRY);

    return NextResponse.json({ id: pollId });
  } catch (error) {
    console.error('Error creating poll:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
