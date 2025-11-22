import React from 'react';
import './Home-page.css';

const HomePage = ({ onMenuClick }) => {
  const quickFeatures = [
    {
      id: 'vehicle-info',
      title: 'Truy vấn thông tin xe',
      description: 'Xem danh mục xe điện, thông số kỹ thuật'
    },
    {
      id: 'create-order',
      title: 'Tạo đơn hàng',
      description: 'Lập đơn hàng mới, tính toán giá'
    },
    {
      id: 'payment',
      title: 'Đơn hàng & Thanh toán',
      description: 'Xử lý thanh toán và hóa đơn'
    },
    
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

export default HomePage;