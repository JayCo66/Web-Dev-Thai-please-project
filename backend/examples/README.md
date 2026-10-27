# ทดสอบ AI ผ่าน Postman

Import THAI-Please-AI.postman_collection.json ใหม่เพื่อแทน body เก่าที่อักขระเสีย หรือใช้ generate-board.mock.json ทั้งไฟล์ส่ง POST http://localhost:5000/api/quests/generate แบบ application/json

board: period_days=30, cells=24, budget=63, levels=[1,3], center_quest="DONATION" ล็อก donation ที่ position=12; ถ้า null จะสุ่มตำแหน่ง

user_profile: รองรับ active_days_last_period, distinct_merchants_last_period, transactions_by_period (ล่าสุดก่อน), confidence และ bingo_history แบบขยาย
quests: ส่ง achieved_period_before และประวัติ offered/completed/last_level/last_status ได้ ประวัติ null คือไม่มีข้อมูล ไม่ใช่ล้มเหลว

ชื่อ หน่วย และ ladder ใน mock มาจากคลัง SQL 31 ภารกิจ ส่วน family และข้อมูลพฤติกรรมทั้งหมดเป็นตัวอย่างสมมติ ไม่ใช่ข้อมูลจริงของผู้ใช้
safe_level ของ mock คำนวณตัวอย่างจากระดับที่ผลงานล่าสุดถึง ไม่ใช่สูตรทางสถิติที่ยืนยันความสำเร็จ service รับค่านี้จากผู้จัดเตรียมข้อมูลโดยตรง

เลือก 24 quest ไม่ซ้ำ safe_level>0 ระดับ 1–3 และไม่เกิน safe_level ผลรวมตรง budget อ่าน target จาก ladder[level-1] ซึ่งมี 10 ระดับ เพิ่ม donation generic อีกหนึ่งช่องไม่รวม budget ยังไม่ผูก quest_id ฐานข้อมูล

reason ต้องระบุตัวเลข achieved_last_period กับ target ที่เลือก การตรวจนี้ไม่ได้พิสูจน์ความจริงของทุกถ้อยคำ ส่วน prompt ห้ามแต่งพฤติกรรมหรืออ้างว่าเป้าหมายสูงขึ้นเมื่อเป้าต่ำกว่าผลงาน

รองรับ completion แบบ optional:
- self_purchases: {periods, rate}
- all_users และ similar_users: {users, rate}
- rate มี 3 หรือ 10 ค่าเรียงระดับเริ่มที่ 1 ค่าระหว่าง 0–1
- self_bingo: object ระดับ 1–10 แต่ละค่า {offered, completed} หรือ null
confidence คือความเชื่อมั่นข้อมูล profile จากผู้จัดเตรียม ไม่ใช่โอกาสสำเร็จทุก quest

budget 63 ของ 24 ช่องเฉลี่ยระดับ 2.625 จึงไม่ใช่ส่วนใหญ่ระดับ 1 การกระจาย family เป็นเป้าหมายแบบยืดหยุ่น ไม่มีเพดาน 5 ต่อ family

ข้อมูลผิดหรือ budget เป็นไปไม่ได้คืน 400 ก่อนเรียก AI; คำตอบผิดให้ AI แก้ได้หนึ่งครั้ง (สูงสุด 2 calls และใช้ tokens เพิ่ม) ส่ง reference เฉพาะตอนแก้คำตอบ ถ้ายังผิดคืน 502 ไม่แอบเติมภารกิจสุ่ม network error ไม่ retry, rate limit คืน 429 timeout 60 วินาทีต่อคำขอ

ใช้ user เป็น alias ของ user_profile ได้ และรองรับ budget ที่ root แต่ถ้าระบุสองจุดต้องตรงกัน

เปิด backend ด้วย npm run dev และตั้ง TYPHOON_API_KEY ใน backend/.env คำขอ Postman ใช้ Typhoon จริง ไม่เขียนฐานข้อมูล ไม่เกี่ยวกับ frontend, payment หรือเช็กเส้น Bingo
ทดสอบโดยไม่ใช้ API: node --test test/questService.test.js จาก backend

หมายเหตุฉบับล่าสุด: reason ที่ส่งกลับสร้างจาก achieved_last_period และ target โดย server พร้อม reason_source=SERVER_DATA เพื่อไม่แสดงข้อความอธิบายที่ AI อาจแต่งขึ้น ไม่ใช่เหตุผลเชิงสาเหตุของโมเดล AI ยังเลือก quest และ level ตามเดิม เหตุผล AI ไม่ครบตัวเลขจึงไม่ทำให้เรียกซ้ำ; เฉพาะโครงสร้าง/จำนวน/ระดับ/budget ผิดจึงเข้าสู่การแก้คำตอบ

การปรับ budget ฉบับล่าสุด: AI เลือก quest และเสนอ level; backend ปรับระดับภายใน 1–3 และ safe_level ให้ผลรวมตรง budget โดยคง quest_code เดิม ใช้อัตราผลงานล่าสุดต่อ target เป็น heuristic ในการเลือกช่องที่จะเพิ่ม/ลด ไม่ใช่สูตรทางสถิติ แสดง ai_level, level_adjusted และ adjusted_cells_count เพื่อให้ตรวจสอบได้ target/title/reason คำนวณใหม่หลังปรับ ถ้า capacity ของชุดที่ AI เลือกไม่พอจะให้ AI เลือกใหม่ ไม่เปลี่ยน quest เอง
