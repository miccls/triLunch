"use client";

import { useState, useMemo } from "react";
import dynamic from 'next/dynamic';

// Dynamically import the map to avoid SSR errors with window object
const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => <div className="h-[600px] w-full bg-arcade-panel border-2 border-arcade-neon flex items-center justify-center neon-text blink">LOADING MAP_SYSTEM...</div>
});

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  // View State
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Filter & Sort State
  const [priceFilter, setPriceFilter] = useState("All");
  const [sortBy, setSortBy] = useState("closest");

  // Polling State
  const [selectedForPoll, setSelectedForPoll] = useState<string[]>([]);
  const [pollCreating, setPollCreating] = useState(false);
  const [pollLink, setPollLink] = useState<string | null>(null);

  const handleSearch = (isLucky: boolean = false) => {
    if (!isLucky && !query) return;
    
    setLoading(true);
    setError(null);
    setHasSearched(true);
    setResults([]);
    setSelectedForPoll([]);
    setPollLink(null);

    if (!navigator.geolocation) {
      setError("ERR_SYS_01: LOCATION_MODULE_OFFLINE");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserLocation({ lat, lng });

        try {
          const searchQuery = (!query && isLucky) ? "lunch" : query;

          const res = await fetch("/api/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: searchQuery, lat, lng }),
          });
          
          if (!res.ok) throw new Error("ERR_NET_02: TARGET_UNREACHABLE");
          
          const data = await res.json();
          let fetchedResults = data.restaurants || [];

          if (isLucky && fetchedResults.length > 0) {
            const highlyRated = fetchedResults.filter((r: any) => r.rating >= 4.0);
            const pool = highlyRated.length > 0 ? highlyRated : fetchedResults;
            const randomChoice = pool[Math.floor(Math.random() * pool.length)];
            setResults([randomChoice]);
            setViewMode('list');
          } else {
            setResults(fetchedResults);
          }

        } catch (err: any) {
          setError(err.message || "ERR_SYS_03: UNKNOWN_EXCEPTION");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError("ERR_SYS_04: LOC_PERMISSION_DENIED. ACCESS RESTRICTED.");
        setLoading(false);
      }
    );
  };

  const togglePollSelection = (restaurantId: string) => {
    setSelectedForPoll(prev => {
      if (prev.includes(restaurantId)) {
        return prev.filter(id => id !== restaurantId);
      }
      if (prev.length >= 3) {
        alert("SYS_LIMIT_REACHED: MAX 3 TARGETS ALLOWED.");
        return prev;
      }
      return [...prev, restaurantId];
    });
  };

  const createPoll = async () => {
    if (selectedForPoll.length === 0) return;
    setPollCreating(true);
    
    try {
      const selectedRestaurants = results.filter(r => selectedForPoll.includes(r.id));
      const res = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurants: selectedRestaurants, query })
      });
      
      if (!res.ok) throw new Error("FAIL");
      
      const data = await res.json();
      const origin = window.location.origin;
      setPollLink(`${origin}/poll/${data.id}`);
    } catch (err) {
      console.error(err);
      alert("ERR_SYS_05: CO-OP_LINK_FAIL.");
    } finally {
      setPollCreating(false);
    }
  };

  const filteredAndSortedResults = useMemo(() => {
    let finalResults = [...results];

    if (priceFilter !== "All") {
      finalResults = finalResults.filter(r => r.priceLevel === priceFilter);
    }

    if (sortBy === "closest") {
      finalResults.sort((a, b) => a.distanceRaw - b.distanceRaw);
    } else if (sortBy === "rating") {
      finalResults.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return finalResults;
  }, [results, priceFilter, sortBy]);

  return (
    <div className="min-h-screen bg-arcade-bg text-arcade-text flex flex-col uppercase relative">
      {/* Grid background effect */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none bg-[linear-gradient(rgba(57,255,20,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(57,255,20,0.2)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

      <header className="relative z-10 py-16 px-6 md:px-12 border-b-4 border-arcade-neon neon-border shadow-[0_0_20px_rgba(57,255,20,0.3)] bg-arcade-panel">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-6xl md:text-8xl font-black tracking-widest mb-4 neon-text">
            TRI_<span className="text-arcade-accent neon-text-accent">LUNCH</span>
          </h1>
          <p className="text-xl md:text-2xl text-arcade-neon mb-8 tracking-widest">
            &gt; INITIALIZE TARGET ACQUISITION...
          </p>

          <div className="p-4 bg-arcade-bg border-2 border-arcade-neon neon-border max-w-4xl mx-auto flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="ENTER CRAVING_ (E.G. SUSHI, PIZZA)"
              className="flex-1 px-4 py-3 bg-black text-arcade-neon border border-arcade-neon focus:outline-none focus:ring-2 focus:ring-arcade-accent placeholder-arcade-neon/50 text-lg uppercase tracking-wider"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch(false)}
            />
            <div className="flex gap-4">
              <button
                onClick={() => handleSearch(false)}
                disabled={loading}
                className="bg-transparent border-2 border-arcade-neon text-arcade-neon hover:bg-arcade-neon hover:text-black font-bold text-lg py-3 px-6 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center tracking-widest"
              >
                {loading ? "SCANNING..." : "EXECUTE"}
              </button>
              <button
                onClick={() => handleSearch(true)}
                disabled={loading}
                className="bg-transparent border-2 border-arcade-accent text-arcade-accent hover:bg-arcade-accent hover:text-black font-bold text-lg py-3 px-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center tracking-widest"
                title="RNG Target Selector"
              >
                🎲 RNG
              </button>
            </div>
          </div>
          {error && <p className="text-arcade-accent neon-text-accent mt-4 text-sm font-bold tracking-widest animate-pulse">{error}</p>}
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-6 py-10 w-full relative z-10">
        {hasSearched && !loading && !error && results.length > 0 && (
          <div className="flex flex-col md:flex-row justify-between items-center bg-arcade-panel p-4 border-2 border-arcade-neon mb-8 gap-4 neon-border">
            
            <div className="flex flex-wrap gap-6 items-center">
              <div className="flex gap-2">
                <button 
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 text-sm font-bold border-2 transition-colors ${viewMode === 'list' ? 'bg-arcade-neon text-black border-arcade-neon' : 'bg-transparent text-arcade-neon border-arcade-neon hover:bg-arcade-neon/20'}`}
                >
                  DATABANK
                </button>
                <button 
                  onClick={() => setViewMode('map')}
                  className={`px-4 py-2 text-sm font-bold border-2 transition-colors ${viewMode === 'map' ? 'bg-arcade-neon text-black border-arcade-neon' : 'bg-transparent text-arcade-neon border-arcade-neon hover:bg-arcade-neon/20'}`}
                >
                  RADAR
                </button>
              </div>

              <div className="h-8 w-1 bg-arcade-neon hidden md:block"></div>

              <div className="flex items-center gap-3">
                <label className="text-sm font-bold text-arcade-neon tracking-widest">SORT:</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-black border border-arcade-neon text-arcade-neon text-sm p-2 focus:ring-arcade-accent uppercase tracking-widest">
                  <option value="closest">PROXIMITY</option>
                  <option value="rating">HIGH_SCORE</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-bold text-arcade-neon tracking-widest">CREDITS:</label>
                <select value={priceFilter} onChange={(e) => setPriceFilter(e.target.value)} className="bg-black border border-arcade-neon text-arcade-neon text-sm p-2 focus:ring-arcade-accent uppercase tracking-widest">
                  <option value="All">ANY</option>
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
          <div className="mb-8 p-4 bg-arcade-panel border-2 border-arcade-accent neon-border-accent flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-arcade-accent tracking-widest text-xl neon-text-accent">MULTIPLAYER CO-OP</h3>
              <p className="text-sm text-arcade-text tracking-widest">TARGETS LOCKED: {selectedForPoll.length} / 3</p>
            </div>
            {pollLink ? (
              <div className="flex items-center gap-2 w-full md:w-auto">
                <input type="text" readOnly value={pollLink} className="flex-1 md:w-64 px-3 py-2 text-sm border border-arcade-neon bg-black text-arcade-neon" />
                <button onClick={() => navigator.clipboard.writeText(pollLink)} className="bg-arcade-neon text-black border-2 border-arcade-neon hover:bg-transparent hover:text-arcade-neon px-4 py-2 text-sm font-bold tracking-widest transition-colors">COPY_LINK</button>
              </div>
            ) : (
              <button 
                onClick={createPoll}
                disabled={pollCreating}
                className="bg-arcade-accent text-black hover:bg-transparent hover:text-arcade-accent border-2 border-arcade-accent font-bold py-2 px-6 tracking-widest transition-colors disabled:opacity-50"
              >
                {pollCreating ? "GENERATING..." : "INITIATE_POLL"}
              </button>
            )}
          </div>
        )}

        {hasSearched && !loading && !error && filteredAndSortedResults.length === 0 && (
          <div className="text-center py-20 bg-arcade-panel border-2 border-arcade-accent neon-border-accent">
            <h3 className="text-3xl font-bold text-arcade-accent mb-4 blink">0 TARGETS FOUND</h3>
            <p className="text-arcade-text tracking-widest">ADJUST SCAN PARAMETERS AND RETRY.</p>
          </div>
        )}

        {hasSearched && filteredAndSortedResults.length > 0 && viewMode === 'map' && userLocation && (
          <div className="border-4 border-arcade-neon neon-border p-1 bg-black">
             <MapView userLocation={userLocation} restaurants={filteredAndSortedResults} />
          </div>
        )}

        {hasSearched && filteredAndSortedResults.length > 0 && viewMode === 'list' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredAndSortedResults.map((restaurant, idx) => {
              const isSelected = selectedForPoll.includes(restaurant.id);
              
              return (
                <div key={restaurant.id || idx} className={`group bg-arcade-panel border-2 transition-all duration-300 flex flex-col h-full relative ${isSelected ? 'border-arcade-accent neon-border-accent scale-105 z-10' : 'border-arcade-neon hover:neon-border'}`}>
                  
                  <div className="absolute top-4 left-4 z-10 bg-black border-2 border-arcade-neon p-1 cursor-pointer" onClick={() => togglePollSelection(restaurant.id)}>
                    <div className={`w-6 h-6 flex items-center justify-center transition-colors ${isSelected ? 'bg-arcade-accent' : 'bg-black hover:bg-arcade-neon/30'}`}>
                      {isSelected && <span className="text-black font-black text-xl leading-none">X</span>}
                    </div>
                  </div>

                  <div className="h-56 bg-black relative border-b-2 border-arcade-neon overflow-hidden">
                    {restaurant.imageUrl ? (
                      <img src={restaurant.imageUrl} alt={restaurant.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity grayscale group-hover:grayscale-0" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-arcade-neon/50 font-bold tracking-widest text-sm bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(57,255,20,0.1)_10px,rgba(57,255,20,0.1)_20px)]">NO_VISUAL_DATA</div>
                    )}
                    
                    {restaurant.rating && (
                      <div className="absolute top-4 right-4 bg-black border border-arcade-neon text-arcade-neon px-2 py-1 text-sm font-black flex items-center gap-1">
                        SCORE: {restaurant.rating}
                      </div>
                    )}
                  </div>
                  
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="text-xl font-bold text-arcade-neon mb-2 tracking-wider group-hover:neon-text">{restaurant.name}</h3>
                    <p className="text-arcade-text/70 text-sm mb-6 flex-1 tracking-widest">{restaurant.address}</p>
                    
                    <div className="flex justify-between items-center pt-4 border-t-2 border-arcade-neon/30 mb-6">
                      <span className="text-arcade-accent font-bold text-sm tracking-widest">
                        DST: {restaurant.distance}
                      </span>
                      {restaurant.priceLevel && (
                        <span className="text-arcade-neon font-bold tracking-widest bg-black px-2 border border-arcade-neon">LVL: {restaurant.priceLevel}</span>
                      )}
                    </div>
                    
                    {userLocation && restaurant.lat && restaurant.lng && (
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${restaurant.lat},${restaurant.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center bg-transparent hover:bg-arcade-neon hover:text-black text-arcade-neon font-bold py-3 border-2 border-arcade-neon tracking-widest transition-colors"
                      >
                        [ NAVIGATE_ ]
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="relative z-10 border-t-2 border-arcade-neon bg-arcade-panel py-6 text-center text-arcade-neon/50 tracking-widest text-xs">
        <p>© {new Date().getFullYear()} TRI_LUNCH SYS. v1.0. ALL RIGHTS RESERVED.</p>
      </footer>
    </div>
  );
}
