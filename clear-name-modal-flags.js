// Utility script to clear name modal flags for testing
// Run this in browser console to reset modal flags for all users

console.log('Clearing all name modal flags...');

// Get all localStorage keys that start with 'nameModal_shown_'
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && key.startsWith('nameModal_shown_')) {
    keysToRemove.push(key);
  }
}

// Remove all the flags
keysToRemove.forEach(key => {
  localStorage.removeItem(key);
  console.log(`Removed: ${key}`);
});

console.log(`Cleared ${keysToRemove.length} name modal flags.`);
console.log('Users will now see the name modal again on next login (if they don\'t have complete names).');