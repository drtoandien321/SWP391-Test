import React, { useState } from 'react';
import './EVMStaff.css';
import CarManagement from './EVMStaffFeatures/CarManagement';
import UserProfile from './UserProfile';

const EVMStaff = ({ user, onLogout }) => {
  const [activeFeature, setActiveFeature] = useState('product-management');
  const [showProfile, setShowProfile] = useState(false);

  const handleMenuClick = () => {
    setActiveFeature('product-management');
  };

  const renderMainContent = () => {
    return <div className="feature-content"><h3>Quản lý xe</h3><p>Chức năng quản lý xe sẽ được phát triển...</p></div>;
  };

  return (
    <div className="evmstaff-layout">
      <header className="evmstaff-header">
        <div className="header-left">
          <h1>EV Dealer Management System - EVM Staff</h1>
        </div>
        <div className="header-right">
          <div className="user-info" onClick={() => setShowProfile(true)}>
            <div className="user-avatar">
              {user.name ? user.name.charAt(0) : user.username.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <span className="user-name">{user.name || user.username}</span>
              <span className="user-role">Nhân viên hãng xe</span>
            </div>
          </div>
          <button onClick={onLogout} className="logout-button">
            Đăng xuất
          </button>
        </div>
      </header>
      <main className="evmstaff-content">
        <CarManagement />
      </main>
      
      {showProfile && <UserProfile onClose={() => setShowProfile(false)} />}
    </div>
  );
};

export default EVMStaff;
