# THAI Please — saved requests and fixtures

Import `THAI-Please-AI.postman_collection.json`. The collection now follows the authenticated functional API. Begin with **Create demo account** to capture a token, then fetch the board. Payment/donation/reward writes require a `requestId`; reusing the same ID with the same payload returns the original operation.

`generate-board.mock.json` is a test fixture only. The citizen board flow does not read it or accept a fabricated profile from the browser. It builds aggregate statistics from MySQL and stores each board. The old unauthenticated AI preview contract is retired: `POST /quests/generate` now returns the current stored board and requires authentication.

`POST /quests/progress` is blocked. `POST /rewards/demo-faucet` credits exactly 500 test tokens to the authenticated account, requires a requestId, and is available only when demo tools are enabled (disabled by default in production). Replaying the same request does not credit twice. Complete missions via payment/donation. Claim a completed line using MANUAL or AUTO_MAX_TOKEN, then accept the board to open the next one (maximum four per Bangkok calendar month).

Actual SDK HTTP behavior is checked by the local simulation under `postman/simulations/typhoon`. It models only the boundary the project calls; unknown endpoints return 501. There is no configured provider-owned Postman workspace, so no owner mock was pulled. The stand-in does not establish provider availability or AI quality. Start the simulation then run `npm run verify:ai` from backend.

Merged coupon contract: GET /rewards/my-redemptions aliases /my-items. POST /rewards/use-voucher accepts redemptionId or voucherCode, verifies ownership and expiry, and persistently marks a coupon USED. It does not debit tokens again. Profiles use server-backed demo topups and do not claim ThaiD verification.

Owned-item presentation: LUCKY_DRAW is an account entry count for its monthly campaign, not a redeemable coupon. PHYSICAL is an exchange record. Only COUPON/DISCOUNT items have a usable voucher and expiry; expiresAt is null for draw and physical items, including legacy records with an old coupon-style expiry. The internal code remains a database reference for backward compatibility. No draw execution is implemented.
