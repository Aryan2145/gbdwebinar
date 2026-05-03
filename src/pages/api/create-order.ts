import type { NextApiRequest, NextApiResponse } from "next";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Razorpay = require("razorpay");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { name, whatsapp, email, quantity = 1 } = req.body;
  if (!name || !whatsapp || !email) {
    return res.status(400).json({ error: "Name, WhatsApp and email are required" });
  }
  const qty = Math.max(1, Math.min(7, parseInt(quantity, 10) || 1));

  console.log("KEY_ID loaded:", process.env.RAZORPAY_KEY_ID);
  console.log("SECRET loaded:", process.env.RAZORPAY_KEY_SECRET ? "YES (length " + process.env.RAZORPAY_KEY_SECRET.length + ")" : "MISSING");

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });

  try {
    const order = await razorpay.orders.create({
      amount: 9900 * qty,
      currency: "INR",
      receipt: `gbd_${Date.now()}`,
      notes: { name, whatsapp, email, quantity: qty },
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err: any) {
    console.error("Razorpay order error:", err);
    const message = err?.error?.description || err?.message || "Failed to create order";
    res.status(500).json({ error: message });
  }
}
