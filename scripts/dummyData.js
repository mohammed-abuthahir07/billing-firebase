/**
 * Comprehensive Dummy Data Generator for Billing SaaS
 * Generates realistic accounts, profiles, products, stock variants, invoices, and metrics.
 */

export const SEED_ADMIN = {
  uid: "test-admin-uid-001",
  email: "admin@testbilling.com",
  name: "System Administrator",
  role: "admin",
};

export const SEED_USERS = [
  {
    uid: "test-user-alpha-001",
    email: "alpha.traders@testbilling.com",
    name: "Alpha Spices & Traders",
    company: {
      companyName: "Alpha Spices & Traders Pvt Ltd",
      mobile: "9876543210",
      alternateEmail: "billing@alphaspices.com",
      gstNumber: "33AAAAA0000A1Z5",
      address: "124 Market Street, South Gate",
      city: "Madurai",
      state: "Tamil Nadu",
      country: "India",
      pincode: "625001",
      website: "https://alphaspices.example.com",
      profileImage: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200",
    },
  },
  {
    uid: "test-user-beta-002",
    email: "beta.organics@testbilling.com",
    name: "Beta Organic Provisions",
    company: {
      companyName: "Beta Organic Provisions LLP",
      mobile: "9845123456",
      alternateEmail: "accounts@betaorganic.com",
      gstNumber: "29BBBBB1111B1Z2",
      address: "45 Commercial Axis, Indiranagar",
      city: "Bengaluru",
      state: "Karnataka",
      country: "India",
      pincode: "560038",
      website: "https://betaorganic.example.com",
      profileImage: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=200",
    },
  },
  {
    uid: "test-user-gamma-003",
    email: "gamma.retail@testbilling.com",
    name: "Gamma Gourmet Foods",
    company: {
      companyName: "Gamma Gourmet Foods Enterprises",
      mobile: "9123456789",
      alternateEmail: "finance@gammagourmet.com",
      gstNumber: "27CCCCC2222C1Z8",
      address: "88 Linking Road, Bandra West",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      pincode: "400050",
      website: "https://gammagourmet.example.com",
      profileImage: "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=200",
    },
  },
];

