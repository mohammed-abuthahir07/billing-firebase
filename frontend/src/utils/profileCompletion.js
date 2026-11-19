const clean = (value) => {
  const text = String(value ?? '').trim();
  if (!text || text.toLowerCase() === 'null' || text.toLowerCase() === 'undefined') return '';
  return text;
};

const phoneDigits = (value) => clean(value).replace(/\D/g, '');

/**
 * Required business details are the company name, a usable phone number,
 * and the street address. GSTIN, business email, logo, and the login email
 * do not count. A stored businessConfigured flag cannot fill a missing field.
 */
export function missingBusinessProfileFields(profile) {
  const source = profile || {};
  const missing = [];
  if (!clean(source.companyName ?? source.company_name)) missing.push('companyName');

  const digits = phoneDigits(source.mobile ?? source.phone);
  if (digits.length < 7 || digits.length > 15) missing.push('mobile');

  if (!clean(source.address)) missing.push('address');
  return missing;
}

export function isBusinessProfileComplete(profile) {
  return missingBusinessProfileFields(profile).length === 0;
}
