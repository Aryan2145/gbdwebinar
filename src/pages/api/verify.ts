import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { query } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    name,
    whatsapp,
    email,
    company,
    designation,
    industry,
    session_id,
    quantity,
    additional_names,
  } = req.body;

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expected !== razorpay_signature) {
    return res.status(400).json({ error: "Invalid payment signature" });
  }

  try {
    await query(
      `INSERT INTO registrations (name, company, designation, industry, whatsapp, email, razorpay_order_id, razorpay_payment_id, session_id, payment_status, quantity, additional_names, amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'paid', $10, $11, $12)
       ON CONFLICT (razorpay_payment_id) DO NOTHING`,
      [name || "Unknown", company || null, designation || null, industry || null, whatsapp || "", email || "", razorpay_order_id, razorpay_payment_id, session_id || null,
       quantity || 1, additional_names ? JSON.stringify(additional_names) : null, (quantity || 1) * 9900]
    );
  } catch (err) {
    console.error("DB save error (payment still valid):", err);
  }

  res.json({ success: true });
}
