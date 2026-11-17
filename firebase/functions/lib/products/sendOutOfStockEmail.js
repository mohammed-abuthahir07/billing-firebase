"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOutOfStockEmail = void 0;
const https_1 = require("firebase-functions/v2/https");
const nodemailer_1 = __importDefault(require("nodemailer"));
exports.sendOutOfStockEmail = (0, https_1.onCall)({ cors: true }, async (request) => {
    const to = request.auth?.token.email;
    if (!request.auth || !to) {
        throw new https_1.HttpsError("unauthenticated", "Sign in with an email account to receive stock alerts.");
    }
    const productName = String(request.data?.productName || "").trim();
    if (!productName) {
        throw new https_1.HttpsError("invalid-argument", "Product name is required.");
    }
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user;
    if (!host || !user || !pass || !from) {
        throw new https_1.HttpsError("failed-precondition", "Outbound email is not configured.");
    }
    const port = Number(process.env.SMTP_PORT || 587);
    const transport = nodemailer_1.default.createTransport({
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
//# sourceMappingURL=sendOutOfStockEmail.js.map