/**
 * StatCard — displays a single metric with an optional improvement percentage.
 */

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
}

export function StatCard({ label, value, change, positive = true }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value">{value}</div>
      {change && (
        <span className={`stat-card-change ${positive ? "positive" : "negative"}`}>
          {positive ? "↑" : "↓"} {change}
        </span>
      )}
    </div>
  );
}
