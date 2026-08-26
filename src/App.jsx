import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/layout/Navbar';
import MobileNav from './components/layout/MobileNav';
import Footer from './components/layout/Footer';

import HomePage from './pages/HomePage';
import BrowsePage from './pages/BrowsePage';
import BookDetailPage from './pages/BookDetailPage';
import SellBookPage from './pages/SellBookPage';
import ExchangePage from './pages/ExchangePage';
import DonatePage from './pages/DonatePage';
import RequestsPage from './pages/RequestsPage';
import OrdersPage from './pages/OrdersPage';
import MessagesPage from './pages/MessagesPage';
import WishlistPage from './pages/WishlistPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboardPage from './pages/AdminDashboardPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <SocketProvider>
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
              <Navbar />
              <main style={{ flex: 1 }}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/browse" element={<BrowsePage />} />
                  <Route path="/books/:id" element={<BookDetailPage />} />
                  <Route path="/sell" element={<SellBookPage />} />
                  <Route path="/exchanges" element={<ExchangePage />} />
                  <Route path="/donations" element={<DonatePage />} />
                  <Route path="/requests" element={<RequestsPage />} />
                  <Route path="/orders" element={<OrdersPage />} />
                  <Route path="/messages" element={<MessagesPage />} />
                  <Route path="/wishlist" element={<WishlistPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/admin" element={<AdminDashboardPage />} />
                </Routes>
              </main>
              <Footer />
              <MobileNav />
            </div>
          </SocketProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
