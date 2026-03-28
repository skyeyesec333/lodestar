import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!url || !key) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export const supabase = createClient(url, key);

export const DOCUMENTS_BUCKET = "lodestar-documents";

/**
 * Upload a file to Supabase Storage.
 * Returns the storage path on success.
 */
export async function uploadFile(
  path: string,
  file: File
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const { error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, file, { upsert: false });

  if (error) return { ok: false, error: error.message };
  return { ok: true, path };
}

/**
 * Get a short-lived signed URL for a stored file.
 */
export async function getSignedUrl(
  storagePath: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * Delete a file from Supabase Storage.
 */
export async function deleteFile(storagePath: string): Promise<void> {
  await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
}
