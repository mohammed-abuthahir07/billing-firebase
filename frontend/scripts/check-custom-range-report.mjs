import { inflateSync } from 'node:zlib';
import { mergeRecords } from '../src/utils/salesMerge.js';
import {
  buildCustomRangeReport,
  calendarPartsFromValue,
  invoiceCalendarDate,
  validateDateRange,
} from '../src/utils/reportDateRange.js';
import {
  generateCustomRangeReportPDF,
  generateMonthlyReportPDF,
  generateTotalReportPDF,
  generateYearlyReportPDF,
} from '../src/utils/reportPdfGenerator.js';

let passed = 0;
const check = (condition, message) => {
  if (!condition) throw new Error(message);
  passed += 1;
};

const bill = ({
  id,
  day,
  month = 11,
  year = 2026,
  grand = 100,
  subtotal = 100,
  gst = 0,
  items,
  status = 'Paid',
  created_at,
  timestamp,
  invoiceNumber,
  customer = 'Walk-in Customer',
}) => ({
  id,
  invoice_number: invoiceNumber || `INV-${id}`,
  customer_name: customer,
  year,
  month,
  day,
  created_at,
  timestamp,
  subtotal,
  gst_amount: gst,
  grand_total: grand,
  status,
  items: items || [],
});

const nov = (day, extra = {}) => bill({ id: `nov-${day}`, day, ...extra });

const idsOf = (report) => report.invoices.map((invoice) => invoice.id);

check(validateDateRange('', '2026-11-19') === 'Please select a From Date.', 'from date is mandatory');
check(validateDateRange('2026-11-01', '') === 'Please select a To Date.', 'to date is mandatory');
check(
  validateDateRange('2026-11-19', '2026-11-01') === 'To Date cannot be earlier than From Date.',
  'invalid range is rejected'
);
check(validateDateRange('2026-11-01', '2026-11-01') === '', 'one-day range is valid');
check(validateDateRange('2026-02-31', '2026-03-01') === 'Please enter a valid From Date and To Date.', 'impossible dates are rejected');

const oneDay = buildCustomRangeReport([
  nov(18, { grand: 10, subtotal: 10 }),
  nov(19, { grand: 25, subtotal: 20, gst: 5, customer: 'Lavanya' }),
  nov(20, { grand: 10, subtotal: 10 }),
], { fromDate: '2026-11-19', toDate: '2026-11-19' });
check(idsOf(oneDay).join() === 'nov-19', 'one-day report includes only that date');
check(oneDay.summary.totalRevenue === 25 && oneDay.summary.totalGst === 5, 'one-day totals use stored invoice amounts');

const weekRecords = [1, 7, 8].map((day) => nov(day, { id: `week-${day}`, grand: day, subtotal: day }));
const week = buildCustomRangeReport(weekRecords, { fromDate: '2026-11-01', toDate: '2026-11-07' });
check(idsOf(week).join() === 'week-1,week-7', 'seven-day range includes the first and seventh days only');

const monthRecords = [
  nov(1, { id: 'm-1', month: 11 }),
  nov(30, { id: 'm-30', month: 11 }),
  bill({ id: 'oct-31', day: 31, month: 10, grand: 9, subtotal: 9 }),
  bill({ id: 'dec-1', day: 1, month: 12, grand: 9, subtotal: 9 }),
];
const month = buildCustomRangeReport(monthRecords, { fromDate: '2026-11-01', toDate: '2026-11-30' });
check(idsOf(month).join() === 'm-1,m-30', 'full month includes both boundaries and excludes neighbouring months');

const cross = buildCustomRangeReport([
  bill({ id: 'oct-27', day: 27, month: 10 }),
  bill({ id: 'oct-28', day: 28, month: 10 }),
  bill({ id: 'nov-3', day: 3, month: 11 }),
  bill({ id: 'nov-4', day: 4, month: 11 }),
], { fromDate: '2026-10-28', toDate: '2026-11-03' });
check(idsOf(cross).join() === 'oct-28,nov-3', 'range across two months keeps only dates inside the range');

const empty = buildCustomRangeReport(monthRecords, { fromDate: '1999-01-01', toDate: '1999-01-07' });
check(empty.summary.totalInvoices === 0 && empty.invoices.length === 0, 'a period with no invoices is empty');

