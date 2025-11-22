import React from 'react';
import './HomePageManager.css';

const HomePageManager = ({ onMenuClick }) => {
  const quickFeatures = [
    {
      id: 'car-management',
      title: 'Quản lý xe cho đại lý',
      description: 'Quản lý thông tin xe, cập nhật giá và trạng thái'
    },
    {
      id: 'order-management',
      title: 'Quản lý đơn hàng',
      description: 'Theo dõi và quản lý các đơn hàng của đại lý'
    },
    {
      id: 'dashboard',
      title: 'Dashboard',
      description: 'Xem thống kê doanh thu, lợi nhuận'
    },
    {
      id: 'promotion-management',
      title: 'Quản lý khuyến mãi',
      description: 'Tạo và quản lý các chương trình khuyến mãi'
    }
  ];

  return (
    <div className="home-page">
      {/* Local Video Section */}
      <div className="video-section">
        <div className="video-container">
          <video 
            width="100%" 
            height="100%" 
            autoPlay 
            muted 
            loop 
            playsInline
            controls={false}
            className="local-video"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentElement.classList.add('video-error');
            }}
          >
            <source src="/video-banner/videoplayback.mp4" type="video/mp4" />
            <div className="video-fallback">Video không thể tải</div>
          </video>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="dashboard-content">
        {/* Features Overview */}
        <div className="features-overview">
          <h4>Chức năng chính</h4>
          <div className="feature-quick-access">
            {quickFeatures.map((feature) => (
              <div 
                key={feature.id}
                className="quick-feature-card" 
                onClick={() => onMenuClick(feature.id)}
              >
                <div className="quick-feature-content">
                  <h5>{feature.title}</h5>
                  <p>{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePageManager;
