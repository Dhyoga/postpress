type IgAccountRow = {
  id: string;
  handle: string;
  igUserId: string;
  tokenExpiresAt: Date | string | null;
  isActive: boolean;
};

/**
 * Bentuk akun IG yang aman dikirim ke client — `token_encrypted` TIDAK PERNAH
 * ikut keluar (design.md §11.1 & agents.md §5), meski sudah terenkripsi.
 */
export function toIgAccountView(row: IgAccountRow) {
  return {
    id: row.id,
    handle: row.handle,
    igUserId: row.igUserId,
    tokenExpiresAt: row.tokenExpiresAt ? new Date(row.tokenExpiresAt).toISOString() : null,
    isActive: row.isActive,
  };
}
