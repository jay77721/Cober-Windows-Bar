type ProgressBarProps = {
  value: number;
  tone?: "pink" | "blue" | "green";
};

const toneClass = {
  pink: "from-rose-400 to-pink-500",
  blue: "from-sky-300 to-blue-500",
  green: "from-emerald-300 to-green-500",
};

export function ProgressBar({ value, tone = "blue" }: ProgressBarProps) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-500/25">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${toneClass[tone]}`}
        style={{ width: `${Math.max(0, Math.min(value, 100))}%` }}
      />
    </div>
  );
}
