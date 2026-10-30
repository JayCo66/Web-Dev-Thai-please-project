# เปรียบเทียบ branch ณ 30 ตุลาคม 2026

ตรวจด้วย git ls-remote และ git fetch origin โดยไม่ checkout, merge หรือ push งานในเครื่องอยู่ improveUxUi HEAD `fb274bc` และมีการแก้ที่ยังไม่ commit จึงต้องแยกจากสถานะ remote improveUxUi

| Branch บน GitHub | Commit ล่าสุด | Commit เฉพาะ HEAD ในเครื่อง | Commit เฉพาะ branch นั้น |
|---|---|---:|---:|
| `feat/bingo-quest-seed-sql` | `44efb21` | 22 | 0 |
| `improveUxUi` | `c708a26` | 2 | 0 |
| `main` | `de262e2` | 2 | 5 |
| `mobile-ui` | `c708a26` | 2 | 0 |
| `token-reward` | `c1858af` | 19 | 0 |

main ล่าสุด `de262e2` มี 5 commits หลังจุดร่วม c708a26 ส่วน improveUxUi ในเครื่องมี 2 commits เฉพาะฝั่งเรา ยังไม่รวมไฟล์แก้ที่ไม่ commit; remote improveUxUi และ mobile-ui ยังชี้ c708a26 เหมือนกัน ไม่ใช่โค้ด UX ล่าสุดในเครื่อง ส่วน api-typhoon ยังมี tracking ref เก่าในเครื่องแต่ไม่อยู่ในรายการ live remote branches แล้ว

## ความต่างหลักกับ main

| ส่วน | main ล่าสุด | งานในเครื่อง improveUxUi |
|---|---|---|
| SQL / Prisma | เพิ่ม reward_redemptions แบบ reward_name, voucher_code, barcode_number, ticket_number, campaign_id; Prisma เพิ่ม custom_title/reason ใน user_quests และ month_key/theme ใน bingo_boards | เพิ่มแบบ additive upgrade: demo_balance, request_key/event_key, snapshot/board_index และ unique user+month+index; reward_redemptions แบบ kind/code/metadata/request_key |
| Bingo | Map ในหน่วยความจำร่วมกับ DB user_quests, เตรียม 4 กระดาน 100 ช่อง ใช้ examples/generate-board.mock.json เป็น input ตั้งต้น | เก็บ snapshot รายกระดานใน DB, กระดานแรกชุดร่วม 12/8/4 จากนั้นใช้ profile จริงรวมวันนี้ สร้างทีละกระดาน |
| รางวัล | เพิ่ม my-redemptions, use-voucher และบาร์โค้ด/ใช้คูปอง พร้อมวงล้อ | my-items เก็บสิทธิ์แยกตามรางวัล รองรับ request replay/row lock, สิทธิ์ราคาเต็มและกรอกจำนวนเอง ไม่มีวงล้อเปิดใช้งาน |
| กระเป๋าเงิน | user_simulated_balance ใน localStorage ฝั่ง frontend | demo_balance ที่ backend ควบคุมและเปลี่ยนพร้อม transaction |
| Frontend | เพิ่ม Profile.jsx, route /profile, ปรับ Navbar/Home/Bingo/Charities/Payment/ThaiPlus และ index.css ใหม่ พร้อมภาพมูลนิธิ 4 และรางวัล 10 ไฟล์ | หน้า UX ปัจจุบัน ภาพ local assets, pagination 6 ต่อหน้า, เส้นบิงโก/โทเค็นต่อช่อง/เครื่องมือทดสอบและรายการลุ้น 3 รางวัล |
| การตรวจสอบ | เปรียบเทียบจาก source เท่านั้น ยังไม่ได้รัน main บนฐานข้อมูลแยก | มี functional/browser harness, unit tests และ Typhoon simulation |

## ประเด็นที่ต้องแก้ก่อนนำงานมารวม

