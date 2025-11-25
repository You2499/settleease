/**
 * Utility functions for hashing JSON data
 */

/**
 * Recursively sorts object keys for consistent JSON stringification
 * @param obj The object to sort
 * @returns Object with sorted keys
 */
function sortObjectKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  
  const sortedObj: any = {};
  Object.keys(obj).sort().forEach(key => {
    sortedObj[key] = sortObjectKeys(obj[key]);
  });
  
  return sortedObj;
}

/**
 * Computes a SHA-256 hash of JSON data
 * @param data The JSON data to hash
 * @returns Promise resolving to hex string hash
 */
export async function computeJsonHash(data: any): Promise<string> {
  // Recursively sort all object keys for consistent hashing
  const sortedData = sortObjectKeys(data);
  const jsonString = JSON.stringify(sortedData);
  
  // Use Web Crypto API for hashing
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(jsonString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}





