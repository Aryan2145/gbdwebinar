import type { NextApiRequest, NextApiResponse } from "next";
import { verifyAdmin } from "@/lib/auth";
import { query } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!verifyAdmin(req)) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "PATCH") return res.status(405).end();

  const id = parseInt(req.query.id as string, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const { is_active } = req.body;
  if (typeof is_active !== "boolean") {
    return res.status(400).json({ error: "is_active (boolean) is required" });
  }

  try {
    const result = await query(
      `UPDATE sessions SET is_active = $1 WHERE id = $2 RETURNING *`,
      [is_active, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Session not found" });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("DB error:", err);
    return res.status(500).json({ error: "Database error" });
  }
}
