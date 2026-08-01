/** Kode error Graph API auth (token kedaluwarsa/dicabut) — design.md §8.6:
 * "Error autentikasi (kode 190) tidak di-retry — percuma, dan bisa
 * memperburuk status akun." */
export const AUTH_ERROR_CODE = 190;

export class GraphApiError extends Error {
  code: number | null;
  subcode: number | null;
  fbtraceId: string | null;

  constructor(message: string, options: { code?: number | null; subcode?: number | null; fbtraceId?: string | null } = {}) {
    super(message);
    this.name = "GraphApiError";
    this.code = options.code ?? null;
    this.subcode = options.subcode ?? null;
    this.fbtraceId = options.fbtraceId ?? null;
  }

  get isAuthError(): boolean {
    return this.code === AUTH_ERROR_CODE;
  }
}
