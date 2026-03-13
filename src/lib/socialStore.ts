import { randomUUID } from "crypto";
import { redis } from "@/lib/pollsStore";

export type UserRecord = {
  id: string;
  email: string;
  emailNormalized: string;
  username: string;
  usernameNormalized: string;
  avatarUrl: string | null;
  officeAddress: string | null;
  createdAt: string;
};

export type InviteeSummary = {
  userId: string;
  username: string;
  avatarUrl: string | null;
};

export type PollOption = {
  id: string;
  name: string;
  address: string;
  rating: number | null;
  distance: string;
  distanceRaw: number;
  lat: number | null;
  lng: number | null;
  priceLevel: string | null;
  imageUrl: string | null;
  votes: number;
};

export type PollRecord = {
  id: string;
  query: string;
  createdAt: string;
  ownerUserId: string | null;
  ownerUsername: string | null;
  ownerAvatarUrl: string | null;
  invitees: InviteeSummary[];
  options: PollOption[];
};

type PollCreateInput = {
  id: string;
  query: string;
  restaurants: Omit<PollOption, "votes">[];
  owner: UserRecord | null;
  invitees: InviteeSummary[];
};

const USER_SET_KEY = "users:all";
const SESSION_PREFIX = "session:";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function validateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

export function validateUsername(value: string) {
  return /^[a-zA-Z0-9_.-]{3,24}$/.test(value.trim());
}

function userKey(userId: string) {
  return `user:${userId}`;
}

function userEmailKey(emailNormalized: string) {
  return `user:email:${emailNormalized}`;
}

function userUsernameKey(usernameNormalized: string) {
  return `user:username:${usernameNormalized}`;
}

export async function createUser(input: {
  email: string;
  username: string;
  avatarUrl?: string | null;
}) {
  const emailNormalized = normalizeEmail(input.email);
  const usernameNormalized = normalizeUsername(input.username);

  if (!validateEmail(emailNormalized)) {
    throw new Error("INVALID_EMAIL");
  }

  if (!validateUsername(input.username)) {
    throw new Error("INVALID_USERNAME");
  }

  const existingEmailId = await redis.get(userEmailKey(emailNormalized));
  if (existingEmailId) {
    throw new Error("EMAIL_TAKEN");
  }

  const existingUsernameId = await redis.get(userUsernameKey(usernameNormalized));
  if (existingUsernameId) {
    throw new Error("USERNAME_TAKEN");
  }

  const user: UserRecord = {
    id: randomUUID(),
    email: input.email.trim(),
    emailNormalized,
    username: input.username.trim(),
    usernameNormalized,
    avatarUrl: input.avatarUrl?.trim() || null,
    officeAddress: null,
    createdAt: new Date().toISOString(),
  };

  const multi = redis.multi();
  multi.set(userKey(user.id), JSON.stringify(user));
  multi.set(userEmailKey(emailNormalized), user.id);
  multi.set(userUsernameKey(usernameNormalized), user.id);
  multi.sadd(USER_SET_KEY, user.id);
  await multi.exec();

  return user;
}

export async function getUserById(userId: string) {
  const raw = await redis.get(userKey(userId));
  return raw ? (JSON.parse(raw) as UserRecord) : null;
}

export async function updateUser(userId: string, updates: Partial<UserRecord>) {
  const existing = await getUserById(userId);
  if (!existing) {
    throw new Error("USER_NOT_FOUND");
  }

  const updated: UserRecord = {
    ...existing,
    ...updates,
  };

  await redis.set(userKey(userId), JSON.stringify(updated));
  return updated;
}

export async function getUserByEmail(email: string) {
  const emailNormalized = normalizeEmail(email);
  const userId = await redis.get(userEmailKey(emailNormalized));
  return userId ? getUserById(userId) : null;
}

export async function getUsersByIds(userIds: string[]) {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (ids.length === 0) {
    return [];
  }

  const pipeline = redis.pipeline();
  for (const userId of ids) {
    pipeline.get(userKey(userId));
  }

  const rows = await pipeline.exec();
  if (!rows) {
    return [];
  }

  return rows
    .map((row) => row?.[1])
    .filter((value): value is string => typeof value === "string")
    .map((value) => JSON.parse(value) as UserRecord);
}

export async function searchUsers(query: string, excludeUserId?: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length < 2) {
    return [];
  }

  const userIds = await redis.smembers(USER_SET_KEY);
  const users = await getUsersByIds(userIds);

  return users
    .filter((user) => user.id !== excludeUserId)
    .filter(
      (user) =>
        user.usernameNormalized.includes(normalizedQuery) ||
        user.emailNormalized.includes(normalizedQuery),
    )
    .sort((a, b) => a.usernameNormalized.localeCompare(b.usernameNormalized))
    .slice(0, 8)
    .map((user) => ({
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      email: user.email,
    }));
}

export async function createSession(userId: string) {
  const token = randomUUID();
  await redis.set(`${SESSION_PREFIX}${token}`, userId, "EX", SESSION_TTL_SECONDS);
  return token;
}

export async function getUserBySessionToken(token: string) {
  const userId = await redis.get(`${SESSION_PREFIX}${token}`);
  return userId ? getUserById(userId) : null;
}

export async function deleteSession(token: string) {
  await redis.del(`${SESSION_PREFIX}${token}`);
}

export async function hydrateInvitees(userIds: string[]) {
  const users = await getUsersByIds(userIds);
  return users.map(
    (user): InviteeSummary => ({
      userId: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
    }),
  );
}

export async function createPollRecord(input: PollCreateInput) {
  const options = input.restaurants.map((restaurant) => ({
    ...restaurant,
    votes: 0,
  }));

  const pollData: PollRecord = {
    id: input.id,
    query: input.query || "Lunch",
    createdAt: new Date().toISOString(),
    ownerUserId: input.owner?.id ?? null,
    ownerUsername: input.owner?.username ?? null,
    ownerAvatarUrl: input.owner?.avatarUrl ?? null,
    invitees: input.invitees,
    options,
  };

  return pollData;
}
