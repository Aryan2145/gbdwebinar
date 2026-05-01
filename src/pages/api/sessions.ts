import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const result = await query(
      `SELECT id, label, date_str, time_str, starts_at FROM sessions
       WHERE is_active = TRUE AND (ends_at IS NULL OR ends_at > NOW())
       ORDER BY starts_at ASC NULLS LAST`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Database error" });
  }
}
