import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const {
    razorpay_order_id,
    razorpay_payment_id,
    name,
    whatsapp,
    email,
    company,
    designation,
    industry,
    session_id,
  } = req.body;

  if (!razorpay_order_id) return res.status(400).json({ error: "order_id required" });

  try {
    await query(
      `INSERT INTO registrations (name, company, designation, industry, whatsapp, email, razorpay_order_id, razorpay_payment_id, session_id, payment_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'failed')
       ON CONFLICT (razorpay_payment_id) DO NOTHING`,
      [name || "Unknown", company || null, designation || null, industry || null, whatsapp || "", email || "", razorpay_order_id, razorpay_payment_id || null, session_id || null]
    );
  } catch (err) {
    console.error("DB save error (failed payment):", err);
  }

  res.json({ received: true });
}
