import { configuredAccounts } from './account-config.js';
const email = process.argv[2];
if (!email) throw new Error('Usage: npm run admin:promote -w server -- registered-email');
const accounts = await configuredAccounts([]);
try { accounts.promote(email); console.log('Administrator role granted.'); }
finally { accounts.close(); }
