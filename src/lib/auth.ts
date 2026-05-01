import type { NextApiRequest } from "next";
import jwt from "jsonwebtoken";

export function verifyAdmin(req: NextApiRequest): boolean {
  const cookieStr = req.headers.cookie || "";
  const cookies = Object.fromEntries(
    cookieStr.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k, v.join("=")];
    })
  );
  const token = cookies["admin_token"];
  if (!token) return false;
  try {
    jwt.verify(token, process.env.JWT_SECRET!);
    return true;
  } catch {
    return false;
  }
}
