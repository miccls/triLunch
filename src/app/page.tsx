"use client";

import { useState, useMemo } from "react";
import dynamic from 'next/dynamic';

// Dynamically import the map to avoid SSR errors with window object
const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => <div className="h-[600px] w-full bg-gray-100 animate-pulse rounded-md border border-osttra-gray flex items-center justify-center">Loading interactive map...</div>
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
    // Only require query if it's a standard search
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
          // If lucky search and no query, default to "lunch" to get a broad pool
          const searchQuery = (!query && isLucky) ? "lunch" : query;

          const res = await fetch("/api/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: searchQuery, lat, lng }),
          });
          
          if (!res.ok) throw new Error("Failed to fetch restaurants");
          
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
        setError("Unable to retrieve your location. Please ensure location services are enabled.");
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
        alert("You can select up to 3 restaurants for a poll.");
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
      
      if (!res.ok) throw new Error("Failed to create poll");
      
      const data = await res.json();
      const origin = window.location.origin;
      setPollLink(`${origin}/poll/${data.id}`);
    } catch (err) {
      console.error(err);
      alert("Error creating poll.");
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
    <div className="min-h-screen bg-osttra-light text-gray-900 font-sans flex flex-col">
      <header className="bg-gradient-to-br from-osttra-indigo to-osttra-indigo-dark text-white py-16 px-6 md:px-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-osttra-rose blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-white blur-[80px]" />
        </div>

        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-4">
            tri<span className="text-osttra-rose">Lunch</span>
          </h1>
          <p className="text-lg md:text-xl font-light text-gray-200 mb-8 max-w-2xl mx-auto">
            Discover the perfect dining experience nearby.
          </p>

          <div className="bg-white/10 backdrop-blur-md p-2 rounded-lg max-w-4xl mx-auto flex flex-col md:flex-row gap-2 border border-white/20 shadow-2xl">
            <input
              type="text"
              placeholder="What are you craving? (e.g., sushi, pizza, salad)"
              className="flex-1 px-6 py-4 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-osttra-rose transition-all text-lg font-medium placeholder-gray-400"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch(false)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleSearch(false)}
                disabled={loading}
                className="bg-osttra-rose hover:bg-osttra-rose-dark text-white font-bold text-lg py-4 px-8 rounded-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center uppercase tracking-wide whitespace-nowrap"
              >
                {loading ? "Searching..." : "Find Lunch"}
              </button>
              <button
                onClick={() => handleSearch(true)}
                disabled={loading}
                className="bg-white hover:bg-gray-100 text-osttra-indigo font-bold text-lg py-4 px-6 rounded-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center uppercase tracking-wide whitespace-nowrap shadow-sm border border-transparent"
                title="Find a highly-rated restaurant nearby"
              >
                🎲 Lucky
              </button>
            </div>
          </div>
          {error && <p className="text-red-400 mt-4 text-sm font-medium">{error}</p>}
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-6 py-10 w-full">
        {hasSearched && !loading && !error && results.length > 0 && (
          <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-md shadow-sm border border-osttra-gray mb-8 gap-4">
            
            {/* View Toggles & Filters */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex bg-osttra-light p-1 rounded-md border border-osttra-gray">
                <button 
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-1.5 text-sm font-bold rounded-sm transition-colors ${viewMode === 'list' ? 'bg-white text-osttra-indigo shadow-sm' : 'text-gray-500 hover:text-osttra-indigo'}`}
                >
                  List View
                </button>
                <button 
                  onClick={() => setViewMode('map')}
                  className={`px-4 py-1.5 text-sm font-bold rounded-sm transition-colors ${viewMode === 'map' ? 'bg-white text-osttra-indigo shadow-sm' : 'text-gray-500 hover:text-osttra-indigo'}`}
                >
                  Map View
                </button>
              </div>

              <div className="h-6 w-px bg-gray-300 hidden md:block"></div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-osttra-indigo">Sort by:</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-osttra-light border border-osttra-gray text-gray-900 text-sm rounded-sm p-1.5 focus:ring-osttra-rose">
                  <option value="closest">Closest</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-osttra-indigo">Price:</label>
                <select value={priceFilter} onChange={(e) => setPriceFilter(e.target.value)} className="bg-osttra-light border border-osttra-gray text-gray-900 text-sm rounded-sm p-1.5 focus:ring-osttra-rose">
                  <option value="All">All</option>
                  <option value="$">$</option>
                  <option value="$$">$$</option>
                  <option value="$$$">$$$</option>
                  <option value="$$$$">$$$$</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Polling Creation Area */}
        {hasSearched && results.length > 0 && selectedForPoll.length > 0 && (
          <div className="mb-8 p-4 bg-indigo-50 border border-osttra-indigo/20 rounded-md shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-osttra-indigo">Team Lunch Poll</h3>
              <p className="text-sm text-gray-600">You've selected {selectedForPoll.length} of 3 restaurants.</p>
            </div>
            {pollLink ? (
              <div className="flex items-center gap-2 w-full md:w-auto">
                <input type="text" readOnly value={pollLink} className="flex-1 md:w-64 px-3 py-2 text-sm border rounded-sm bg-white" />
                <button onClick={() => navigator.clipboard.writeText(pollLink)} className="bg-osttra-indigo text-white px-4 py-2 text-sm font-bold rounded-sm">Copy</button>
              </div>
            ) : (
              <button 
                onClick={createPoll}
                disabled={pollCreating}
                className="bg-osttra-indigo hover:bg-osttra-indigo-dark text-white font-bold py-2 px-6 rounded-sm shadow-md transition-colors disabled:opacity-50"
              >
                {pollCreating ? "Creating..." : "Create Poll Link"}
              </button>
            )}
          </div>
        )}

        {hasSearched && !loading && !error && filteredAndSortedResults.length === 0 && (
          <div className="text-center py-20 bg-white rounded-lg border border-osttra-gray shadow-sm">
            <h3 className="text-2xl font-bold text-osttra-indigo mb-2">No results found</h3>
            <p className="text-gray-500 text-lg">We couldn't find any restaurants matching your search or filters nearby.</p>
          </div>
        )}

        {/* Results Rendering (List or Map) */}
        {hasSearched && filteredAndSortedResults.length > 0 && viewMode === 'map' && userLocation && (
          <MapView userLocation={userLocation} restaurants={filteredAndSortedResults} />
        )}

        {hasSearched && filteredAndSortedResults.length > 0 && viewMode === 'list' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredAndSortedResults.map((restaurant, idx) => {
              const isSelected = selectedForPoll.includes(restaurant.id);
              
              return (
                <div key={restaurant.id || idx} className={`group bg-white rounded-md shadow-sm border overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full relative ${isSelected ? 'border-osttra-indigo ring-2 ring-osttra-indigo/20' : 'border-osttra-gray'}`}>
                  
                  {/* Select for Poll Checkbox */}
                  <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur rounded-sm p-1 shadow-md flex items-center justify-center cursor-pointer" onClick={() => togglePollSelection(restaurant.id)}>
                    <div className={`w-6 h-6 border-2 flex items-center justify-center rounded-sm transition-colors ${isSelected ? 'border-osttra-indigo bg-osttra-indigo' : 'border-gray-400 bg-white'}`}>
                      {isSelected && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                  </div>

                  <div className="h-56 bg-osttra-gray relative overflow-hidden">
                    {restaurant.imageUrl ? (
                      <img src={restaurant.imageUrl} alt={restaurant.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 font-medium bg-gray-100">Image Unavailable</div>
                    )}
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-osttra-rose"></div>
                    
                    {restaurant.rating && (
                      <div className="absolute top-4 right-4 bg-white/95 text-osttra-indigo px-3 py-1 rounded-sm text-sm font-black flex items-center gap-1 shadow-md">
                        ★ {restaurant.rating}
                      </div>
                    )}
                  </div>
                  
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight group-hover:text-osttra-rose transition-colors">{restaurant.name}</h3>
                    <p className="text-gray-500 text-sm mb-6 flex-1 leading-relaxed">{restaurant.address}</p>
                    
                    <div className="flex justify-between items-center pt-4 border-t border-osttra-gray mb-4">
                      <span className="text-osttra-indigo font-semibold text-sm bg-osttra-indigo/5 px-3 py-1.5 rounded-sm">
                        {restaurant.distance} away
                      </span>
                      {restaurant.priceLevel && (
                        <span className="text-gray-400 font-bold tracking-widest">{restaurant.priceLevel}</span>
                      )}
                    </div>
                    
                    {userLocation && restaurant.lat && restaurant.lng && (
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${restaurant.lat},${restaurant.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center bg-osttra-light hover:bg-osttra-rose hover:text-white text-osttra-indigo font-semibold py-2 px-4 rounded-sm border border-osttra-gray hover:border-osttra-rose transition-colors"
                      >
                        Take me there 🧭
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-osttra-gray py-8 text-center text-gray-500 text-sm mt-auto">
        <p>© {new Date().getFullYear()} triLunch by Osttra. Modern post-trade dining solutions.</p>
      </footer>
    </div>
  );
}
