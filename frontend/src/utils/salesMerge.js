export function isPermissionDenied(error) {
  const code = String(error?.code || '');
  return code === 'permission-denied' || code.includes('permission-denied');
}

export function permissionMessage(action) {
  return `Firestore denied ${action}. Nothing was left half-saved. Security rules were not modified.`;
}

export function money(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function roundCurrency(value) {
  return Math.round((money(value) + Number.EPSILON) * 100) / 100;
}

export function floorMoney(value) {
  const number = money(value);
  return number > 0 ? roundCurrency(number) : 0;
}

export function mergeRecords(salesRecords = [], invoiceRecords = []) {
  const merged = new Map();
  for (const record of salesRecords) {
    if (record?.id) merged.set(record.id, record);
  }
  for (const record of invoiceRecords) {
    if (record?.id && !merged.has(record.id)) merged.set(record.id, record);
  }
  return Array.from(merged.values());
}

export function recordGrandTotal(record) {
  return money(record?.grand_total ?? record?.grandTotal);
}

export function recordGst(record) {
  return money(record?.gst_amount ?? record?.gstAmount);
}

export function recordSubtotal(record) {
  return money(record?.subtotal);
}

export function recordYear(record) {
  const year = Number(record?.year);
  if (year) return year;
  const created = record?.created_at || record?.createdAt;
  const parsed = created ? new Date(created).getFullYear() : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function recordMonth(record) {
  const month = Number(record?.month);
  if (month) return month;
  const created = record?.created_at || record?.createdAt;
  const parsed = created ? new Date(created).getMonth() + 1 : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function customerLabel(record, emptyLabel = 'Walk-in Customer') {
  const name = String(record?.customer_name || record?.customerName || '').trim();
  return name || emptyLabel;
}
