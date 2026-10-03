import { isAdmin } from "@/lib/auth";
import { getSettings, saveSettings } from "@/lib/db";
import { json, serverError } from "@/lib/http";
import { normalizeSettings, pruneSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return json({ error: "Unauthorized" }, 401);
  try {
    return json({ settings: await getSettings() });
  } catch (err) {
    return serverError(err);
  }
}

export async function PUT(req: Request) {
  if (!(await isAdmin())) return json({ error: "Unauthorized" }, 401);
  try {
    const body = await req.json().catch(() => null);
    const settings = pruneSettings(normalizeSettings(body?.settings));
    return json({ settings: await saveSettings(settings) });
  } catch (err) {
    return serverError(err);
  }
}
