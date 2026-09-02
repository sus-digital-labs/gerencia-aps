export default function IndicatorGauge({ value, target, size = 80 }) {
  const ready = typeof value === "number" && Number.isFinite(value);
  const percentage = ready ? Math.min(100, Math.max(0, value)) : 0;
  const radius = size / 2 - 8;
  const circumference = radius * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (!ready) return "#94a3b8";
    if (value >= target) return "#10b981";
    if (value >= target * 0.7) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div className="relative" style={{ width: size, height: size / 2 + 10 }}>
      <svg width={size} height={size / 2 + 10} className="transform -rotate-0">
        <path
          d={`M ${8} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 8} ${size / 2}`}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d={`M ${8} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 8} ${size / 2}`}
          fill="none"
          stroke={getColor()}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <div
        className="absolute inset-0 flex items-end justify-center pb-1"
        style={{ fontSize: size / 5 }}
      >
        <span className="font-bold" style={{ color: getColor() }}>
          {ready ? `${value.toFixed(0)}%` : "—"}
        </span>
      </div>
    </div>
  );
}
