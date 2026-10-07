// Browsers use the server's HttpOnly cookie; never persist account bearer tokens in JS storage.
export async function readAccountToken(): Promise<string | null> { return null; }
export async function storeAccountToken(_token: string | null) {}
