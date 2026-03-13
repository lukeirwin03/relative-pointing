// Tag color palette and styling definitions
// Tags come from the session store (DB), this file provides color mappings and helpers

export const TAG_COLOR_PALETTE = [
  { id: 'yellow', name: 'Yellow' },
  { id: 'green', name: 'Green' },
  { id: 'red', name: 'Red' },
  { id: 'blue', name: 'Blue' },
  { id: 'purple', name: 'Purple' },
  { id: 'orange', name: 'Orange' },
  { id: 'pink', name: 'Pink' },
  { id: 'cyan', name: 'Cyan' },
];

export const TAG_COLORS = {
  yellow: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/20',
    border: 'border-yellow-400 dark:border-yellow-400/60',
    darkBorder: 'dark:border-l-yellow-400/60',
    cornerColor: '#facc15',
    pill: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-200',
    pillActive:
      'bg-yellow-200 text-yellow-900 ring-2 ring-yellow-400 ring-offset-1 ring-offset-warm-50 dark:bg-yellow-500/40 dark:text-yellow-100 dark:ring-yellow-400 dark:ring-offset-dark-bg-900',
    glow: 'tag-glow-yellow',
    glowRgb: '251, 191, 36',
    dot: 'bg-yellow-500',
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-900/20',
    border: 'border-green-400 dark:border-green-400/60',
    darkBorder: 'dark:border-l-green-400/60',
    cornerColor: '#4ade80',
    pill: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-200',
    pillActive:
      'bg-green-200 text-green-900 ring-2 ring-green-400 ring-offset-1 ring-offset-warm-50 dark:bg-green-500/40 dark:text-green-100 dark:ring-green-400 dark:ring-offset-dark-bg-900',
    glow: 'tag-glow-green',
    glowRgb: '74, 222, 128',
    dot: 'bg-green-500',
  },
  red: {
    bg: 'bg-red-100 dark:bg-red-900/20',
    border: 'border-red-400 dark:border-red-400/60',
    darkBorder: 'dark:border-l-red-400/60',
    cornerColor: '#fb7185',
    pill: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200',
    pillActive:
      'bg-red-200 text-red-900 ring-2 ring-red-400 ring-offset-1 ring-offset-warm-50 dark:bg-red-500/40 dark:text-red-100 dark:ring-red-400 dark:ring-offset-dark-bg-900',
    glow: 'tag-glow-red',
    glowRgb: '251, 113, 133',
    dot: 'bg-red-500',
  },
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/20',
    border: 'border-blue-400 dark:border-blue-400/60',
    darkBorder: 'dark:border-l-blue-400/60',
    cornerColor: '#60a5fa',
    pill: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200',
    pillActive:
      'bg-blue-200 text-blue-900 ring-2 ring-blue-400 ring-offset-1 ring-offset-warm-50 dark:bg-blue-500/40 dark:text-blue-100 dark:ring-blue-400 dark:ring-offset-dark-bg-900',
    glow: 'tag-glow-blue',
    glowRgb: '96, 165, 250',
    dot: 'bg-blue-500',
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-900/20',
    border: 'border-purple-400 dark:border-purple-400/60',
    darkBorder: 'dark:border-l-purple-400/60',
    cornerColor: '#a855f7',
    pill: 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-200',
    pillActive:
      'bg-purple-200 text-purple-900 ring-2 ring-purple-400 ring-offset-1 ring-offset-warm-50 dark:bg-purple-500/40 dark:text-purple-100 dark:ring-purple-400 dark:ring-offset-dark-bg-900',
    glow: 'tag-glow-purple',
    glowRgb: '168, 85, 247',
    dot: 'bg-purple-500',
  },
  orange: {
    bg: 'bg-orange-100 dark:bg-orange-900/20',
    border: 'border-orange-400 dark:border-orange-400/60',
    darkBorder: 'dark:border-l-orange-400/60',
    cornerColor: '#fb923c',
    pill: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200',
    pillActive:
      'bg-orange-200 text-orange-900 ring-2 ring-orange-400 ring-offset-1 ring-offset-warm-50 dark:bg-orange-500/40 dark:text-orange-100 dark:ring-orange-400 dark:ring-offset-dark-bg-900',
    glow: 'tag-glow-orange',
    glowRgb: '251, 146, 60',
    dot: 'bg-orange-500',
  },
  pink: {
    bg: 'bg-pink-100 dark:bg-pink-900/20',
    border: 'border-pink-400 dark:border-pink-400/60',
    darkBorder: 'dark:border-l-pink-400/60',
    cornerColor: '#ec4899',
    pill: 'bg-pink-100 text-pink-800 dark:bg-pink-500/20 dark:text-pink-200',
    pillActive:
      'bg-pink-200 text-pink-900 ring-2 ring-pink-400 ring-offset-1 ring-offset-warm-50 dark:bg-pink-500/40 dark:text-pink-100 dark:ring-pink-400 dark:ring-offset-dark-bg-900',
    glow: 'tag-glow-pink',
    glowRgb: '236, 72, 153',
    dot: 'bg-pink-500',
  },
  cyan: {
    bg: 'bg-cyan-100 dark:bg-cyan-900/20',
    border: 'border-cyan-400 dark:border-cyan-400/60',
    darkBorder: 'dark:border-l-cyan-400/60',
    cornerColor: '#22d3ee',
    pill: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-200',
    pillActive:
      'bg-cyan-200 text-cyan-900 ring-2 ring-cyan-400 ring-offset-1 ring-offset-warm-50 dark:bg-cyan-500/40 dark:text-cyan-100 dark:ring-cyan-400 dark:ring-offset-dark-bg-900',
    glow: 'tag-glow-cyan',
    glowRgb: '86, 214, 224',
    dot: 'bg-cyan-500',
  },
};

// Default (no tag) styling
const NO_TAG = {
  bg: 'bg-warm-50 dark:bg-dark-bg-700',
  border: 'border-warm-300 dark:border-white/10',
  darkBorder: '',
  cornerColor: null,
  pill: 'bg-warm-300 text-gray-600 dark:bg-white/10 dark:text-gray-400',
  pillActive:
    'bg-warm-400 text-gray-800 ring-2 ring-gray-400 dark:bg-white/20 dark:text-gray-200 dark:ring-gray-400',
  glow: '',
  dot: 'bg-gray-400',
};

export function getTagColorClasses(colorKey) {
  return TAG_COLORS[colorKey] || NO_TAG;
}

export function getTagForTask(task, tags) {
  if (!task.tag_id || !tags || tags.length === 0) return null;
  return tags.find((t) => t.id === task.tag_id) || null;
}
