import type { ValidatedImageFile } from "@/lib/validation/submission";

type ValidatedStorageImageFile = Omit<ValidatedImageFile, "fileSize"> & {
  fileSize?: number;
};

export type StoredFile = {
  provider: "local" | "r2";
  fileId: string;
  publicUrl: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
};

export type StoredFileBody = {
  body: BodyInit;
  mimeType: string;
  fileSize?: number;
};

export type SaveSubmissionImageInput = {
  activitySlug: string;
  submissionId: string;
  file: File;
  validatedImage?: ValidatedStorageImageFile;
};

export type SavePaymentProofInput = {
  activitySlug: string;
  ownerId: string;
  file: File;
  validatedImage?: ValidatedStorageImageFile;
};

export type FileStorage = {
  saveSubmissionImage(input: SaveSubmissionImageInput): Promise<StoredFile>;
  savePaymentProof(input: SavePaymentProofInput): Promise<StoredFile>;
  readFile(fileId: string): Promise<StoredFileBody | null>;
  deleteFile(file: StoredFile): Promise<void>;
};
