import * as SecureStore from 'expo-secure-store';
const key = 'sobe.account.v1';
export const readAccountToken = () => SecureStore.getItemAsync(key);
export async function storeAccountToken(token: string | null) {
  if (token) await SecureStore.setItemAsync(key, token);
  else await SecureStore.deleteItemAsync(key);
}
