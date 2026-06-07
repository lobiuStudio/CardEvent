import { prisma } from "./prisma";
import type { StoredFile } from "@/lib/files/file-storage";

export type CreatePaymentProofInput = {
  activityId: string;
  participantId: string;
  submissionId?: string | null;
  file: StoredFile;
};

export class PaymentProofNotFoundError extends Error {
  constructor() {
    super("Payment proof was not found.");
    this.name = "PaymentProofNotFoundError";
  }
}

export function createPaymentProof(input: CreatePaymentProofInput) {
  return prisma.paymentProof.create({
    data: {
      activityId: input.activityId,
      participantId: input.participantId,
      submissionId: input.submissionId ?? null,
      storageProvider: input.file.provider,
      storageFileId: input.file.fileId,
      publicUrl: input.file.publicUrl,
      originalName: input.file.originalName,
      mimeType: input.file.mimeType,
      fileSize: input.file.fileSize,
      status: "pending",
    },
  });
}

export async function confirmPaymentProof(paymentProofId: string) {
  const proof = await prisma.paymentProof.findUnique({
    where: {
      id: paymentProofId,
    },
    include: {
      activity: {
        select: {
          paymentChargingMode: true,
        },
      },
    },
  });

  if (!proof) {
    throw new PaymentProofNotFoundError();
  }

  const reviewedAt = new Date();
  const updatedProof = await prisma.paymentProof.update({
    where: {
      id: paymentProofId,
    },
    data: {
      status: "confirmed",
      reviewedAt,
    },
  });

  if (proof.submissionId) {
    await prisma.submission.updateMany({
      where: {
        id: proof.submissionId,
        activityId: proof.activityId,
        participantId: proof.participantId,
        deletedAt: null,
      },
      data: {
        paymentStatus: "confirmed",
      },
    });
  } else if (proof.activity.paymentChargingMode === "per_participant") {
    await prisma.submission.updateMany({
      where: {
        activityId: proof.activityId,
        participantId: proof.participantId,
        deletedAt: null,
      },
      data: {
        paymentStatus: "confirmed",
      },
    });
  }

  return updatedProof;
}

export async function rejectPaymentProof(paymentProofId: string) {
  const proof = await prisma.paymentProof.findUnique({
    where: {
      id: paymentProofId,
    },
    select: {
      id: true,
    },
  });

  if (!proof) {
    throw new PaymentProofNotFoundError();
  }

  return prisma.paymentProof.update({
    where: {
      id: paymentProofId,
    },
    data: {
      status: "rejected",
      reviewedAt: new Date(),
    },
  });
}

export function listPendingPaymentProofs() {
  return prisma.paymentProof.findMany({
    where: {
      status: "pending",
    },
    orderBy: {
      createdAt: "asc",
    },
    include: {
      activity: true,
      participant: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
      submission: {
        include: {
          group: true,
          images: {
            where: {
              active: true,
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      },
    },
  });
}

export function listParticipantPaymentProofs(participantId: string) {
  return prisma.paymentProof.findMany({
    where: {
      participantId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      activity: {
        select: {
          id: true,
          slug: true,
          title: true,
          paymentChargingMode: true,
        },
      },
      submission: {
        select: {
          id: true,
          cardName: true,
        },
      },
    },
  });
}
