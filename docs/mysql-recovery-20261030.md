# XAMPP MySQL recovery — 30 October 2026

## สาเหตุที่ยืนยันได้

MariaDB 10.4.32 ไม่สามารถเริ่ม InnoDB ได้ log เวลา 12:08–12:09 มี invalid undo header offset 0, Plugin initialization aborted with error Data structure corruption และ Unknown/unsupported storage engine: InnoDB พอร์ต 3306 ไม่มีโปรแกรมอื่นฟังอยู่ในขณะตรวจ จึงไม่ได้แก้ด้วยการเปลี่ยนพอร์ต

ยังยืนยันไม่ได้ว่าเหตุการณ์ใดทำให้ไฟล์เสีย ปัญหาปรากฏระหว่างการทดสอบฐานข้อมูลของโครงการ ไม่ใช่ข้อผิดพลาด syntax ของ React หรือ merge conflict ใน Git

## งานที่ทำแล้ว

1. เก็บ physical copy หลังเกิดปัญหาไว้ C:/Drive d/fullstack2/.db-backups/20261030-1200/data (สำเนาของไฟล์ที่เสีย ไม่ใช่ backup ก่อนเกิดเหตุ)
2. ทำงานบนสำเนาอีกชุดที่ .db-recovery/20261030/source เท่านั้น ทดลอง recovery ระดับ 1–4 เริ่มไม่ได้ ระดับ 5 อ่านได้ ใช้เพื่อ export ข้อมูล ไม่ใช้โหมดนี้กับฐานหลัก
3. Export SQL ฐานผู้ใช้ finaltest, myshop, phpmyadmin, test, thai_please, weightlifting รวม 38 base tables เก็บบัญชี/สิทธิ์ MySQL แยก ไม่ย้ายฐาน thai_please_qa_* ที่เป็นข้อมูลทดสอบชั่วคราว
4. สร้าง MariaDB data directory ใหม่ นำเข้า SQL และบัญชีผู้ใช้ แล้วเทียบจำนวนแถวและ SHA-256 ของเนื้อหาทุกตารางกับข้อมูลที่อ่านได้จากสำเนา ตรงกันครบทั้ง 38 ตารางก่อนเปิดให้แอปใช้ การตรงกันนี้ไม่สามารถยืนยันย้อนกลับว่าข้อมูลที่ยังไม่ commit ตอน crash ถูกกู้ครบหรือไม่
5. ตรวจ innodb_force_recovery=0 และ mysqlcheck --all-databases สำเร็จ
6. คัดลอกฐานที่ตรวจแล้วไป C:/xampp/mysql/data-recovered-20261030 แล้วปรับ datadir, innodb_data_home_dir, innodb_log_group_home_dir ใน C:/xampp/mysql/bin/my.ini ให้ชี้โฟลเดอร์นี้ โดยเก็บ C:/xampp/mysql/data เดิมไว้ ไม่ลบ ibdata1 หรือ redo logs ของเดิม
7. สำรอง config เดิมไว้ C:/xampp/mysql/bin/my.ini.pre-recovery-20261030-1214
8. เปิดที่พอร์ต 3306 ตามเดิมและตรวจหลังปิด–เปิดอีกครั้ง ปัจจุบัน XAMPP ใช้ mysqld.exe --defaults-file=C:/xampp/mysql/bin/my.ini --standalone และเปิดรับการเชื่อมต่อได้
9. ใช้ตัวแก้ catalog ที่ทดสอบไว้ รางวัลลุ้นเหลือ 3 รายการเปิดใช้งาน: ทองคำแท่ง 1 บาท, iPhone 18 Pro 256GB, Honda Wave 125i ประวัติตั๋ว/โทเค็นไม่เปลี่ยนจากข้อมูลที่กู้ได้ ปิดเฉพาะแถวรางวัลซ้ำ ไม่ลบ

หลังเปิดใช้งานแล้ว phpMyAdmin ปรับ pma__recent/pma__userconfig และการแก้ catalog เปลี่ยน rewards ตามคาด ส่วนตารางอื่นยังตรงกับชุดที่กู้ได้ ณ เวลาตรวจ

## ใช้งานต่อ

ใช้ Start/Stop MySQL ใน XAMPP ตามปกติ พอร์ตยังเป็น 3306 และ backend/.env ไม่เปลี่ยน เก็บโฟลเดอร์เดิมและไฟล์สำรองไว้ก่อน อย่าคัดลอกเฉพาะโฟลเดอร์ตารางเก่ามาทับชุดใหม่ และรอให้ mysqld ปิดเสร็จก่อน Start ใหม่ (ระหว่างทดสอบเคยเปิดเร็วเกินไปหนึ่งครั้ง ทำให้ได้ข้อความ ibdata1 must be writable จาก file lock แต่ปิดเสร็จแล้วเปิดใหม่ได้)

ควรใช้ logical SQL backup ของฐานงานเป็นระยะ ไฟล์ SQL และ manifest ตรวจข้อมูลอยู่ C:/Drive d/fullstack2/.db-recovery/20261030 และถูกกันออกจาก Git เพราะมีข้อมูลฐานจริง

อ้างอิง: https://mariadb.com/docs/server/server-usage/storage-engines/innodb/innodb-troubleshooting/innodb-recovery-modes
