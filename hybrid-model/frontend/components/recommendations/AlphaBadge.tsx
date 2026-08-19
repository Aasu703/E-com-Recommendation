import { Zap } from 'lucide-react';

interface AlphaBadgeProps {
  /** the `context` field of a RecommendationResponse (hybrid endpoint only). */
  context?: Record<string, unknown>;
}

/** Honest, live indicator of the CF/CB blend weight and how many real interactions drove it. */
export function AlphaBadge({ context }: AlphaBadgeProps) {
  const alpha = context?.alpha_avg;
  const count = context?.user_interaction_count;
  if (typeof alpha !== 'number' || typeof count !== 'number') return null;

  const label = alpha < 0.34 ? 'content-heavy' : alpha < 0.67 ? 'balanced' : 'collaborative-heavy';

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold border border-teal-200">
      <Zap className="h-3 w-3" />
      α = {alpha.toFixed(2)} · {label} ({count} interaction{count === 1 ? '' : 's'})
    </span>
  );
}
