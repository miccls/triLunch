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
      if (!res.ok) throw new Error("ERR_404: Poll node not found.");
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
      
      if (!res.ok) throw new Error("ERR_500: Vote registration failed.");
      
      const data = await res.json();
      setPoll(data.poll);
      setHasVoted(true);
    } catch (err) {
      alert("System Error: Could not commit score.");
    } finally {
      setVotingFor(null);
    }
  };

  if (loading) return <div className="min-h-screen bg-dark-bg flex items-center justify-center font-mono uppercase"><div className="text-sm text-accent-primary animate-pulse tracking-[0.3em] font-bold">Synchronizing_Data...</div></div>;
  
  if (error || !poll) return <div className="min-h-screen bg-dark-bg flex items-center justify-center font-mono uppercase"><div className="text-xs text-accent-primary bg-black border border-accent-primary/30 p-8 rounded-2xl font-bold tracking-widest">! {error || "POLL_OFFLINE"}</div></div>;

  const totalVotes = poll.options.reduce((sum: number, option: any) => sum + option.votes, 0);

  return (
    <div className="min-h-screen bg-dark-bg text-gray-300 font-mono uppercase flex flex-col relative selection:bg-accent-primary selection:text-white">
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none bg-[linear-gradient(rgba(139,92,246,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.1)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

      <header className="relative z-10 py-16 px-6 text-center border-b border-dark-border bg-gradient-to-b from-dark-surface to-dark-bg">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none opacity-20">
          <div className="absolute top-[-50%] left-[-20%] w-[150%] h-[200%] bg-gradient-to-br from-accent-primary/20 via-transparent to-transparent blur-[150px]" />
        </div>
        <h1 className="text-3xl md:text-5xl font-black tracking-tighter mb-4 lowercase relative z-10">
          tri_<span className="text-accent-primary">poll</span>
        </h1>
        <p className="text-xs text-gray-500 tracking-[0.2em] relative z-10">&gt; Mission_Context: "{poll.query}"</p>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 w-full relative z-10">
        <div className="glass-panel rounded-3xl p-6 md:p-10 shadow-2xl">
          <div className="flex flex-col md:flex-row justify-between items-center mb-10 pb-6 border-b border-white/5 gap-4">
            <h2 className="text-lg font-bold text-white tracking-widest">Target_Selection</h2>
            <span className="bg-black/40 border border-white/10 text-accent-primary px-4 py-2 text-[10px] font-bold tracking-[0.2em] rounded-xl">Global_Score: {totalVotes}</span>
          </div>

          <div className="flex flex-col gap-8">
            {poll.options.map((option: any) => {
              const votePercentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
              const maxVotes = Math.max(...poll.options.map((o:any) => o.votes));
              const isWinner = totalVotes > 0 && option.votes === maxVotes;
              
              return (
                <div key={option.id} className={`border rounded-2xl p-5 flex flex-col md:flex-row gap-6 items-center transition-all bg-black/20 relative overflow-hidden group ${isWinner ? 'border-accent-primary/50 shadow-lg' : 'border-white/5'}`}>
                  
                  {/* Progress Bar Background */}
                  <div 
                    className="absolute top-0 left-0 h-full bg-accent-primary/10 transition-all duration-1000 ease-out z-0 border-r border-accent-primary/20" 
                    style={{ width: `${votePercentage}%` }}
                  />

                  <div className="w-full md:w-32 h-32 md:h-24 flex-shrink-0 bg-black/40 border border-white/5 rounded-xl overflow-hidden z-10">
                    {option.imageUrl ? (
                      <img src={option.imageUrl} alt={option.name} className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-700 tracking-widest bg-[radial-gradient(circle,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:10px_10px]">No_Data</div>
                    )}
                  </div>
                  
                  <div className="flex-1 text-center md:text-left z-10">
                    <div className="flex flex-col md:flex-row items-center md:justify-start gap-3 mb-2">
                      <h3 className={`text-lg font-bold tracking-tight transition-colors duration-300 ${isWinner ? 'text-white' : 'text-gray-400'}`}>{option.name}</h3>
                      {option.rating && <span className="text-[10px] bg-black/60 border border-white/10 text-gray-400 px-2 py-0.5 rounded-lg font-bold tracking-widest uppercase">Lvl: {option.rating}</span>}
                    </div>
                    <p className="text-gray-600 text-[10px] mb-2 tracking-widest lowercase line-clamp-1">{option.address}</p>
                    <p className="text-[9px] font-bold text-accent-primary tracking-[0.2em]">Dist: {option.distance} {option.priceLevel && `• Cost: ${option.priceLevel}`}</p>
                  </div>

                  <div className="flex flex-col items-center gap-4 z-10 w-full md:w-auto">
                    <button 
                      onClick={() => handleVote(option.id)}
                      disabled={hasVoted || votingFor === option.id}
                      className={`w-full md:w-40 py-3 font-bold text-[10px] tracking-[0.2em] border rounded-xl transition-all uppercase
                        ${hasVoted 
                          ? 'bg-transparent text-gray-700 border-white/5 cursor-not-allowed' 
                          : 'bg-accent-primary text-white border-accent-primary hover:bg-accent-hover hover:glow-accent'
                        }
                      `}
                    >
                      {votingFor === option.id ? 'Syncing...' : (hasVoted ? 'Committed' : '[ Vote_ ]')}
                    </button>
                    <div className="text-center bg-black/40 border border-white/5 px-4 py-1.5 rounded-xl min-w-[100px]">
                      <span className={`text-xl font-black ${isWinner ? 'text-white' : 'text-gray-500'}`}>{option.votes}</span>
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
            <a href="/" className="text-[9px] font-bold text-gray-600 hover:text-accent-primary tracking-[0.3em] transition-colors uppercase border-b border-transparent hover:border-accent-primary pb-1">/ Abort_Mission_Return_To_Base</a>
          </div>
        </div>
      </main>
    </div>
  );
}
