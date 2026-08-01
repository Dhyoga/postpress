// Modul terpisah dan tanpa dependensi lain supaya middleware.ts (jalan di Edge
// runtime) bisa memakai nama cookie tanpa ikut menarik driver Postgres/bcrypt
// yang cuma jalan di Node runtime.
export const SESSION_COOKIE = "postpress_session";
