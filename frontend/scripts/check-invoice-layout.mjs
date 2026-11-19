import { inflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { generateInvoicePDF } from "../src/utils/invoicePdfGenerator.js";
import { sellerFromCompany } from "../src/utils/companySeller.js";

const seller = sellerFromCompany(
  {
    companyName: "Lavanya",
    alternateEmail: "owner@gmail.com",
    mobile: "9790912053",
    address: "37, AA Road, Gnanaolivupuram",
    city: "Madurai",
    state: "Tamil Nadu",
    pincode: "625016",
    country: "India",
    profileImage: "data:image/png;base64,AAAA",
  },
  { personalName: "Lavanya", authEmail: "owner@gmail.com" }
);

if (seller.companyName !== "Lavanya") {
  throw new Error(`company name was hidden: ${seller.companyName}`);
}
if (seller.email) {
  throw new Error("login email was printed before the business profile was saved");
}

const decodePdf = (buffer) => {
  const raw = Buffer.from(buffer).toString("latin1");
  if (raw.includes("/Subtype /Image") || raw.includes("/Subtype/Image")) {
    throw new Error("invoice PDF still embeds an image");
  }
  const parts = [raw];
  const streams = raw.match(/stream\r?\n([\s\S]*?)\r?\nendstream/g) || [];
  for (const block of streams) {
    const body = block.replace(/^stream\r?\n/, "").replace(/\r?\nendstream$/, "");
    try {
      parts.push(inflateSync(Buffer.from(body, "latin1")).toString("latin1"));
    } catch {
      parts.push(body);
    }
  }
  return parts.join("\n");
};

const stringsOf = (pdfText) => {
  const found = [];
  const pattern = /\((?:\\\)|[^)])*\)\s*Tj/g;
  for (const match of pdfText.match(pattern) || []) {
    const value = match
      .replace(/\)\s*Tj$/, "")
      .slice(1)
      .replace(/\\([()\\])/g, "$1");
    found.push(value);
  }
  return found;
};

const positionsOf = (pdfText, needle) => {
  const positions = [];
  const chunks = pdfText.split("BT");
  for (const chunk of chunks) {
    if (!chunk.includes(`(${needle})`)) continue;
    const moves = [...chunk.matchAll(/([\d.]+)\s+([\d.]+)\s+Td/g)];
    const matrices = [...chunk.matchAll(/1 0 0 1 ([\d.]+) ([\d.]+) Tm/g)];
    const last = moves.at(-1) || matrices.at(-1);
    if (last) positions.push({ x: Number(last[1]), y: Number(last[2]) });
  }
  return positions;
};

const baseItems = [
  { product_name: "Idli Podi 250 grams", quantity: 1, price: 135, gst: 0, total: 135 },
  { product_name: "Kariveppillai Podi 100 grams", quantity: 3, price: 65, gst: 0, total: 195 },
  { product_name: "A very long product name that has to wrap inside the item column without running into the quantity or price", quantity: 2, price: 52, gst: 5, total: 109.2 },
];

const invoice = {
  invoice_number: "INV-1794912375438",
  created_at: "2026-11-17T10:00:00.000Z",
  seller_name: seller.companyName,
  seller_email: seller.email,
  seller_phone: seller.phone,
  seller_address: seller.address,
  seller_gst: "",
  profileImage: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  customer_name: "Lavanya",
  customer_email: "lavanya.raja23@gmail.com",
  customer_phone: "97909 12053",
  customer_address: "",
  customer_gst: null,
  subtotal: 439.2,
  gst_amount: 5.2,
  grand_total: 444.4,
  items: baseItems,
};

const full = decodePdf(generateInvoicePDF(invoice, { delivery: "buffer" }));
const fullText = stringsOf(full).join(" | ");
for (const expected of ["Lavanya", "TAX INVOICE", "SELLER DETAILS", "BILLED TO", "lavanya.raja23@gmail.com", "Phone: 97909 12053", "Idli Podi 250 grams", "Grand Total:"]) {
  if (!full.includes(expected)) throw new Error(`missing ${expected}`);
}
if (full.includes("data:image") || full.includes("iVBORw0KGgo")) {
  throw new Error("logo bytes were written into the PDF");
}

