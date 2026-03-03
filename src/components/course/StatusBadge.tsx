interface StatusBadgeProps {
  status: 'pending' | 'generating' | 'completed' | 'failed';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    pending: {
      bg: 'bg-neutral-100',
      text: 'text-neutral-600',
      dot: 'bg-neutral-400',
      label: 'Pending',
    },
    generating: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      dot: 'bg-blue-500 animate-pulse',
      label: 'Generating',
    },
    completed: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      dot: 'bg-green-500',
      label: 'Ready',
    },
    failed: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      dot: 'bg-red-500',
      label: 'Failed',
    },
  };

  const { bg, text, dot, label } = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${bg} ${text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
