"use client";

import { useState, useMemo } from "react";
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => <div className="h-[600px] w-full bg-dark-surface rounded-2xl border border-dark-border flex items-center justify-center text-gray-400 animate-pulse font-mono tracking-widest uppercase">Initializing Radar System...</div>
});

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [priceFilter, setPriceFilter] = useState("All");
  const [sortBy, setSortBy] = useState("closest");

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
      setError("Geolocation is not supported by your browser");
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
          
          if (!res.ok) throw new Error("Connection failed. Try again.");
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
          setError(err.message || "An unexpected error occurred");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError("Unable to retrieve your location. Please check browser permissions.");
        setLoading(false);
      }
    );
  };

  const togglePollSelection = (restaurantId: string) => {
    setSelectedForPoll(prev => {
      if (prev.includes(restaurantId)) {
        return prev.filter(id => id !== restaurantId);
      }
      if (prev.length >= 3) return prev;
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
      if (!res.ok) throw new Error("Fail");
      const data = await res.json();
      setPollLink(`${window.location.origin}/poll/${data.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setPollCreating(false);
    }
  };

  const filteredAndSortedResults = useMemo(() => {
    let finalResults = [...results];
    if (priceFilter !== "All") finalResults = finalResults.filter(r => r.priceLevel === priceFilter);
    if (sortBy === "closest") finalResults.sort((a, b) => a.distanceRaw - b.distanceRaw);
    else if (sortBy === "rating") finalResults.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    return finalResults;
  }, [results, priceFilter, sortBy]);

  return (
    <div className="min-h-screen bg-dark-bg text-gray-100 flex flex-col font-sans">
      <header className="py-20 px-6 bg-gradient-to-b from-dark-surface to-dark-bg relative overflow-hidden border-b border-dark-border">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none opacity-20">
          <div className="absolute top-[-50%] left-[-20%] w-[150%] h-[200%] bg-gradient-to-br from-osttra-indigo/30 via-transparent to-osttra-rose/10 blur-[150px]" />
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-gray-500">
            tri<span className="text-osttra-rose">Lunch</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 font-light mb-12 max-w-2xl mx-auto leading-relaxed">
            Smart dining solutions for the modern team.
          </p>

          <div className="glass-panel p-2 rounded-2xl max-w-4xl mx-auto flex flex-col md:flex-row gap-2 shadow-2xl">
            <input
              type="text"
              placeholder="What are you craving? (e.g. sushi, salad)"
              className="flex-1 px-6 py-4 bg-black/40 text-white rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-osttra-rose/50 transition-all text-lg placeholder-gray-500"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch(false)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleSearch(false)}
                disabled={loading}
                className="bg-osttra-rose hover:bg-osttra-rose-hover text-white font-bold text-lg py-4 px-10 rounded-xl transition-all glow-rose disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center uppercase tracking-wider"
              >
                {loading ? "Scanning..." : "Search"}
              </button>
              <button
                onClick={() => handleSearch(true)}
                disabled={loading}
                className="bg-dark-surface hover:bg-gray-800 text-white font-bold text-lg py-4 px-6 rounded-xl border border-dark-border transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center uppercase"
                title="RNG Discovery"
              >
                🎲
              </button>
            </div>
          </div>
          {error && <p className="text-osttra-rose mt-4 text-sm font-semibold tracking-wide animate-pulse">{error}</p>}
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full relative">
        {hasSearched && !loading && !error && results.length > 0 && (
          <div className="flex flex-col md:flex-row justify-between items-center glass-panel p-4 rounded-2xl mb-8 gap-4">
            
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                <button 
                  onClick={() => setViewMode('list')}
                  className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${viewMode === 'list' ? 'bg-dark-surface text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                >
                  List
                </button>
                <button 
                  onClick={() => setViewMode('map')}
                  className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${viewMode === 'map' ? 'bg-dark-surface text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                >
                  Radar
                </button>
              </div>

              <div className="h-8 w-px bg-white/10 hidden md:block"></div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-black text-gray-500 tracking-widest uppercase">Sort</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-dark-surface border border-white/10 text-white text-sm rounded-lg p-2 focus:ring-osttra-rose transition-all">
                  <option value="closest">Proximity</option>
                  <option value="rating">Rating</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-black text-gray-500 tracking-widest uppercase">Price</label>
                <select value={priceFilter} onChange={(e) => setPriceFilter(e.target.value)} className="bg-dark-surface border border-white/10 text-white text-sm rounded-lg p-2 focus:ring-osttra-rose transition-all">
                  <option value="All">All Levels</option>
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
          <div className="mb-8 p-6 bg-gradient-to-r from-osttra-indigo to-dark-surface border border-osttra-rose/30 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h3 className="font-bold text-white text-xl mb-1">Collaborative Dining</h3>
              <p className="text-sm text-gray-400">Locked targets: {selectedForPoll.length} / 3</p>
            </div>
            {pollLink ? (
              <div className="flex items-center gap-2 w-full md:w-auto">
                <input type="text" readOnly value={pollLink} className="flex-1 md:w-80 px-4 py-3 text-sm border border-white/10 rounded-xl bg-black/40 text-osttra-rose font-mono" />
                <button onClick={() => navigator.clipboard.writeText(pollLink)} className="bg-white text-black hover:bg-gray-200 px-6 py-3 text-sm font-bold rounded-xl transition-all uppercase tracking-widest">Copy</button>
              </div>
            ) : (
              <button 
                onClick={createPoll}
                disabled={pollCreating}
                className="bg-osttra-rose hover:bg-osttra-rose-hover text-white font-bold py-3 px-8 rounded-xl transition-all glow-rose disabled:opacity-50"
              >
                {pollCreating ? "Initializing..." : "Generate Session Link"}
              </button>
            )}
          </div>
        )}

        {hasSearched && !loading && !error && filteredAndSortedResults.length === 0 && (
          <div className="text-center py-24 glass-panel rounded-3xl">
            <h3 className="text-3xl font-light text-white mb-4 italic tracking-tight">Zero Targets Found</h3>
            <p className="text-gray-500 text-lg">Adjust scanner parameters and retry acquisition.</p>
          </div>
        )}

        {hasSearched && filteredAndSortedResults.length > 0 && viewMode === 'map' && userLocation && (
          <div className="border border-dark-border p-1 bg-black rounded-3xl overflow-hidden shadow-2xl">
             <MapView userLocation={userLocation} restaurants={filteredAndSortedResults} />
          </div>
        )}

        {hasSearched && filteredAndSortedResults.length > 0 && viewMode === 'list' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredAndSortedResults.map((restaurant, idx) => {
              const isSelected = selectedForPoll.includes(restaurant.id);
              return (
                <div key={restaurant.id || idx} className={`group bg-dark-surface rounded-3xl border transition-all duration-500 flex flex-col h-full relative overflow-hidden ${isSelected ? 'border-osttra-rose ring-4 ring-osttra-rose/10' : 'border-dark-border hover:border-gray-700'}`}>
                  
                  {/* Selection Check */}
                  <div className="absolute top-6 left-6 z-10 bg-black/60 backdrop-blur-md rounded-xl p-2 cursor-pointer transition-all hover:scale-110" onClick={() => togglePollSelection(restaurant.id)}>
                    <div className={`w-6 h-6 flex items-center justify-center rounded-lg transition-all ${isSelected ? 'bg-osttra-rose' : 'bg-transparent border-2 border-white/20'}`}>
                      {isSelected && <span className="text-white text-sm font-black">✓</span>}
                    </div>
                  </div>

                  <div className="h-64 bg-black relative border-b border-dark-border overflow-hidden">
                    {restaurant.imageUrl ? (
                      <img src={restaurant.imageUrl} alt={restaurant.name} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-all duration-700 group-hover:scale-110" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-700 font-bold uppercase text-xs tracking-[0.2em] bg-[radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px]">Data Unavailable</div>
                    )}
                    
                    {restaurant.rating && (
                      <div className="absolute top-6 right-6 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-sm font-bold flex items-center gap-1.5 border border-white/10">
                        <span className="text-osttra-rose">★</span> {restaurant.rating}
                      </div>
                    )}
                  </div>
                  
                  <div className="p-8 flex flex-col flex-1">
                    <h3 className="text-2xl font-bold text-white mb-2 leading-tight group-hover:text-osttra-rose transition-colors duration-300">{restaurant.name}</h3>
                    <p className="text-gray-500 text-sm mb-8 flex-1 leading-relaxed line-clamp-2">{restaurant.address}</p>
                    
                    <div className="flex justify-between items-center py-4 border-t border-white/5 mb-6">
                      <span className="text-white font-mono text-sm tracking-tighter">
                        {restaurant.distance}
                      </span>
                      {restaurant.priceLevel && (
                        <span className="text-gray-500 font-bold tracking-[0.3em] text-xs">{restaurant.priceLevel}</span>
                      )}
                    </div>
                    
                    {userLocation && restaurant.lat && restaurant.lng && (
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${restaurant.lat},${restaurant.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center bg-transparent hover:bg-white hover:text-black text-white font-bold py-4 rounded-2xl border border-white/20 transition-all duration-300 uppercase tracking-widest text-xs"
                      >
                        Navigate
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="border-t border-dark-border bg-dark-surface py-12 text-center text-gray-500 tracking-widest text-[10px] uppercase mt-auto">
        <p>© {new Date().getFullYear()} triLunch System / Developed by Osttra</p>
      </footer>
    </div>
  );
}