export const SAMPLE_PRODUCTS = [
  // Masalas & Spices
  { itemName: "Idli Podi", category: "Masala & Spices", sku: "SKU-IP-250", packageWeight: 250, weightUnit: "g", sellingPrice: 175, gst: 5, quantity: 45 },
  { itemName: "Idli Podi", category: "Masala & Spices", sku: "SKU-IP-500", packageWeight: 500, weightUnit: "g", sellingPrice: 330, gst: 5, quantity: 20 },
  { itemName: "Sambar Podi", category: "Masala & Spices", sku: "SKU-SP-100", packageWeight: 100, weightUnit: "g", sellingPrice: 70, gst: 5, quantity: 8 }, // Low stock (<= 10)
  { itemName: "Rasam Podi", category: "Masala & Spices", sku: "SKU-RP-100", packageWeight: 100, weightUnit: "g", sellingPrice: 65, gst: 5, quantity: 4 }, // Low stock
  { itemName: "Garam Masala", category: "Masala & Spices", sku: "SKU-GM-200", packageWeight: 200, weightUnit: "g", sellingPrice: 140, gst: 12, quantity: 30 },
  { itemName: "Turmeric Powder", category: "Masala & Spices", sku: "SKU-TP-500", packageWeight: 500, weightUnit: "g", sellingPrice: 120, gst: 5, quantity: 0 }, // Out of stock
  { itemName: "Red Chilli Powder", category: "Masala & Spices", sku: "SKU-RC-500", packageWeight: 500, weightUnit: "g", sellingPrice: 190, gst: 5, quantity: 15 },
  { itemName: "Coriander Powder", category: "Masala & Spices", sku: "SKU-CP-500", packageWeight: 500, weightUnit: "g", sellingPrice: 135, gst: 5, quantity: 25 },
  { itemName: "Black Pepper Whole", category: "Masala & Spices", sku: "SKU-BP-100", packageWeight: 100, weightUnit: "g", sellingPrice: 110, gst: 5, quantity: 5 }, // Low stock
  { itemName: "Cumin Seeds", category: "Masala & Spices", sku: "SKU-CS-250", packageWeight: 250, weightUnit: "g", sellingPrice: 180, gst: 5, quantity: 18 },

  // Flours & Grains
  { itemName: "Organic Wheat Flour", category: "Grains & Flours", sku: "SKU-WF-5", packageWeight: 5, weightUnit: "kg", sellingPrice: 320, gst: 0, quantity: 50 },
  { itemName: "Ragi Flour", category: "Grains & Flours", sku: "SKU-RF-1", packageWeight: 1, weightUnit: "kg", sellingPrice: 85, gst: 0, quantity: 12 },
  { itemName: "Besan Gram Flour", category: "Grains & Flours", sku: "SKU-BF-1", packageWeight: 1, weightUnit: "kg", sellingPrice: 110, gst: 5, quantity: 35 },
  { itemName: "Basmati Rice Royal", category: "Grains & Flours", sku: "SKU-BR-5", packageWeight: 5, weightUnit: "kg", sellingPrice: 580, gst: 0, quantity: 40 },
  { itemName: "Sona Masoori Rice", category: "Grains & Flours", sku: "SKU-SM-10", packageWeight: 10, weightUnit: "kg", sellingPrice: 650, gst: 0, quantity: 22 },

  // Beverages & Dairy
  { itemName: "South Indian Filter Coffee", category: "Beverages", sku: "SKU-FC-250", packageWeight: 250, weightUnit: "g", sellingPrice: 220, gst: 5, quantity: 60 },
  { itemName: "Assam CTC Tea", category: "Beverages", sku: "SKU-AT-500", packageWeight: 500, weightUnit: "g", sellingPrice: 260, gst: 5, quantity: 14 },
  { itemName: "Green Tea Organic", category: "Beverages", sku: "SKU-GT-100", packageWeight: 100, weightUnit: "g", sellingPrice: 195, gst: 5, quantity: 7 }, // Low stock
  { itemName: "Pure Desi Cow Ghee", category: "Dairy", sku: "SKU-CG-500", packageWeight: 500, weightUnit: "ml", sellingPrice: 480, gst: 12, quantity: 28 },
  { itemName: "Pure Desi Cow Ghee", category: "Dairy", sku: "SKU-CG-1", packageWeight: 1, weightUnit: "L", sellingPrice: 920, gst: 12, quantity: 9 }, // Low stock

  // Oils & Dry Fruits
  { itemName: "Cold Pressed Sesame Oil", category: "Oils", sku: "SKU-SO-1", packageWeight: 1, weightUnit: "L", sellingPrice: 380, gst: 5, quantity: 32 },
  { itemName: "Cold Pressed Coconut Oil", category: "Oils", sku: "SKU-CO-1", packageWeight: 1, weightUnit: "L", sellingPrice: 340, gst: 5, quantity: 25 },
  { itemName: "California Almonds", category: "Dry Fruits", sku: "SKU-AL-500", packageWeight: 500, weightUnit: "g", sellingPrice: 490, gst: 12, quantity: 16 },
  { itemName: "Cashew Nuts W320", category: "Dry Fruits", sku: "SKU-CN-500", packageWeight: 500, weightUnit: "g", sellingPrice: 520, gst: 12, quantity: 15 },
  { itemName: "Kashmiri Walnuts", category: "Dry Fruits", sku: "SKU-WN-250", packageWeight: 250, weightUnit: "g", sellingPrice: 360, gst: 12, quantity: 6 }, // Low stock
];

export const SAMPLE_CUSTOMERS = [
  { name: "Meenakshi Amman Store", email: "meenakshi@store.com", gst: "33AABCM1111A1Z9", address: "14 West Chithirai St, Madurai" },
  { name: "Krishna Supermarket", email: "krishna@supermarket.com", gst: "33AABCK2222B1Z4", address: "102 North Veli St, Madurai" },
  { name: "Lakshmi Home Mart", email: "lakshmi@homemart.com", gst: "33AABCL3333C1Z1", address: "89 Anna Nagar Main Rd, Madurai" },
  { name: "Sri Balaji Provisions", email: "balaji@provisions.com", gst: "33AABCB4444D1Z7", address: "54 Kamarajar Salai, Madurai" },
  { name: "Walk-in Retail Customer", email: "walkin@guest.com", gst: "", address: "Counter Sale, Madurai" },
];
