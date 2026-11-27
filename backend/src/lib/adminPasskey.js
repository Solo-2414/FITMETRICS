export function hasAdminPasskey(claims) {
  return Array.isArray(claims?.amr)
    && claims.amr.some((entry) => (
      entry === 'passkey' || entry?.method === 'passkey'
    ));
}
