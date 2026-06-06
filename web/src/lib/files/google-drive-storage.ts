import { Readable } from "node:stream";
import { google } from "googleapis";
import type { FileStorage, StoredFile } from "./file-storage";

function getDriveClient() {
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  if (!clientEmail || !privateKey) {
    throw new Error("Google Drive credentials are missing");
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });

  return google.drive({ version: "v3", auth });
}

function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function ensureFolder(name: string, parentId: string): Promise<string> {
  const drive = getDriveClient();
  const escapedName = escapeDriveQueryValue(name);
  const escapedParentId = escapeDriveQueryValue(parentId);
  const existing = await drive.files.list({
    q: `'${escapedParentId}' in parents and name = '${escapedName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id,name)",
  });

  const existingId = existing.data.files?.[0]?.id;
  if (existingId) {
    return existingId;
  }

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });

  if (!created.data.id) {
    throw new Error("Google Drive folder creation failed");
  }

  return created.data.id;
}

async function uploadToDrive(folderId: string, file: File): Promise<StoredFile> {
  const drive = getDriveClient();
  const buffer = Buffer.from(await file.arrayBuffer());
  const created = await drive.files.create({
    requestBody: {
      name: file.name || "upload",
      parents: [folderId],
    },
    media: {
      mimeType: file.type,
      body: Readable.from(buffer),
    },
    fields: "id,webViewLink",
  });

  if (!created.data.id) {
    throw new Error("Google Drive upload failed");
  }

  return {
    provider: "google_drive",
    fileId: created.data.id,
    publicUrl: created.data.webViewLink ?? `https://drive.google.com/file/d/${created.data.id}/view`,
    originalName: file.name || "upload",
    mimeType: file.type,
    fileSize: file.size,
  };
}

function getRootFolderId(): string {
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

  if (!rootFolderId) {
    throw new Error("GOOGLE_DRIVE_ROOT_FOLDER_ID is missing");
  }

  return rootFolderId;
}

export const googleDriveStorage: FileStorage = {
  async saveSubmissionImage({ activitySlug, submissionId, file }) {
    const activityFolderId = await ensureFolder(activitySlug, getRootFolderId());
    const submissionFolderId = await ensureFolder(submissionId, activityFolderId);
    return uploadToDrive(submissionFolderId, file);
  },
  async savePaymentProof({ activitySlug, ownerId, file }) {
    const activityFolderId = await ensureFolder(activitySlug, getRootFolderId());
    const proofFolderId = await ensureFolder(`payment-${ownerId}`, activityFolderId);
    return uploadToDrive(proofFolderId, file);
  },
};
