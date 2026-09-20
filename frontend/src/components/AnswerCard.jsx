import { BrainIcon } from "./Icons.jsx";

function AnswerCard({ answer }) {
  if (!answer) {
    return null;
  }

  return (
    <div className="card-glass rounded-2xl p-6 mb-5 animate-fade-in-up border-indigo-500/30">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 shrink-0">
          <BrainIcon />
        </div>
        <h2 className="text-xl font-semibold text-slate-100">AI Answer</h2>
      </div>
      <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap bg-black/20 rounded-xl p-4 border border-indigo-500/10">
        {answer}
      </div>
    </div>
  );
}

export default AnswerCard;
