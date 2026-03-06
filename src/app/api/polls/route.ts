import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { POLL_EXPIRY } from '@/lib/pollsStore';

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

    // Use KV to store the poll persistently, with an automatic 24-hour expiration
    await kv.set(`poll:${pollId}`, pollData, { ex: POLL_EXPIRY });

    return NextResponse.json({ id: pollId });
  } catch (error) {
    console.error('Error creating poll:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
