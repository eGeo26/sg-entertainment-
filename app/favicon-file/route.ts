import { readFile } from "node:fs/promises"
import path from "node:path"

export const runtime = "nodejs"

export async function GET() {
  const icon = await readFile(path.join(process.cwd(), "public", "assets", "favicon.ico"))

  return new Response(new Uint8Array(icon), {
    headers: {
      "Cache-Control": "public, max-age=86400, must-revalidate",
      "Content-Type": "image/x-icon",
    },
  })
}
