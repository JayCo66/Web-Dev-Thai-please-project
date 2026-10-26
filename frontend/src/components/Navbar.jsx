import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  CreditCard,
  HeartHandshake,
  Wallet,
  Coins,
  LogOut,
  Home,
  User,
  PlusCircle,
  X,
  ShieldCheck,
  ChevronRight,
  QrCode,
  Gift
} from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const { user, wallet, tokens, shop, resetBalance, logout } = useAuth();
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);

  const userBalance = parseFloat(wallet?.balance || '500.00');

  const getRoleName = (role) => {
    switch (role) {
      case 'MERCHANT': return 'ร้านค้าผู้ประกอบการ';
      case 'ADMIN': return 'ผู้ดูแลระบบ';
      case 'GOV_EXECUTIVE': return 'ผู้บริหารภาครัฐ';
      default: return 'ประชาชนผู้ใช้สิทธิ';
    }
  };

  const getRoleClass = (role) => {
    switch (role) {
      case 'MERCHANT': return 'role-merchant';
      case 'ADMIN': return 'role-admin';
      default: return 'role-citizen';
    }
  };

  return (
    <>
      {/* Top Application Header */}
      <header className="app-header">
        <div className="header-brand">
          <Link to="/" className="brand-link" aria-label="กลับสู่หน้าหลัก">
            <div className="header-logo">TP</div>
            <div className="brand-text-group">
              <div className="header-title">ไทยช่วยไทย<span>พลีส</span></div>
              <div className="header-tag">กระเป๋าเงินดิจิทัล & บริการคนละครึ่ง 60/40</div>
            </div>
          </Link>
        </div>

        {/* Desktop Nav Links */}
        <nav className="desktop-nav" aria-label="Desktop Navigation">
          <Link
            to="/"
            className={`nav-pill-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            <Home size={16} />
            <span>หน้าหลัก</span>
          </Link>
          <Link
            to="/payment"
            className={`nav-pill-link ${location.pathname === '/payment' ? 'active' : ''}`}
          >
            <QrCode size={16} />
            <span>ชำระเงิน (60/40)</span>
          </Link>
          <Link
            to="/charities"
            className={`nav-pill-link ${location.pathname === '/charities' ? 'active' : ''}`}
          >
            <HeartHandshake size={16} />
            <span>บริจาค e-Donation</span>
          </Link>
          <Link
            to="/plus"
            className={`nav-pill-link ${location.pathname === '/plus' || location.pathname === '/rewards' ? 'active' : ''}`}
          >
            <Gift size={16} />
            <span>ไทยช่วยไทยพลัส</span>
          </Link>
        </nav>

        {/* Desktop User Section */}
        <div className="header-user desktop-only">
          {/* Simulated Balance Pill */}
          <div className="balance-pill" title="ยอดเงินในกระเป๋าจำลอง">
            <Wallet size={16} />
            <span>฿{userBalance.toFixed(2)}</span>
            <button
              type="button"
              className="btn-topup-mini"
              onClick={() => resetBalance(500)}
              title="เติมเงินจำลอง 500 บาทสำหรับการทดสอบ"
              aria-label="เติมเงินจำลอง 500 บาท"
            >
              + เติม ฿500
            </button>
          </div>

          {/* Tokens Pill */}
          <Link
            to="/plus"
            className="token-pill"
            title="Impact Tokens สะสม (คลิกเพื่อแลกรางวัล)"
            style={{ textDecoration: 'none', cursor: 'pointer' }}
          >
            <Coins size={15} />
            <span>{tokens} Tokens</span>
          </Link>

          {/* Role Badge */}
          <span className={`role-badge ${getRoleClass(user?.role)}`}>
            {getRoleName(user?.role)}
          </span>

          {/* Logout Button */}
          <button
            type="button"
            className="btn-logout"
            onClick={logout}
            aria-label="ออกจากระบบ"
          >
            <LogOut size={15} />
            <span>ออก</span>
          </button>
        </div>

        {/* Mobile Header Right (Compact Balance + Profile Trigger) */}
        <div className="mobile-header-actions mobile-only">
          <div className="balance-pill-compact" title="ยอดเงินจำลอง">
            <Wallet size={14} />
            <span>฿{userBalance.toFixed(0)}</span>
          </div>

          <button
            type="button"
            className="btn-mobile-profile"
            onClick={() => setProfileDrawerOpen(true)}
            aria-label="เปิดเมนูบัญชีผู้ใช้"
          >
            <User size={18} />
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Banking Style with Center FAB) */}
      <nav className="mobile-bottom-nav" aria-label="เมนูหลัก">
        <Link
          to="/"
          className={`bottom-nav-item ${location.pathname === '/' ? 'active' : ''}`}
        >
          <div className="bottom-nav-icon">
            <Home size={19} />
          </div>
          <span>หน้าหลัก</span>
        </Link>

        <Link
          to="/rewards"
          className={`bottom-nav-item ${location.pathname === '/rewards' || location.pathname === '/plus' || location.pathname === '/thai-plus' ? 'active' : ''}`}
        >
          <div className="bottom-nav-icon">
            <Gift size={19} />
          </div>
          <span>แลกรางวัล</span>
        </Link>

        {/* Center Prominent FAB for 60/40 Co-Pay (Banking Scan/Pay style) */}
        <Link
          to="/payment"
          className={`bottom-nav-item bottom-nav-fab-center ${location.pathname === '/payment' ? 'active' : ''}`}
          aria-label="คนละครึ่ง 60/40 สแกนจ่าย"
        >
          <div className="bottom-nav-fab-btn">
            <QrCode size={24} strokeWidth={2.4} />
          </div>
          <span className="bottom-nav-fab-label">คนละครึ่ง</span>
        </Link>

        <Link
          to="/charities"
          className={`bottom-nav-item ${location.pathname === '/charities' ? 'active' : ''}`}
        >
          <div className="bottom-nav-icon">
            <HeartHandshake size={19} />
          </div>
          <span>บริจาค</span>
        </Link>

        <button
          type="button"
          className="bottom-nav-item"
          onClick={() => setProfileDrawerOpen(true)}
          aria-label="เมนูบัญชีผู้ใช้"
        >
          <div className="bottom-nav-icon">
            <User size={19} />
          </div>
          <span>บัญชี</span>
        </button>
      </nav>

      {/* Mobile Profile & Actions Sheet */}
      {profileDrawerOpen && (
        <div
          className="drawer-overlay"
          onClick={() => setProfileDrawerOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="drawer-title">
                <ShieldCheck size={19} color="var(--bank-royal)" />
                <span>บัญชีผู้ใช้งาน</span>
              </div>
              <button
                type="button"
                className="btn-close-drawer"
                onClick={() => setProfileDrawerOpen(false)}
                aria-label="ปิดเมนู"
              >
                <X size={18} />
              </button>
            </div>

            {/* User Profile Card */}
            <div style={{
              background: 'var(--bank-royal-light)',
              border: '1px solid var(--bank-royal-border)',
              borderRadius: 'var(--radius-md)',
              padding: 16,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-full)',
                background: 'var(--btn-primary-gradient)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                fontWeight: 700,
                flexShrink: 0
              }}>
                {user?.fullName ? user.fullName.charAt(0) : 'U'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                  {user?.fullName || 'ผู้ใช้งาน'}
                </div>
                <span className={`role-badge ${getRoleClass(user?.role)}`}>
                  {getRoleName(user?.role)}
                </span>
                {user?.maskedCitizenId && (
                  <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 4 }}>
                    เลขบัตร ปชช: {user.maskedCitizenId}
                  </div>
                )}
                {user?.maskedPhone && (
                  <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                    เบอร์โทรศัพท์: {user.maskedPhone}
                  </div>
                )}
                {shop && (
                  <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                    ร้านค้า: <strong>{shop.shopName}</strong> ({shop.category})
                  </div>
                )}
              </div>
            </div>

            {/* Quick Balances in Drawer */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
              <div style={{ background: '#FFFFFF', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <Wallet size={14} color="var(--bank-royal)" />
                  <span>ยอดเงินกระเป๋า</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--bank-royal)' }}>
                  ฿{userBalance.toFixed(2)}
                </div>
                <button
                  type="button"
                  style={{
                    marginTop: 6,
                    padding: '6px 10px',
                    minHeight: 34,
                    width: '100%',
                    background: 'var(--bank-royal-light)',
                    border: '1px solid var(--bank-royal-border)',
                    color: 'var(--bank-royal)',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4
                  }}
                  onClick={() => resetBalance(500)}
                >
                  <PlusCircle size={13} /> เติมจำลอง ฿500
                </button>
              </div>

              <div style={{ background: '#FFFFFF', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <Coins size={14} color="var(--accent-gold)" />
                  <span>Impact Tokens</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-gold)' }}>
                  {tokens}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>
                  สิทธิร่วมบริจาคโครงการ
                </div>
              </div>
            </div>

            {/* Action Buttons in Drawer */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link
                to="/payment"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  minHeight: 46,
                  background: '#FFFFFF',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                  color: 'var(--text-primary)',
                  fontSize: 13.5,
                  fontWeight: 600
                }}
                onClick={() => setProfileDrawerOpen(false)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CreditCard size={17} color="var(--bank-royal)" />
                  <span>ชำระเงินคนละครึ่ง (สิทธิ 60/40)</span>
                </div>
                <ChevronRight size={17} color="var(--text-tertiary)" />
              </Link>

              <Link
                to="/charities"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  minHeight: 46,
                  background: '#FFFFFF',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                  color: 'var(--text-primary)',
                  fontSize: 13.5,
                  fontWeight: 600
                }}
                onClick={() => setProfileDrawerOpen(false)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <HeartHandshake size={17} color="var(--bank-royal)" />
                  <span>บริจาค e-Donation ลดหย่อนภาษี</span>
                </div>
                <ChevronRight size={17} color="var(--text-tertiary)" />
              </Link>

              <Link
                to="/plus"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  minHeight: 46,
                  background: '#FEF3C7',
                  border: '1px solid #FDE68A',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                  color: '#92400E',
                  fontSize: 13.5,
                  fontWeight: 700
                }}
                onClick={() => setProfileDrawerOpen(false)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Gift size={17} color="#D97706" />
                  <span>ไทยช่วยไทยพลัส (แลกรางวัล & ลุ้นโชค)</span>
                </div>
                <ChevronRight size={17} color="#B45309" />
              </Link>

              <button
                type="button"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  minHeight: 46,
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: 'var(--fin-danger)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 4
                }}
                onClick={() => {
                  setProfileDrawerOpen(false);
                  logout();
                }}
              >
                <LogOut size={16} />
                <span>ออกจากระบบ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
