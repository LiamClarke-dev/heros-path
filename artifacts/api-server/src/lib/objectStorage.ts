import { Storage } from "@google-cloud/storage";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

function getBucketId(): string {
  const id = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!id) throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID is not set");
  return id;
}

export const storageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  } as unknown as import("@google-cloud/storage").StorageOptions["credentials"],
  projectId: "",
});

export async function uploadAvatar(
  userId: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const ext = mimeType === "image/png" ? "png" : "jpg";
  const objectKey = `avatars/${userId}/${Date.now()}.${ext}`;
  const bucketId = getBucketId();
  const bucket = storageClient.bucket(bucketId);
  const file = bucket.file(objectKey);

  await file.save(buffer, {
    contentType: mimeType,
    resumable: false,
  });

  return objectKey;
}

export async function downloadAvatar(objectKey: string): Promise<{ data: Buffer; contentType: string }> {
  const bucketId = getBucketId();
  const bucket = storageClient.bucket(bucketId);
  const file = bucket.file(objectKey);
  const [exists] = await file.exists();
  if (!exists) throw new Error("Avatar not found");
  const [metadata] = await file.getMetadata();
  const contentType = (metadata.contentType as string | undefined) ?? "image/jpeg";
  const [data] = await file.download();
  return { data, contentType };
}
