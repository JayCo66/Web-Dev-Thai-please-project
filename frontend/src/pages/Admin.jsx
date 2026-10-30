import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Users,
  Store,
  Gift,
  Plus,
  Pencil,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Coins,
  Receipt,
  HeartHandshake,
  ArrowRight,
  RefreshCw,
  X,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Package,
  Ticket,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "../styles/admin.css";

const PRESET_ASSETS = [
  { label: "ทองคำแท่ง", url: "/assets/rewards/gold.jpg" },
  { label: "iPhone 18 Pro", url: "/assets/rewards/iphone18pro.jpg" },
  { label: "Honda Wave", url: "/assets/rewards/wave125i.png" },
  { label: "แก้วเซรามิก", url: "/assets/rewards/mug.jpg" },
  { label: "กระเป๋าผ้า", url: "/assets/rewards/tote.jpg" },
  { label: "คูปอง 50฿", url: "/assets/rewards/coupon-50.svg" },
  { label: "คูปองเครื่องดื่ม", url: "/assets/rewards/coupon-coffee.svg" },
];

const REWARD_TYPES = [
  { value: "COUPON", label: "คูปองส่วนลด / เครดิตเงิน" },
  { value: "DISCOUNT", label: "ส่วนลดร้านค้าชุมชน" },
  { value: "PHYSICAL", label: "สินค้า / ของที่ระลึกจริง" },
  { value: "LUCKY_DRAW", label: "สิทธิ์สุ่มชิงโชครางวัลใหญ่" },
];

