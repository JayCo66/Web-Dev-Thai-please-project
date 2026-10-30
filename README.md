# THAI Please

โครงงาน React + Express + Prisma/MySQL: บิงโกเฉพาะบุคคล การบริจาคทดลอง และแต้มแลกรางวัล มี 4 เมนูหลัก หน้าหลัก / บิงโก / มูลนิธิ / รางวัล

## เริ่มในเครื่อง (ฐานข้อมูลเดิม)

ใช้ Node.js 24 และ MySQL 8 ขึ้นไป ค่าเชื่อมต่ออยู่ใน `backend/.env` ตาม `.env.example`

```sh
cd backend
npm ci
npm run db:generate
npm run db:upgrade
npm run dev
```

อีก terminal:

```sh
cd frontend
npm ci
npm run dev
```

เปิด URL ที่ Vite แสดง กด **เปิดบัญชีทดลอง** เพื่อเริ่มด้วยเงินทดลอง 500 บาทและ 50 แต้ม ไม่ต้องใช้เลขบัตรประชาชน การอัปเกรดเพิ่มคอลัมน์/ตาราง ไม่มี reset หรือการลบข้อมูลเดิม

สำหรับ DB ใหม่ให้นำเข้า `thai_please_schema.sql` ก่อน แล้วรัน upgrade ข้างบน ไม่ใช้ไฟล์ seed ทับฐานข้อมูลเดิม

## Docker ทั้งชุด

```sh
docker compose up --build
```

เว็บ http://localhost:8080 และ phpMyAdmin http://localhost:8081 มี frontend/backend/MySQL/phpMyAdmin พร้อม volume เก็บ DB ไม่ต้องมี MySQL ใน host ค่า default ใช้สำหรับเดโมในเครื่อง ปรับ environment ของ compose เมื่อแชร์ให้คนอื่น

Docker daemon ในเครื่องที่ตรวจยังไม่ได้เปิด จึงตรวจผ่าน `docker compose config` และทดสอบแอปกับ MySQL ใน host แยกกัน ยังไม่ได้ยืนยันการ build image จริง

## AI และข้อมูลจำลอง

- ไม่มี API key: เลือกภารกิจด้วยกติกาและระบุ RULE_BASED
- ผู้ใช้ใหม่: เริ่มภารกิจง่าย ไม่ใช้ fixed budget=63
- กระดานแรกใช้ชุดร่วมคละง่าย/กลาง/ท้าทาย 12/8/4 ตั้งแต่กระดานที่สองใช้ AI จากสถิติย้อนหลัง 30 วันรวมวันนี้เมื่อมี `TYPHOON_API_KEY`; ถ้าใช้ไม่ได้แสดงกฎสำรองตามจริง
- อย่างน้อย 12 ช่องง่าย / กลางไม่เกิน 8 / ยากไม่เกิน 4 ทุกกระดานมีภารกิจบริจาค
- การใช้จ่าย บริจาค เงินร่วมจ่าย คูปอง และสิทธิ์ลุ้นยังเป็นการทดลอง ไม่มีเงินจริง/การจับรางวัล/สิทธิลดหย่อนภาษี ThaiD ยังไม่เชื่อมและ endpoint เดิมปิดไว้
- มีชื่อมูลนิธิและโลโก้ที่ตรวจจากเว็บทางการ 4 แห่ง แต่ไม่มีความร่วมมือกับองค์กรเหล่านั้น ดู [แหล่งภาพ](docs/charity-image-sources.md)

## ตรวจงาน

```sh
cd backend
npm test
cd ../frontend
npm run build
npm run lint
```

ผลตรวจจริงอยู่ใน [รายงาน Functional และ QA](docs/functional-upgrade.md) และภาพใน `docs/qa` รายละเอียดกติกาที่เปลี่ยนอยู่ใน [ADR-0004](docs/adr/0004-functional-ux-and-difficulty.md)

Postman simulation ทดสอบ HTTP ของ adapter ด้วยข้อมูล fixture แยกจากผู้ใช้จริง:

```sh
postman simulation run postman/simulations/typhoon/typhoon.sim.yaml --port 5093 --no-history
```

เป็น mock ที่สร้างสำหรับ boundary ของโปรเจกต์ ไม่ใช่ mock ที่รับรองจากผู้ให้บริการ ไม่มีการ push/deploy ไป Postman cloud

กติกาล่าสุด ภาพ และเครื่องมือทดสอบ: [รายละเอียดรอบปรับปรุง](docs/project-refinements-v3.md)
