# THAI Please — saved requests and fixtures

Import `THAI-Please-AI.postman_collection.json`. The collection now follows the authenticated functional API. Begin with **Create demo account** to capture a token, then fetch the board. Payment/donation/reward writes require a `requestId`; reusing the same ID with the same payload returns the original operation.

`generate-board.mock.json` is a test fixture only. The citizen board flow does not read it or accept a fabricated profile from the browser. It builds aggregate statistics from MySQL and stores each board. The old unauthenticated AI preview contract is retired: `POST /quests/generate` now returns the current stored board and requires authentication.

`POST /quests/progress` and `/rewards/demo-faucet` are deliberately blocked. Complete missions via payment/donation. Claim a completed line using MANUAL or AUTO_MAX_TOKEN, then accept the board to open the next one (maximum four per Bangkok calendar month).

Actual SDK HTTP behavior is checked by the local simulation under `postman/simulations/typhoon`. It models only the boundary the project calls; unknown endpoints return 501. There is no configured provider-owned Postman workspace, so no owner mock was pulled. The stand-in does not establish provider availability or AI quality. Start the simulation then run `npm run verify:ai` from backend.
