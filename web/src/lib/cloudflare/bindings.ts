/// <reference types="@cloudflare/workers-types" />

import { getCloudflareContext } from "@opennextjs/cloudflare";

export type CardEventCloudflareEnv = {
  DB: D1Database;
  CARD_EVENT_UPLOADS: R2Bucket;
};

function isPresent<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

export function getRequiredCloudflareEnv(): CardEventCloudflareEnv {
  const env = getCloudflareContext().env as Partial<CardEventCloudflareEnv>;

  if (!isPresent(env.DB)) {
    throw new Error(
      "Cloudflare D1 binding DB is missing. Configure a D1 binding named DB on the Cloudflare Pages project.",
    );
  }

  if (!isPresent(env.CARD_EVENT_UPLOADS)) {
    throw new Error(
      "Cloudflare R2 binding CARD_EVENT_UPLOADS is missing. Configure an R2 binding named CARD_EVENT_UPLOADS on the Cloudflare Pages project.",
    );
  }

  return {
    DB: env.DB,
    CARD_EVENT_UPLOADS: env.CARD_EVENT_UPLOADS,
  };
}
