import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, User, Phone, Mail, MapPin, Lock, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const FALLBACK_CATEGORIES = ['อาหารและเครื่องดื่ม', 'สินค้าทั่วไปและของใช้', 'สินค้า OTOP และวิสาหกิจชุมชน', 'บริการชุมชนและสุขภาพ'];

const labelStyle = { fontSize: 13.5, fontWeight: 700, marginBottom: 6 };
const inputStyle = { minHeight: 48, fontSize: 16 };

function Field({ label, icon: Icon, required, hint, children }) {
  return (
    <div className="form-group" style={{ marginBottom: 16 }}>
      <label className="form-label" style={labelStyle}>
        {label} {required && <span className="req">*</span>}
      </label>
      <div className="input-with-icon">
        <Icon size={18} className="input-icon" />
        {children}
      </div>
      {hint && <div className="form-hint" style={{ fontSize: 12, marginTop: 4, color: 'var(--text-tertiary)' }}>{hint}</div>}
    </div>
  );
}

export default function MerchantRegisterForm() {
  const navigate = useNavigate();
  const { registerMerchant } = useAuth();
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [form, setForm] = useState({
    shopName: '',
    category: FALLBACK_CATEGORIES[0],
    contactName: '',
    phoneNumber: '',
    email: '',
    addressLine: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/merchants/categories')
      .then((res) => {
        const names = (res.data.data || []).map((c) => c.category_name);
        if (names.length) {
          setCategories(names);
          setForm((current) => ({ ...current, category: names.includes(current.category) ? current.category : names[0] }));
        }
      })
      .catch(() => {});
  }, []);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (form.shopName.trim().length < 2) return setError('กรุณาระบุชื่อร้านค้า');
    if (form.phoneNumber.length !== 10) return setError('เบอร์โทรศัพท์ต้องมี 10 หลัก (เช่น 0812345678)');
    if (form.password.length < 8) return setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
    if (form.password !== form.confirmPassword) return setError('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');

    setLoading(true);
    const res = await registerMerchant({
      shopName: form.shopName.trim(),
      category: form.category,
      contactName: form.contactName.trim() || undefined,
      phoneNumber: form.phoneNumber,
      email: form.email.trim() || undefined,
      addressLine: form.addressLine.trim() || undefined,
      password: form.password,
    });
    setLoading(false);
    if (res.success) navigate('/merchant');
    else setError(res.error);
  }

  return (
    <form onSubmit={submit}>
      <div className="alert alert-info" style={{ marginBottom: 18 }}>
        <ShieldCheck size={20} style={{ flexShrink: 0 }} />
        <div style={{ fontSize: 13, lineHeight: 1.45 }}>
          <strong>ขั้นตอน:</strong> สมัครร้านค้า → เจ้าหน้าที่ภาครัฐตรวจสอบและอนุมัติ → ร้านจึงเริ่มรับชำระเงินคนละครึ่งได้
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert" style={{ marginBottom: 16 }}>
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>{error}</div>
        </div>
      )}

      <Field label="ชื่อร้านค้า" icon={Store} required>
        <input type="text" className="form-input" style={inputStyle} placeholder="เช่น ร้านป้าพร อาหารตามสั่ง" value={form.shopName} onChange={set('shopName')} required disabled={loading} />
      </Field>

      <Field label="หมวดหมู่ร้านค้า" icon={MapPin} required hint="ใช้จัดกลุ่มการใช้จ่ายของประชาชนในภารกิจบิงโก">
        <select className="form-select" style={{ minHeight: 48, fontSize: 15 }} value={form.category} onChange={set('category')} disabled={loading}>
          {categories.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </Field>

      <Field label="ชื่อเจ้าของร้าน / ผู้ติดต่อ" icon={User}>
        <input type="text" className="form-input" style={inputStyle} placeholder="เช่น นางสมพร สดใส" value={form.contactName} onChange={set('contactName')} disabled={loading} />
      </Field>

      <Field label="เบอร์โทรศัพท์ (ใช้เข้าสู่ระบบ)" icon={Phone} required>
        <input type="tel" className="form-input" style={inputStyle} placeholder="เช่น 0898765432" maxLength={10} value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value.replace(/\D/g, '') })} required disabled={loading} />
      </Field>

      <Field label="อีเมล (ไม่บังคับ)" icon={Mail}>
        <input type="email" className="form-input" style={inputStyle} placeholder="example@mail.com" value={form.email} onChange={set('email')} disabled={loading} />
      </Field>

      <Field label="ที่อยู่ร้านค้า" icon={MapPin}>
        <input type="text" className="form-input" style={inputStyle} placeholder="เลขที่ ตำบล อำเภอ จังหวัด" value={form.addressLine} onChange={set('addressLine')} disabled={loading} />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <Field label="รหัสผ่าน" icon={Lock} required>
          <input type="password" className="form-input" style={inputStyle} placeholder="อย่างน้อย 8 ตัวอักษร" value={form.password} onChange={set('password')} required disabled={loading} autoComplete="new-password" />
        </Field>
        <Field label="ยืนยันรหัสผ่าน" icon={Lock} required>
          <input type="password" className="form-input" style={inputStyle} placeholder="กรอกรหัสผ่านซ้ำ" value={form.confirmPassword} onChange={set('confirmPassword')} required disabled={loading} autoComplete="new-password" />
        </Field>
      </div>

      <button type="submit" className="btn-primary" disabled={loading} style={{ minHeight: 56, fontSize: 16, fontWeight: 700, width: '100%', marginTop: 8 }}>
        {loading ? (
          <>
            <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
            <span>กำลังส่งใบสมัคร...</span>
          </>
        ) : (
          <>
            <Store size={18} />
            <span>ส่งใบสมัครร้านค้า</span>
          </>
        )}
      </button>
    </form>
  );
}
