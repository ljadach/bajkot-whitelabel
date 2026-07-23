export const STATUS_COLORS: Record<string, string> = {
  intake: 'bg-blue-100 text-blue-800',
  profiling: 'bg-blue-100 text-blue-800',
  story_planning: 'bg-indigo-100 text-indigo-800',
  story_writing: 'bg-indigo-100 text-indigo-800',
  psych_review: 'bg-purple-100 text-purple-800',
  art_direction: 'bg-violet-100 text-violet-800',
  character_design: 'bg-violet-100 text-violet-800',
  style_vote: 'bg-amber-100 text-amber-800',
  illustrating: 'bg-orange-100 text-orange-800',
  visual_qa: 'bg-orange-100 text-orange-800',
  composing_pdf: 'bg-teal-100 text-teal-800',
  final_qa: 'bg-teal-100 text-teal-800',
  delivering: 'bg-green-100 text-green-800',
  completed: 'bg-green-200 text-green-900',
  failed: 'bg-red-100 text-red-800',
  paused: 'bg-yellow-100 text-yellow-800',
};

// Stripe paymentStatus → badge class + Polish label, shared by the dashboard
// and the order-detail customer section.
export const PAYMENT_BADGES: Record<string, { cls: string; label: string }> = {
  completed: { cls: 'bg-emerald-100 text-emerald-700', label: 'Opłacone' },
  pending: { cls: 'bg-amber-100 text-amber-700', label: 'Nieopłacone' },
  failed: { cls: 'bg-red-100 text-red-700', label: 'Płatność nieudana' },
};
