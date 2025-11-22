const API_BASE_URL = 'http://localhost:8080/api';
const getAuthToken = () => {
  return localStorage.getItem('token');
};

export const getCurrentUser = () => {
  const userDataStr = localStorage.getItem('userData');
  if (!userDataStr) return null;
  try {
    return JSON.parse(userDataStr);
  } catch (error) {
    return null;
  }
};

export const fetchAllUsers = async () => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/admin/users`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  if (!response.ok) throw new Error('Failed to fetch users');
  return response.json();
};

export const createUserAccount = async (userData) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/admin/users`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(userData)
  });
  if (!response.ok) {
    let errorMessage = '';
    
    try {
      const responseText = await response.text();
      
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.error || responseText;
      } catch (jsonError) {
        errorMessage = responseText;
      }
    } catch (e) {
      errorMessage = 'Failed to create user';
    }
    
    throw new Error(errorMessage || 'Failed to create user');
  }
  return response.json();
};

export const searchUsers = async (keyword) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/admin/users/search?keyword=${encodeURIComponent(keyword)}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  if (!response.ok) throw new Error('Failed to search users');
  return response.json();
};
// Search users by dealer
export const searchUsersByDealer = async (dealerName) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/admin/users/search/dealer?dealerName=${encodeURIComponent(dealerName)}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  if (!response.ok) throw new Error('Failed to search users by dealer');
  return response.json();
};
// Search users by role
export const searchUsersByRole = async (roleName) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/admin/users/search/role?roleName=${encodeURIComponent(roleName)}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  if (!response.ok) throw new Error('Failed to search users by role');
  return response.json();
};


// Lấy danh sách tên đại lý
export const fetchDealerNames = async () => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/dealers/names`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  if (!response.ok) throw new Error('Failed to fetch dealer names');
  return response.json();
};

// Lấy thông tin dealer của user hiện tại
export const fetchMyDealerInfo = async () => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/dealers/my-dealer`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  if (!response.ok) throw new Error('Failed to fetch dealer info');
  return response.json();
};

// Lấy thông tin profile của user hiện tại đang đăng nhập
export const fetchCurrentUserProfile = async () => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/admin/users/profile`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  if (!response.ok) throw new Error('Failed to fetch user profile');
  return response.json();
};

// Cập nhật thông tin profile của user hiện tại (chỉ username, password, phoneNumber)
export const updateCurrentUserProfile = async (profileData) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/admin/users/profile`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(profileData)
  });
  if (!response.ok) throw new Error('Failed to update user profile');
  return response.json();
};

// Lấy danh sách tên các role
export const fetchRoleNames = async () => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/admin/users/roles`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  if (!response.ok) throw new Error('Failed to fetch role names');
  return response.json();
};
// Lấy thông tin user theo userId
export const fetchUserById = async (userId) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  if (!response.ok) throw new Error('Failed to fetch user by ID');
  return response.json();
};

// Cập nhật thông tin user
export const updateUserAccount = async (userId, userData) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(userData)
  });
  if (!response.ok) {
    let errorMessage = '';
    
    try {
      const responseText = await response.text();
      
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.error || responseText;
      } catch (jsonError) {
        errorMessage = responseText;
      }
    } catch (e) {
      errorMessage = 'Failed to update user';
    }
    
    throw new Error(errorMessage || 'Failed to update user');
  }
  return response.json();
};
// Search users by both role and dealer
export const searchUsersByRoleAndDealer = async (roleName, dealerName) => {
  const token = getAuthToken();
  const url = `${API_BASE_URL}/admin/users/search/role-and-dealer?roleName=${encodeURIComponent(roleName)}&dealerName=${encodeURIComponent(dealerName)}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  if (!response.ok) throw new Error('Failed to search users by role and dealer');
  return response.json();
};
// Xóa tài khoản theo userId
export const deleteUserAccount = async (userId) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  if (!response.ok) throw new Error('Failed to delete user');
  // Backend returns plain text, not JSON
  const textResponse = await response.text();
  return { success: true, message: textResponse };
};