import React, { useState, createContext, useContext, useEffect } from 'react';
import './DealerStaff.css';
import HomePage from './Features/Home-page';
import VehicleInfoFeature from './Features/VehicleInfoFeature';
import CreateOrderFeature from './Features/CreateOrderFeature';
import OrderFeatureManagementPayment from './Features/OrderFeatureManagement&Payment';
import UserProfile from './UserProfile';
import { fetchMyDealerInfo } from '../services/adminApi';

const TestDriveContext = createContext();

export const useTestDrive = () => {
  const context = useContext(TestDriveContext);
  if (!context) {
    throw new Error('useTestDrive must be used within TestDriveProvider');
  }
  return context;
};

const DealerStaff = ({ user, onLogout }) => {
  // Get initial route from URL hash
  const getInitialRoute = () => {
    const hash = window.location.hash.slice(1); // Remove the '#'
    return hash || 'home';
  };

  const [activeFeature, setActiveFeature] = useState(getInitialRoute());
  const [testDriveBookings, setTestDriveBookings] = useState([]);
  const [quoteRequests, setQuoteRequests] = useState([]);
  const [dealerInfo, setDealerInfo] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [createOrderKey, setCreateOrderKey] = useState(0); // Key để force re-mount CreateOrderFeature

  useEffect(() => {
    const loadDealerInfo = async () => {
      try {
        const data = await fetchMyDealerInfo();
        setDealerInfo(data);
      } catch (error) {
        console.error('Error loading dealer info:', error);
      }
    };
    loadDealerInfo();
  }, []);

  const addTestDriveBooking = (booking) => {
    const newBooking = {
      id: `TD${String(testDriveBookings.length + 1).padStart(3, '0')}`,
      ...booking,
      status: 'Chờ xác nhận',
      createdDate: new Date().toISOString().split('T')[0]
    };
    setTestDriveBookings(prev => [...prev, newBooking]);
  };

  const addQuoteRequest = (request) => {
    const newRequest = {
      id: `YC${String(quoteRequests.length + 1).padStart(3, '0')}`,
      ...request,
      status: 'Chờ xử lý',
      createdDate: new Date().toISOString().split('T')[0]
    };
    setQuoteRequests(prev => [...prev, newRequest]);
  };

  const updateTestDriveStatus = (id, newStatus) => {
    setTestDriveBookings(prev => 
      prev.map(booking => 
        booking.id === id ? { ...booking, status: newStatus } : booking
      )
    );
  };

  const updateQuoteStatus = (id, newStatus) => {
    setQuoteRequests(prev => 
      prev.map(request => 
        request.id === id ? { ...request, status: newStatus } : request
      )
    );
  };

  const handleMenuClick = (featureId) => {
    setActiveFeature(featureId);
    // Update URL hash
    window.location.hash = featureId;
    
    // Force re-mount CreateOrderFeature khi chuyển đến create-order
    if (featureId === 'create-order') {
      setCreateOrderKey(prev => prev + 1);
    }
  };

  // Listen to hash changes (browser back/forward)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash) {
        setActiveFeature(hash);
        
        // Force re-mount CreateOrderFeature khi hash change đến create-order
        if (hash === 'create-order') {
          setCreateOrderKey(prev => prev + 1);
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const renderMainContent = () => {
    switch (activeFeature) {
      case 'home':
        return <HomePage key="home" onMenuClick={handleMenuClick} />;
      case 'vehicle-info':
        return <VehicleInfoFeature key="vehicle-info" />;
      case 'create-order':
        return <CreateOrderFeature key={`create-order-${createOrderKey}`} />;
      case 'payment':
        return <OrderFeatureManagementPayment key="payment" />;
      default:
        return <HomePage key="home-default" onMenuClick={handleMenuClick} />;
    }
  };

  return (
    <TestDriveContext.Provider value={{ 
      testDriveBookings, 
      addTestDriveBooking, 
      updateTestDriveStatus,
      quoteRequests,
      addQuoteRequest,
      updateQuoteStatus 
    }}>
      <div className="new-dealer-staff-layout">
        {/* Sidebar bên trái */}
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
              className={`menu-item ${activeFeature === 'vehicle-info' ? 'active' : ''}`}
              onClick={() => handleMenuClick('vehicle-info')}
              title="Truy vấn thông tin xe"
            >
              <span className="menu-text">Truy vấn thông tin xe</span>
            </div>
            
            <div 
              className={`menu-item ${activeFeature === 'create-order' ? 'active' : ''}`}
              onClick={() => handleMenuClick('create-order')}
              title="Tạo đơn hàng"
            >
              <span className="menu-text">Tạo đơn hàng</span>
            </div>
            
            <div 
              className={`menu-item ${activeFeature === 'payment' ? 'active' : ''}`}
              onClick={() => handleMenuClick('payment')}
              title="Quản lý Đơn hàng & Thanh toán"
            >
              <span className="menu-text">Đơn hàng & Thanh toán</span>
            </div>
          </nav>
        </div>

        {/* Main content bên phải */}
        <div className="main-content">
          {/* Header */}
          <header className="top-header">
            <div className="header-left">
              <h1>EV Dealer Management - {user.dealerName}</h1>
            </div>
            
            <div className="header-right">
              <div className="user-info" onClick={() => setShowProfile(true)}>
                <div className="user-avatar">
                  {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="user-details">
                  <span className="user-name">{user.username}</span>
                  <span className="user-role">Nhân viên đại lý</span>
                </div>
              </div>
              <button onClick={onLogout} className="logout-button">
                Đăng xuất
              </button>
            </div>
          </header>

          {/* Content area with footer */}
          <div className="content-wrapper">
            <main className="content-area">
              {renderMainContent()}
            </main>

            {/* Footer */}
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
      </div>
      {showProfile && <UserProfile onClose={() => setShowProfile(false)} />}
    </TestDriveContext.Provider>
  );
};

export default DealerStaff;