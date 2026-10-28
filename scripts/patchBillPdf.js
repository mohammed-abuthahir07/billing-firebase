const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/pages/Bills/Bill.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add import if not present
if (!content.includes('generateInvoicePDF')) {
  content = "import { generateInvoicePDF } from '../../utils/invoicePdfGenerator';\n" + content;
}

// 2. Replace handleDownloadPDF function
const targetRegex = /const handleDownloadPDF = async \(inv\) => \{[\s\S]*?finally \{[\s\S]*?\}[\s\S]*?\};/;

const replacement = `const handleDownloadPDF = async (inv) => {
    const targetInvoice = inv || selectedInvoice;
    if (!targetInvoice) return;
    try {
      generateInvoicePDF(targetInvoice);
      showToast("Invoice PDF downloaded successfully!");
    } catch (err) {
      console.error("PDF download failed:", err);
      showToast("Failed to generate PDF.", "error");
    }
  };`;

if (targetRegex.test(content)) {
  content = content.replace(targetRegex, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("SUCCESS: Replaced handleDownloadPDF in Bill.jsx");
} else {
  console.error("FAILED to match handleDownloadPDF regex");
}
