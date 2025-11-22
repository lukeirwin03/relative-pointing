// src/utils/roomCodeGenerator.js
// Generate unique and fun room names for sessions

const ADJECTIVES = [
  'happy', 'lucky', 'swift', 'clever', 'bold', 'bright',
  'quick', 'calm', 'eager', 'gentle', 'jolly', 'keen',
  'lively', 'neat', 'noble', 'proud', 'quiet', 'rapid',
  'smart', 'tiny', 'vital', 'wise', 'zippy', 'alert',
  'brave', 'cool', 'eager', 'funny', 'grand', 'happy',
  'ideal', 'jolly', 'kind', 'lush', 'merry', 'neat',
  'okay', 'plucky', 'quirky', 'rosy', 'super', 'tasty',
  'unique', 'vivid', 'witty', 'young', 'zealous'
];

const NOUNS = [
  'panda', 'tiger', 'eagle', 'fox', 'owl', 'bear',
  'seal', 'otter', 'hawk', 'raven', 'wolf', 'moose',
  'lynx', 'ibex', 'okapi', 'emu', 'ant', 'bat',
  'cat', 'dog', 'elk', 'frog', 'gnu', 'hare',
  'ibis', 'jay', 'kiwi', 'lark', 'mink', 'newt',
  'ox', 'pig', 'quail', 'rat', 'swan', 'toad',
  'vole', 'wasp', 'yak', 'zebra', 'dolphin', 'falcon',
  'cody', 'jesse', 'joe', 'paul', 'doug', 'ben',
  'sanjay', 'bryan', 'luke'
];

/**
 * Generates a random fun room name
 * Example: "happy-panda", "swift-eagle", "clever-fox"
 * @returns {string} Room name (lowercase)
 */
export function generateRoomCode() {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adjective}-${noun}`.toLowerCase();
}

/**
 * Validates a room code format (now validates fun names)
 * @param {string} code - Room code to validate
 * @returns {boolean} True if valid format
 */
export function isValidRoomCode(code) {
  if (typeof code !== 'string') return false;

  // Simple validation: must contain hyphen and be reasonable length
  const parts = code.split('-');
  if (parts.length !== 2) return false;
  if (code.length > 20) return false;
  if (code.length < 5) return false;

  return true;
}

/**
 * Formats a room code for display (no formatting needed for fun names)
 * @param {string} code - Room code
 * @returns {string} Formatted code
 */
export function formatRoomCode(code) {
  return code;
}
