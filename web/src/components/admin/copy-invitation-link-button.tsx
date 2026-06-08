"use client";

import { useState } from "react";

type CopyInvitationLinkButtonProps = {
  invitationUrl: string;
};

export function CopyInvitationLinkButton({ invitationUrl }: CopyInvitationLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copyInvitationLink() {
    await navigator.clipboard.writeText(invitationUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      className="inline-flex min-h-10 items-center justify-center rounded-md bg-white px-3 text-sm font-semibold text-zinc-950 ring-1 ring-zinc-200 transition hover:bg-zinc-50"
      onClick={copyInvitationLink}
      type="button"
    >
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
