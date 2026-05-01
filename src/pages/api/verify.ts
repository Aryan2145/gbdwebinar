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
      `INSERT INTO registrations (name, company, whatsapp, email, razorpay_order_id, razorpay_payment_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (razorpay_payment_id) DO NOTHING`,
      [name || "Unknown", company || null, whatsapp || "", email || "", razorpay_order_id, razorpay_payment_id]
    );
  } catch (err) {
    console.error("DB save error (payment still valid):", err);
  }

  res.json({ success: true });
}
