import React, { useState, useEffect } from 'react';
import './Notification.css';

const Notification = ({ message, type = 'info', duration = 4000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, 300);
  };

  if (!isVisible) return null;

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  const titles = {
    success: 'Thành công',
    error: 'Lỗi',
    warning: 'Cảnh báo',
    info: 'Thông báo'
  };

  return (
    <div className={`notification notification-${type} ${isExiting ? 'notification-exit' : ''}`}>
      <div className="notification-icon">
        {icons[type]}
      </div>
      <div className="notification-content">
        <div className="notification-title">{titles[type]}</div>
        <div className="notification-message">{message}</div>
      </div>
      <button className="notification-close" onClick={handleClose}>
        ×
      </button>
      <div className="notification-progress">
        <div 
          className="notification-progress-bar" 
          style={{ animationDuration: `${duration}ms` }}
        ></div>
      </div>
    </div>
  );
};

const NotificationContainer = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Lắng nghe event để thêm notification
    const handleShowNotification = (event) => {
      const { message, type, duration } = event.detail;
      const id = Date.now();
      
      setNotifications(prev => [...prev, { id, message, type, duration }]);
    };

    window.addEventListener('showNotification', handleShowNotification);

    return () => {
      window.removeEventListener('showNotification', handleShowNotification);
    };
  }, []);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  return (
    <div className="notification-container">
      {notifications.map(notif => (
        <Notification
          key={notif.id}
          message={notif.message}
          type={notif.type}
          duration={notif.duration}
          onClose={() => removeNotification(notif.id)}
        />
      ))}
    </div>
  );
};

// Helper function để hiển thị notification từ bất kỳ đâu
export const showNotification = (message, type = 'info', duration = 4000) => {
  const event = new CustomEvent('showNotification', {
    detail: { message, type, duration }
  });
  window.dispatchEvent(event);
};

export { Notification, NotificationContainer };
export default NotificationContainer;
