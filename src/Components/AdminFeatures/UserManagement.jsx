import React, { useEffect, useState } from "react";
import "./UserManagement.css";
import { fetchAllUsers, searchUsers, searchUsersByRole, searchUsersByDealer, searchUsersByRoleAndDealer, deleteUserAccount } from "../../services/adminApi";
import { createUserAccount, fetchDealerNames, fetchRoleNames, updateUserAccount } from "../../services/adminApi";
import { showNotification } from '../Notification';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchRole, setSearchRole] = useState("");
  const [searchDealer, setSearchDealer] = useState("");
  const [searching, setSearching] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    email: "",
    phoneNumber: "",
    roleName: "DealerStaff",
    dealerName: ""
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [dealerNames, setDealerNames] = useState([]);
  const [roleNames, setRoleNames] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [updateUser, setUpdateUser] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState("");

  // Confirm dialog states
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'Xác nhận',
    cancelText: 'Hủy',
    type: 'warning'
  });

  // Show custom confirm dialog
  const showConfirm = (title, message, onConfirm, type = 'warning') => {
    setConfirmConfig({
      title,
      message,
      onConfirm,
      confirmText: 'Xác nhận',
      cancelText: 'Hủy',
      type
    });
    setShowConfirmDialog(true);
  };

  const handleConfirmClose = () => {
    setShowConfirmDialog(false);
    setConfirmConfig({
      title: '',
      message: '',
      onConfirm: null,
      confirmText: 'Xác nhận',
      cancelText: 'Hủy',
      type: 'warning'
    });
  };

  const handleConfirmAction = () => {
    if (confirmConfig.onConfirm) {
      confirmConfig.onConfirm();
    }
    handleConfirmClose();
  };

  const handleDeleteUser = async (userId) => {
    showConfirm(
      'Xác nhận xóa tài khoản',
      'Bạn có chắc chắn muốn xóa tài khoản này?',
      async () => {
        try {
          await deleteUserAccount(userId);
          showNotification("Xóa tài khoản thành công!", "success");
          const updatedUsers = await fetchAllUsers();
          setUsers(updatedUsers);
        } catch (err) {
          showNotification("Xóa tài khoản thất bại!", "error");
        }
      },
      'error'
    );
  };




  useEffect(() => {
    fetchAllUsers()
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    // Lấy danh sách tên đại lý
    fetchDealerNames()
      .then(setDealerNames)
      .catch(() => setDealerNames([]));
    // Lấy danh sách role
    fetchRoleNames()
      .then(setRoleNames)
      .catch(() => setRoleNames([]));
  }, []);

  // Search handler for text, role, and dealer
  const handleSearch = async (e) => {
    e.preventDefault();
    setSearching(true);
    try {
      let result = [];
      if (searchRole && searchDealer) {
        // Search by both role and dealer
        result = await searchUsersByRoleAndDealer(searchRole, searchDealer);
      } else if (searchRole) {
        result = await searchUsersByRole(searchRole);
      } else if (searchDealer) {
        result = await searchUsersByDealer(searchDealer);
      } else if (search.trim()) {
        result = await searchUsers(search.trim());
      } else {
        result = await fetchAllUsers();
      }
      setUsers(result);
    } catch {
      setUsers([]);
    }
    setSearching(false);
  };

  // Reset search filters and reload all users
  const handleResetSearch = async () => {
    setSearch("");
    setSearchRole("");
    setSearchDealer("");
    setSearching(true);
    try {
      const allUsers = await fetchAllUsers();
      setUsers(allUsers);
    } catch {
      setUsers([]);
    }
    setSearching(false);
  };

  // Xử lý tạo tài khoản mới
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    
    // Validate phone number
    if (newUser.phoneNumber && newUser.phoneNumber.length !== 10) {
      setCreateError("Số điện thoại phải có đúng 10 chữ số");
      setCreating(false);
      return;
    }
    
    // Validate phone number contains only digits
    if (newUser.phoneNumber && !/^\d{10}$/.test(newUser.phoneNumber)) {
      setCreateError("Số điện thoại chỉ được chứa số và phải có đúng 10 chữ số");
      setCreating(false);
      return;
    }
    
    try {
      await createUserAccount(newUser);
      // Sau khi tạo thành công, load lại danh sách user
      const updatedUsers = await fetchAllUsers();
      setUsers(updatedUsers);
      // Reset form
      setNewUser({
        username: "",
        password: "",
        email: "",
        phoneNumber: "",
        roleName: "DealerStaff",
        dealerName: ""
      });
      showNotification("Tạo tài khoản thành công!", "success");
      setShowCreateForm(false);
    } catch (err) {
      const errorMessage = err.message || err.toString();
      const lowerErrorMessage = errorMessage.toLowerCase();
      
      if (errorMessage.includes("Phone number must be exactly 10 digits")) {
        setCreateError("Số điện thoại phải có đúng 10 chữ số");
      } else if (lowerErrorMessage.includes("email already exists")) {
        setCreateError("Email đã tồn tại trong hệ thống");
      } else if (lowerErrorMessage.includes("phone number already exists")) {
        setCreateError("Số điện thoại đã tồn tại trong hệ thống");
      } else if (lowerErrorMessage.includes("email") && lowerErrorMessage.includes("already")) {
        setCreateError("Email đã tồn tại trong hệ thống");
      } else if (lowerErrorMessage.includes("phone") && lowerErrorMessage.includes("already")) {
        setCreateError("Số điện thoại đã tồn tại trong hệ thống");
      } else if (errorMessage === "Failed to create user") {
        setCreateError("Tạo tài khoản thất bại. Email hoặc số điện thoại có thể đã tồn tại.");
      } else {
        setCreateError(errorMessage);
      }
    }
    setCreating(false);
  };

  // Hiển thị form cập nhật user
  const handleShowUpdateForm = (user) => {
    setUpdateUser({ ...user });
    setShowUpdateForm(true);
    setUpdateError("");
  };

  const handleUpdateUserChange = (field, value) => {
    setUpdateUser((prev) => ({ ...prev, [field]: value }));
  };

  // Xử lý cập nhật user
  const handleUpdateUserSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setUpdateError("");
    
    // Validate phone number
    if (updateUser.phoneNumber && updateUser.phoneNumber.length !== 10) {
      setUpdateError("Số điện thoại phải có đúng 10 chữ số");
      setUpdating(false);
      return;
    }
    
    // Validate phone number contains only digits
    if (updateUser.phoneNumber && !/^\d{10}$/.test(updateUser.phoneNumber)) {
      setUpdateError("Số điện thoại chỉ được chứa số và phải có đúng 10 chữ số");
      setUpdating(false);
      return;
    }
    
    try {
      await updateUserAccount(updateUser.userId, {
        username: updateUser.username,
        password: updateUser.password,
        email: updateUser.email,
        phoneNumber: updateUser.phoneNumber,
        roleName: updateUser.roleName,
        dealerName: updateUser.dealerName,
        status: updateUser.status
      });
      // Sau khi cập nhật thành công, load lại danh sách user
      const updatedUsers = await fetchAllUsers();
      setUsers(updatedUsers);
      setShowUpdateForm(false);
      showNotification("Cập nhật tài khoản thành công!", "success");
    } catch (err) {
      const errorMessage = err.message || err.toString();
      const lowerErrorMessage = errorMessage.toLowerCase();
      
      if (errorMessage.includes("Phone number must be exactly 10 digits")) {
        setUpdateError("Số điện thoại phải có đúng 10 chữ số");
      } else if (lowerErrorMessage.includes("email already exists")) {
        setUpdateError("Email đã tồn tại trong hệ thống");
      } else if (lowerErrorMessage.includes("phone number already exists")) {
        setUpdateError("Số điện thoại đã tồn tại trong hệ thống");
      } else if (lowerErrorMessage.includes("email") && lowerErrorMessage.includes("already")) {
        setUpdateError("Email đã tồn tại trong hệ thống");
      } else if (lowerErrorMessage.includes("phone") && lowerErrorMessage.includes("already")) {
        setUpdateError("Số điện thoại đã tồn tại trong hệ thống");
      } else if (errorMessage === "Failed to update user") {
        setUpdateError("Cập nhật tài khoản thất bại. Email hoặc số điện thoại có thể đã tồn tại.");
      } else {
        setUpdateError(errorMessage);
      }
    }
    setUpdating(false);
  };

  // Toggle password visibility for a user
  const handleTogglePassword = (userId) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  return (
    <div className="user-management-container">
      <h2>Quản lý tài khoản</h2>
      <div className="search-create-row">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="search-role-select min-width-140"
            value={searchRole}
            onChange={async e => {
              const value = e.target.value;
              setSearchRole(value);
              setSearching(true);
              try {
                let result = [];
                if (value && searchDealer) {
                  result = await searchUsersByRoleAndDealer(value, searchDealer);
                } else if (value) {
                  result = await searchUsersByRole(value);
                } else if (searchDealer) {
                  result = await searchUsersByDealer(searchDealer);
                } else {
                  result = await fetchAllUsers();
                }
                setUsers(result);
              } catch {
                setUsers([]);
              }
              setSearching(false);
            }}
          >
            <option value="">Tất cả vai trò</option>
            {roleNames.map(role => (
              <option key={role.roleId} value={role.roleName}>{role.roleName}</option>
            ))}
          </select>
          <select
            className="search-dealer-select min-width-140"
            value={searchDealer}
            onChange={async e => {
              const value = e.target.value;
              setSearchDealer(value);
              setSearching(true);
              try {
                let result = [];
                if (searchRole && value) {
                  result = await searchUsersByRoleAndDealer(searchRole, value);
                } else if (value) {
                  result = await searchUsersByDealer(value);
                } else if (searchRole) {
                  result = await searchUsersByRole(searchRole);
                } else {
                  result = await fetchAllUsers();
                }
                setUsers(result);
              } catch {
                setUsers([]);
              }
              setSearching(false);
            }}
          >
            <option value="">Tất cả đại lý</option>
            {dealerNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <button type="submit">
            Tìm kiếm
          </button>
          <button
            type="button"
            className="reset-search-btn"
            onClick={handleResetSearch}
          >
            Làm mới
          </button>
        </form>
        <button
          type="button"
          className="create-user-toggle-btn"
          onClick={() => setShowCreateForm((prev) => !prev)}
        >
          {showCreateForm ? "Đóng" : "Tạo tài khoản mới"}
        </button>
      </div>
      {showCreateForm && (
        <div className="user-modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="create-user-modal" onClick={e => e.stopPropagation()}>
            <div className="create-user-modal-header">
              <h3>Tạo tài khoản mới</h3>
              <button className="create-user-modal-close" type="button" onClick={() => setShowCreateForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateUser} className="create-user-form" autoComplete="off">
              <div className="form-row">
                <div className="form-group">
                  <input type="text" required autoComplete="new-username" placeholder="Tên người dùng" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} />
                </div>
                <div className="form-group">
                  <input type="password" required autoComplete="new-password" placeholder="Mật khẩu (ít nhất 6 ký tự)" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                </div>
                <div className="form-group">
                  <input type="email" required autoComplete="off" placeholder="Email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <input type="text" required autoComplete="off" placeholder="Số điện thoại" value={newUser.phoneNumber} onChange={e => setNewUser({ ...newUser, phoneNumber: e.target.value })} />
                </div>
                <div className="form-group">
                  <select required value={newUser.roleName} onChange={e => setNewUser({ ...newUser, roleName: e.target.value })}>
                    <option value="">Chọn vai trò...</option>
                    {roleNames.map(role => (
                      <option key={role.roleId} value={role.roleName}>{role.roleName}</option>
                    ))}
                  </select>
                </div>
                {(newUser.roleName === "DealerStaff" || newUser.roleName === "DealerManager") ? (
                  <div className="form-group">
                    <select
                      required
                      value={newUser.dealerName}
                      onChange={e => setNewUser({ ...newUser, dealerName: e.target.value })}
                    >
                      <option value="">Chọn đại lý...</option>
                      {dealerNames.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
              <button type="submit" disabled={creating} className="create-user-submit-btn">
                {creating ? "Đang tạo..." : "Tạo tài khoản"}
              </button>
              {createError && <div className="error-message">{createError}</div>}
            </form>
          </div>
        </div>
      )}

      {/* Modal cập nhật user */}
      {showUpdateForm && updateUser && (
        <div className="user-modal-overlay" onClick={() => setShowUpdateForm(false)}>
          <div className="create-user-modal" onClick={e => e.stopPropagation()}>
            <div className="create-user-modal-header">
              <h3>Cập nhật tài khoản</h3>
              <button className="create-user-modal-close" type="button" onClick={() => setShowUpdateForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleUpdateUserSubmit} className="create-user-form" autoComplete="off">
              <div className="form-row">
                <div className="form-group">
                  <input type="text" required placeholder="Tên người dùng" value={updateUser.username} onChange={e => handleUpdateUserChange("username", e.target.value)} />
                </div>
                <div className="form-group">
                  <input type="password" required placeholder="Mật khẩu" value={updateUser.password} onChange={e => handleUpdateUserChange("password", e.target.value)} />
                </div>
                <div className="form-group">
                  <input type="email" required placeholder="Email" value={updateUser.email} onChange={e => handleUpdateUserChange("email", e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <input type="text" required placeholder="Số điện thoại" value={updateUser.phoneNumber} onChange={e => handleUpdateUserChange("phoneNumber", e.target.value)} />
                </div>
                <div className="form-group">
                  <select required value={updateUser.roleName} onChange={e => handleUpdateUserChange("roleName", e.target.value)}>
                    <option value="">Chọn vai trò...</option>
                    {roleNames.map(role => (
                      <option key={role.roleId} value={role.roleName}>{role.roleName}</option>
                    ))}
                  </select>
                </div>
                {(updateUser.roleName === "DealerStaff" || updateUser.roleName === "DealerManager") ? (
                  <div className="form-group">
                    <select
                      required
                      value={updateUser.dealerName}
                      onChange={e => handleUpdateUserChange("dealerName", e.target.value)}
                    >
                      <option value="">Chọn đại lý...</option>
                      {dealerNames.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <div className="form-group">
                  <select required value={updateUser.status} onChange={e => handleUpdateUserChange("status", e.target.value)}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <button type="submit" disabled={updating} className="create-user-submit-btn">
                {updating ? "Đang cập nhật..." : "Cập nhật"}
              </button>
              {updateError && <div className="error-message">{updateError}</div>}
            </form>
          </div>
        </div>
      )}

      {(loading || searching) ? (
        <p>Đang tải dữ liệu...</p>
      ) : (
        <table className="user-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên người dùng</th>
              <th>Email</th>
              <th>Mật khẩu</th>
              <th>Số điện thoại</th>
              <th>Vai trò</th>
              <th>Đại lý</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={10} className="user-table-no-data">Không có dữ liệu</td></tr>
            ) : (
              users.map((user) => (
                <tr key={user.userId}>
                  <td>{user.userId}</td>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>
                    {user.password ? (
                      <span>
                        {visiblePasswords[user.userId] ? user.password : "••••••••"}
                        <button
                          type="button"
                          className="toggle-password-btn"
                          onClick={() => handleTogglePassword(user.userId)}
                        >
                          {visiblePasswords[user.userId] ? "Ẩn" : "Hiện"}
                        </button>
                      </span>
                    ) : ""}
                  </td>
                  <td>{user.phoneNumber}</td>
                  <td>{user.roleName}</td>
                  <td>{user.dealerName || "-"}</td>
                  <td>{user.status}</td>
                  <td>{new Date(user.createdDate).toLocaleString()}</td>
                  <td>
                    <div className="user-action-btns">
                      <button type="button" className="update-user-btn" onClick={() => handleShowUpdateForm(user)}>Cập nhật</button>
                      <button type="button" className="delete-user-btn" onClick={() => handleDeleteUser(user.userId)}>Xóa</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* Custom Confirm Dialog */}
      {showConfirmDialog && (
        <div className="modal-overlay" onClick={handleConfirmClose}>
          <div className="modal-content confirm-dialog-modal" onClick={e => e.stopPropagation()}>
            <div className={`confirm-dialog-header confirm-${confirmConfig.type}`}>
              <div className="confirm-icon">
                {confirmConfig.type === 'success' && '✓'}
                {confirmConfig.type === 'warning' && '⚠'}
                {confirmConfig.type === 'error' && '✕'}
                {confirmConfig.type === 'info' && 'ℹ'}
              </div>
              <h3>{confirmConfig.title}</h3>
            </div>

            <div className="confirm-dialog-body">
              <p className="confirm-message-text">{confirmConfig.message}</p>
            </div>

            <div className="confirm-dialog-footer">
              <button
                className="btn-confirm-cancel"
                onClick={handleConfirmClose}
              >
                {confirmConfig.cancelText}
              </button>
              <button
                className={`btn-confirm-action confirm-${confirmConfig.type}`}
                onClick={handleConfirmAction}
              >
                {confirmConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;