1. reward_redemptions ใช้ชื่อตารางเดียวกัน แต่คอลัมน์และสถานะต่างกัน CREATE TABLE IF NOT EXISTS ของ main จะไม่เปลี่ยนตารางเดิมให้เข้ากัน ต้องออก migration แปลงข้อมูล ไม่ใช่นำ SQL seed มารันทับ
2. Prisma main เพิ่ม user_quests.custom_title/reason และ bingo_boards.month_key/theme แต่ diff thai_please_schema.sql ใน 5 commits นี้เพิ่มเพียง reward_redemptions จึงยังต้องตรวจ migration ของคอลัมน์เหล่านี้ก่อนรันกับ DB ใหม่
3. loadUserBoardsFromDB(userId,monthKey) ของ main รับ monthKey แต่ SELECT กรองเฉพาะ user_id แล้ว LIMIT 4 ไม่กรองเดือน มีความเสี่ยงดึงกระดานเก่าข้ามเดือน (ข้อสังเกตจาก source ยังไม่ใช่ผล runtime)
4. main สร้าง input จาก default mock สำหรับ 4 กระดาน จึงไม่ใช่นโยบายกระดานแรกชุดร่วม/กระดานถัดไปอิงพฤติกรรมจริงของงานในเครื่อง
5. main ตั้งวันหมดอายุ lucky draw คงที่ 31 มีนาคม 2026 ซึ่งก่อนวันที่ตรวจนี้ และ INSERT ตั๋วด้วย reward_id=NULL แม้รับ rewardId จาก request จึงต้องแก้ถ้าจะนำระบบสิทธิ์ลุ้นมารวม
6. main เพิ่ม /quests/progress ที่รับ markComplete และ /demo-faucet; ฝั่งในเครื่องปิด endpoint เก่าและแยก /demo-complete ที่ควบคุมด้วยโหมดทดสอบ ควรรักษาขอบเขตเครื่องมือทดสอบเมื่อนำมารวม

แนะนำรวมหน้า Profile กับแนวคิดบาร์โค้ด/ใช้คูปองทีละส่วน และรักษา migration, profile AI จริง, การล็อกธุรกรรมและป้องกันรายการซ้ำของงานในเครื่องไว้ รายงานนี้ไม่ได้ merge งานใด

## ไฟล์ต่างกันระหว่าง HEAD กับ main

ทิศทางด้านล่างคือ HEAD → main: A=มีใน main เพิ่ม, D=ไม่มีใน main, M=เนื้อหาต่างกัน ไม่ได้แปลว่ามีใครลบไฟล์จากเครื่อง

