/** Error yang sampai ke pemanggil sudah berupa kalimat yang bisa ditindaklanjuti
 * (agents.md: "Error yang sampai ke UI harus kalimat yang bisa ditindaklanjuti
 * pengguna, bukan pesan teknis") — jangan pernah sertakan body respons mentah,
 * header, atau API key di sini, supaya secret tidak ikut bocor ke log/pesan error. */
export class LlmError extends Error {}
