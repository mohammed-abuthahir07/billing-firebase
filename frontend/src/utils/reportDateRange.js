import {
  customerLabel,
  money,
  recordGrandTotal,
  recordGst,
  recordSubtotal,
  roundCurrency,
} from './salesMerge.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function ordinal(parts) {
  return parts.year * 10000 + parts.month * 100 + parts.day;
}

function isRealCalendarDate(parts) {
  if (!parts) return false;
  const { year, month, day } = parts;
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function partsFromDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const parts = { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
  return isRealCalendarDate(parts) ? parts : null;
}

/**
 * Calendar date in the local timezone.
 * Date-only values (YYYY-MM-DD) stay on that calendar day instead of shifting through UTC.
 * Firestore timestamps and ISO datetimes use the local calendar day.
 */
export function calendarPartsFromValue(value) {
  if (value == null || value === '') return null;

  if (value instanceof Date) return partsFromDate(value);

  if (typeof value === 'object') {
    if (typeof value.toDate === 'function') {
      try {
        return partsFromDate(value.toDate());
      } catch {
        return null;
      }
    }
    if (typeof value.seconds === 'number') {
      const millis = value.seconds * 1000 + Math.floor(Number(value.nanoseconds || 0) / 1e6);
      return partsFromDate(new Date(millis));
    }
  }

  const text = String(value).trim();
  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const parts = {
      year: Number(dateOnly[1]),
      month: Number(dateOnly[2]),
      day: Number(dateOnly[3]),
    };
    return isRealCalendarDate(parts) ? parts : null;
  }

  return partsFromDate(new Date(text));
}

/**
 * Invoice calendar date. Stored year/month/day win because they are saved in local time
 * when the bill is created. Otherwise fall back to the invoice timestamp, not the download time.
 */
export function invoiceCalendarDate(record) {
  const year = Number(record?.year);
  const month = Number(record?.month);
  const day = Number(record?.day);
  if (Number.isInteger(year) && Number.isInteger(month) && Number.isInteger(day)) {
    const stored = { year, month, day };
    if (isRealCalendarDate(stored)) return stored;
  }

  return calendarPartsFromValue(record?.created_at)
    || calendarPartsFromValue(record?.createdAt)
    || calendarPartsFromValue(record?.invoice_date)
    || calendarPartsFromValue(record?.invoiceDate)
    || calendarPartsFromValue(record?.date)
    || calendarPartsFromValue(record?.timestamp)
    || null;
}

export function formatRangeLabel(value) {
  const parts = value && value.year ? value : calendarPartsFromValue(value);
  if (!parts) return '';
  return `${String(parts.day).padStart(2, '0')} ${MONTHS[parts.month - 1]} ${parts.year}`;
}

export function validateDateRange(fromValue, toValue) {
  if (!fromValue) return 'Please select a From Date.';
  if (!toValue) return 'Please select a To Date.';
  const from = calendarPartsFromValue(fromValue);
  const to = calendarPartsFromValue(toValue);
  if (!from || !to) return 'Please enter a valid From Date and To Date.';
  if (ordinal(to) < ordinal(from)) return 'To Date cannot be earlier than From Date.';
  return '';
}

export function isInvoiceInRange(record, fromValue, toValue) {
  const invoice = invoiceCalendarDate(record);
  const from = calendarPartsFromValue(fromValue);
  const to = calendarPartsFromValue(toValue);
  if (!invoice || !from || !to) return false;
  const day = ordinal(invoice);
  return day >= ordinal(from) && day <= ordinal(to);
}

function recordKey(record) {
  return String(record?.id || record?.invoice_number || record?.invoiceNumber || '');
}

function lineGstAmount(item) {
  const price = money(item?.sellingPrice ?? item?.selling_price ?? item?.price);
  const qty = money(item?.quantity);
  const rate = money(item?.gst ?? item?.gst_rate ?? item?.gstRate);
  if (price <= 0 || qty <= 0 || rate <= 0) return 0;
  return roundCurrency((price * qty * rate) / 100);
}

/**
 * Active financial records only. Callers must pass the same merged sales/invoice list
 * used by monthly, yearly, and lifetime reports. Wrong-entry deletions are already gone.
 * Completely deleted invoices remain only when a sales record is still in that list.
 */
export function buildCustomRangeReport(records = [], { fromDate, toDate } = {}) {
  const seen = new Set();
  const selected = [];

  for (const record of records) {
    if (!record || !isInvoiceInRange(record, fromDate, toDate)) continue;
    const key = recordKey(record);
    if (key) {
      if (seen.has(key)) continue;
      seen.add(key);
    }
    selected.push(record);
  }

  selected.sort((a, b) => {
    const diff = ordinal(invoiceCalendarDate(a)) - ordinal(invoiceCalendarDate(b));
    if (diff) return diff;
    return String(a.invoice_number || a.invoiceNumber || '').localeCompare(
      String(b.invoice_number || b.invoiceNumber || '')
    );
  });

  let totalRevenue = 0;
  let totalSubtotal = 0;
  let totalGst = 0;
  let totalQuantity = 0;
  const productMap = new Map();

  const invoices = selected.map((record) => {
    totalRevenue += recordGrandTotal(record);
    totalSubtotal += recordSubtotal(record);
    totalGst += recordGst(record);

    const items = Array.isArray(record.items) ? record.items : [];
    items.forEach((item) => {
      const name = item.product_name || item.productName || 'Product';
      const qty = money(item.quantity);
      const sales = money(item.total);
      const gstAmount = lineGstAmount(item);
      totalQuantity += qty;
      const current = productMap.get(name) || {
        productName: name,
        quantitySold: 0,
        revenueGenerated: 0,
        gstAmount: 0,
      };
      current.quantitySold += qty;
      current.revenueGenerated += sales;
      current.gstAmount += gstAmount;
      productMap.set(name, current);
    });

    const parts = invoiceCalendarDate(record);
    const paymentStatus = String(record.status || record.payment_status || record.paymentStatus || '').trim();

    return {
      id: record.id || '',
      invoiceNumber: record.invoice_number || record.invoiceNumber || (record.id ? `INV-${String(record.id).substring(0, 8)}` : 'Invoice'),
      customerName: customerLabel(record),
      invoiceDate: parts ? new Date(parts.year, parts.month - 1, parts.day, 12) : null,
      itemsCount: Array.isArray(record.items) ? record.items.length : 1,
      totalAmount: recordGrandTotal(record),
      paymentStatus,
    };
  });

  const totalInvoices = invoices.length;
  const products = Array.from(productMap.values())
    .map((product) => ({
      productName: product.productName,
      quantitySold: roundCurrency(product.quantitySold),
      revenueGenerated: roundCurrency(product.revenueGenerated),
      gstAmount: roundCurrency(product.gstAmount),
    }))
    .sort((a, b) => b.quantitySold - a.quantitySold || b.revenueGenerated - a.revenueGenerated);

  return {
    summary: {
      totalRevenue: roundCurrency(totalRevenue),
      totalSubtotal: roundCurrency(totalSubtotal),
      totalGst: roundCurrency(totalGst),
      grandTotal: roundCurrency(totalRevenue),
      totalSales: totalInvoices,
      totalInvoices,
      averageInvoiceValue: totalInvoices > 0 ? roundCurrency(totalRevenue / totalInvoices) : 0,
      totalQuantity: roundCurrency(totalQuantity),
    },
    products,
    invoices,
  };
}
