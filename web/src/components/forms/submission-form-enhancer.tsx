"use client";

import { useEffect, useState } from "react";

type SubmissionFormEnhancerProps = {
  formId: string;
  storageKey: string;
};

type DraftValue = boolean | string;
type Draft = Record<string, DraftValue>;

type DraftField = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const ignoredInputTypes = new Set(["button", "file", "hidden", "image", "reset", "submit"]);

function getDraftFields(form: HTMLFormElement): DraftField[] {
  const fields: DraftField[] = [];

  for (const element of Array.from(form.querySelectorAll("input, select, textarea"))) {
    if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement)) {
      continue;
    }

    if (!element.name || element.disabled) {
      continue;
    }

    if (element instanceof HTMLInputElement && ignoredInputTypes.has(element.type)) {
      continue;
    }

    fields.push(element);
  }

  return fields;
}

function readDraft(storageKey: string): Draft {
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Draft) : {};
  } catch {
    return {};
  }
}

function restoreField(field: DraftField, draft: Draft) {
  const value = draft[field.name];

  if (value === undefined) {
    return;
  }

  if (field instanceof HTMLInputElement && field.type === "checkbox") {
    field.checked = Boolean(value);
    return;
  }

  if (field instanceof HTMLInputElement && field.type === "radio") {
    field.checked = value === field.value;
    return;
  }

  field.value = String(value);
}

function readFieldValue(field: DraftField): DraftValue | null {
  if (field instanceof HTMLInputElement && field.type === "checkbox") {
    return field.checked;
  }

  if (field instanceof HTMLInputElement && field.type === "radio") {
    return field.checked ? field.value : null;
  }

  return field.value;
}

function saveFormDraft(form: HTMLFormElement, storageKey: string) {
  const draft: Draft = {};

  for (const field of getDraftFields(form)) {
    const value = readFieldValue(field);

    if (value !== null) {
      draft[field.name] = value;
    }
  }

  window.localStorage.setItem(storageKey, JSON.stringify(draft));
}

function getSelectedImageFiles(form: HTMLFormElement): File[] {
  const imageInputs = Array.from(form.querySelectorAll<HTMLInputElement>('input[type="file"][name="images"]'));
  return imageInputs.flatMap((input) => Array.from(input.files ?? []));
}

export function SubmissionFormEnhancer({ formId, storageKey }: SubmissionFormEnhancerProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    const form = document.getElementById(formId);

    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const draft = readDraft(storageKey);

    for (const field of getDraftFields(form)) {
      restoreField(field, draft);
    }

    const handleInput = () => saveFormDraft(form, storageKey);
    const handleChange = () => {
      saveFormDraft(form, storageKey);
      setSelectedFiles(getSelectedImageFiles(form));
    };

    form.addEventListener("input", handleInput);
    form.addEventListener("change", handleChange);

    return () => {
      form.removeEventListener("input", handleInput);
      form.removeEventListener("change", handleChange);
    };
  }, [formId, storageKey]);

  if (!selectedFiles.length) {
    return null;
  }

  return (
    <section className="rounded-md border-2 border-[var(--line)] bg-white p-3" aria-label="Selected images / 已選圖片">
      <h3 className="text-sm font-black text-[var(--ink)]">Selected images / 已選圖片</h3>
      <ul className="mt-2 grid gap-2 text-sm leading-6 text-[var(--ink-muted)]">
        {selectedFiles.map((file) => (
          <li className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 px-3 py-2" key={`${file.name}-${file.size}`}>
            <span className="min-w-0 truncate font-bold text-[var(--ink)]">{file.name}</span>
            <span className="shrink-0 text-xs">{Math.max(1, Math.ceil(file.size / 1024))} KB</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
