// src/utils/roomCodeGenerator.js
// Generate unique room codes for sessions

/**
 * Generates a random 6-character alphanumeric room code
 * Example: "A3X9K2"
 * @returns {string} Room code
 */
export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar chars (I, 1, O, 0)
  let code = '';
  
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    code += chars[randomIndex];
  }
  
  return code;
}

/**
 * Validates a room code format
 * @param {string} code - Room code to validate
 * @returns {boolean} True if valid format
 */
export function isValidRoomCode(code) {
  if (typeof code !== 'string') return false;
  if (code.length !== 6) return false;
  
  const validChars = /^[A-HJ-NP-Z2-9]{6}$/;
  return validChars.test(code);
}

/**
 * Formats a room code for display (adds hyphen in middle)
 * Example: "A3X9K2" -> "A3X-9K2"
 * @param {string} code - Room code
 * @returns {string} Formatted code
 */
export function formatRoomCode(code) {
  if (!isValidRoomCode(code)) return code;
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}