```text
D	.gitignore
D	README.md
D	backend/.dockerignore
D	backend/.env.example
D	backend/Dockerfile
M	backend/examples/README.md
M	backend/examples/THAI-Please-AI.postman_collection.json
M	backend/package-lock.json
M	backend/package.json
M	backend/prisma/schema.prisma
D	backend/prisma/upgrades/20261030_functional_upgrade.sql
D	backend/scripts/upgrade-db.js
D	backend/scripts/verify-ai.cjs
D	backend/scripts/verify-project.cjs
M	backend/src/config/prisma.js
M	backend/src/controllers/charityController.js
D	backend/src/controllers/demoAuthController.js
D	backend/src/controllers/demoWalletController.js
M	backend/src/controllers/questController.js
M	backend/src/controllers/rewardController.js
M	backend/src/controllers/transactionController.js
M	backend/src/routes/authRoutes.js
M	backend/src/routes/questRoutes.js
M	backend/src/routes/rewardRoutes.js
M	backend/src/routes/userRoutes.js
M	backend/src/services/authService.js
D	backend/src/services/bingoProfile.js
D	backend/src/services/catalogService.js
D	backend/src/services/charityMedia.js
D	backend/src/services/missionPolicy.js
D	backend/src/services/questMetrics.js
M	backend/src/services/questService.js
D	backend/src/utils/operations.js
D	backend/test/bingoProfile.test.js
M	backend/test/fairnessEngine.test.js
D	backend/test/missionPolicy.test.js
D	backend/test/questMetrics.test.js
M	backend/test/questService.test.js
M	backend/test/tokenomics.test.js
D	compose.yaml
D	docs/adr/0004-functional-ux-and-difficulty.md
D	docs/charity-image-sources.md
D	docs/functional-upgrade.md
D	docs/media-manifest-v3.json
D	docs/project-refinements-v3.md
D	docs/qa/bingo-completed-desktop.png
D	docs/qa/bingo-completed-mobile.png
D	docs/qa/bingo-desktop.png
D	docs/qa/bingo-mobile.png
D	docs/qa/charities-desktop.png
D	docs/qa/charities-mobile.png
D	docs/qa/functional-report.json
D	docs/qa/home-desktop.png
D	docs/qa/home-mobile.png
D	docs/qa/login-desktop.png
D	docs/qa/login-mobile.png
D	docs/qa/payment-desktop.png
D	docs/qa/payment-mobile.png
D	docs/qa/rewards-desktop.png
D	docs/qa/rewards-mobile.png
D	frontend/.dockerignore
D	frontend/.env.example
D	frontend/Dockerfile
D	frontend/nginx.conf
D	frontend/public/assets/charities/children-cover.jpg
D	frontend/public/assets/charities/community-illustration.jpg
D	frontend/public/assets/charities/education-illustration.jpg
D	frontend/public/assets/charities/environment-illustration.jpg
D	frontend/public/assets/charities/healthcare-illustration.jpg
D	frontend/public/assets/charities/mirror-cover.jpg
D	frontend/public/assets/charities/mirror.png
D	frontend/public/assets/charities/rama-cover.jpg
D	frontend/public/assets/charities/ramathibodi.png
D	frontend/public/assets/charities/seub-cover.jpg
D	frontend/public/assets/charities/seub.png
D	frontend/public/assets/charities/sos-cover.jpg
D	frontend/public/assets/charities/worldvision-cover.webp
D	frontend/public/assets/charities/yuvabadhana-cover.png
D	frontend/public/assets/charities/yuvabadhana.png
D	frontend/public/assets/rewards/coupon-50.svg
D	frontend/public/assets/rewards/coupon-coffee.svg
D	frontend/public/assets/rewards/gold.jpg
D	frontend/public/assets/rewards/iphone18pro.jpg
D	frontend/public/assets/rewards/motorcycle.png
D	frontend/public/assets/rewards/mug.jpg
D	frontend/public/assets/rewards/tote.jpg
A	frontend/public/charities/charity-1.jpg
A	frontend/public/charities/charity-2.jpg
A	frontend/public/charities/charity-3.jpg
A	frontend/public/charities/charity-4.jpg
A	frontend/public/rewards/coupon50.jpg
A	frontend/public/rewards/drink.jpg
A	frontend/public/rewards/ev.jpg
A	frontend/public/rewards/fuel.jpg
A	frontend/public/rewards/gold.jpg
A	frontend/public/rewards/iphone.jpg
A	frontend/public/rewards/polo.jpg
A	frontend/public/rewards/rice.jpg
A	frontend/public/rewards/totebag.jpg
A	frontend/public/rewards/tumbler.jpg
M	frontend/src/App.jsx
M	frontend/src/components/Navbar.jsx
M	frontend/src/context/AuthContext.jsx
M	frontend/src/index.css
M	frontend/src/pages/Bingo.jsx
M	frontend/src/pages/Charities.jsx
M	frontend/src/pages/Home.jsx
M	frontend/src/pages/Login.jsx
M	frontend/src/pages/Payment.jsx
A	frontend/src/pages/Profile.jsx
M	frontend/src/pages/ThaiPlus.jsx
D	frontend/src/styles/experience.css
D	frontend/src/styles/project-refinements.css
D	postman/contracts/typhoon.openapi.yaml
D	postman/mocks/typhoon/config.yaml
D	postman/mocks/typhoon/default.js
D	postman/simulations/typhoon/typhoon.context.yaml
D	postman/simulations/typhoon/typhoon.sim.yaml
M	thai_please_schema.sql
```
