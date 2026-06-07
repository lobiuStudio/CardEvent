import { getFileStorage } from "@/lib/files/storage-provider";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

function notFoundResponse(): Response {
  return new Response("Not found", { status: 404 });
}

export async function GET(_request: Request, { params }: RouteContext): Promise<Response> {
  const { path: pathSegments } = await params;
  const fileId = pathSegments.join("/");
  const file = await getFileStorage().readFile(fileId);

  if (!file) {
    return notFoundResponse();
  }

  return new Response(file.body, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": file.mimeType,
      ...(file.fileSize ? { "Content-Length": String(file.fileSize) } : {}),
    },
  });
}
