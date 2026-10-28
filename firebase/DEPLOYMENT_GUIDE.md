# Complete Deployment Guide

This guide covers deploying the React Billing frontend to **Vercel** and the backend services to **Firebase**.

---

## 1. Firebase Backend Deployment

### Prerequisites
- Node.js 20+
- Firebase CLI (`npm install -g firebase-tools`)
- Firebase Blaze plan enabled on project `billing-firebase-1b0e4` (required for Cloud Functions)

### Deployment Steps
1. Navigate to the `firebase/` directory:
   ```bash
   cd firebase
   ```
2. Log in to Firebase:
   ```bash
   firebase login
   ```
3. Set active project:
   ```bash
   firebase use billing-firebase-1b0e4
   ```
4. Deploy Firestore Rules and Indexes:
   ```bash
   firebase deploy --only firestore
   ```
5. Deploy Storage Rules:
   ```bash
   firebase deploy --only storage
   ```
6. Build and deploy Cloud Functions:
   ```bash
   cd functions
   npm run build
   cd ..
   firebase deploy --only functions
   ```

---

## 2. Admin User Initialization
To designate an admin user:
1. Register an account with an email (e.g. `admin@gmail.com`) via the web app.
2. Call the `setAdminClaim` Cloud Function with the user's email and `ADMIN_BOOTSTRAP_SECRET`:
   ```bash
   firebase functions:shell
   > setAdminClaim({ email: "admin@gmail.com", secretKey: "billing-admin-bootstrap-2026" })
   ```
3. The user can now log into `/admin/login` and access the Admin Dashboard.

---

## 3. Vercel Frontend Deployment

### Steps
1. Push repository to GitHub or GitLab.
2. In the Vercel Dashboard, import the repository.
3. Configure project settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Configure Environment Variables in Vercel:
   ```env
   VITE_FIREBASE_API_KEY=AIzaSyARl_AiGJ5AYmo0EIt8w_wq9IbjqjF4-Y8
   VITE_FIREBASE_AUTH_DOMAIN=billing-firebase-1b0e4.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=billing-firebase-1b0e4
   VITE_FIREBASE_STORAGE_BUCKET=billing-firebase-1b0e4.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=477563068737
   VITE_FIREBASE_APP_ID=1:477563068737:web:0d96c0e29c3446679241c0
   VITE_FIREBASE_MEASUREMENT_ID=G-S7FXG2Y5K2
   ```
5. Deploy. Vercel will build the frontend and serve it with client-side SPA routing (`vercel.json` and `_redirects` ensure deep routes like `/bills` and `/admin/dashboard` resolve correctly on refresh).
