import { CheckIcon, SpinnerIcon } from "./Icons.jsx";

const COLORS = {
  info: "bg-blue-500/10 border-blue-500/30 text-blue-300",
  success: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
  error: "bg-red-500/10 border-red-500/30 text-red-300",
  loading: "bg-indigo-500/10 border-indigo-500/30 text-indigo-300",
};

function StatusBadge({ message, type = "info" }) {
  return (
    <div className={`mt-4 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium ${COLORS[type]}`}>
      {type === "loading" && <SpinnerIcon />}
      {type === "success" && <CheckIcon />}
      <span>{message}</span>
    </div>
  );
}

export default StatusBadge;
