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
  Gift,
  Grid
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
      <header className="app-header" role="banner">
        <div className="header-brand">
          <Link to="/" className="brand-link" aria-label="ไทยช่วยไทยพลีส กลับสู่หน้าหลัก">
            <div className="header-logo" aria-hidden="true">TP</div>
            <div className="brand-text-group">
              <div className="header-title">ไทยช่วยไทย<span className="accent-text">พลีส</span></div>
              <div className="header-tag">กระเป๋าเงินดิจิทัล & บริการคนละครึ่ง 60/40</div>
            </div>
          </Link>
        </div>

        {/* Desktop Nav Links */}
        <nav className="desktop-nav" aria-label="การนำทางหลักบนคอมพิวเตอร์">
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
          <Link
            to="/bingo"
            className={`nav-pill-link ${location.pathname === '/bingo' ? 'active' : ''}`}
          >
            <Grid size={16} />
            <span>ภารกิจบิงโก</span>
          </Link>
        </nav>

        {/* Desktop User Section */}
        <div className="header-user desktop-only">
          {/* Simulated Balance Pill */}
          <div className="balance-pill" title="ยอดเงินในกระเป๋าจำลอง">
            <Wallet size={16} />
            <span className="tabular-num">฿{userBalance.toFixed(2)}</span>
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
            aria-label={`Impact Tokens สะสม ${tokens} เหรียญ คลิกเพื่อแลกรางวัล`}
          >
            <Coins size={15} />
            <span className="tabular-num">{tokens} Tokens</span>
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

        {/* Mobile Header Right (Tokens + Balance + Profile Trigger) */}
        <div className="mobile-header-actions mobile-only" aria-label="สถานะเหรียญและยอดเงิน">
          {/* Tokens Pill (Impact Tokens) */}
          <Link
            to="/plus"
            className="mobile-header-pill mobile-token-pill"
            title="Impact Tokens สะสม (แตะเพื่อแลกรางวัล)"
            aria-label={`เหรียญ Impact Tokens สะสม: ${tokens} เหรียญ แตะเพื่อแลกของรางวัล`}
          >
            <Coins size={14} className="pill-icon text-amber" />
            <span className="pill-val tabular-num">{tokens}</span>
          </Link>

          {/* Balance Pill (Wallet Money) */}
          <button
            type="button"
            className="mobile-header-pill mobile-balance-pill"
            onClick={() => setProfileDrawerOpen(true)}
            title="ยอดเงินในกระเป๋าจำลอง (แตะเพื่อดูรายละเอียดหรือเติมเงิน)"
            aria-label={`ยอดเงินคงเหลือในกระเป๋า: ฿${userBalance.toFixed(0)} บาท แตะเพื่อดูรายละเอียด`}
          >
            <Wallet size={14} className="pill-icon text-royal" />
            <span className="pill-val tabular-num">฿{userBalance.toFixed(0)}</span>
          </button>

          {/* User Profile Avatar Trigger */}
          <button
            type="button"
            className="btn-mobile-profile"
            onClick={() => setProfileDrawerOpen(true)}
            aria-label="เปิดเมนูบัญชีผู้ใช้และจัดการกระเป๋าเงิน"
            title="บัญชีผู้ใช้งาน"
          >
            {user?.fullName ? (
              <span className="avatar-initial">{user.fullName.charAt(0)}</span>
            ) : (
              <User size={18} />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Docked Mobile Footer Nav) */}
      <nav className="mobile-bottom-nav" aria-label="เมนูหลักด้านล่าง">
        <Link
          to="/"
          className={`bottom-nav-item ${location.pathname === '/' ? 'active' : ''}`}
          aria-label="หน้าหลัก"
        >
          <div className="bottom-nav-icon">
            <Home size={20} />
          </div>
          <span className="bottom-nav-label">หน้าหลัก</span>
        </Link>

        <Link
          to="/rewards"
          className={`bottom-nav-item ${location.pathname === '/rewards' || location.pathname === '/plus' || location.pathname === '/thai-plus' ? 'active' : ''}`}
          aria-label="แลกของรางวัลและชิงโชค"
        >
          <div className="bottom-nav-icon">
            <Gift size={20} />
          </div>
          <span className="bottom-nav-label">แลกรางวัล</span>
        </Link>

        {/* Center Prominent FAB for 60/40 Co-Pay (Banking Scan/Pay style) */}
        <Link
          to="/payment"
          className={`bottom-nav-item bottom-nav-fab-center ${location.pathname === '/payment' ? 'active' : ''}`}
          aria-label="คนละครึ่ง 60/40 สแกนชำระเงิน"
        >
          <div className="bottom-nav-fab-btn">
            <QrCode size={24} strokeWidth={2.3} />
          </div>
          <span className="bottom-nav-fab-label">คนละครึ่ง</span>
        </Link>

        <Link
          to="/charities"
          className={`bottom-nav-item ${location.pathname === '/charities' ? 'active' : ''}`}
          aria-label="ร่วมบริจาค e-Donation ลดหย่อนภาษี"
        >
          <div className="bottom-nav-icon">
            <HeartHandshake size={20} />
          </div>
          <span className="bottom-nav-label">บริจาค</span>
        </Link>

        <Link
          to="/bingo"
          className={`bottom-nav-item ${location.pathname === '/bingo' ? 'active' : ''}`}
          aria-label="เกมบิงโกภารกิจ 5x5"
        >
          <div className="bottom-nav-icon">
            <Grid size={20} />
          </div>
          <span className="bottom-nav-label">บิงโก</span>
        </Link>
      </nav>

      {/* Mobile Profile & Actions Sheet (Slide-Up Drawer with dvh support) */}
      {profileDrawerOpen && (
        <div
          className="drawer-overlay"
          onClick={() => setProfileDrawerOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="เมนูบัญชีผู้ใช้งานและจัดการกระเป๋าเงิน"
        >
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            {/* Sheet Grab Handle on Mobile */}
            <div className="drawer-grab-handle" aria-hidden="true" />

            <div className="drawer-header">
              <div className="drawer-title">
                <ShieldCheck size={20} color="var(--bank-royal)" />
                <span>บัญชีผู้ใช้งาน</span>
              </div>
              <button
                type="button"
                className="btn-close-drawer"
                onClick={() => setProfileDrawerOpen(false)}
                aria-label="ปิดเมนูบัญชี"
              >
                <X size={20} />
              </button>
            </div>

            {/* User Profile Card */}
            <div className="drawer-profile-card">
              <div className="drawer-profile-avatar">
                {user?.fullName ? user.fullName.charAt(0) : 'U'}
              </div>
              <div className="drawer-profile-info">
                <div className="drawer-profile-name">
                  {user?.fullName || 'ผู้ใช้งาน'}
                </div>
                <span className={`role-badge ${getRoleClass(user?.role)}`}>
                  {getRoleName(user?.role)}
                </span>
                {user?.maskedCitizenId && (
                  <div className="drawer-profile-meta">
                    เลขบัตร ปชช: {user.maskedCitizenId}
                  </div>
                )}
                {user?.maskedPhone && (
                  <div className="drawer-profile-meta">
                    เบอร์โทรศัพท์: {user.maskedPhone}
                  </div>
                )}
                {shop && (
                  <div className="drawer-profile-meta">
                    ร้านค้า: <strong>{shop.shopName}</strong> ({shop.category})
                  </div>
                )}
              </div>
            </div>

            {/* Quick Balances in Drawer (Money & Tokens) */}
            <div className="drawer-balances-grid">
              <div className="drawer-balance-card">
                <div className="drawer-card-label">
                  <Wallet size={15} color="var(--bank-royal)" />
                  <span>ยอดเงินกระเป๋า</span>
                </div>
                <div className="drawer-card-val text-royal tabular-num">
                  ฿{userBalance.toFixed(2)}
                </div>
                <button
                  type="button"
                  className="btn-drawer-topup"
                  onClick={() => resetBalance(500)}
                  aria-label="เติมเงินจำลอง 500 บาท"
                >
                  <PlusCircle size={14} /> เติมจำลอง ฿500
                </button>
              </div>

              <div className="drawer-balance-card">
                <div className="drawer-card-label">
                  <Coins size={15} color="var(--accent-gold)" />
                  <span>Impact Tokens</span>
                </div>
                <div className="drawer-card-val text-amber tabular-num">
                  {tokens}
                </div>
                <Link
                  to="/plus"
                  className="drawer-token-link"
                  onClick={() => setProfileDrawerOpen(false)}
                  aria-label="ไปที่หน้าแลกของรางวัล"
                >
                  <span>แลกของรางวัล &gt;</span>
                </Link>
              </div>
            </div>

            {/* Action Buttons in Drawer */}
            <div className="drawer-actions-list">
              <Link
                to="/payment"
                className="drawer-action-btn"
                onClick={() => setProfileDrawerOpen(false)}
              >
                <div className="drawer-action-left">
                  <CreditCard size={18} color="var(--bank-royal)" />
                  <span>ชำระเงินคนละครึ่ง (สิทธิ 60/40)</span>
                </div>
                <ChevronRight size={18} color="var(--text-tertiary)" />
              </Link>

              <Link
                to="/charities"
                className="drawer-action-btn"
                onClick={() => setProfileDrawerOpen(false)}
              >
                <div className="drawer-action-left">
                  <HeartHandshake size={18} color="var(--bank-royal)" />
                  <span>บริจาค e-Donation ลดหย่อนภาษี</span>
                </div>
                <ChevronRight size={18} color="var(--text-tertiary)" />
              </Link>

              <Link
                to="/plus"
                className="drawer-action-btn highlight-gold"
                onClick={() => setProfileDrawerOpen(false)}
              >
                <div className="drawer-action-left">
                  <Gift size={18} color="#D97706" />
                  <span>ไทยช่วยไทยพลัส (แลกรางวัล & ลุ้นโชค)</span>
                </div>
                <ChevronRight size={18} color="#B45309" />
              </Link>

              <Link
                to="/bingo"
                className="drawer-action-btn highlight-blue"
                onClick={() => setProfileDrawerOpen(false)}
              >
                <div className="drawer-action-left">
                  <Grid size={18} color="#1D4ED8" />
                  <span>ภารกิจบิงโก 5x5 (Typhoon AI)</span>
                </div>
                <ChevronRight size={18} color="#1D4ED8" />
              </Link>

              <button
                type="button"
                className="drawer-logout-btn"
                onClick={() => {
                  setProfileDrawerOpen(false);
                  logout();
                }}
                aria-label="ออกจากระบบ"
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
