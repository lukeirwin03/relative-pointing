// Shared color options for task tags
export const COLOR_OPTIONS = [
  {
    id: null,
    name: 'None',
    bg: 'bg-warm-50 dark:bg-dark-bg-700',
    border: 'border-warm-300 dark:border-white/10',
    pill: 'bg-warm-300 text-gray-600 dark:bg-white/10 dark:text-gray-400',
    pillActive:
      'bg-warm-400 text-gray-800 ring-2 ring-gray-400 dark:bg-white/20 dark:text-gray-200 dark:ring-gray-400',
  },
  {
    id: 'red',
    name: 'Red',
    bg: 'bg-red-100 dark:bg-red-900/20',
    border: 'border-red-400 dark:border-red-500/50',
    dot: 'bg-red-500',
    pill: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
    pillActive:
      'bg-red-200 text-red-800 ring-2 ring-red-400 dark:bg-red-500/30 dark:text-red-200 dark:ring-red-400 dark:shadow-glow-danger-sm',
  },
  {
    id: 'orange',
    name: 'Orange',
    bg: 'bg-orange-100 dark:bg-orange-900/20',
    border: 'border-orange-400 dark:border-orange-500/50',
    dot: 'bg-orange-500',
    pill: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
    pillActive:
      'bg-orange-200 text-orange-800 ring-2 ring-orange-400 dark:bg-orange-500/30 dark:text-orange-200 dark:ring-orange-400',
  },
  {
    id: 'yellow',
    name: 'Yellow',
    bg: 'bg-yellow-100 dark:bg-yellow-900/20',
    border: 'border-yellow-400 dark:border-yellow-500/50',
    dot: 'bg-yellow-500',
    pill: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300',
    pillActive:
      'bg-yellow-200 text-yellow-800 ring-2 ring-yellow-400 dark:bg-yellow-500/30 dark:text-yellow-200 dark:ring-yellow-400',
  },
  {
    id: 'green',
    name: 'Green',
    bg: 'bg-green-100 dark:bg-green-900/20',
    border: 'border-green-400 dark:border-green-500/50',
    dot: 'bg-green-500',
    pill: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
    pillActive:
      'bg-green-200 text-green-800 ring-2 ring-green-400 dark:bg-green-500/30 dark:text-green-200 dark:ring-green-400 dark:shadow-glow-success-sm',
  },
  {
    id: 'blue',
    name: 'Blue',
    bg: 'bg-blue-100 dark:bg-blue-900/20',
    border: 'border-blue-400 dark:border-blue-500/50',
    dot: 'bg-blue-500',
    pill: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
    pillActive:
      'bg-blue-200 text-blue-800 ring-2 ring-blue-400 dark:bg-blue-500/30 dark:text-blue-200 dark:ring-blue-400',
  },
  {
    id: 'purple',
    name: 'Purple',
    bg: 'bg-purple-100 dark:bg-purple-900/20',
    border: 'border-purple-400 dark:border-purple-500/50',
    dot: 'bg-purple-500',
    pill: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
    pillActive:
      'bg-purple-200 text-purple-800 ring-2 ring-purple-400 dark:bg-purple-500/30 dark:text-purple-200 dark:ring-purple-400 dark:shadow-glow-accent-sm',
  },
  {
    id: 'pink',
    name: 'Pink',
    bg: 'bg-pink-100 dark:bg-pink-900/20',
    border: 'border-pink-400 dark:border-pink-500/50',
    dot: 'bg-pink-500',
    pill: 'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300',
    pillActive:
      'bg-pink-200 text-pink-800 ring-2 ring-pink-400 dark:bg-pink-500/30 dark:text-pink-200 dark:ring-pink-400',
  },
];

export function getColorClasses(colorTag) {
  const color = COLOR_OPTIONS.find((c) => c.id === colorTag);
  return color || COLOR_OPTIONS[0];
}
