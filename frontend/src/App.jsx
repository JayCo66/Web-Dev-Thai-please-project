import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Charities from './pages/Charities';
import CharityDashboard from './pages/CharityDashboard';
import Payment from './pages/Payment';
import ThaiPlus from './pages/ThaiPlus';
import Bingo from './pages/Bingo';
import Profile from './pages/Profile';
import "./styles/thai-plus-theme.css";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/charities"
            element={
              <ProtectedRoute>
                <Charities />
              </ProtectedRoute>
            }
          />
          <Route path="/charities/dashboard" element={<ProtectedRoute><CharityDashboard /></ProtectedRoute>} />
          <Route
            path="/payment"
            element={
              <ProtectedRoute>
                <Payment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/plus"
            element={
              <ProtectedRoute>
                <ThaiPlus />
              </ProtectedRoute>
            }
          />
          <Route
            path="/thai-plus"
            element={
              <ProtectedRoute>
                <ThaiPlus />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rewards"
            element={
              <ProtectedRoute>
                <ThaiPlus />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bingo"
            element={
              <ProtectedRoute>
                <Bingo />
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
