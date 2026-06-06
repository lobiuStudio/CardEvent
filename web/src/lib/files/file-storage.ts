export type StoredFile = {
  provider: "local" | "google_drive";
  fileId: string;
  publicUrl: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
};

export type SaveSubmissionImageInput = {
  activitySlug: string;
  submissionId: string;
  file: File;
};

export type SavePaymentProofInput = {
  activitySlug: string;
  ownerId: string;
  file: File;
};

export type FileStorage = {
  saveSubmissionImage(input: SaveSubmissionImageInput): Promise<StoredFile>;
  savePaymentProof(input: SavePaymentProofInput): Promise<StoredFile>;
};
