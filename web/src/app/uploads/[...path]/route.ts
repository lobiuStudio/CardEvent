import { readFile } from "fs/promises";
import path from "path";
import { resolveLocalUploadPath } from "@/lib/files/local-file-storage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

const contentTypesByExtension = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
]);

function notFoundResponse(): Response {
  return new Response("Not found", { status: 404 });
}

export async function GET(_request: Request, { params }: RouteContext): Promise<Response> {
  const { path: pathSegments } = await params;
  const absolutePath = resolveLocalUploadPath(pathSegments);

  if (!absolutePath) {
    return notFoundResponse();
  }

  const contentType = contentTypesByExtension.get(path.extname(absolutePath).toLowerCase());

  if (!contentType) {
    return notFoundResponse();
  }

  try {
    const file = await readFile(absolutePath);

    return new Response(file, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": contentType,
      },
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error.code === "ENOENT" || error.code === "EISDIR")
    ) {
      return notFoundResponse();
    }

    throw error;
  }
}
