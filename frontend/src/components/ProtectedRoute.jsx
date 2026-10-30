import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>กำลังตรวจสอบข้อมูลสิทธิ์ผู้ใช้งาน...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // Citizen pages make no sense for a shop owner; send them to their shop page.
  if (!allowedRoles && user.role === 'MERCHANT') {
    return <Navigate to="/merchant" replace />;
  }

  return children;
}
