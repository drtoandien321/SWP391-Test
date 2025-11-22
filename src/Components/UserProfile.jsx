import React, { useState, useEffect } from 'react';
import './UserProfile.css';
import { fetchCurrentUserProfile, updateCurrentUserProfile } from '../services/adminApi';

const UserProfile = ({ onClose }) => {
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await fetchCurrentUserProfile();
      setProfile(data);
      setFormData({
        username: data.username || '',
        email: data.email || '',
        phoneNumber: data.phoneNumber || '',
        password: '',
        confirmPassword: ''
      });
      setError('');
    } catch (err) {
      setError('Không thể tải thông tin profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate password if changing
    if (formData.password) {
      if (formData.password !== formData.confirmPassword) {
        setError('Mật khẩu xác nhận không khớp');
        return;
      }
      if (formData.password.length < 6) {
        setError('Mật khẩu phải có ít nhất 6 ký tự');
        return;
      }
    }

    try {
      setSaving(true);
      const updateData = {
        username: formData.username,
        phoneNumber: formData.phoneNumber
      };
      
      // Only include password if user is changing it
      if (formData.password) {
        updateData.password = formData.password;
      }

      const updatedProfile = await updateCurrentUserProfile(updateData);
      setProfile(updatedProfile);
      setSuccess('Cập nhật thông tin thành công!');
      setIsEditing(false);
      
      // Update localStorage
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      localStorage.setItem('userData', JSON.stringify({
        ...userData,
        username: updatedProfile.username,
        phoneNumber: updatedProfile.phoneNumber
      }));
      
      // Clear password fields
      setFormData(prev => ({
        ...prev,
        password: '',
        confirmPassword: ''
      }));
    } catch (err) {
      setError('Không thể cập nhật thông tin. Vui lòng thử lại');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      username: profile?.username || '',
      email: profile?.email || '',
      phoneNumber: profile?.phoneNumber || '',
      password: '',
      confirmPassword: ''
    });
    setError('');
    setSuccess('');
  };

  const getRoleBadgeClass = (roleName) => {
    switch (roleName) {
      case 'Admin':
        return 'role-badge-admin';
      case 'DealerManager':
        return 'role-badge-manager';
      case 'DealerStaff':
        return 'role-badge-staff';
      case 'EVMStaff':
        return 'role-badge-evm';
      default:
        return 'role-badge-default';
    }
  };

  const getRoleDisplayName = (roleName) => {
    const roleMap = {
      'Admin': 'Quản trị viên',
      'DealerManager': 'Quản lý đại lý',
      'DealerStaff': 'Nhân viên đại lý',
      'EVMStaff': 'Nhân viên EVM'
    };
    return roleMap[roleName] || roleName;
  };

  if (loading) {
    return (
      <div className="profile-modal-overlay">
        <div className="profile-modal">
          <div className="profile-loading">
            <div className="spinner"></div>
            <p>Đang tải thông tin...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <button className="profile-close-btn" onClick={onClose}>×</button>
        
        <div className="profile-header">
          <div className="profile-avatar-large">
            {profile?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="profile-header-info">
            <h2>{profile?.username}</h2>
            <span className={`role-badge ${getRoleBadgeClass(profile?.roleName)}`}>
              {getRoleDisplayName(profile?.roleName)}
            </span>
          </div>
        </div>

        {error && (
          <div className="profile-alert profile-alert-error">
            {error}
          </div>
        )}

        {success && (
          <div className="profile-alert profile-alert-success">
            {success}
          </div>
        )}

        <div className="profile-content">
          {!isEditing ? (
            <>
              <div className="profile-section">
                <h3>Thông tin cá nhân</h3>
                <div className="profile-info-grid">
                  <div className="profile-info-item">
                    <div className="info-content">
                      <label>Tên đăng nhập</label>
                      <p>{profile?.username}</p>
                    </div>
                  </div>
                  
                  <div className="profile-info-item">
                    <div className="info-content">
                      <label>Email</label>
                      <p>{profile?.email}</p>
                    </div>
                  </div>
                  
                  <div className="profile-info-item">
                    <div className="info-content">
                      <label>Số điện thoại</label>
                      <p>{profile?.phoneNumber || 'Chưa cập nhật'}</p>
                    </div>
                  </div>
                  
                  <div className="profile-info-item">
                    <div className="info-content">
                      <label>Mật khẩu</label>
                      <div className="password-display">
                        <p>{showPassword ? profile?.password || '••••••••' : '••••••••'}</p>
                        <button 
                          type="button"
                          className="btn-toggle-password"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? '🙈' : '👁️'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {profile?.dealerName && (
                <div className="profile-section">
                  <h3>Thông tin đại lý</h3>
                  <div className="profile-info-grid">
                    <div className="profile-info-item">
                      <div className="info-content">
                        <label>Đại lý</label>
                        <p>{profile?.dealerName}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="profile-section">
                <h3>Thông tin hệ thống</h3>
                <div className="profile-info-grid">
                  <div className="profile-info-item">
                    <div className="info-content">
                      <label>Ngày tạo</label>
                      <p>{new Date(profile?.createdDate).toLocaleDateString('vi-VN')}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="profile-actions">
                <button 
                  className="btn-edit-profile"
                  onClick={() => setIsEditing(true)}
                >
                  Chỉnh sửa thông tin
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="profile-edit-form">
              <div className="profile-section">
                <h3>Chỉnh sửa thông tin</h3>
                
                <div className="form-group">
                  <label htmlFor="username">
                    Tên đăng nhập
                  </label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    disabled={saving}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    disabled
                    className="input-disabled"
                  />
                  <small className="form-hint">Email không thể thay đổi</small>
                </div>

                <div className="form-group">
                  <label htmlFor="phoneNumber">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="0909123456"
                    disabled={saving}
                  />
                </div>

                <div className="form-divider">
                  <span>Đổi mật khẩu (tùy chọn)</span>
                </div>

                <div className="form-group">
                  <label htmlFor="password">
                    Mật khẩu mới
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Để trống nếu không đổi"
                    disabled={saving}
                  />
                  <small className="form-hint">Tối thiểu 6 ký tự</small>
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">
                    Xác nhận mật khẩu
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Nhập lại mật khẩu mới"
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="profile-actions">
                <button 
                  type="button"
                  className="btn-cancel"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  className="btn-save"
                  disabled={saving}
                >
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;

