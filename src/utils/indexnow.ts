/**
 * Генерирует криптографически безопасный 32-символьный hex-ключ для протокола IndexNow.
 * Поддерживает как Node.js, так и браузерное/Edge окружение через Web Crypto API.
 * 
 * @returns {string} 32-символьный hex-ключ
 */
export function generateIndexNowKey(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  // Фолбэк для старых сред Node.js
  const nodeCrypto = require('crypto');
  return nodeCrypto.randomBytes(16).toString('hex');
}
