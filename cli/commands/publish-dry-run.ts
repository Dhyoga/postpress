import { GraphClient } from "@/lib/instagram/client";
import { attemptPublish } from "@/lib/instagram/publish";

let fakeIdCounter = 1;

/** Fetch palsu — meniru bentuk respons Graph API tanpa pernah menyentuh
 * jaringan. Dipakai `publish:dry-run` supaya jalur publish (container ->
 * carousel -> publish, termasuk logging ke publish_logs) bisa diuji end-to-end
 * lewat kode produksi yang sama persis, tanpa memanggil Meta sungguhan. */
const fakeFetch: typeof fetch = async (input) => {
  const url = new URL(String(input));
  const headers = new Headers({ "x-app-usage": JSON.stringify({ call_count: 1, total_cputime: 1, total_time: 1 }) });

  if (url.pathname.endsWith("/content_publishing_limit")) {
    return new Response(
      JSON.stringify({ data: [{ quota_usage: 1, config: { quota_total: 50, quota_duration: 86400 } }] }),
      { status: 200, headers },
    );
  }
  if (url.pathname.endsWith("/media_publish")) {
    return new Response(JSON.stringify({ id: `fake_media_${fakeIdCounter++}` }), { status: 200, headers });
  }
  // /media (single, carousel item, atau parent carousel)
  return new Response(JSON.stringify({ id: `fake_container_${fakeIdCounter++}` }), { status: 200, headers });
};

export async function publishDryRun(args: string[]) {
  const postId = args[0];
  if (!postId) {
    console.error("Pemakaian: pnpm cli publish:dry-run <post-id>");
    process.exitCode = 1;
    return;
  }

  const client = new GraphClient("dry-run-fake-token", { fetchImpl: fakeFetch });

  console.log(`Menjalankan alur publish (dry-run, tidak memanggil Meta) untuk post ${postId}...`);
  const result = await attemptPublish(postId, 1, { client });

  if (result.ok) {
    console.log(`OK — media_id palsu: ${result.mediaId}`);
  } else {
    console.error(`GAGAL — ${result.error} (retryable: ${result.retryable})`);
    process.exitCode = 1;
  }
}
