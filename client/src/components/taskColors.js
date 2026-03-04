// Shared color options for task tags
export const COLOR_OPTIONS = [
  {
    id: null,
    name: 'None',
    bg: 'bg-white dark:bg-gray-700',
    border: 'border-gray-300 dark:border-gray-500',
  },
  {
    id: 'red',
    name: 'Red',
    bg: 'bg-red-100 dark:bg-red-900/30',
    border: 'border-red-400',
    dot: 'bg-red-500',
  },
  {
    id: 'orange',
    name: 'Orange',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    border: 'border-orange-400',
    dot: 'bg-orange-500',
  },
  {
    id: 'yellow',
    name: 'Yellow',
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    border: 'border-yellow-400',
    dot: 'bg-yellow-500',
  },
  {
    id: 'green',
    name: 'Green',
    bg: 'bg-green-100 dark:bg-green-900/30',
    border: 'border-green-400',
    dot: 'bg-green-500',
  },
  {
    id: 'blue',
    name: 'Blue',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    border: 'border-blue-400',
    dot: 'bg-blue-500',
  },
  {
    id: 'purple',
    name: 'Purple',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    border: 'border-purple-400',
    dot: 'bg-purple-500',
  },
  {
    id: 'pink',
    name: 'Pink',
    bg: 'bg-pink-100 dark:bg-pink-900/30',
    border: 'border-pink-400',
    dot: 'bg-pink-500',
  },
];

export function getColorClasses(colorTag) {
  const color = COLOR_OPTIONS.find((c) => c.id === colorTag);
  return color || COLOR_OPTIONS[0];
}
