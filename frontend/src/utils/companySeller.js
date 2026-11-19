const clean = (value) => {
  const text = String(value ?? '').trim();
  if (!text || text.toLowerCase() === 'null' || text.toLowerCase() === 'undefined') return '';
  return text;
};

const same = (left, right) => clean(left).toLowerCase() === clean(right).toLowerCase();

function read(profile, camel, snake) {
  return clean(profile?.[camel] ?? profile?.[snake]);
}

function explicitValue(value, inheritedValue, configured) {
  const text = clean(value);
  if (!text) return '';
  if (configured) return text;
  if (inheritedValue && same(text, inheritedValue)) return '';
  return text;
}

function businessAddress(profile, configured) {
  const street = read(profile, 'address', 'address');
  const city = read(profile, 'city', 'city');
  const state = read(profile, 'state', 'state');
  const pincode = read(profile, 'pincode', 'pincode');
  const country = read(profile, 'country', 'country');
  const parts = [street, city, state, pincode].filter(Boolean);
  if (configured && country) parts.push(country);
  else if (parts.length && country && country.toLowerCase() !== 'india') parts.push(country);
  return parts.join(', ');
}

/**
 * Seller details for invoices and reports.
 * The company name is the saved business name. The login email is printed
 * only after the owner saves the business profile, or when the saved
 * business email is different from it.
 */
export function sellerFromCompany(profile = {}, identity = {}) {
  const configured = profile.businessConfigured === true || profile.business_configured === true;
  const companyName = read(profile, 'companyName', 'company_name');
  const email = explicitValue(
    read(profile, 'alternateEmail', 'alternate_email'),
    identity.authEmail,
    configured
  );

  return {
    companyName,
    email,
    phone: read(profile, 'mobile', 'mobile'),
    gstin: read(profile, 'gstNumber', 'gst_number'),
    address: businessAddress(profile, configured),
    logo: profile.profileImage || profile.profile_image || '',
  };
}

export function applySellerToInvoice(invoice, seller) {
  if (!invoice || !seller) return invoice;
  const logo = seller.logo || invoice.profileImage || invoice.profile_image || '';
  return {
    ...invoice,
    seller_name: seller.companyName,
    sellerName: seller.companyName,
    seller_email: seller.email,
    sellerEmail: seller.email,
    seller_gst: seller.gstin,
    sellerGST: seller.gstin,
    seller_phone: seller.phone,
    sellerPhone: seller.phone,
    seller_address: seller.address,
    sellerAddress: seller.address,
    profileImage: logo,
    profile_image: logo,
  };
}
