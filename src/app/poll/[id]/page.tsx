"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Invitee = {
  userId: string;
  username: string;
  avatarUrl: string | null;
};

type SessionUser = {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
};

type SearchUser = {
  id: string;
  username: string;
  avatarUrl: string | null;
  email: string;
};

type PollOption = {
  id: string;
  name: string;
  address: string;
  rating: number | null;
  distance: string;
  priceLevel: string | null;
  imageUrl: string | null;
  votes: number;
};

type Poll = {
  id: string;
  query: string;
  ownerUserId: string | null;
  ownerUsername: string | null;
  ownerAvatarUrl: string | null;
  invitees: Invitee[];
  options: PollOption[];
  votedUserIds?: string[];
};

function initials(username: string) {
  return username.slice(0, 2).toUpperCase();
}

export default function PollPage() {
  const params = useParams();
  const pollId = params.id as string;

  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [votingFor, setVotingFor] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [inviteQuery, setInviteQuery] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResults, setInviteResults] = useState<SearchUser[]>([]);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        const data = await res.json();
        setCurrentUser(data.user);
      } catch (err) {
        console.error("Failed to load session", err);
      }
    };
    fetchSession();
  }, []);

  useEffect(() => {
    if (!pollId) return;

    const fetchPoll = async () => {
      try {
        const res = await fetch(`/api/polls/${pollId}/vote`, { cache: "no-store" });
        if (!res.ok) throw new Error("ERR_404: Poll node not found.");
        const data = await res.json();
        setPoll(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchPoll();
    const interval = setInterval(fetchPoll, 5000);
    return () => clearInterval(interval);
  }, [pollId]);

  useEffect(() => {
    if (poll && currentUser && poll.votedUserIds?.includes(currentUser.id)) {
      setHasVoted(true);
    }
  }, [poll, currentUser]);

  useEffect(() => {
    if (!currentUser || inviteQuery.trim().length < 2) {
      setInviteResults([]);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        setInviteLoading(true);
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(inviteQuery)}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!res.ok) throw new Error("SEARCH_FAILED");

        const data = await res.json();
        setInviteResults(data.users ?? []);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setInviteResults([]);
        }
      } finally {
        setInviteLoading(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [currentUser, inviteQuery]);

  const handleVote = async (restaurantId: string) => {
    if (!currentUser) {
      alert("You must log in to vote.");
      return;
    }
    if (hasVoted) return;
    setVotingFor(restaurantId);

    try {
      const res = await fetch(`/api/polls/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ERR_500: Vote registration failed.");

      setPoll(data.poll);
      setHasVoted(true);
    } catch (err) {
      alert(`System Error: ${(err as Error).message}`);
    } finally {
      setVotingFor(null);
    }
  };

  const handleInviteUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/polls/${pollId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to invite user");

      setPoll(data.poll);
      setInviteQuery("");
      setInviteResults([]);
    } catch (err) {
      alert(`System Error: ${(err as Error).message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center font-mono uppercase">
        <div className="text-sm text-accent-primary animate-pulse tracking-[0.3em] font-bold">
          Synchronizing_Data...
        </div>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center font-mono uppercase">
        <div className="text-xs text-accent-primary bg-black border border-accent-primary/30 p-8 rounded-2xl font-bold tracking-widest">
          ! {error || "POLL_OFFLINE"}
        </div>
      </div>
    );
  }

  const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);

  return (
    <div className="min-h-screen bg-dark-bg text-gray-300 font-mono uppercase flex flex-col relative selection:bg-accent-primary selection:text-white">
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none bg-[linear-gradient(rgba(139,92,246,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.1)_1px,transparent_1px)] bg-[size:40px_40px]" />

      <header className="relative z-10 py-16 px-6 text-center border-b border-dark-border bg-gradient-to-b from-dark-surface to-dark-bg">
        <div className="absolute top-6 left-6 z-20">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-black/40 border border-white/10 rounded-xl text-[10px] font-bold tracking-[0.2em] uppercase text-gray-400 hover:text-white hover:border-white/30 hover:bg-black/60 transition-all backdrop-blur-md"
          >
            &lt; Return_To_Base
          </Link>
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none opacity-20">
          <div className="absolute top-[-50%] left-[-20%] w-[150%] h-[200%] bg-gradient-to-br from-accent-primary/20 via-transparent to-transparent blur-[150px]" />
        </div>
        <h1 className="text-3xl md:text-5xl font-black tracking-tighter mb-4 lowercase relative z-10">
          tri_<span className="bg-gradient-to-r from-[#ff6747] to-[#f01eb0] text-transparent bg-clip-text">poll</span>
        </h1>
        <p className="text-xs text-gray-500 tracking-[0.2em] relative z-10">
          &gt; Mission_Context: &quot;{poll.query}&quot;
        </p>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-6 py-12 w-full relative z-10">
        <div className="glass-panel rounded-3xl p-6 md:p-10 shadow-2xl">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] mb-8 pb-6 border-b border-white/5 items-start">
            <div>
              <h2 className="text-lg font-bold text-white tracking-widest">Target_Selection</h2>
              <div className="mt-4 flex flex-wrap gap-3 text-[10px] tracking-[0.15em] uppercase">
                <span className="bg-black/40 border border-white/10 text-accent-primary px-4 py-2 rounded-xl">
                  Global_Score: {totalVotes}
                </span>
                <div className="flex items-center gap-3 bg-black/30 border border-white/5 text-gray-400 px-4 py-2 rounded-xl">
                  <div className="w-6 h-6 rounded-lg border border-white/10 bg-black/40 overflow-hidden flex items-center justify-center text-[8px] font-black text-accent-primary shrink-0">
                    {poll.ownerAvatarUrl ? (
                      <img src={poll.ownerAvatarUrl} alt={poll.ownerUsername || ""} className="w-full h-full object-cover" />
                    ) : (
                      initials(poll.ownerUsername || "??")
                    )}
                  </div>
                  <span className="text-[10px] tracking-[0.15em] uppercase">
                    Host: {poll.ownerUsername || "anonymous"}
                  </span>
                </div>
                <span className="bg-black/30 border border-white/5 text-gray-400 px-4 py-2 rounded-xl">
                  Invited: {poll.invitees.length}
                </span>
              </div>
            </div>
          </div>

          {poll.invitees.length > 0 && (
            <div className="mb-8 rounded-2xl border border-white/5 bg-black/20 p-5">
              <h3 className="text-xs font-bold text-white tracking-[0.2em] uppercase mb-4">Invited crew</h3>
              <div className="flex flex-wrap gap-3">
                {poll.invitees.map((invitee) => (
                  <div
                    key={invitee.userId}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/5 bg-black/40 text-[10px] tracking-[0.15em] uppercase text-gray-300"
                  >
                    <div className="w-5 h-5 rounded-md border border-white/10 bg-black/40 overflow-hidden flex items-center justify-center text-[6px] font-black text-accent-primary shrink-0">
                      {invitee.avatarUrl ? (
                        <img src={invitee.avatarUrl} alt={invitee.username} className="w-full h-full object-cover" />
                      ) : (
                        initials(invitee.username)
                      )}
                    </div>
                    {invitee.username}
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentUser?.id === poll.ownerUserId && (
            <div className="mb-8 rounded-2xl border border-white/5 bg-black/20 p-5">
              <h3 className="text-xs font-bold text-white tracking-[0.2em] uppercase mb-4">Add Crew Members</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  value={inviteQuery}
                  onChange={(event) => setInviteQuery(event.target.value)}
                  placeholder="SEARCH_USERS"
                  className="w-full px-4 py-3 bg-black/40 text-white rounded-xl border border-white/5 focus:outline-none focus:ring-1 focus:ring-accent-primary/50 text-xs uppercase tracking-widest placeholder-gray-600"
                />

                <div className="space-y-2">
                  {inviteLoading && (
                    <div className="text-[10px] tracking-[0.15em] text-gray-500 uppercase">Scanning user graph...</div>
                  )}

                  {!inviteLoading &&
                    inviteQuery.trim().length >= 2 &&
                    inviteResults.filter((user) => !poll.invitees.some((invitee) => invitee.userId === user.id)).length === 0 && (
                      <div className="text-[10px] tracking-[0.15em] text-gray-500 uppercase">No new personnel found.</div>
                    )}

                  {inviteResults
                    .filter((user) => !poll.invitees.some((invitee) => invitee.userId === user.id))
                    .map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-black/40 hover:bg-black/60 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg border border-white/10 bg-black/40 overflow-hidden flex items-center justify-center text-[10px] font-black text-accent-primary shrink-0">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                            ) : (
                              initials(user.username)
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white tracking-widest">{user.username}</div>
                            <div className="text-[10px] text-gray-500 tracking-[0.15em] lowercase">{user.email}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleInviteUser(user.id)}
                          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-bold tracking-[0.2em] uppercase transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-8">
            {poll.options.map((option) => {
              const votePercentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
              const maxVotes = Math.max(...poll.options.map((entry) => entry.votes));
              const isWinner = totalVotes > 0 && option.votes === maxVotes;

              return (
                <div
                  key={option.id}
                  className={`border rounded-2xl p-5 flex flex-col md:flex-row gap-6 items-center transition-all bg-black/20 relative overflow-hidden group ${
                    isWinner ? "border-accent-primary/50 shadow-lg" : "border-white/5"
                  }`}
                >
                  <div
                    className="absolute top-0 left-0 h-full bg-accent-primary/10 transition-all duration-1000 ease-out z-0 border-r border-accent-primary/20"
                    style={{ width: `${votePercentage}%` }}
                  />

                  <div className="w-full md:w-32 h-32 md:h-24 flex-shrink-0 bg-black/40 border border-white/5 rounded-xl overflow-hidden z-10">
                    {option.imageUrl ? (
                      <img
                        src={option.imageUrl}
                        alt={option.name}
                        className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-700 tracking-widest bg-[radial-gradient(circle,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:10px_10px]">
                        No_Data
                      </div>
                    )}
                  </div>

                  <div className="flex-1 text-center md:text-left z-10">
                    <div className="flex flex-col md:flex-row items-center md:justify-start gap-3 mb-2">
                      <h3
                        className={`text-lg font-bold tracking-tight transition-colors duration-300 ${
                          isWinner ? "text-white" : "text-gray-400"
                        }`}
                      >
                        {option.name}
                      </h3>
                      {option.rating && (
                        <span className="text-[10px] bg-black/60 border border-white/10 text-gray-400 px-2 py-0.5 rounded-lg font-bold tracking-widest uppercase">
                          Lvl: {option.rating}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-[10px] mb-2 tracking-widest lowercase line-clamp-1">{option.address}</p>
                    <p className="text-[9px] font-bold text-accent-primary tracking-[0.2em]">
                      Dist: {option.distance} {option.priceLevel && `• Cost: ${option.priceLevel}`}
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-4 z-10 w-full md:w-auto">
                    <button
                      onClick={() => handleVote(option.id)}
                      disabled={hasVoted || votingFor === option.id}
                      className={`w-full md:w-40 py-3 font-bold text-[10px] tracking-[0.2em] border rounded-xl transition-all uppercase ${
                        hasVoted
                          ? "bg-transparent text-gray-700 border-white/5 cursor-not-allowed"
                          : "bg-gradient-to-r from-[#ff6747] to-[#f01eb0] border-transparent text-white hover:brightness-110 hover:glow-accent"
                      }`}
                    >
                      {votingFor === option.id ? "Syncing..." : hasVoted ? "Committed" : "[ Vote_ ]"}
                    </button>
                    <div className="text-center bg-black/40 border border-white/5 px-4 py-1.5 rounded-xl min-w-[100px]">
                      <span className={`text-xl font-black ${isWinner ? "text-white" : "text-gray-500"}`}>{option.votes}</span>
                      <span className="text-[8px] text-gray-600 ml-2 tracking-widest uppercase">Pts</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {hasVoted && (
            <div className="mt-10 text-center p-4 bg-accent-primary/5 border border-accent-primary/20 text-accent-primary tracking-widest text-[10px] font-bold rounded-2xl animate-pulse">
              &gt; Score_Committed. Waiting for peer synchronization...
            </div>
          )}

          <div className="mt-10 text-center">
            <Link
              href="/"
              className="text-[9px] font-bold text-gray-600 hover:text-accent-primary tracking-[0.3em] transition-colors uppercase border-b border-transparent hover:border-accent-primary pb-1"
            >
              / Abort_Mission_Return_To_Base
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
