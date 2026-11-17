import { onCall, HttpsError } from "firebase-functions/v2/https";
import nodemailer from "nodemailer";

export const sendOutOfStockEmail = onCall(
  {
    cors: true,
    invoker: "public",
  },
  async (request) => {
  const to = request.auth?.token.email;
  if (!request.auth || !to) {
    throw new HttpsError("unauthenticated", "Sign in with an email account to receive stock alerts.");
  }

  const productName = String(request.data?.productName || "").trim();
  if (!productName) {
    throw new HttpsError("invalid-argument", "Product name is required.");
  }

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;
  if (!host || !user || !pass || !from) {
    throw new HttpsError("failed-precondition", "Outbound email is not configured.");
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transport.sendMail({
    from,
    to,
    subject: `Please update stock: ${productName} is out of stock`,
    text: [
      "Please update the stock of this product because this product stock is 0.",
      "",
      `Product: ${productName}`,
    ].join("\n"),
  });

  return { sent: true };
});