const ROLE_LABELS = {
  CITIZEN: "ประชาชน",
  MERCHANT: "ร้านค้าชุมชน",
  ADMIN: "ผู้ดูแลระบบ",
  GOV_EXECUTIVE: "ผู้บริหารภาครัฐ",
};

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");

  // Data states
  const [stats, setStats] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [shopsList, setShopsList] = useState([]);

  // UI & Loading states
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // Filters & Search
  const [rewardSearch, setRewardSearch] = useState("");
  const [rewardTypeFilter, setRewardTypeFilter] = useState("ALL");
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");
  const [shopSearch, setShopSearch] = useState("");
  const [shopCategoryFilter, setShopCategoryFilter] = useState("ALL");

  // Modal State for Rewards
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formState, setFormState] = useState({
    name: "",
    description: "",
    image_url: "",
    reward_type: "COUPON",
    token_cost: 50,
    is_active: true,
  });

  const money = (n) =>
    Number(n || 0).toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Fetch Stats
  const loadStats = useCallback(async () => {
    try {
      const res = await api.get("/admin/stats");
      if (res.data.success) setStats(res.data.data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Fetch Rewards
  const loadRewards = useCallback(async () => {
    try {
      const res = await api.get("/admin/rewards");
      if (res.data.success) setRewards(res.data.data);
    } catch (e) {
      setError(e.response?.data?.error || "โหลดรายการของรางวัลไม่สำเร็จ");
    }
  }, []);

  // Fetch Users
  const loadUsers = useCallback(async () => {
    try {
      const res = await api.get("/admin/users");
      if (res.data.success) setUsersList(res.data.data);
    } catch (e) {
      setError(e.response?.data?.error || "โหลดรายชื่อผู้ใช้ไม่สำเร็จ");
    }
  }, []);

  // Fetch Shops
  const loadShops = useCallback(async () => {
    try {
      const res = await api.get("/admin/shops");
      if (res.data.success) setShopsList(res.data.data);
    } catch (e) {
      setError(e.response?.data?.error || "โหลดรายชื่อร้านค้าไม่สำเร็จ");
    }
  }, []);

  // Initial Load
  useEffect(() => {
    setLoading(true);
    Promise.all([loadStats(), loadRewards(), loadUsers(), loadShops()]).finally(
      () => setLoading(false)
    );
  }, [loadStats, loadRewards, loadUsers, loadShops]);

  // Open Modal for Create
  function openCreateModal() {
    setEditingReward(null);
    setFormState({
      name: "",
      description: "",
      image_url: "",
      reward_type: "COUPON",
      token_cost: 50,
      is_active: true,
    });
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  // Open Modal for Edit
  function openEditModal(reward) {
    setEditingReward(reward);
    setFormState({
      name: reward.name,
      description: reward.description || "",
      image_url: reward.imageUrl || "",
      reward_type: reward.rewardType,
      token_cost: reward.tokenCost,
      is_active: reward.isActive,
    });
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  // Save Reward (Create or Update)
  async function handleSaveReward(e) {
    e.preventDefault();
    if (!formState.name.trim()) {
      setError("กรุณากรอกชื่อของรางวัล");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editingReward) {
        await api.put(`/admin/rewards/${editingReward.rewardId}`, formState);
        setNotice(`แก้ไข "${formState.name}" สำเร็จ`);
      } else {
        await api.post("/admin/rewards", formState);
        setNotice(`เพิ่มของรางวัล "${formState.name}" สำเร็จ`);
      }
      setModalOpen(false);
      await loadRewards();
      await loadStats();
    } catch (e) {
      setError(e.response?.data?.error || "บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  // Toggle Reward Active Status
  async function handleToggleReward(rewardId) {
    try {
      const res = await api.patch(`/admin/rewards/${rewardId}/toggle`);
      setNotice(res.data.message || "เปลี่ยนสถานะสำเร็จ");
      await loadRewards();
      await loadStats();
    } catch (e) {
      setError(e.response?.data?.error || "เปลี่ยนสถานะไม่สำเร็จ");
    }
  }

  // Delete Reward
  async function handleDeleteReward(rewardId, name) {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบหรือปิดการใช้งานของรางวัล "${name}"?`)) {
      return;
    }
    try {
      const res = await api.delete(`/admin/rewards/${rewardId}`);
      setNotice(res.data.message || "ลบเรียบร้อยแล้ว");
      await loadRewards();
      await loadStats();
    } catch (e) {
      setError(e.response?.data?.error || "ลบไม่สำเร็จ");
    }
  }

  // Toggle Shop Active Status
  async function handleToggleShop(shopId) {
    try {
      const res = await api.patch(`/admin/shops/${shopId}/toggle`);
      setNotice(res.data.message || "เปลี่ยนสถานะร้านค้าสำเร็จ");
      await loadShops();
      await loadStats();
    } catch (e) {
      setError(e.response?.data?.error || "เปลี่ยนสถานะร้านค้าไม่สำเร็จ");
    }
  }

  // Filtered Rewards
  const filteredRewards = rewards.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(rewardSearch.toLowerCase()) ||
      r.description.toLowerCase().includes(rewardSearch.toLowerCase());
    const matchesType =
      rewardTypeFilter === "ALL" || r.rewardType === rewardTypeFilter;
    return matchesSearch && matchesType;
  });

  // Filtered Users
  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.phoneNumber.includes(userSearch);
    const matchesRole =
      userRoleFilter === "ALL" || u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  // Filtered Shops
  const filteredShops = shopsList.filter((s) => {
    const matchesSearch =
      s.shopName.toLowerCase().includes(shopSearch.toLowerCase()) ||
      s.address.toLowerCase().includes(shopSearch.toLowerCase());
    const matchesCat =
      shopCategoryFilter === "ALL" || s.category === shopCategoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="app-shell">
      <Navbar />
      <main id="main-content" className="admin-container">
        {/* Header Section */}
        <div className="admin-header">
          <div className="admin-title-group">
            <h1>
              <ShieldCheck size={28} color="#0044d6" />
              ระบบบริหารจัดการภาครัฐ (Admin Console)
            </h1>
            <p>
              ควบคุมดูแลของรางวัล สถิติภาพรวม ผู้ใช้งาน และร้านค้าชุมชนในระบบ THAI Please
            </p>
          </div>
          <div className="admin-role-badge">
            <span className="status-pill active" />
            เข้าสู่ระบบในฐานะ: {ROLE_LABELS[user?.role] || user?.role}
          </div>
        </div>

        {/* Global Notices */}
        {notice && (
          <div className="notice notice--success" role="status" style={{ marginBottom: 20 }}>
            <CheckCircle2 size={18} />
            <span>{notice}</span>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setNotice("")}
              style={{ marginLeft: "auto", padding: 0 }}
            >
              <X size={16} />
            </button>
          </div>
        )}
        {error && (
          <div className="notice notice--error" role="alert" style={{ marginBottom: 20 }}>
            <AlertCircle size={18} />
            <span>{error}</span>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setError("")}
              style={{ marginLeft: "auto", padding: 0 }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="admin-tabs" role="tablist">
          <button
            type="button"
            className={`admin-tab-btn ${tab === "overview" ? "is-active" : ""}`}
            onClick={() => setTab("overview")}
          >
            <TrendingUp size={18} />
            <span>ภาพรวมและตัวชี้วัด</span>
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${tab === "rewards" ? "is-active" : ""}`}
            onClick={() => setTab("rewards")}
          >
            <Gift size={18} />
            <span>จัดการของรางวัล (CRUD)</span>
            <span className="badge">{rewards.length}</span>
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${tab === "users" ? "is-active" : ""}`}
            onClick={() => setTab("users")}
          >
            <Users size={18} />
            <span>ตรวจสอบผู้ใช้งาน</span>
            <span className="badge">{usersList.length}</span>
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${tab === "shops" ? "is-active" : ""}`}
            onClick={() => setTab("shops")}
          >
            <Store size={18} />
            <span>ตรวจสอบร้านค้าชุมชน</span>
            <span className="badge">{shopsList.length}</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: OVERVIEW & STATS */}
        {/* ========================================================= */}
        {tab === "overview" && (
          <section aria-label="ภาพรวมสถิติ">
            <div className="admin-stats-grid">
              <div className="admin-stat-card">
                <div className="admin-stat-head">
                  <span className="admin-stat-label">ผู้ใช้งานในระบบทั้งหมด</span>
                  <div className="admin-stat-icon">
                    <Users size={22} />
                  </div>
                </div>
                <div className="admin-stat-number">{stats?.users?.total || 0} คน</div>
                <div className="admin-stat-meta">
                  <span>ประชาชน: <strong>{stats?.users?.citizens || 0}</strong></span>
                  <span>ร้านค้า: <strong>{stats?.users?.merchants || 0}</strong></span>
                  <span>เจ้าหน้าที่: <strong>{(stats?.users?.admins || 0) + (stats?.users?.executives || 0)}</strong></span>
                </div>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-head">
                  <span className="admin-stat-label">ร้านค้าชุมชนที่เข้าร่วม</span>
                  <div className="admin-stat-icon green">
                    <Store size={22} />
                  </div>
                </div>
                <div className="admin-stat-number">{stats?.shops?.total || 0} ร้าน</div>
                <div className="admin-stat-meta">
                  <span>เปิดบริการ: <strong style={{ color: "#059669" }}>{stats?.shops?.active || 0}</strong></span>
                  <span>ระงับชั่วคราว: <strong>{stats?.shops?.inactive || 0}</strong></span>
                </div>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-head">
                  <span className="admin-stat-label">ของรางวัลในระบบ</span>
                  <div className="admin-stat-icon gold">
                    <Gift size={22} />
                  </div>
                </div>
                <div className="admin-stat-number">{stats?.rewards?.total || 0} รายการ</div>
                <div className="admin-stat-meta">
                  <span>เปิดให้แลก: <strong style={{ color: "#0044d6" }}>{stats?.rewards?.active || 0}</strong></span>
                  <span>ถูกแลกไปแล้ว: <strong>{stats?.rewards?.redemptionsCount || 0} ครั้ง</strong></span>
                </div>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-head">
                  <span className="admin-stat-label">เงินอุดหนุนคนละครึ่ง (60%)</span>
                  <div className="admin-stat-icon purple">
                    <Receipt size={22} />
                  </div>
                </div>
                <div className="admin-stat-number">
                  ฿{money(stats?.financials?.subsidySpent || 0)}
                </div>
                <div className="admin-stat-meta">
                  <span>ยอดธุรกรรมสะพรั่ง: <strong>฿{money(stats?.financials?.totalVolume || 0)}</strong></span>
                  <span>รวม <strong>{stats?.financials?.transactionCount || 0}</strong> รายการ</span>
                </div>
              </div>
            </div>

            <div className="panel" style={{ padding: 24, background: "#fff", borderRadius: 16 }}>
              <h2 style={{ fontSize: 18, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <HeartHandshake size={20} color="#059669" />
                การมีส่วนร่วมทางสังคมและการบริจาค (Social Impact)
              </h2>
              <p style={{ color: "#61718a", fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>
                ยอดการบริจาคเพื่อสังคมที่เชื่อมโยงกับภารกิจบิงโก 5x5 และโครงการ THAI Please:
              </p>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                <div>
                  <small style={{ color: "#61718a", display: "block" }}>ยอดบริจาครวมผ่าน e-Donation</small>
                  <strong style={{ fontSize: 24, color: "#059669", fontFamily: "Outfit, sans-serif" }}>
                    ฿{money(stats?.financials?.totalDonations || 0)}
                  </strong>
                </div>
                <div>
                  <small style={{ color: "#61718a", display: "block" }}>จำนวนครั้งที่ประชาชนร่วมบริจาค</small>
                  <strong style={{ fontSize: 24, color: "#14264c", fontFamily: "Outfit, sans-serif" }}>
                    {stats?.financials?.donationCount || 0} ครั้ง
                  </strong>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* TAB 2: REWARDS CRUD */}
        {/* ========================================================= */}
        {tab === "rewards" && (
          <section aria-label="จัดการของรางวัล">
            <div className="admin-toolbar">
              <div className="admin-search-box">
                <Search size={16} color="#61718a" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อรางวัล หรือคำอธิบาย..."
                  value={rewardSearch}
                  onChange={(e) => setRewardSearch(e.target.value)}
                />
              </div>

              <div className="admin-filter-group">
                <button
                  type="button"
                  className={`admin-filter-btn ${rewardTypeFilter === "ALL" ? "is-active" : ""}`}
                  onClick={() => setRewardTypeFilter("ALL")}
                >
                  ทั้งหมด ({rewards.length})
                </button>
                <button
                  type="button"
                  className={`admin-filter-btn ${rewardTypeFilter === "COUPON" ? "is-active" : ""}`}
                  onClick={() => setRewardTypeFilter("COUPON")}
                >
                  คูปอง
                </button>
                <button
                  type="button"
                  className={`admin-filter-btn ${rewardTypeFilter === "PHYSICAL" ? "is-active" : ""}`}
                  onClick={() => setRewardTypeFilter("PHYSICAL")}
                >
                  ของที่ระลึก
                </button>
                <button
                  type="button"
                  className={`admin-filter-btn ${rewardTypeFilter === "LUCKY_DRAW" ? "is-active" : ""}`}
                  onClick={() => setRewardTypeFilter("LUCKY_DRAW")}
                >
                  สิทธิ์ชิงโชค
                </button>
                <button
                  type="button"
                  className="button button--primary"
                  onClick={openCreateModal}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, padding: "8px 14px" }}
                >
                  <Plus size={16} /> เพิ่มของรางวัลใหม่
                </button>
              </div>
            </div>

            {filteredRewards.length === 0 ? (
              <div className="empty-state panel" style={{ padding: 40, textAlign: "center", background: "#fff", borderRadius: 16 }}>
                <Gift size={40} color="#94a3b8" />
                <p style={{ marginTop: 12, color: "#61718a" }}>ไม่พบรายการของรางวัลที่ค้นหา</p>
              </div>
            ) : (
              <div className="admin-rewards-grid">
                {filteredRewards.map((reward) => (
                  <article
                    key={reward.rewardId}
                    className={`admin-reward-card ${!reward.isActive ? "is-inactive" : ""}`}
                  >
                    <div className="admin-reward-art">
                      {reward.imageUrl ? (
                        <img src={reward.imageUrl} alt={reward.name} loading="lazy" />
                      ) : (
                        <Gift size={48} color="#94a3b8" />
                      )}
                      <div className="admin-reward-badges">
                        <span className={`status-pill ${reward.isActive ? "active" : "inactive"}`}>
                          {reward.isActive ? "เปิดให้แลก" : "ปิดใช้งาน"}
                        </span>
                        <span className="badge" style={{ background: "#ffffffea", color: "#1e3a8a", border: "1px solid #dce5f3" }}>
                          {reward.rewardType}
                        </span>
                      </div>
                    </div>

                    <div className="admin-reward-body">
                      <h3>{reward.name}</h3>
                      <p>{reward.description || "ไม่มีคำอธิบาย"}</p>
                      <div style={{ fontSize: 12, color: "#61718a" }}>
                        แลกแล้ว <strong>{reward.redemptionsCount}</strong> ครั้ง
                      </div>

                      <div className="admin-reward-footer">
                        <span className="admin-token-pill">
                          <Coins size={16} />
                          {Number(reward.tokenCost).toLocaleString("th-TH")} แต้ม
                        </span>
                        <div className="admin-card-actions">
                          <button
                            type="button"
                            className="admin-action-btn"
                            title={reward.isActive ? "ปิดการใช้งาน" : "เปิดการใช้งาน"}
                            onClick={() => handleToggleReward(reward.rewardId)}
                          >
                            {reward.isActive ? <ToggleRight size={18} color="#059669" /> : <ToggleLeft size={18} />}
                          </button>
                          <button
                            type="button"
                            className="admin-action-btn"
                            title="แก้ไขข้อมูล"
                            onClick={() => openEditModal(reward)}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            className="admin-action-btn delete"
                            title="ลบของรางวัล"
                            onClick={() => handleDeleteReward(reward.rewardId, reward.name)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ========================================================= */}
        {/* TAB 3: USERS DIRECTORY */}
        {/* ========================================================= */}
        {tab === "users" && (
          <section aria-label="ตรวจสอบรายชื่อผู้ใช้งาน">
            <div className="admin-toolbar">
              <div className="admin-search-box">
                <Search size={16} color="#61718a" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ, อีเมล หรือเบอร์โทร..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>

              <div className="admin-filter-group">
                <button
                  type="button"
                  className={`admin-filter-btn ${userRoleFilter === "ALL" ? "is-active" : ""}`}
                  onClick={() => setUserRoleFilter("ALL")}
                >
                  ทั้งหมด ({usersList.length})
                </button>
                <button
                  type="button"
                  className={`admin-filter-btn ${userRoleFilter === "CITIZEN" ? "is-active" : ""}`}
                  onClick={() => setUserRoleFilter("CITIZEN")}
                >
                  ประชาชน
                </button>
                <button
                  type="button"
                  className={`admin-filter-btn ${userRoleFilter === "MERCHANT" ? "is-active" : ""}`}
                  onClick={() => setUserRoleFilter("MERCHANT")}
                >
                  ร้านค้า
                </button>
                <button
                  type="button"
                  className={`admin-filter-btn ${userRoleFilter === "ADMIN" ? "is-active" : ""}`}
                  onClick={() => setUserRoleFilter("ADMIN")}
                >
                  ผู้ดูแลระบบ
                </button>
                <button
                  type="button"
                  className={`admin-filter-btn ${userRoleFilter === "GOV_EXECUTIVE" ? "is-active" : ""}`}
                  onClick={() => setUserRoleFilter("GOV_EXECUTIVE")}
                >
                  ผู้บริหาร
                </button>
              </div>
            </div>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>ชื่อ - นามสกุล</th>
                    <th>บทบาท</th>
                    <th>ติดต่อ (Email / Tel)</th>
                    <th>จังหวัด</th>
                    <th>เงินจำลอง</th>
                    <th>แต้มสะสม</th>
                    <th>ธุรกรรม/บริจาค</th>
                    <th>ร้านค้า</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: "center", padding: 30, color: "#61718a" }}>
                        ไม่พบผู้ใช้งานตามเงื่อนไขที่เลือก
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.userId}>
                        <td style={{ color: "#61718a" }}>#{u.userId}</td>
                        <td>
                          <strong>{u.name}</strong>
                        </td>
                        <td>
                          <span className={`role-badge ${u.role}`}>
                            {ROLE_LABELS[u.role] || u.role}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: 12 }}>{u.email}</div>
                          <div style={{ fontSize: 11, color: "#61718a" }}>{u.phoneNumber}</div>
                        </td>
                        <td>{u.provinceCode || "BKK"}</td>
                        <td>
                          <strong style={{ color: "#0044d6" }}>฿{money(u.demoBalance)}</strong>
                        </td>
                        <td>
                          <span style={{ color: "#b45309", fontWeight: 600 }}>
                            {Number(u.tokenBalance).toLocaleString("th-TH")} แต้ม
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: 12 }}>
                            ช้อป {u.transactionCount} | บริจาค {u.donationCount}
                          </span>
                        </td>
                        <td>{u.shopName ? <span className="badge">{u.shopName}</span> : "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* TAB 4: SHOPS DIRECTORY */}
        {/* ========================================================= */}
        {tab === "shops" && (
          <section aria-label="ตรวจสอบร้านค้าชุมชน">
            <div className="admin-toolbar">
              <div className="admin-search-box">
                <Search size={16} color="#61718a" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อร้านค้า หรือที่อยู่..."
                  value={shopSearch}
                  onChange={(e) => setShopSearch(e.target.value)}
                />
              </div>

              <div className="admin-filter-group">
                <button
                  type="button"
                  className={`admin-filter-btn ${shopCategoryFilter === "ALL" ? "is-active" : ""}`}
                  onClick={() => setShopCategoryFilter("ALL")}
                >
                  ทั้งหมด ({shopsList.length})
                </button>
                <button
                  type="button"
                  className={`admin-filter-btn ${shopCategoryFilter === "FOOD" ? "is-active" : ""}`}
                  onClick={() => setShopCategoryFilter("FOOD")}
                >
                  อาหารและเครื่องดื่ม
                </button>
                <button
                  type="button"
                  className={`admin-filter-btn ${shopCategoryFilter === "RETAIL" ? "is-active" : ""}`}
                  onClick={() => setShopCategoryFilter("RETAIL")}
                >
                  สินค้าทั่วไป
                </button>
              </div>
            </div>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>ชื่อร้านค้า</th>
                    <th>หมวดหมู่</th>
                    <th>เจ้าของร้าน</th>
                    <th>ที่อยู่</th>
                    <th>ยอดขายรวม</th>
                    <th>รัฐอุดหนุน (60%)</th>
                    <th>ออเดอร์</th>
                    <th>สถานะ</th>
                    <th>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShops.length === 0 ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: "center", padding: 30, color: "#61718a" }}>
                        ไม่พบข้อมูลร้านค้าตามเงื่อนไขที่เลือก
                      </td>
                    </tr>
                  ) : (
                    filteredShops.map((shop) => (
                      <tr key={shop.shopId}>
                        <td style={{ color: "#61718a" }}>#{shop.shopId}</td>
                        <td>
                          <strong>{shop.shopName}</strong>
                        </td>
                        <td>
                          <span className="badge" style={{ background: "#edf4ff", color: "#1d4ed8" }}>
                            {shop.category}
                          </span>
                        </td>
                        <td>
                          {shop.owner ? (
                            <div>
                              <div>{shop.owner.name}</div>
                              <small style={{ color: "#61718a" }}>{shop.owner.phoneNumber}</small>
                            </div>
                          ) : (
                            <span style={{ color: "#94a3b8" }}>-</span>
                          )}
                        </td>
                        <td style={{ maxWidth: 200, fontSize: 12, color: "#61718a" }}>
                          {shop.address}
                        </td>
                        <td>
                          <strong style={{ color: "#059669" }}>฿{money(shop.totalSales)}</strong>
                        </td>
                        <td>
                          <span style={{ color: "#0044d6" }}>฿{money(shop.governmentSubsidy)}</span>
                        </td>
                        <td>{shop.transactionCount} รายการ</td>
                        <td>
                          <span className={`status-pill ${shop.isActive ? "active" : "inactive"}`}>
                            {shop.isActive ? "เปิดทำการ" : "ปิดชั่วคราว"}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="button button--secondary"
                            style={{ padding: "4px 8px", fontSize: 11 }}
                            onClick={() => handleToggleShop(shop.shopId)}
                          >
                            {shop.isActive ? "ระงับ" : "เปิด"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* MODAL: ADD / EDIT REWARD */}
        {/* ========================================================= */}
        {modalOpen && (
          <div className="admin-modal-overlay" onClick={() => setModalOpen(false)}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-header">
                <h2>{editingReward ? "แก้ไขของรางวัล" : "เพิ่มของรางวัลใหม่"}</h2>
                <button
                  type="button"
                  className="button button--icon"
                  onClick={() => setModalOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveReward}>
                <div className="admin-modal-body">
                  <div className="admin-form-group">
                    <label htmlFor="reward-name">ชื่อของรางวัล *</label>
                    <input
                      id="reward-name"
                      type="text"
                      required
                      placeholder="เช่น คูปองส่วนลด 100 บาท, ทองคำแท่ง 1 บาท"
                      value={formState.name}
                      onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                    />
                  </div>

                  <div className="admin-form-group">
                    <label htmlFor="reward-type">ประเภทรางวัล *</label>
                    <select
                      id="reward-type"
                      value={formState.reward_type}
                      onChange={(e) => setFormState({ ...formState, reward_type: e.target.value })}
                    >
                      {REWARD_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label} ({t.value})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label htmlFor="reward-cost">แต้มที่ต้องใช้แลก (Impact Tokens) *</label>
                    <input
                      id="reward-cost"
                      type="number"
                      min="1"
                      required
                      value={formState.token_cost}
                      onChange={(e) =>
                        setFormState({ ...formState, token_cost: parseInt(e.target.value, 10) || 1 })
                      }
                    />
                  </div>

                  <div className="admin-form-group">
                    <label htmlFor="reward-image">URL รูปภาพรางวัล (หรือเลือกด้านล่าง)</label>
                    <input
                      id="reward-image"
                      type="text"
                      placeholder="/assets/rewards/gold.jpg หรือลิงก์ภายนอก"
                      value={formState.image_url}
                      onChange={(e) => setFormState({ ...formState, image_url: e.target.value })}
                    />
                    <div className="admin-asset-presets">
                      {PRESET_ASSETS.map((asset) => (
                        <button
                          key={asset.url}
                          type="button"
                          className="admin-asset-chip"
                          onClick={() => setFormState({ ...formState, image_url: asset.url })}
                        >
                          + {asset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="admin-form-group">
                    <label htmlFor="reward-desc">คำอธิบายรายละเอียด</label>
                    <textarea
                      id="reward-desc"
                      rows="3"
                      placeholder="เงื่อนไขการใช้คูปอง หรือคำอธิบายของที่ระลึก..."
                      value={formState.description}
                      onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                    />
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                    <input
                      id="reward-active"
                      type="checkbox"
                      style={{ width: 18, height: 18, cursor: "pointer" }}
                      checked={formState.is_active}
                      onChange={(e) => setFormState({ ...formState, is_active: e.target.checked })}
                    />
                    <label htmlFor="reward-active" style={{ fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
                      เปิดให้ประชาชนแลกรับได้ทันที (Active)
                    </label>
                  </div>
                </div>

                <div className="admin-modal-footer">
                  <button
                    type="button"
                    className="button button--secondary"
                    onClick={() => setModalOpen(false)}
                    disabled={saving}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="button button--primary"
                    disabled={saving}
                  >
                    {saving ? "กำลังบันทึก..." : editingReward ? "บันทึกการแก้ไข" : "เพิ่มของรางวัล"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

