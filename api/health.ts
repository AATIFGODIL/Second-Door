// Zero imports on purpose. If this answers and /api/extract does not, the
// fault is in extract's import graph rather than the function setup.
export default async function handler(request: Request): Promise<Response> {
  return Response.json({
    ok: true,
    method: request.method,
    node: process.version,
    hasKey: Boolean(process.env.GEMINI_API_KEY),
    demoOnly: process.env.DEMO_ONLY ?? null,
  })
}
