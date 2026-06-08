"use client";

import type { FormEvent } from "react";

type DeleteActivityFormProps = {
  activityId: string;
  activityTitle: string;
};

export function DeleteActivityForm({ activityId, activityTitle }: DeleteActivityFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const confirmed = window.confirm(`Delete "${activityTitle}"? This removes the activity, submissions, judges, results, and uploaded files.`);

    if (!confirmed) {
      event.preventDefault();
    }
  }

  return (
    <form action={`/api/admin/activities/${activityId}`} method="post" onSubmit={handleSubmit}>
      <button
        className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100"
        type="submit"
      >
        Delete
      </button>
    </form>
  );
}
