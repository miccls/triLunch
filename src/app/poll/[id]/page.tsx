"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function PollPage() {
  const params = useParams();
  const pollId = params.id as string;
  
  const [poll, setPoll] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [votingFor, setVotingFor] = useState<string | null>(null);

  const fetchPoll = async () => {
    try {
      const res = await fetch(`/api/polls/${pollId}/vote`);
      if (!res.ok) throw new Error("Poll not found");
      const data = await res.json();
      setPoll(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!pollId) return;
    fetchPoll();
    // Set up polling to refresh results every 5 seconds for live updates
    const interval = setInterval(fetchPoll, 5000);
    return () => clearInterval(interval);
  }, [pollId]);

  const handleVote = async (restaurantId: string) => {
    if (hasVoted) return;
    setVotingFor(restaurantId);
    
    try {
      const res = await fetch(`/api/polls/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId })
      });
      
      if (!res.ok) throw new Error("Failed to vote");
      
      const data = await res.json();
      setPoll(data.poll);
      setHasVoted(true);
    } catch (err) {
      alert("Error casting vote.");
    } finally {
      setVotingFor(null);
    }
  };

  if (loading) return <div className="min-h-screen bg-osttra-light flex items-center justify-center font-sans"><div className="text-xl text-osttra-indigo animate-pulse font-bold">Loading poll...</div></div>;
  
  if (error || !poll) return <div className="min-h-screen bg-osttra-light flex items-center justify-center font-sans"><div className="text-xl text-red-500 bg-white p-8 rounded-md shadow-sm font-bold">Error: {error || "Poll not found"}</div></div>;

  const totalVotes = poll.options.reduce((sum: number, option: any) => sum + option.votes, 0);

  return (
    <div className="min-h-screen bg-osttra-light text-gray-900 font-sans flex flex-col">
      <header className="bg-gradient-to-br from-osttra-indigo to-osttra-indigo-dark text-white py-12 px-6 text-center shadow-md relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-50%] right-[-10%] w-[300px] h-[300px] rounded-full bg-osttra-rose blur-[80px]" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2 relative z-10">
          tri<span className="text-osttra-rose">Lunch</span> Poll
        </h1>
        <p className="text-lg text-gray-200 relative z-10">Help the team decide where to eat for "{poll.query}"!</p>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 w-full">
        <div className="bg-white rounded-md shadow-sm border border-osttra-gray p-6 md:p-8">
          <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-100">
            <h2 className="text-2xl font-bold text-osttra-indigo">Vote for your favorite</h2>
            <span className="bg-osttra-light text-gray-600 px-3 py-1 rounded-sm text-sm font-semibold">{totalVotes} Total Votes</span>
          </div>

          <div className="flex flex-col gap-6">
            {poll.options.map((option: any) => {
              const votePercentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
              const maxVotes = Math.max(...poll.options.map((o:any) => o.votes));
              const isWinner = totalVotes > 0 && option.votes === maxVotes;
              
              return (
                <div key={option.id} className="border border-osttra-gray rounded-md p-4 md:p-6 flex flex-col md:flex-row gap-6 items-center hover:shadow-md transition-shadow bg-white relative overflow-hidden">
                  
                  {/* Progress Bar Background */}
                  <div 
                    className="absolute top-0 left-0 h-full bg-osttra-rose/5 transition-all duration-1000 ease-out z-0 border-r border-osttra-rose/20" 
                    style={{ width: `${votePercentage}%` }}
                  />

                  <div className="w-full md:w-32 h-32 md:h-24 flex-shrink-0 bg-gray-100 rounded-sm overflow-hidden z-10">
                    {option.imageUrl ? (
                      <img src={option.imageUrl} alt={option.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No Image</div>
                    )}
                  </div>
                  
                  <div className="flex-1 text-center md:text-left z-10">
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                      <h3 className="text-xl font-bold text-gray-900">{option.name}</h3>
                      {option.rating && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-sm font-bold">★ {option.rating}</span>}
                    </div>
                    <p className="text-gray-500 text-sm mb-2">{option.address}</p>
                    <p className="text-xs font-semibold text-osttra-indigo">{option.distance} away {option.priceLevel && `• ${option.priceLevel}`}</p>
                  </div>

                  <div className="flex flex-col items-center gap-2 z-10 w-full md:w-auto">
                    <button 
                      onClick={() => handleVote(option.id)}
                      disabled={hasVoted || votingFor === option.id}
                      className={`w-full md:w-32 py-3 rounded-sm font-bold text-sm transition-all uppercase tracking-wide
                        ${hasVoted 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' 
                          : 'bg-osttra-rose hover:bg-osttra-rose-dark text-white shadow-sm hover:shadow-md'
                        }
                      `}
                    >
                      {votingFor === option.id ? 'Voting...' : (hasVoted ? 'Voted' : 'Vote')}
                    </button>
                    <div className="text-center">
                      <span className={`text-3xl font-black ${isWinner ? 'text-osttra-rose' : 'text-gray-700'}`}>{option.votes}</span>
                      <span className="text-xs text-gray-500 ml-1 font-semibold uppercase">votes</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {hasVoted && (
            <div className="mt-8 text-center p-4 bg-indigo-50 text-osttra-indigo rounded-sm font-medium border border-indigo-100">
              Thanks for voting! You can leave this page open to see live updates as your team votes.
            </div>
          )}
          
          <div className="mt-6 text-center">
            <a href="/" className="text-sm font-semibold text-gray-500 hover:text-osttra-indigo underline">← Create a new search</a>
          </div>
        </div>
      </main>
    </div>
  );
}
