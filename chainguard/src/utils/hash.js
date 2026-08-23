// Real SHA-256 hashing via the browser's SubtleCrypto API — used on the
// Evidence Upload page to fingerprint a file before it goes on-chain.
export async function sha256File(file) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function shortHash(hash, size = 6) {
  if (!hash) return '';
  return `${hash.slice(0, size)}...${hash.slice(-size)}`;
}