const boundary = buildCustomRangeReport([
  {
    id: 'start',
    year: 2026,
    month: 11,
    day: 1,
    created_at: new Date(2026, 10, 1, 0, 0, 1).toISOString(),
    grand_total: 11,
    subtotal: 11,
    gst_amount: 0,
    items: [],
  },
  {
    id: 'end-clock',
    created_at: new Date(2026, 10, 19, 23, 59, 59),
    grand_total: 19,
    subtotal: 19,
    gst_amount: 0,
    items: [],
  },
  {
    id: 'before',
    created_at: new Date(2026, 9, 31, 23, 59, 59),
    grand_total: 1,
    subtotal: 1,
    gst_amount: 0,
    items: [],
  },
  {
    id: 'after',
    timestamp: { toDate: () => new Date(2026, 10, 20, 0, 0, 1) },
    grand_total: 1,
    subtotal: 1,
    gst_amount: 0,
    items: [],
  },
  {
    id: 'firestore-seconds',
    timestamp: { seconds: Math.floor(new Date(2026, 10, 19, 23, 59, 59).getTime() / 1000), nanoseconds: 0 },
    grand_total: 7,
    subtotal: 7,
    gst_amount: 0,
    items: [],
  },
], { fromDate: '2026-11-01', toDate: '2026-11-19' });
check(
  idsOf(boundary).sort().join() === 'end-clock,firestore-seconds,start',
  'local start-of-day and end-of-day invoices are included and the next day is not'
);

const storedWins = invoiceCalendarDate({
  year: 2026,
  month: 11,
  day: 1,
  created_at: '2026-10-31T18:30:00.000Z',
});
check(storedWins.day === 1 && storedWins.month === 11, 'stored invoice day wins over a conflicting timestamp');

const dateOnly = calendarPartsFromValue('2026-11-01');
check(dateOnly.year === 2026 && dateOnly.month === 11 && dateOnly.day === 1, 'date-only values stay on that calendar day');

const utcEvening = new Date(Date.UTC(2026, 10, 18, 23, 30, 0));
const isoParts = invoiceCalendarDate({ created_at: utcEvening.toISOString() });
check(
  isoParts.year === utcEvening.getFullYear()
    && isoParts.month === utcEvening.getMonth() + 1
    && isoParts.day === utcEvening.getDate(),
  'ISO invoice timestamps use the local calendar day'
);
if (utcEvening.getUTCDate() !== utcEvening.getDate() || utcEvening.getUTCMonth() !== utcEvening.getMonth()) {
  check(
    isoParts.day !== utcEvening.getUTCDate() || isoParts.month !== utcEvening.getUTCMonth() + 1,
    'local day is not replaced by the UTC date prefix'
  );
}

const podi = {
  product_name: 'Kuzambu Milagai Podi 100 grams',
  quantity: 2,
  sellingPrice: 50,
  gst: 18,
  total: 118,
};
const idli = {
  product_name: 'Idli Podi',
  quantity: 3,
  selling_price: '50.00',
  gst: '0.00',
  total: '50.00',
};
const priced = [
  bill({
    id: 'dup',
    day: 2,
    grand: 118,
    subtotal: 100,
    gst: 18,
    customer: 'Asha',
    invoiceNumber: 'INV-100',
    items: [podi],
  }),
  bill({
    id: 'dup',
    day: 2,
    grand: 999,
    subtotal: 999,
    gst: 99,
    customer: 'Duplicate',
    invoiceNumber: 'INV-100',
    items: [podi],
  }),
  bill({
    id: 'second',
    day: 5,
    grand: 50,
    subtotal: 50,
    gst: 0,
    customer: 'Bala',
    invoiceNumber: 'INV-200',
    status: '',
    items: [idli],
  }),
  bill({ id: 'outside', day: 21, grand: 500, subtotal: 500, gst: 40, items: [podi] }),
];
const totals = buildCustomRangeReport(priced, { fromDate: '2026-11-01', toDate: '2026-11-19' });
check(totals.summary.totalInvoices === 2 && totals.summary.totalSales === 2, 'duplicate invoice ids are counted once');
check(totals.summary.totalRevenue === 168, 'revenue is the sum of invoice grand totals');
check(totals.summary.totalGst === 18, 'GST is the sum of stored invoice GST');
check(totals.summary.grandTotal === 168, 'grand total matches invoice grand totals');
check(totals.summary.totalSubtotal === 150, 'subtotal is the sum of stored subtotals');
check(totals.summary.averageInvoiceValue === 84, 'average invoice value uses the included invoices');
check(totals.summary.totalQuantity === 5, 'quantity is the sum of product quantities');
check(totals.products[0].productName === 'Idli Podi' && totals.products[0].quantitySold === 3, 'products rank by quantity sold');
check(
  totals.products.find((product) => product.productName === 'Kuzambu Milagai Podi 100 grams').gstAmount === 18,
  'product GST uses the existing line rate formula'
);
check(
  totals.products.find((product) => product.productName === 'Kuzambu Milagai Podi 100 grams').revenueGenerated === 118,
  'product sales amount uses the stored line total'
);
check(totals.invoices[0].paymentStatus === 'Paid' && totals.invoices[1].paymentStatus === '', 'payment status is included only when stored');
check(totals.invoices[0].itemsCount === 1 && totals.invoices[1].customerName === 'Bala', 'invoice details use existing customer and item fields');
check(!idsOf(totals).includes('outside'), 'invoices outside the range are excluded');

