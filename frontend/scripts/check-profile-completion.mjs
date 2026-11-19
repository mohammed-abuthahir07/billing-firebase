import {
  isBusinessProfileComplete,
  missingBusinessProfileFields,
} from '../src/utils/profileCompletion.js';

let passed = 0;
const check = (condition, message) => {
  if (!condition) throw new Error(message);
  passed += 1;
};

const complete = {
  companyName: 'Seeragam Quality Products',
  mobile: '+91 97909 12053',
  address: '37, AA Road, Gnanaolivupuram',
  alternateEmail: 'owner@gmail.com',
  gstNumber: '',
  profileImage: '',
  country: 'India',
  businessConfigured: false,
};

check(missingBusinessProfileFields(null).join() === 'companyName,mobile,address', 'a missing profile document is incomplete');
check(!isBusinessProfileComplete({ country: 'India', businessConfigured: false }), 'a new registration profile is incomplete');
check(!isBusinessProfileComplete({ businessConfigured: true, country: 'India' }), 'a stored completion flag cannot hide missing fields');
check(isBusinessProfileComplete(complete), 'company name, phone, and address complete the profile');
check(
  isBusinessProfileComplete({ ...complete, alternateEmail: '', gstNumber: '', profileImage: '' }),
  'GSTIN, business email, and logo are optional'
);
check(
  !isBusinessProfileComplete({ ...complete, companyName: '   ' }),
  'clearing the company name makes the profile incomplete'
);
check(
  !isBusinessProfileComplete({ ...complete, mobile: '' }),
  'clearing the phone number makes the profile incomplete'
);
check(
  !isBusinessProfileComplete({ ...complete, address: '' }),
  'clearing the address makes the profile incomplete'
);
check(
  isBusinessProfileComplete({ ...complete, companyName: 'Seeragam Quality Products' }),
  'filling the missing company name completes the profile again'
);
check(
  !isBusinessProfileComplete({ ...complete, mobile: '12345' }),
  'a phone number that is too short is not complete'
);
check(
  isBusinessProfileComplete({
    company_name: 'Seeragam Quality Products',
    mobile: '9790912053',
    address: '37, AA Road',
  }),
  'snake_case profile fields are accepted'
);
check(
  !isBusinessProfileComplete({
    companyName: '',
    mobile: '9790912053',
    address: '37, AA Road',
    email: 'owner@gmail.com',
    alternateEmail: 'owner@gmail.com',
  }),
  'the login email is not a substitute for the company name'
);
check(
  !isBusinessProfileComplete({ ...complete, address: '', city: 'Madurai', country: 'India' }),
  'city and the default country do not replace the street address'
);

const clearedName = missingBusinessProfileFields({ ...complete, companyName: '' });
const restored = { ...complete, companyName: 'Seeragam Quality Products' };
check(clearedName.includes('companyName') && isBusinessProfileComplete(restored), 'the reminder state follows the saved fields in both directions');

console.log(`Profile completion checks passed: ${passed}`);
