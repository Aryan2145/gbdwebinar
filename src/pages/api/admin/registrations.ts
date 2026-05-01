import type { NextApiRequest, NextApiResponse } from "next";
import { verifyAdmin } from "@/lib/auth";
import { query } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  if (!verifyAdmin(req)) return res.status(401).json({ error: "Unauthorized" });

  try {
    const result = await query(
      `SELECT r.id, r.name, r.company, r.designation, r.industry, r.whatsapp, r.email,
              r.razorpay_order_id, r.razorpay_payment_id, r.amount, r.payment_status,
              r.quantity, r.additional_names, r.created_at,
              s.label AS session_label, s.date_str AS session_date, s.time_str AS session_time
       FROM registrations r
       LEFT JOIN sessions s ON r.session_id = s.id
       ORDER BY r.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Database error" });
  }
}
