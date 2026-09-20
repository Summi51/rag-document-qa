import { BookIcon } from "./Icons.jsx";

function SourceList({ sources }) {
  if (!sources.length) {
    return null;
  }

  return (
    <div className="card-glass rounded-2xl p-6 animate-fade-in-up">
      <div className="flex items-center gap-3 mb-5">
        <BookIcon />
        <h2 className="text-xl font-semibold text-slate-100">Retrieved Sources</h2>
        <span className="ml-auto px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 border border-blue-500/25 text-blue-300">
          {sources.length} chunk{sources.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {sources.map((source, index) => {
          const pct = Math.min(100, Math.round((source.score ?? 0) * 100));

          return (
            <div
              key={source._id || `${source.documentName}-${source.chunkIndex}-${index}`}
              className="source-chip rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-600/20 text-blue-300 border border-blue-600/30">
                    Chunk {source.chunkIndex + 1}
                  </span>
                  <span className="text-xs text-slate-400 font-medium truncate max-w-xs">
                    {source.documentName}
                  </span>
                  {source.pageNumber !== undefined && (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-600/20 text-indigo-300 border border-indigo-600/30">
                      📍 Page {source.pageNumber}
                    </span>
                  )}
                </div>
                <span className="text-xs font-semibold text-indigo-300 shrink-0">
                  {pct}% match
                </span>
              </div>

              <div className="h-1 w-full bg-slate-800 rounded mb-3">
                <div className="score-bar" style={{ width: `${pct}%` }} />
              </div>

              <p className="text-slate-400 text-xs leading-relaxed line-clamp-4">
                {source.chunkText}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SourceList;