const nameY = positionsOf(full, "Lavanya");
const emailY = positionsOf(full, "lavanya.raja23@gmail.com");
const phoneY = positionsOf(full, "Phone: 97909 12053");
if (!nameY.length || !emailY.length || !phoneY.length) {
  throw new Error(`could not read customer positions from: ${fullText.slice(0, 500)}`);
}
const customerName = nameY.filter((point) => point.x > 100).sort((a, b) => b.y - a.y)[0];
const sellerName = nameY
  .filter((point) => point.x < 100)
  .sort((a, b) => Math.abs(a.y - customerName.y) - Math.abs(b.y - customerName.y))[0];
const customerEmail = emailY[0];
const customerPhone = phoneY[0];
const emailGap = Math.abs(customerName.y - customerEmail.y);
const phoneGap = Math.abs(customerEmail.y - customerPhone.y);
if (emailGap > 16 || phoneGap > 16) {
  throw new Error(`customer lines are too far apart: email ${emailGap}, phone ${phoneGap}`);
}
if (Math.abs(customerName.y - sellerName.y) > 1) {
  throw new Error(`seller and customer columns are not top-aligned: ${customerName.y} vs ${sellerName.y}`);
}

const sparse = decodePdf(generateInvoicePDF({
  ...invoice,
  customer_email: "",
  customer_address: undefined,
  customer_gst: "N/A",
}, { delivery: "buffer" }));
if (sparse.includes("lavanya.raja23@gmail.com") || sparse.includes("N/A") || sparse.includes("undefined")) {
  throw new Error("missing customer fields left a placeholder");
}
const sparseName = positionsOf(sparse, "Lavanya").filter((point) => point.x > 100).sort((a, b) => b.y - a.y)[0];
const sparsePhone = positionsOf(sparse, "Phone: 97909 12053")[0];
if (Math.abs(sparseName.y - sparsePhone.y) > 16) {
  throw new Error(`name and phone left a gap of ${Math.abs(sparseName.y - sparsePhone.y)}`);
}

const longName = "Sri Meenakshi Amman Quality Food Products and Traditional Podi Stores";
const longPdf = decodePdf(generateInvoicePDF({
  ...invoice,
  seller_name: longName,
  customer_name: "Lavanya Raja Subramanian Quality Foods Account",
}, { delivery: "buffer" }));
if (!longPdf.includes("Sri Meenakshi") || !longPdf.includes("TAX INVOICE")) {
  throw new Error("long company name was dropped");
}

const many = Array.from({ length: 48 }, (_, index) => ({
  product_name: `Sambar Podi batch ${index + 1} with extra grinding notes`,
  quantity: index + 1,
  price: 54,
  gst: 0,
  total: 54 * (index + 1),
}));
const multi = decodePdf(generateInvoicePDF({
  ...invoice,
  items: many,
  subtotal: 1000,
  gst_amount: 0,
  grand_total: 1000,
}, { delivery: "buffer" }));
if (!multi.includes("Page 1 of") || !multi.includes("Page 2 of")) {
  throw new Error("multi-page invoice is missing page numbers");
}
const itemHeaders = [...multi.matchAll(/Item & Variant/g)].length;
if (itemHeaders < 2) throw new Error("table header was not repeated");

mkdirSync(new URL("../tmp-invoice-check/", import.meta.url), { recursive: true });
writeFileSync(new URL("../tmp-invoice-check/full.pdf", import.meta.url), Buffer.from(generateInvoicePDF(invoice, { delivery: "buffer" })));
writeFileSync(new URL("../tmp-invoice-check/sparse.pdf", import.meta.url), Buffer.from(generateInvoicePDF({
  ...invoice,
  customer_email: "",
  customer_address: "",
}, { delivery: "buffer" })));
writeFileSync(new URL("../tmp-invoice-check/long.pdf", import.meta.url), Buffer.from(generateInvoicePDF({
  ...invoice,
  seller_name: longName,
  customer_name: "Lavanya Raja Subramanian Quality Foods Account",
}, { delivery: "buffer" })));
writeFileSync(new URL("../tmp-invoice-check/multi.pdf", import.meta.url), Buffer.from(generateInvoicePDF({
  ...invoice,
  items: many,
}, { delivery: "buffer" })));

console.log("invoice layout checks passed");
console.log({ emailGap, phoneGap, pages: itemHeaders, seller });