const active = bill({ id: 'active', day: 4, grand: 40, subtotal: 40 });
const wrongEntryRemoved = bill({ id: 'wrong-entry', day: 4, grand: 80, subtotal: 80 });
const completelyDeletedStillInSales = bill({ id: 'archived-sale', day: 4, grand: 15, subtotal: 15 });
const completelyDeletedArchiveOnly = bill({ id: 'archive-only', day: 4, grand: 70, subtotal: 70 });
const merged = mergeRecords(
  [completelyDeletedStillInSales],
  [active, { ...completelyDeletedStillInSales, grand_total: 999 }]
);
const deletionReport = buildCustomRangeReport(merged, { fromDate: '2026-11-04', toDate: '2026-11-04' });
check(!merged.some((record) => record.id === wrongEntryRemoved.id), 'wrong-entry invoices are absent once removed from both collections');
check(!merged.some((record) => record.id === completelyDeletedArchiveOnly.id), 'archive-only deleted invoices are not part of the active merge');
check(idsOf(deletionReport).sort().join() === 'active,archived-sale', 'custom totals follow the existing merged sales records');
check(
  deletionReport.invoices.find((invoice) => invoice.id === 'archived-sale').totalAmount === 15,
  'a sales record wins over a duplicate invoice, so the invoice is not counted twice'
);

const many = Array.from({ length: 45 }, (_, index) => bill({
  id: `row-${index + 1}`,
  day: (index % 19) + 1,
  grand: 10,
  subtotal: 8,
  gst: 2,
  customer: index === 0 ? 'Boundary Customer' : `Customer ${index + 1}`,
  invoiceNumber: index === 0 ? 'INV-BOUNDARY' : `INV-${1000 + index}`,
  items: index === 0 ? [podi] : [],
}));
const longReport = buildCustomRangeReport(many, { fromDate: '2026-11-01', toDate: '2026-11-19' });
check(longReport.summary.totalInvoices === 45, 'every in-range invoice is retained before pagination');
check(longReport.summary.totalRevenue === 450 && longReport.summary.totalGst === 90, 'long-report totals match the source invoices');

const decodePdf = (buffer) => {
  const raw = Buffer.from(buffer).toString('latin1');
  const parts = [raw];
  const streams = raw.match(/stream\r?\n([\s\S]*?)\r?\nendstream/g) || [];
  for (const block of streams) {
    const body = block.replace(/^stream\r?\n/, '').replace(/\r?\nendstream$/, '');
    try {
      parts.push(inflateSync(Buffer.from(body, 'latin1')).toString('latin1'));
    } catch {
      parts.push(body);
    }
  }
  return parts.join('\n');
};

