# Complete Scalability Report

Date: 17 November 2026  
Target discussed: about 1,000 registered businesses, and a separate question of how many of those can be active at the same time.

## Test environment

- Workspace checkout on Windows.
- Firebase project id referenced by the client: `billing-firebase-1b0e4`.
- `firebase.json` defines emulators (Auth 9099, Functions 5001, Firestore 8080, Storage 9199, UI 4000). None of them were started.
- No k6, Artillery, Locust, or JMeter run was executed.
- No test accounts were created.
- Production Firestore was not loaded, written, or stress-tested.

## Test methodology

Load generation against production was refused. The safe options were the local emulator or a separate non-production Firebase project. Neither was brought up in this session, so there is no latency series.

Code was read to identify which operations would dominate cost if 1,000 businesses existed. That reading is an estimate of risk. It is not a capacity result.

## Registered-user test results

NOT TESTED.

No set of 1,000 business accounts was created. The live project was not counted. This report does not know how many users exist in production.

## Concurrent-user test results

NOT TESTED at every level.

| Concurrent users | Status | Requests | Success | Errors | Average | P95 | P99 | Throughput |
|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 10 | NOT TESTED | — | — | — | — | — | — | — |
| 25 | NOT TESTED | — | — | — | — | — | — | — |
| 50 | NOT TESTED | — | — | — | — | — | — | — |
| 100 | NOT TESTED | — | — | — | — | — | — | — |
| 250 | NOT TESTED | — | — | — | — | — | — | — |
| 500 | NOT TESTED | — | — | — | — | — | — | — |
| 1,000 | NOT TESTED | — | — | — | — | — | — | — |

There is no evidence for any of those concurrency levels. The application is not claimed to support them.

## What the code implies (estimate, not a test)

These statements are from reading queries. They are not measured under load.

- One business dashboard reads one stats document, all of that user’s products, the latest 10 invoices, and the current year’s sales records for the pie chart. For a single company with a modest catalog this is a small read. It grows with product count and with invoices created this year.
- Invoice search reads every invoice for that user, then filters in the browser. A company with a large history pays for the full read on every search.
- Creating an invoice is one transaction: products, stock decrement, invoice, sales record, dashboard counters. Concurrent bills for the same company depend on Firestore transactions. That race was not executed, so correctness under two simultaneous checkouts is NOT TESTED.
- Admin dashboard, analytics, companies, invoices, products, and deleted invoices loop every user document and then read nested collections. Cost is roughly users × (products + invoices). At 1,000 businesses this is an admin-only scan, not a per-login cost, and it can exceed practical client timeouts and Firestore read quotas. It was not timed.
- There is no `onSnapshot` fan-out in the React source, which avoids listener multiplication. Polling is by page load.
- `platform_stats` is writable by any signed-in user in the repository rules. That is a security problem, not a measured hotspot.
- The stock email callable is not deployed. It does not add runtime load today.

## Firestore bottlenecks to plan for

1. Unbounded per-user invoice reads on search.
2. Admin N+1 scans across all companies.
3. Dashboard year-merge read in addition to the stats document.
4. Missing rules for `sales_records` and `deleted_invoices` if the repo rules are deployed. Writes would fail rather than scale.
5. No composite-index check was run against the live project. Report queries that filter by year and month may require an index. That was not confirmed in the console.

## Infrastructure required before a real 1,000-user test

1. A Firebase emulator suite, or a dedicated non-production project. Do not point the tool at `billing-firebase-1b0e4`.
2. Seed data: about 1,000 synthetic users, a realistic product catalog, and invoice history. No production invoices.
3. A load tool with a scripted journey: sign in, open dashboard, list products, create one invoice, open history, open analytics, sign out.
4. Step the concurrency through 10, 25, 50, 100, 250, 500, and only then 1,000. Stop when error rate or latency becomes unacceptable.
5. Record success, failure, timeout, p50, p95, p99, and Firestore reads. Do not infer those numbers from this document.

## Estimated versus tested capacity

| Question | Tested? | Statement |
|---|---|---|
| 1,000 registered accounts stored | No | Not created and not counted. |
| 100 simultaneous users | No | Not simulated. |
| 250 simultaneous users | No | Not simulated. |
| 500 simultaneous users | No | Not simulated. |
| 1,000 simultaneous users | No | Not simulated. |

Tested capacity is unknown. The admin full-scan pattern is the clearest design limit once the user count grows, and it still needs a timed test before anyone calls a number.
