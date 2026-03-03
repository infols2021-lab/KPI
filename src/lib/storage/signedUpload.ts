export async function uploadToSignedUrl(signedUrl: string, file: File) {
  const ct = file.type || "application/octet-stream";

  const res = await fetch(signedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": ct,
      "x-upsert": "false",
    },
    body: file,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Upload failed (${res.status}). ${txt.slice(0, 200)}`);
  }
}