const pdf = generateCustomRangeReportPDF({
  company: { name: 'Seeragam Quality Products', email: 'accounts@seeragam.example', gstNumber: '33ABCDE1234F1Z5' },
  fromLabel: '01 Nov 2026',
  toLabel: '19 Nov 2026',
  generatedLabel: '19 Nov 2026',
  summary: totals.summary,
  products: totals.products,
  invoices: totals.invoices,
  fileName: 'Custom-Date-Range-Report-01-Nov-2026-to-19-Nov-2026.pdf',
  delivery: 'buffer',
});
const pdfText = decodePdf(pdf);
for (const expected of [
  'Custom Date Range Financial Report',
  'Seeragam Quality Products',
  'FROM DATE',
  'TO DATE',
  'REPORT GENERATION DATE',
  '01 Nov 2026',
  '19 Nov 2026',
  'TOTAL REVENUE',
  'TOTAL SALES',
  'TOTAL INVOICES',
  'AVERAGE INVOICE VALUE',
  'TOTAL GST COLLECTED',
  'TOTAL QUANTITY SOLD',
  'PRODUCT SALES SUMMARY',
  'Kuzambu Milagai Podi 100 grams',
  'INVOICE DETAILS',
  'INV-100',
  'Asha',
  'Paid',
  'FINAL SUMMARY',
  'TOTAL GST',
  'GRAND TOTAL',
  'Rs. 168.00',
  'Rs. 18.00',
]) {
  check(pdfText.includes(expected), `PDF contains ${expected}`);
}
check(/MediaBox \[0 0 595\.2\d* 841\.8\d*\]/.test(pdfText), 'PDF page size is A4');
check((pdfText.match(/\/Type\s*\/Page(?!s)/g) || []).length >= 1, 'PDF has at least one page');

const longPdf = decodePdf(generateCustomRangeReportPDF({
  company: { name: 'Seeragam Quality Products' },
  fromLabel: '01 Nov 2026',
  toLabel: '19 Nov 2026',
  generatedLabel: '19 Nov 2026',
  summary: longReport.summary,
  products: longReport.products,
  invoices: longReport.invoices,
  delivery: 'buffer',
}));
const pageCount = (longPdf.match(/\/Type\s*\/Page(?!s)/g) || []).length;
check(pageCount > 1, `long invoice list continues onto another page (${pageCount})`);
check(longPdf.includes('INV-BOUNDARY') && longPdf.includes('Rs. 450.00'), 'paginated PDF keeps the boundary invoice and the grand total');

const monthlyPdf = decodePdf(generateMonthlyReportPDF({
  summary: { totalRevenue: 10, totalInvoices: 1, totalGst: 1, averageInvoiceValue: 10 },
  products: [],
  invoices: [],
  company: { name: 'Monthly Co' },
  reportMonth: 'November 2026',
  delivery: 'buffer',
}));
check(monthlyPdf.includes('MONTHLY SALES & REVENUE REPORT'), 'monthly PDF generator still runs');

const yearlyPdf = decodePdf(generateYearlyReportPDF({
  year: 2026,
  company: { name: 'Yearly Co' },
  summary: { totalRevenue: 10, totalInvoices: 1, totalGst: 1, averageInvoiceValue: 10 },
  monthlyBreakdown: [],
  products: [],
  customers: [],
  invoices: [],
  delivery: 'buffer',
}));
check(yearlyPdf.includes('ANNUAL BUSINESS & REVENUE REPORT'), 'yearly PDF generator still runs');

const totalPdf = decodePdf(generateTotalReportPDF({
  company: { name: 'Lifetime Co' },
  summary: { totalRevenue: 10, totalInvoices: 1, totalGst: 1, averageInvoiceValue: 10 },
  yearlyBreakdown: [],
  products: [],
  customers: [],
  inventory: {},
  invoices: [],
  period: 'All Time',
  accountCreatedAt: 'Active',
  delivery: 'buffer',
}));
check(totalPdf.includes('COMPLETE BUSINESS & LIFETIME REPORT'), 'lifetime PDF generator still runs');

const shared = generateCustomRangeReportPDF({
  company: { name: 'Seeragam Quality Products' },
  fromLabel: '01 Nov 2026',
  toLabel: '19 Nov 2026',
  generatedLabel: '19 Nov 2026',
  summary: totals.summary,
  products: totals.products,
  invoices: totals.invoices,
  fileName: 'Custom-Date-Range-Report-01-Nov-2026-to-19-Nov-2026.pdf',
  delivery: 'file',
});
check(shared instanceof File, 'share delivery returns a PDF file');
check(shared.type === 'application/pdf', 'shared file is a PDF');
check(shared.name.includes('Custom-Date-Range-Report'), 'shared file keeps the custom range name');

console.log(`Custom date range checks passed: ${passed}`);
