import type { NextApiRequest, NextApiResponse } from "next";
import { verifyAdmin } from "@/lib/auth";
import { query } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!verifyAdmin(req)) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === "GET") {
    try {
      const result = await query(
        `SELECT id, label, date_str, time_str, is_active, starts_at, ends_at, created_at FROM sessions ORDER BY starts_at ASC NULLS LAST`
      );
      return res.json(result.rows);
    } catch (err) {
      console.error("DB error:", err);
      return res.status(500).json({ error: "Database error" });
    }
  }

  if (req.method === "POST") {
    const { label, date_str, time_str, starts_at, ends_at } = req.body;
    if (!label || !date_str || !time_str) {
      return res.status(400).json({ error: "label, date_str, and time_str are required" });
    }
    try {
      const result = await query(
        `INSERT INTO sessions (label, date_str, time_str, starts_at, ends_at) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [label, date_str, time_str, starts_at || null, ends_at || null]
      );
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("DB error:", err);
      return res.status(500).json({ error: "Database error" });
    }
  }

  return res.status(405).end();
}
