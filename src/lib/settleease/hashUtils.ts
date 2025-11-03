/**
 * Utility functions for hashing JSON data
 */

/**
 * Computes a SHA-256 hash of JSON data
 * @param data The JSON data to hash
 * @returns Promise resolving to hex string hash
 */
export async function computeJsonHash(data: any): Promise<string> {
  const jsonString = JSON.stringify(data, Object.keys(data).sort());
  
  // Use Web Crypto API for hashing
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(jsonString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}


