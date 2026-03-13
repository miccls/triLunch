"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

type Restaurant = {
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

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] w-full bg-dark-surface rounded-2xl border border-dark-border flex items-center justify-center text-gray-400 animate-pulse font-mono tracking-widest uppercase text-xs">
      Initializing Radar_Scan...
    </div>
  ),
});

const AUTH_MESSAGES: Record<string, string> = {
  EMAIL_TAKEN: "This email is already registered.",
  INVALID_EMAIL: "Enter a valid email address.",
  INVALID_USERNAME: "Use 3-24 letters, numbers, dots, dashes, or underscores.",
  USERNAME_TAKEN: "That username is already taken.",
  USER_NOT_FOUND: "No account found for that email.",
};

function initials(username: string) {
  return username.slice(0, 2).toUpperCase();
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Restaurant[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [priceFilter, setPriceFilter] = useState("All");
  const [sortBy, setSortBy] = useState("closest");

  const [selectedForPoll, setSelectedForPoll] = useState<string[]>([]);
  const [pollCreating, setPollCreating] = useState(false);
  const [pollLink, setPollLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [authMode, setAuthMode] = useState<"register" | "login">("register");
  const [authLoading, setAuthLoading] = useState(true);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authAvatarUrl, setAuthAvatarUrl] = useState("");
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [newAvatarUrl, setNewAvatarUrl] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);

  const [inviteQuery, setInviteQuery] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResults, setInviteResults] = useState<SearchUser[]>([]);
  const [selectedInvitees, setSelectedInvitees] = useState<SearchUser[]>([]);

  const loadSession = async () => {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      const data = await res.json();
      setCurrentUser(data.user);
    } catch {
      setCurrentUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

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

        if (!res.ok) {
          throw new Error("SEARCH_FAILED");
        }

        const data = await res.json();
        setInviteResults(data.users ?? []);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setInviteResults([]);
        }
      } finally {
        setInviteLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [currentUser, inviteQuery]);

  const handleCopy = () => {
    if (!pollLink) return;
    navigator.clipboard.writeText(pollLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSearch = (isLucky = false) => {
    if (!isLucky && !query) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);
    setResults([]);
    setSelectedForPoll([]);
    setPollLink(null);

    if (!navigator.geolocation) {
      setError("ERR_01: Location module unavailable.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserLocation({ lat, lng });

        try {
          const searchQuery = !query && isLucky ? "lunch" : query;
          const res = await fetch("/api/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: searchQuery, lat, lng }),
          });

          if (!res.ok) throw new Error("ERR_02: Target connection failed.");
          const data = await res.json();
          const fetchedResults = (data.restaurants || []) as Restaurant[];

          if (isLucky && fetchedResults.length > 0) {
            const highlyRated = fetchedResults.filter((restaurant) => (restaurant.rating || 0) >= 4.0);
            const pool = highlyRated.length > 0 ? highlyRated : fetchedResults;
            const randomChoice = pool[Math.floor(Math.random() * pool.length)];
            setResults([randomChoice]);
            setViewMode("list");
          } else {
            setResults(fetchedResults);
          }
        } catch (err) {
          setError((err as Error).message || "ERR_03: Unexpected system exception.");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError("ERR_04: Access to position denied.");
        setLoading(false);
      },
    );
  };

  const togglePollSelection = (restaurantId: string) => {
    setSelectedForPoll((previous) => {
      if (previous.includes(restaurantId)) {
        return previous.filter((id) => id !== restaurantId);
      }

      if (previous.length >= 3) {
        return previous;
      }

      return [...previous, restaurantId];
    });
  };

  const toggleInvitee = (user: SearchUser) => {
    setSelectedInvitees((previous) => {
      if (previous.some((entry) => entry.id === user.id)) {
        return previous.filter((entry) => entry.id !== user.id);
      }

      return [...previous, user];
    });
  };

  const createPoll = async () => {
    if (selectedForPoll.length === 0) return;

    setPollCreating(true);

    try {
      const selectedRestaurants = results.filter((restaurant) => selectedForPoll.includes(restaurant.id));
      const res = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurants: selectedRestaurants,
          query,
          inviteeUserIds: selectedInvitees.map((invitee) => invitee.id),
        }),
      });

      if (!res.ok) {
        throw new Error("POLL_CREATE_FAILED");
      }

      const data = await res.json();
      setPollLink(`${window.location.origin}/poll/${data.id}`);
    } catch (err) {
      console.error(err);
      setError("ERR_05: Session assembly failed.");
    } finally {
      setPollCreating(false);
    }
  };

  const submitAuth = async () => {
    setAuthSubmitting(true);
    setAuthError(null);

    const route = authMode === "register" ? "/api/auth/register" : "/api/auth/login";
    const payload =
      authMode === "register"
        ? { email: authEmail, username: authUsername, avatarUrl: authAvatarUrl }
        : { email: authEmail };

    try {
      const res = await fetch(route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "AUTH_FAILED");
      }

      setCurrentUser(data.user);
      setAuthEmail("");
      setAuthUsername("");
      setAuthAvatarUrl("");
      setInviteQuery("");
      setInviteResults([]);
    } catch (err) {
      const message = (err as Error).message;
      setAuthError(AUTH_MESSAGES[message] || "Authentication failed.");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleUpdateAvatar = async () => {
    if (!currentUser) return;
    setUpdateLoading(true);

    try {
      const res = await fetch("/api/auth/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: newAvatarUrl }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Error_${res.status}: Failed to commit update.`);
      }

      setCurrentUser(data.user);
      setEditingAvatar(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "NETWORK_FAILURE";
      alert(`! UPDATE_ERROR: ${message}`);
    } finally {
      setUpdateLoading(false);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setCurrentUser(null);
    setSelectedInvitees([]);
    setInviteResults([]);
    setInviteQuery("");
  };

  const filteredAndSortedResults = useMemo(() => {
    let finalResults = [...results];

    if (priceFilter !== "All") {
      finalResults = finalResults.filter((restaurant) => restaurant.priceLevel === priceFilter);
    }

    if (sortBy === "closest") {
      finalResults.sort((a, b) => a.distanceRaw - b.distanceRaw);
    } else if (sortBy === "rating") {
      finalResults.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return finalResults;
  }, [results, priceFilter, sortBy]);

  return (
    <div className="min-h-screen bg-dark-bg text-gray-200 flex flex-col font-mono selection:bg-accent-primary selection:text-white">
      <header className="py-20 px-6 bg-gradient-to-b from-dark-surface to-dark-bg relative overflow-hidden border-b border-dark-border">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none opacity-20">
          <div className="absolute top-[-50%] left-[-20%] w-[150%] h-[200%] bg-gradient-to-br from-accent-primary/20 via-transparent to-accent-primary/5 blur-[150px]" />
        </div>

        <div className="max-w-6xl mx-auto relative z-10 space-y-10">
          <div className="flex flex-col xl:flex-row gap-8 xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 lowercase">
                <span className="bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-gray-500">tri_</span>
                <span className="bg-gradient-to-r from-[#ff6747] to-[#f01eb0] text-transparent bg-clip-text">lunch</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-400 font-light max-w-2xl leading-relaxed tracking-tight">
                &gt; Discover nearby lunch spots, spin up a shared poll, and attach teammates directly to the plan.
              </p>
            </div>

            <div className="w-full xl:max-w-md glass-panel rounded-3xl p-6 shadow-2xl">
              {authLoading ? (
                <div className="text-[10px] text-gray-500 tracking-[0.2em] uppercase">Loading identity module...</div>
              ) : currentUser ? (
                <div className="space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl border border-white/10 bg-black/40 overflow-hidden flex items-center justify-center text-sm font-black text-accent-primary relative group">
                      {currentUser.avatarUrl ? (
                        <img src={currentUser.avatarUrl} alt={currentUser.username} className="w-full h-full object-cover" />
                      ) : (
                        initials(currentUser.username)
                      )}
                      <button 
                        onClick={() => {
                          setEditingAvatar(!editingAvatar);
                          setNewAvatarUrl(currentUser.avatarUrl || "");
                        }}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[8px] tracking-tighter uppercase font-bold"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="flex-1">
                      <div className="text-[10px] tracking-[0.25em] uppercase text-gray-500">Identity active</div>
                      <div className="text-lg font-bold text-white">{currentUser.username}</div>
                      <div className="text-[10px] tracking-[0.15em] text-gray-500 lowercase">{currentUser.email}</div>
                    </div>
                  </div>

                  {editingAvatar && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <input
                        type="url"
                        placeholder="NEW_AVATAR_URL"
                        className="w-full px-4 py-2 bg-black/40 text-white rounded-xl border border-white/5 focus:outline-none focus:ring-1 focus:ring-accent-primary/50 text-[10px] uppercase tracking-widest placeholder-gray-600"
                        value={newAvatarUrl}
                        onChange={(e) => setNewAvatarUrl(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleUpdateAvatar}
                          disabled={updateLoading}
                          className="flex-1 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold py-2 rounded-lg transition-all uppercase tracking-widest"
                        >
                          {updateLoading ? "Syncing..." : "Update"}
                        </button>
                        <button
                          onClick={() => setEditingAvatar(false)}
                          className="px-4 py-2 text-gray-500 hover:text-white text-[10px] font-bold transition-all uppercase tracking-widest"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl border border-white/5 bg-black/30 p-4 text-[10px] tracking-[0.15em] text-gray-400 uppercase">
                    Friend search is enabled for this session. Invites are stored on newly created polls.
                  </div>
                  <button
                    onClick={logout}
                    className="w-full border border-white/10 rounded-xl py-3 text-[10px] font-bold tracking-[0.25em] uppercase text-gray-300 hover:text-white hover:border-white/30 transition-all"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex gap-2 rounded-2xl bg-black/30 p-1 border border-white/5">
                    <button
                      onClick={() => setAuthMode("register")}
                      className={`flex-1 rounded-xl py-3 text-[10px] font-bold tracking-[0.2em] uppercase transition-all ${
                        authMode === "register" ? "bg-dark-surface text-white" : "text-gray-500"
                      }`}
                    >
                      Register
                    </button>
                    <button
                      onClick={() => setAuthMode("login")}
                      className={`flex-1 rounded-xl py-3 text-[10px] font-bold tracking-[0.2em] uppercase transition-all ${
                        authMode === "login" ? "bg-dark-surface text-white" : "text-gray-500"
                      }`}
                    >
                      Login
                    </button>
                  </div>

                  <div className="space-y-3">
                    <input
                      type="email"
                      placeholder="EMAIL_ADDRESS"
                      className="w-full px-4 py-3 bg-black/40 text-white rounded-xl border border-white/5 focus:outline-none focus:ring-1 focus:ring-accent-primary/50 text-xs uppercase tracking-widest placeholder-gray-600"
                      value={authEmail}
                      onChange={(event) => setAuthEmail(event.target.value)}
                    />
                    {authMode === "register" && (
                      <>
                        <input
                          type="text"
                          placeholder="USERNAME"
                          className="w-full px-4 py-3 bg-black/40 text-white rounded-xl border border-white/5 focus:outline-none focus:ring-1 focus:ring-accent-primary/50 text-xs uppercase tracking-widest placeholder-gray-600"
                          value={authUsername}
                          onChange={(event) => setAuthUsername(event.target.value)}
                        />
                        <input
                          type="url"
                          placeholder="PROFILE_PICTURE_URL (OPTIONAL)"
                          className="w-full px-4 py-3 bg-black/40 text-white rounded-xl border border-white/5 focus:outline-none focus:ring-1 focus:ring-accent-primary/50 text-xs uppercase tracking-widest placeholder-gray-600"
                          value={authAvatarUrl}
                          onChange={(event) => setAuthAvatarUrl(event.target.value)}
                        />
                      </>
                    )}
                  </div>

                  <button
                    onClick={submitAuth}
                    disabled={authSubmitting}
                    className="w-full bg-gradient-to-r from-[#ff6747] to-[#f01eb0] hover:brightness-110 text-white font-bold text-xs py-4 px-6 rounded-xl transition-all glow-accent disabled:opacity-50 uppercase tracking-[0.2em]"
                  >
                    {authSubmitting ? "Syncing..." : authMode === "register" ? "Create_Identity" : "Resume_Session"}
                  </button>

                  <p className="text-[10px] tracking-[0.15em] text-gray-500 uppercase">
                    Minimal-fuzz auth for now: email-based account entry with no password prompt.
                  </p>

                  {authError && (
                    <div className="text-[10px] tracking-[0.2em] text-accent-primary uppercase">! {authError}</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="glass-panel p-2 rounded-2xl max-w-4xl shadow-2xl flex flex-col md:flex-row gap-2">
            <input
              type="text"
              placeholder="SEARCH_TARGET (E.G. SUSHI, SALAD)"
              className="flex-1 px-6 py-4 bg-black/40 text-white rounded-xl border border-white/5 focus:outline-none focus:ring-1 focus:ring-accent-primary/50 transition-all text-sm uppercase tracking-widest placeholder-gray-600"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleSearch(false)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleSearch(false)}
                disabled={loading}
                className="bg-gradient-to-r from-[#ff6747] to-[#f01eb0] hover:brightness-110 text-white font-bold text-sm py-4 px-10 rounded-xl transition-all glow-accent disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center uppercase tracking-[0.2em]"
              >
                {loading ? "Searching..." : "Execute"}
              </button>
              <button
                onClick={() => handleSearch(true)}
                disabled={loading}
                className="bg-dark-surface hover:bg-gray-800 text-white font-bold text-sm py-4 px-6 rounded-xl border border-dark-border transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center uppercase"
                title="RNG Discovery"
              >
                🎲
              </button>
            </div>
          </div>

          {error && (
            <p className="text-accent-primary text-[10px] font-bold tracking-[0.3em] uppercase animate-pulse">! {error}</p>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full relative">
        {hasSearched && !loading && !error && results.length > 0 && (
          <div className="flex flex-col md:flex-row justify-between items-center glass-panel p-4 rounded-2xl mb-8 gap-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-6 py-2 text-xs font-bold rounded-lg transition-all ${
                    viewMode === "list" ? "bg-dark-surface text-white shadow-lg" : "text-gray-500 hover:text-white"
                  }`}
                >
                  Databank
                </button>
                <button
                  onClick={() => setViewMode("map")}
                  className={`px-6 py-2 text-xs font-bold rounded-lg transition-all ${
                    viewMode === "map" ? "bg-dark-surface text-white shadow-lg" : "text-gray-500 hover:text-white"
                  }`}
                >
                  Radar
                </button>
              </div>

              <div className="h-6 w-px bg-white/10 hidden md:block" />

              <div className="flex items-center gap-3">
                <label className="text-[10px] font-black text-gray-600 tracking-[0.2em] uppercase">Sort</label>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  className="bg-dark-surface border border-white/5 text-white text-xs rounded-lg p-2 focus:ring-accent-primary transition-all uppercase tracking-widest"
                >
                  <option value="closest">Proximity</option>
                  <option value="rating">Rating</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-[10px] font-black text-gray-600 tracking-[0.2em] uppercase">Price</label>
                <select
                  value={priceFilter}
                  onChange={(event) => setPriceFilter(event.target.value)}
                  className="bg-dark-surface border border-white/5 text-white text-xs rounded-lg p-2 focus:ring-accent-primary transition-all uppercase tracking-widest"
                >
                  <option value="All">Any_Cost</option>
                  <option value="$">$</option>
                  <option value="$$">$$</option>
                  <option value="$$$">$$$</option>
                  <option value="$$$$">$$$$</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {hasSearched && results.length > 0 && selectedForPoll.length > 0 && (
          <div className="mb-12 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="p-6 bg-gradient-to-r from-accent-primary/20 to-dark-surface border border-accent-primary/20 rounded-2xl shadow-xl flex flex-col justify-between gap-6 overflow-hidden">
              <div className="text-center md:text-left">
                <h3 className="font-bold text-white text-lg mb-1 tracking-wider uppercase">Multiplayer_Session</h3>
                <p className="text-xs text-gray-400 tracking-widest uppercase">
                  Nodes locked: {selectedForPoll.length} / 3
                </p>
                <p className="text-xs text-gray-500 tracking-[0.12em] uppercase mt-2">
                  Invites attached: {selectedInvitees.length}
                </p>
              </div>
              {pollLink ? (
                <div className="flex items-center gap-2 w-full">
                  <input
                    type="text"
                    readOnly
                    value={pollLink}
                    className="flex-1 px-4 py-3 text-xs border border-white/5 rounded-xl bg-black/40 text-accent-primary focus:outline-none"
                  />
                  <button
                    onClick={handleCopy}
                    className={`min-w-[120px] px-6 py-3 text-xs font-bold rounded-xl transition-all uppercase tracking-[0.2em] shadow-lg ${
                      copied ? "bg-green-500 text-white scale-95 shadow-green-500/20" : "bg-white text-black hover:bg-gray-200 active:scale-95"
                    }`}
                  >
                    {copied ? "Copied!" : "Copy_URL"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={createPoll}
                  disabled={pollCreating}
                  className="bg-gradient-to-r from-[#ff6747] to-[#f01eb0] hover:brightness-110 text-white font-bold py-3 px-8 rounded-xl transition-all glow-accent disabled:opacity-50 uppercase text-xs tracking-[0.2em]"
                >
                  {pollCreating ? "Initializing..." : "Create_Session"}
                </button>
              )}
            </div>

            <div className="glass-panel rounded-2xl border border-white/5 p-6">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-white tracking-[0.2em] uppercase">Invite teammates</h3>
                <p className="text-[10px] tracking-[0.15em] text-gray-500 uppercase mt-2">
                  {currentUser
                    ? "Search by username or email to add people to the poll."
                    : "Sign in to search registered users and attach invites to the poll."}
                </p>
              </div>

              {currentUser ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={inviteQuery}
                    onChange={(event) => setInviteQuery(event.target.value)}
                    placeholder="SEARCH_USERS"
                    className="w-full px-4 py-3 bg-black/40 text-white rounded-xl border border-white/5 focus:outline-none focus:ring-1 focus:ring-accent-primary/50 text-xs uppercase tracking-widest placeholder-gray-600"
                  />

                  {selectedInvitees.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedInvitees.map((invitee) => (
                        <button
                          key={invitee.id}
                          onClick={() => toggleInvitee(invitee)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-accent-primary/20 bg-accent-primary/10 text-[10px] tracking-[0.15em] uppercase text-white hover:bg-accent-primary/20 transition-all"
                        >
                          <div className="w-5 h-5 rounded-md border border-white/10 bg-black/40 overflow-hidden flex items-center justify-center text-[6px] font-black text-accent-primary shrink-0">
                            {invitee.avatarUrl ? (
                              <img src={invitee.avatarUrl} alt={invitee.username} className="w-full h-full object-cover" />
                            ) : (
                              initials(invitee.username)
                            )}
                          </div>
                          {invitee.username} ×
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    {inviteLoading && (
                      <div className="text-[10px] tracking-[0.15em] text-gray-500 uppercase">Scanning user graph...</div>
                    )}

                    {!inviteLoading &&
                      inviteResults
                        .filter((user) => !selectedInvitees.some((invitee) => invitee.id === user.id))
                        .map((user) => (
                          <button
                            key={user.id}
                            onClick={() => toggleInvitee(user)}
                            className="w-full text-left rounded-2xl border border-white/5 bg-black/30 px-4 py-3 hover:border-white/20 transition-all"
                          >
                            <div className="text-xs font-bold text-white uppercase tracking-[0.15em]">{user.username}</div>
                            <div className="text-[10px] tracking-[0.15em] text-gray-500 lowercase">{user.email}</div>
                          </button>
                        ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-5 text-[10px] tracking-[0.15em] text-gray-500 uppercase">
                  Invite search activates after account creation or login.
                </div>
              )}
            </div>
          </div>
        )}

        {hasSearched && !loading && !error && filteredAndSortedResults.length === 0 && (
          <div className="text-center py-24 glass-panel rounded-3xl">
            <h3 className="text-2xl font-light text-white mb-4 tracking-[0.1em] uppercase">Null Results Detected</h3>
            <p className="text-gray-500 text-sm uppercase tracking-widest">Adjust Scan_Parameters and retry.</p>
          </div>
        )}

        {hasSearched && filteredAndSortedResults.length > 0 && viewMode === "map" && userLocation && (
          <div className="border border-dark-border p-1 bg-black rounded-3xl overflow-hidden shadow-2xl">
            <MapView userLocation={userLocation} restaurants={filteredAndSortedResults} />
          </div>
        )}

        {hasSearched && filteredAndSortedResults.length > 0 && viewMode === "list" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredAndSortedResults.map((restaurant, index) => {
              const isSelected = selectedForPoll.includes(restaurant.id);

              return (
                <div
                  key={restaurant.id || index}
                  className={`group bg-dark-surface rounded-2xl border transition-all duration-500 flex flex-col h-full relative overflow-hidden ${
                    isSelected ? "border-accent-primary ring-4 ring-accent-primary/10" : "border-dark-border hover:border-gray-700"
                  }`}
                >
                  <div
                    className="absolute top-6 left-6 z-10 bg-black/60 backdrop-blur-md rounded-xl p-2 cursor-pointer transition-all hover:scale-110"
                    onClick={() => togglePollSelection(restaurant.id)}
                  >
                    <div
                      className={`w-5 h-5 flex items-center justify-center rounded-lg transition-all ${
                        isSelected ? "bg-accent-primary" : "bg-transparent border border-white/10"
                      }`}
                    >
                      {isSelected && <span className="text-white text-[10px] font-black">X</span>}
                    </div>
                  </div>

                  <div className="h-64 bg-black relative border-b border-dark-border overflow-hidden">
                    {restaurant.imageUrl ? (
                      <img
                        src={restaurant.imageUrl}
                        alt={restaurant.name}
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-700 font-bold uppercase text-[10px] tracking-[0.3em] bg-[radial-gradient(circle,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:15px_15px]">
                        No_Visual_Input
                      </div>
                    )}

                    {restaurant.rating && (
                      <div className="absolute top-6 right-6 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-2 border border-white/5">
                        <span className="text-accent-primary uppercase tracking-widest">Score:</span> {restaurant.rating}
                      </div>
                    )}
                  </div>

                  <div className="p-8 flex flex-col flex-1 uppercase">
                    <h3 className="text-lg font-bold text-white mb-2 leading-tight group-hover:text-accent-primary transition-colors duration-300 tracking-wide">
                      {restaurant.name}
                    </h3>
                    <p className="text-gray-500 text-[10px] mb-8 flex-1 leading-relaxed line-clamp-2 tracking-widest">
                      {restaurant.address}
                    </p>

                    <div className="flex justify-between items-center py-4 border-t border-white/5 mb-6">
                      <span className="text-gray-400 text-[10px] tracking-widest">Dist: {restaurant.distance}</span>
                      {restaurant.priceLevel && (
                        <span className="text-gray-600 font-black tracking-[0.2em] text-[10px]">{restaurant.priceLevel}</span>
                      )}
                    </div>

                    {userLocation && restaurant.lat && restaurant.lng && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${restaurant.lat},${restaurant.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center bg-transparent hover:bg-white hover:text-black text-white font-bold py-4 rounded-xl border border-white/10 transition-all duration-300 uppercase tracking-[0.2em] text-[10px]"
                      >
                        [ Navigate_ ]
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="border-t border-dark-border bg-dark-surface py-12 text-center text-gray-600 tracking-[0.4em] text-[9px] uppercase mt-auto">
        <p>© {new Date().getFullYear()} Tri_Lunch / OS_Aesthetic</p>
      </footer>
    </div>
  );
}
