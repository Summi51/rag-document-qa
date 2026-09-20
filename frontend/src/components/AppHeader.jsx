import { BrainIcon } from "./Icons.jsx";

const PIPELINE_TAGS = ["EDA", "Embedding", "Vector Store", "Agent", "LLM"];

function AppHeader({ user, onLogout }) {
  return (
    <div className="text-center mb-12 animate-fade-in-up">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 mb-6 shadow-lg shadow-blue-900/40 animate-pulse-glow">
        <BrainIcon />
      </div>
      <h1 className="text-4xl sm:text-5xl font-bold gradient-text mb-3 tracking-tight">
        RAG Document Q&amp;A
      </h1>
      <p className="text-slate-400 text-lg max-w-md mx-auto leading-relaxed">
        Upload a PDF and get AI-powered answers from your document using vector embeddings.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
        {PIPELINE_TAGS.map((tag) => (
          <span
            key={tag}
            className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 border border-blue-500/25 text-blue-300"
          >
            {tag}
          </span>
        ))}
      </div>

      {user && (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          <span className="text-slate-400">{user.email}</span>
          <button
            type="button"
            onClick={onLogout}
            className="px-3 py-1 rounded-lg border border-slate-600 text-slate-300 hover:border-red-400 hover:text-red-300"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default AppHeader;
