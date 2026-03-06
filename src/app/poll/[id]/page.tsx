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
      if (!res.ok) throw new Error("ERR_DB_404: POLL_NOT_FOUND");
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
      
      if (!res.ok) throw new Error("ERR_DB_500: VOTE_CAST_FAILED");
      
      const data = await res.json();
      setPoll(data.poll);
      setHasVoted(true);
    } catch (err) {
      alert("SYS_ERROR: COULD NOT REGISTER SCORE.");
    } finally {
      setVotingFor(null);
    }
  };

  if (loading) return <div className="min-h-screen bg-arcade-bg flex items-center justify-center font-mono uppercase"><div className="text-xl text-arcade-neon neon-text blink tracking-widest font-bold">LOADING MULTIPLAYER DATA...</div></div>;
  
  if (error || !poll) return <div className="min-h-screen bg-arcade-bg flex items-center justify-center font-mono uppercase"><div className="text-xl text-arcade-accent bg-black border-2 border-arcade-accent p-8 neon-border-accent font-bold tracking-widest blink">SYS_ERR: {error || "POLL_NOT_FOUND"}</div></div>;

  const totalVotes = poll.options.reduce((sum: number, option: any) => sum + option.votes, 0);

  return (
    <div className="min-h-screen bg-arcade-bg text-arcade-text font-mono uppercase flex flex-col relative">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none bg-[linear-gradient(rgba(57,255,20,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(57,255,20,0.2)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

      <header className="relative z-10 py-12 px-6 text-center border-b-4 border-arcade-accent bg-arcade-panel neon-border-accent shadow-[0_0_20px_rgba(255,0,127,0.3)]">
        <h1 className="text-4xl md:text-6xl font-black tracking-widest mb-4 neon-text-accent text-arcade-accent">
          CO-OP <span className="text-arcade-neon neon-text">LUNCH</span> MODE
        </h1>
        <p className="text-lg text-arcade-neon tracking-widest">&gt; MISSION: "{poll.query}"</p>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 w-full relative z-10">
        <div className="bg-arcade-panel border-2 border-arcade-neon neon-border p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 pb-6 border-b-2 border-arcade-neon/30 gap-4">
            <h2 className="text-2xl font-bold text-arcade-neon tracking-widest neon-text">SELECT TARGET</h2>
            <span className="bg-black border border-arcade-neon text-arcade-neon px-4 py-2 text-sm font-bold tracking-widest">GLOBAL SCORE: {totalVotes}</span>
          </div>

          <div className="flex flex-col gap-8">
            {poll.options.map((option: any) => {
              const votePercentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
              const maxVotes = Math.max(...poll.options.map((o:any) => o.votes));
              const isWinner = totalVotes > 0 && option.votes === maxVotes;
              
              return (
                <div key={option.id} className={`border-2 p-4 flex flex-col md:flex-row gap-6 items-center transition-all bg-black relative overflow-hidden ${isWinner ? 'border-arcade-neon shadow-[0_0_15px_rgba(57,255,20,0.4)]' : 'border-arcade-neon/50'}`}>
                  
                  {/* Progress Bar Background */}
                  <div 
                    className="absolute top-0 left-0 h-full bg-arcade-neon/20 transition-all duration-1000 ease-out z-0 border-r-2 border-arcade-neon" 
                    style={{ width: `${votePercentage}%` }}
                  />

                  <div className="w-full md:w-32 h-32 md:h-24 flex-shrink-0 bg-arcade-panel border-2 border-arcade-neon/50 overflow-hidden z-10">
                    {option.imageUrl ? (
                      <img src={option.imageUrl} alt={option.name} className="w-full h-full object-cover grayscale opacity-80" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-arcade-neon/50 tracking-widest bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(57,255,20,0.1)_5px,rgba(57,255,20,0.1)_10px)]">NO_DATA</div>
                    )}
                  </div>
                  
                  <div className="flex-1 text-center md:text-left z-10">
                    <div className="flex flex-col md:flex-row items-center md:justify-start gap-3 mb-2">
                      <h3 className={`text-xl font-bold tracking-wider ${isWinner ? 'text-arcade-neon neon-text' : 'text-arcade-text'}`}>{option.name}</h3>
                      {option.rating && <span className="text-xs bg-black border border-arcade-accent text-arcade-accent px-2 py-1 font-bold tracking-widest">LVL: {option.rating}</span>}
                    </div>
                    <p className="text-arcade-text/70 text-sm mb-2 tracking-widest">{option.address}</p>
                    <p className="text-xs font-bold text-arcade-neon tracking-widest">DST: {option.distance} {option.priceLevel && `• CRD: ${option.priceLevel}`}</p>
                  </div>

                  <div className="flex flex-col items-center gap-4 z-10 w-full md:w-auto">
                    <button 
                      onClick={() => handleVote(option.id)}
                      disabled={hasVoted || votingFor === option.id}
                      className={`w-full md:w-40 py-3 font-bold text-sm tracking-widest border-2 transition-colors uppercase
                        ${hasVoted 
                          ? 'bg-black text-arcade-neon/30 border-arcade-neon/30 cursor-not-allowed' 
                          : 'bg-black text-arcade-accent border-arcade-accent hover:bg-arcade-accent hover:text-black hover:neon-border-accent'
                        }
                      `}
                    >
                      {votingFor === option.id ? 'UPLOADING...' : (hasVoted ? 'LOCKED_IN' : '[ VOTE_ ]')}
                    </button>
                    <div className="text-center bg-black border border-arcade-neon/30 px-4 py-1 min-w-[100px]">
                      <span className={`text-2xl font-black ${isWinner ? 'text-arcade-neon neon-text' : 'text-arcade-text'}`}>{option.votes}</span>
                      <span className="text-[10px] text-arcade-neon/70 ml-2 tracking-widest uppercase">PTS</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {hasVoted && (
            <div className="mt-8 text-center p-4 bg-black border border-arcade-neon text-arcade-neon tracking-widest text-sm font-bold blink">
              &gt; VOTE_REGISTERED. WAITING FOR SQUAD MATES TO SYNC...
            </div>
          )}
          
          <div className="mt-8 text-center">
            <a href="/" className="text-sm font-bold text-arcade-accent hover:text-arcade-neon tracking-widest transition-colors">&lt; ABORT_MISSION / RETURN_TO_BASE</a>
          </div>
        </div>
      </main>
    </div>
  );
}
