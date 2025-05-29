/**
 * Password utility functions that work in both Node.js and browser environments
 */

// Try to import bcrypt, but fall back to a browser-compatible implementation
let bcryptModule: any;

try {
  bcryptModule = require('bcrypt');
} catch (e) {
  // Provide a browser-compatible fallback
  bcryptModule = {
    async hash(password: string, saltRounds: number): Promise<string> {
      // Simple browser-compatible password hashing (for development only)
      // In production, passwords should only be hashed server-side with bcrypt
      console.warn('Using browser fallback for password hashing - NOT SECURE FOR PRODUCTION');
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return `browser-hash:${hashHex}`;
    },
    
    async compare(password: string, hash: string): Promise<boolean> {
      // Simple comparison for browser-hashed passwords
      if (hash.startsWith('browser-hash:')) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return `browser-hash:${hashHex}` === hash;
      }
      
      // Cannot compare bcrypt hashes in browser
      console.warn('Cannot verify bcrypt passwords in browser environment');
      return false;
    }
  };
}

/**
 * Hash a password using bcrypt (or browser fallback)
 */
export async function hashPassword(password: string, workFactor: number = 12): Promise<string> {
  return bcryptModule.hash(password, workFactor);
}

/**
 * Compare a password with a hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcryptModule.compare(password, hash);
}