import type { NextApiRequest, NextApiResponse } from "next";
import { verifyAdmin } from "@/lib/auth";
import { query } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  if (!verifyAdmin(req)) return res.status(401).json({ error: "Unauthorized" });

  try {
    const result = await query(
      `SELECT id, name, company, designation, industry, whatsapp, email,
              razorpay_order_id, razorpay_payment_id, amount, created_at
       FROM registrations
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Database error" });
  }
}
