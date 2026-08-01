/** Error yang sampai ke pemanggil sudah berupa kalimat yang bisa ditindaklanjuti
 * (agents.md: "Error yang sampai ke UI harus kalimat yang bisa ditindaklanjuti
 * pengguna, bukan pesan teknis"). Boleh menyertakan pesan error dari provider
 * (mis. `body.error.message`) untuk membantu debugging di modal Riwayat, TAPI
 * jangan pernah sertakan header request, API key, atau raw body tanpa filter —
 * lihat `extractErrorDetail` di client.ts yang hanya mengambil field pesan
 * yang dikenal dan membatasi panjangnya. */
export class LlmError extends Error {}
