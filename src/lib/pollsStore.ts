import { kv } from '@vercel/kv';

// We'll use the 'kv' object directly in our routes now. 
// This file can stay as a central point of configuration if needed.
export const POLL_EXPIRY = 60 * 60 * 24; // 24 hours in seconds
