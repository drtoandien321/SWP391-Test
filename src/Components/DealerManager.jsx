
import React, { useState, useEffect } from 'react';
import './DealerManager.css';
import DealerCarManagement from '../ManagerFeatures/DealerCarManagement';
import OrderManagement from '../ManagerFeatures/OrderManagement';
import Dashboard from '../ManagerFeatures/Dashboard';
import PromotionManagement from '../ManagerFeatures/PromotionManagement';
import UserProfile from './UserProfile';
import { fetchMyDealerInfo } from '../services/adminApi';
import HomePageManager from '../ManagerFeatures/HomePageManager';

const DealerManager = ({ user, onLogout }) => {
  // Get initial route from URL hash
  const getInitialRoute = () => {
    const hash = window.location.hash.slice(1); // Remove the '#'
    return hash || 'home';
  };

  const [activeFeature, setActiveFeature] = useState(getInitialRoute());
  const [dealerInfo, setDealerInfo] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  useEffect(() => {
    const loadDealerInfo = async () => {
      try {
        const data = await fetchMyDealerInfo();
        setDealerInfo(data);
      } catch (error) {
        // Silently fail
      }
    };
    loadDealerInfo();
  }, []);

  const handleMenuClick = (featureId) => {
    setActiveFeature(featureId);
    // Update URL hash
    window.location.hash = featureId;
  };

  // Listen to hash changes (browser back/forward)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash) {
        setActiveFeature(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const renderMainContent = () => {
    switch (activeFeature) {
      case 'home':
        return <HomePageManager onMenuClick={handleMenuClick} />;
      case 'car-management':
        return <DealerCarManagement />;
      case 'order-management':
        return <OrderManagement />;
      case 'dashboard':
        return <Dashboard />;
      case 'promotion-management':
        return <PromotionManagement />;
      default:
        return <HomePageManager onMenuClick={handleMenuClick} />;
    }
  };

  return (
    <div className="new-dealer-manager-layout">
      <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? 'Mở sidebar' : 'Đóng sidebar'}
          >
            ☰
          </button>
        </div>
        <nav className="sidebar-menu">
          <div
            className={`menu-item ${activeFeature === 'home' ? 'active' : ''}`}
            onClick={() => handleMenuClick('home')}
            title="Trang chủ"
          >
            <span className="menu-text">Trang chủ</span>
          </div>
          <div
            className={`menu-item ${activeFeature === 'car-management' ? 'active' : ''}`}
            onClick={() => handleMenuClick('car-management')}
            title="Quản lý xe cho đại lý"
          >
            <span className="menu-text">Quản lý xe cho đại lý</span>
          </div>
          <div
            className={`menu-item ${activeFeature === 'order-management' ? 'active' : ''}`}
            onClick={() => handleMenuClick('order-management')}
            title="Quản lý đơn hàng"
          >
            <span className="menu-text">Quản lý đơn hàng</span>
          </div>
          <div
            className={`menu-item ${activeFeature === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleMenuClick('dashboard')}
            title="Dashboard"
          >
            <span className="menu-text">Dashboard</span>
          </div>
          <div
            className={`menu-item ${activeFeature === 'promotion-management' ? 'active' : ''}`}
            onClick={() => handleMenuClick('promotion-management')}
            title="Quản lý khuyến mãi"
          >
            <span className="menu-text">Quản lý khuyến mãi</span>
          </div>
        </nav>
      </div>
      <div className="main-content">
        <header className="top-header">
          <div className="header-left">
            <h1>
              EV Dealer Management{user.dealerName ? ` - ${user.dealerName}` : ''}
            </h1>
          </div>
          <div className="header-right">
            <div className="user-info" onClick={() => setShowProfile(true)}>
              <div className="user-avatar">
                {user.name ? user.name.charAt(0) : user.username.charAt(0).toUpperCase()}
              </div>
              <div className="user-details">
                <span className="user-name">{user.name || user.username}</span>
                <span className="user-role">Quản lý đại lý</span>
                
              </div>
            </div>
            <button onClick={onLogout} className="logout-button">
              Đăng xuất
            </button>
          </div>
        </header>
        <div className="content-wrapper">
          <main className="content-area">
            {renderMainContent()}
          </main>
          <footer className="dealer-footer">
            <div className="footer-content">
              <div className="footer-column">
                <span className="footer-label">Đại lý:</span>
                <span className="footer-value">{dealerInfo?.dealerName || 'Đang tải...'}</span>
              </div>
              <div className="footer-column">
                <span className="footer-label">Địa chỉ:</span>
                <span className="footer-value">{dealerInfo?.address || 'Đang tải...'}</span>
              </div>
              <div className="footer-column">
                <span className="footer-label">Điện thoại:</span>
                <span className="footer-value">{dealerInfo?.phone || 'Đang tải...'}</span>
              </div>
              <div className="footer-column">
                <span className="footer-label">Email:</span>
                <span className="footer-value">{dealerInfo?.email || 'Đang tải...'}</span>
              </div>
            </div>
            <div className="footer-bottom">
              <p>© 2025 EV Dealer Management System. All rights reserved.</p>
            </div>
          </footer>
        </div>
      </div>
      {showProfile && <UserProfile onClose={() => setShowProfile(false)} />}
    </div>
  );
}

export default DealerManager;
