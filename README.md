# SwiftCare

**A connection direct to heart.**

SwiftCare is a web platform that shows patients the real price of medicines and lab tests *before* they visit a pharmacy or diagnostic centre. It compares branded drugs with bioequivalent generics, benchmarks 42 NABL-accredited diagnostic tests, estimates the total bill, and issues a digital Cashless Pass that locks the price for 48 hours.

- **Live prototype:** https://peppy-stardust-960494.netlify.app

---

## The problem

Generic medicines can be 50 to 80 percent cheaper than brands, and diagnostic tests can carry 2x to 4x markups. Patients usually find out only at the counter, and comparing prices means switching between many pharmacy and lab apps.

## What SwiftCare does

- **Dual-column Compare hub:** search a medicine on the left and browse 42 NABL diagnostic tests (7 categories) on the right, then add both to one Care Basket.
- **Salt-to-brand matching:** maps a brand to its exact salt and strength and shows CDSCO-approved generics side by side, with live clinical data from NLM RxNorm and openFDA.
- **One-click price sorting:** ascending or descending, across both pharmacies and labs.
- **Proximity filter:** pharmacies and labs within 2 km, 5 km or 10 km.
- **3D visualizer (Three.js):** a Bioequivalence and Pack Inspector, and a 3D network proximity map.
- **Care Cost Estimator:** retail MRP vs locked price vs total savings, a toggle between Cashless Pass and Insurance Deductible, and a Single-Stop vs Split-Branch route optimizer.
- **Cashless checkout:** Couple and Promo codes (`COUPLE25`, `FAMILY30`, `SWIFT20`, `FIRST50`), pharmacy pickup plus home phlebotomy or lab walk-in slots, and UPI, card, OPD wallet or counter payment.
- **Digital Cashless Pass:** `PASS #SC-XXX` with 48-hour rate protection, saved to the patient's pass history.
- **Login gateway:** Google, Apple, ABHA ID with OTP (ABDM standards), or email and +91 mobile, with a 4-step verification pipeline.

## Tech stack

| Area | Technologies |
|---|---|
| Languages | TypeScript, TSX/JSX, SQL (PostgreSQL), HTML5, CSS3 |
| Frontend | React 19, Vite 8, Tailwind CSS v4, Motion, Three.js, Lucide React |
| Backend and data | Supabase (Auth, PostgreSQL, Row-Level Security), Node.js 22, Express |
| Clinical APIs | NLM RxNav / RxNorm, openFDA Drug Label API |
| Standards | ABDM / ABHA (14-digit ABHA ID and OTP flow) |
| Quality | `tsc --noEmit`, `node:test` with `tsx`, esbuild, Autoprefixer |
| Hosting | Netlify |

SwiftCare is web-based and needs no custom hardware. It runs in any modern browser on a phone, tablet or laptop (390px mobile baseline up to 1440px desktop). WebGL powers the 3D views and the browser's geolocation powers the radius filter.

## How it was built

1. **Design system and domain model:** the "Clinical Clarity" theme and typed TypeScript interfaces.
2. **Pricing, sorting and billing engine:** pure, unit-tested TypeScript functions.
3. **Compare hub and NABL catalog:** 42 tests across 7 categories.
4. **Live drug search and 3D inspector:** RxNorm and openFDA with an Indian brand-name bridge.
5. **Estimator and cashless checkout:** route optimizer and digital pass.
6. **Splash and login gateway:** animated ECG splash and the verification pipeline.
7. **Supabase integration:** `patient_profiles` and `cashless_passes` tables protected by Row-Level Security (`auth.uid() = user_id`).
8. **Verification:** type checks, production build and unit tests.

External integrations try live network calls first and fall back to verified datasets when credentials are unavailable.

## Architecture

```
SwiftCare web client (React 19 + TypeScript + Tailwind v4 + Motion + Three.js)
   |-- HTTPS --> NLM RxNav / RxNorm, openFDA
   |-- supabase-js (HTTPS + JWT + RLS) --> Supabase
                                            |-- Auth (email, Google, Apple, ABHA session)
                                            |-- patient_profiles 1 --- N cashless_passes
```

## Getting started

> Adjust the script names below to match your `package.json`.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables (see .env.example)
#    Add your Supabase project URL and anon key.

# 3. Start the dev server (runs on port 3000)
npm run dev

# 4. Type-check
npm run lint
```


## Team
Team Name : NEURIX

Team Leader Name: ABHINAV WATTAMWAR

Domain: ADDRESSING HEALTHCARE

Problem Statement: 
Develop a healthcare cost comparison platform that helps patients identify affordable medicines and diagnostic services by comparing prices across multiple pharmacies and diagnostic centres using a maintained sample or publicly available dataset.

