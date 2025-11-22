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

export const getCarVariantDetails = async () => {
  try {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
    }
    
    const response = await fetch(`${API_BASE_URL}/car-variants/details`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();

  } catch (error) {
    throw error;
  }
};

export const searchCarVariants = async (query) => {
  try {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
    }
    
    const response = await fetch(`${API_BASE_URL}/car-variants/search?q=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();

  } catch (error) {
    throw error;
  }
};

export const getVariantConfiguration = async (variantId) => {
  try {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
    }
    
    const response = await fetch(`${API_BASE_URL}/configurations/variant/${variantId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();

  } catch (error) {
    return null;
  }
};

export const transformCarVariantData = (apiData) => {
  if (!Array.isArray(apiData)) {
    return [];
  }

  return apiData.map(variant => {
    const modelName = variant.modelName || 'Unknown';
    const variantName = variant.variantName || 'Unknown';
    const fullName = `VinFast ${modelName} ${variantName}`;

    const colors = variant.colorPrices?.map(cp => ({
      name: cp.colorName || 'Unknown',
      price: cp.price || cp.manufacturerPrice || cp.dealerPrice || 0,
      image: cp.imagePath ? `http://localhost:8080${cp.imagePath}` : null,
      quantity: cp.quantity || 0
    })) || [];

    const prices = colors.map(c => c.price).filter(p => p > 0);
    const quantities = colors.map(c => c.quantity);
    const totalStock = quantities.reduce((sum, q) => sum + q, 0);
    
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    
    let priceRange = '';
    if (minPrice === maxPrice) {
      priceRange = `${(minPrice / 1000000).toFixed(0)} triệu`;
    } else {
      const minFormatted = minPrice >= 1000000000 
        ? `${(minPrice / 1000000000).toFixed(2)} tỷ`
        : `${(minPrice / 1000000).toFixed(0)} triệu`;
      const maxFormatted = maxPrice >= 1000000000
        ? `${(maxPrice / 1000000000).toFixed(2)} tỷ`
        : `${(maxPrice / 1000000).toFixed(0)} triệu`;
      priceRange = `${minFormatted} - ${maxFormatted}`;
    }

    let status = 'available';
    if (totalStock === 0) {
      status = 'out-of-stock';
    } else if (totalStock < 10) {
      status = 'low-stock';
    }

    const defaultImage = colors[0]?.image || '/images/default-car.png';
    
    const images = {};
    const colorPrices = {};
    colors.forEach(color => {
      images[color.name] = color.image || defaultImage;
      colorPrices[color.name] = color.price;
    });

    return {
      id: variant.variantId,
      name: fullName,
      modelName: modelName,
      variantName: variantName,
      price: minPrice,
      priceRange: priceRange,
      colors: colors.map(c => c.name),
      colorPrices: colorPrices,
      images: images,
      defaultImage: defaultImage,
      stock: totalStock,
      colorQuantities: colors.reduce((obj, c) => {
        obj[c.name] = c.quantity;
        return obj;
      }, {}),
      status: status,
      configLoaded: false,
      specs: null
    };
  });
};

export const transformConfigurationData = (configData) => {
  if (!configData) return null;

  return {
    battery: `${configData.batteryCapacity} kWh (${configData.batteryType})`,
    range: configData.rangeKm,
    charging: `${configData.fullChargeTime} phút (AC)`,
    power: configData.power,
    seats: configData.seats,
    torque: `${configData.torque} Nm`,
    dimensions: `${configData.lengthMm}x${configData.widthMm}x${configData.heightMm} mm`,
    wheelbase: `${configData.wheelbaseMm} mm`,
    weight: `${configData.weightKg} kg`,
    batteryType: configData.batteryType
  };
};
// Search car variants by modelName (dòng xe)
export const searchCarVariantsByModelName = async (modelName) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/car-variants/search/model-name?modelName=${encodeURIComponent(modelName)}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  if (!response.ok) throw new Error('Failed to search car variants by modelName');
  return response.json();
};

// Search car variants by variantName (phiên bản)
export const searchCarVariantsByVariantName = async (variantName) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/car-variants/search/variant-name?variantName=${encodeURIComponent(variantName)}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  if (!response.ok) throw new Error('Failed to search car variants by variantName');
  return response.json();
};
// Search car variants by both modelName and variantName
export const searchCarVariantsByModelAndVariant = async (modelName, variantName) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  const url = `${API_BASE_URL}/car-variants/search/model-and-variant?modelName=${encodeURIComponent(modelName)}&variantName=${encodeURIComponent(variantName)}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};
// Lấy danh sách xe theo tên đại lý
export const getCarVariantsByDealerName = async (dealerName) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  const url = `${API_BASE_URL}/dealers/car-variants/${encodeURIComponent(dealerName)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
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
// Thêm xe mới (complete car)
export const addCompleteCar = async (carData) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  const response = await fetch(`${API_BASE_URL}/cars/add-complete-car`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(carData)
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};
// Lấy tất cả model-names
export const fetchAllModelNames = async () => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/car-models/model-names`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  if (!response.ok) throw new Error('Failed to fetch all model names');
  return response.json();
};
// Lấy cấu hình theo modelName và variantName
export const fetchConfigurationByModelAndVariant = async (modelName, variantName) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/configurations/variant-name?modelName=${encodeURIComponent(modelName)}&variantName=${encodeURIComponent(variantName)}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  if (!response.ok) throw new Error('Failed to fetch configuration by modelName and variantName');
  return response.json();
};
// Lấy description theo modelName và variantName
export const fetchDescriptionByModelAndVariant = async (modelName, variantName) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/car-variants/description?modelName=${encodeURIComponent(modelName)}&variantName=${encodeURIComponent(variantName)}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  if (!response.ok) throw new Error('Failed to fetch description by modelName and variantName');
  return response.text();
};
// Lấy segment theo modelName
export const fetchSegmentByModelName = async (modelName) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/car-models/segment?modelName=${encodeURIComponent(modelName)}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  if (!response.ok) throw new Error('Failed to fetch segment by modelName');
  return response.text();
};
// Lấy danh sách variantName theo modelName
export const fetchVariantNamesByModel = async (modelName) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/car-variants/variant-names/by-model?modelName=${encodeURIComponent(modelName)}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  if (!response.ok) throw new Error('Failed to fetch variant names by model');
  return response.json();
};
// Thêm xe vào đại lý
export const addCarToDealer = async ({modelName, variantName,colorName, dealerName, quantity }) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  const response = await fetch(`${API_BASE_URL}/cars/add-to-dealer`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ modelName, variantName, colorName, dealerName, quantity })
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.text();
};
// Cập nhật cấu hình theo modelName và variantName
export const updateConfigurationByModelAndVariant = async (modelName, variantName, configData) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  const url = `${API_BASE_URL}/configurations/update?modelName=${encodeURIComponent(modelName)}&variantName=${encodeURIComponent(variantName)}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(configData)
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};
// Cập nhật giá xe theo modelName, variantName, colorName
export const updateManufacturerPriceByModelVariantColor = async (modelName, variantName, colorName, newPrice) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  const url = `${API_BASE_URL}/cars/update-manufacturer-price?modelName=${encodeURIComponent(modelName)}&variantName=${encodeURIComponent(variantName)}&colorName=${encodeURIComponent(colorName)}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ manufacturerPrice: newPrice })
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    // Try to get error message from response
    try {
      const errorData = await response.text();
      throw new Error(`Lỗi cập nhật giá: ${errorData || response.status}`);
    } catch (e) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
  // Backend returns plain text "Successful", not JSON
  const textResponse = await response.text();
  return { success: true, message: textResponse };
};
// Lấy danh sách màu theo modelName và variantName
export const fetchColorsByModelAndVariant = async (modelName, variantName) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  const url = `${API_BASE_URL}/colors/by-model-variant?modelName=${encodeURIComponent(modelName)}&variantName=${encodeURIComponent(variantName)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};
// Lấy giá tiền theo modelName, variantName, colorName
export const fetchManufacturerPriceByModelVariantColor = async (modelName, variantName, colorName) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  const url = `${API_BASE_URL}/cars/manufacturer-price?modelName=${encodeURIComponent(modelName)}&variantName=${encodeURIComponent(variantName)}&colorName=${encodeURIComponent(colorName)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};
// Upload image file to server
export const uploadImage = async (file) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_BASE_URL}/images/upload-file`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
      // 'Content-Type' KHÔNG được set khi dùng FormData
    },
    body: formData
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  // Parse JSON and return only the filename
  const data = await response.json();
  return data.filename;
};
// Search car variants by status
export const searchCarVariantsByStatus = async (status) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  const url = `${API_BASE_URL}/car-variants/search/status?status=${encodeURIComponent(status)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};
// Cập nhật giá và trạng thái xe theo model, variant, color (Dealer Manager)
export const updateDealerCarPriceAndStatus = async ({ modelName, variantName, colorName, dealerPrice, status }) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  const url = `${API_BASE_URL}/car-variants/update-dealer-car?modelName=${encodeURIComponent(modelName)}&variantName=${encodeURIComponent(variantName)}&colorName=${encodeURIComponent(colorName)}&dealerPrice=${encodeURIComponent(dealerPrice)}&status=${encodeURIComponent(status)}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  // Backend returns plain text "Successful", not JSON
  const textResponse = await response.text();
  return { success: true, message: textResponse };
};

// Xóa xe theo modelName, variantName và colorName
export const deleteCarByModelVariantColor = async ({ modelName, variantName, colorName }) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  // Build URL with optional parameters
  let url = `${API_BASE_URL}/admin/cars/delete?modelName=${encodeURIComponent(modelName)}`;
  if (variantName) {
    url += `&variantName=${encodeURIComponent(variantName)}`;
  }
  if (colorName) {
    url += `&colorName=${encodeURIComponent(colorName)}`;
  }
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.text();
};

// Lấy danh sách khuyến mãi của đại lý
export const fetchPromotionsByDealer = async () => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  try {
    const response = await fetch(`${API_BASE_URL}/promotions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
      }
      if (response.status === 403) {
        throw new Error('Bạn không có quyền truy cập danh sách khuyến mãi.');
      }
      if (response.status === 404) {
        throw new Error('Không tìm thấy API khuyến mãi.');
      }
      
      // Thử đọc thông báo lỗi từ server
      try {
        const errorText = await response.text();
        throw new Error(`Lỗi ${response.status}: ${errorText || 'Không thể tải danh sách khuyến mãi'}`);
      } catch (e) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

// Tạo khuyến mãi mới
export const createPromotion = async (promotionData) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  // Validate dates
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day
  
  const startDate = new Date(promotionData.startDate);
  const endDate = new Date(promotionData.endDate);
  
  if (startDate < today) {
    throw new Error('Ngày bắt đầu phải từ hôm nay trở đi');
  }
  
  if (endDate <= startDate) {
    throw new Error('Ngày kết thúc phải sau ngày bắt đầu');
  }
  
  // Validate type
  if (!['VND', '%'].includes(promotionData.type)) {
    throw new Error('Loại khuyến mãi chỉ có thể là "VND" hoặc "%"');
  }
  
  const response = await fetch(`${API_BASE_URL}/promotions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(promotionData)
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    
    try {
      const responseText = await response.text();
      
      try {
        const errorData = JSON.parse(responseText);
        throw new Error(errorData.message || errorData.error || responseText);
      } catch (jsonError) {
        throw new Error(responseText || `HTTP error! status: ${response.status}`);
      }
    } catch (e) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
  
  return response.json();
};

// Tìm kiếm khuyến mãi theo type
export const searchPromotionsByType = async (type) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  const response = await fetch(`${API_BASE_URL}/promotions/search/type?type=${encodeURIComponent(type)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Tìm kiếm khuyến mãi theo status
export const searchPromotionsByStatus = async (status) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  const response = await fetch(`${API_BASE_URL}/promotions/search/status?status=${encodeURIComponent(status)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Tìm kiếm khuyến mãi theo type và status
export const searchPromotionsByTypeAndStatus = async (type, status) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  const response = await fetch(`${API_BASE_URL}/promotions/search?type=${encodeURIComponent(type)}&status=${encodeURIComponent(status)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};



// Cập nhật khuyến mãi theo promotionId
export const updatePromotion = async (promotionId, promotionData) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  // Validate dates if provided
  if (promotionData.startDate && promotionData.endDate) {
    const startDate = new Date(promotionData.startDate);
    const endDate = new Date(promotionData.endDate);
    
    // Chỉ kiểm tra endDate phải sau startDate (cho phép sửa khuyến mãi đã bắt đầu)
    if (endDate <= startDate) {
      throw new Error('Ngày kết thúc phải sau ngày bắt đầu');
    }
  }
  
  // Validate type if provided
  if (promotionData.type && !['VND', '%'].includes(promotionData.type)) {
    throw new Error('Loại khuyến mãi chỉ có thể là "VND" hoặc "%"');
  }
  
  const response = await fetch(`${API_BASE_URL}/promotions/${promotionId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(promotionData)
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    
    try {
      const responseText = await response.text();
      
      try {
        const errorData = JSON.parse(responseText);
        throw new Error(errorData.message || errorData.error || responseText);
      } catch (jsonError) {
        throw new Error(responseText || `HTTP error! status: ${response.status}`);
      }
    } catch (e) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
  
  return response.json();
};

// Xóa khuyến mãi theo promotionId
export const deletePromotion = async (promotionId) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  const response = await fetch(`${API_BASE_URL}/promotions/${promotionId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  // Backend returns plain text message
  const textResponse = await response.text();
  return { success: true, message: textResponse };
};

// Lấy tất cả khách hàng
export const getAllCustomers = async () => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  const response = await fetch(`${API_BASE_URL}/customers`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Không thể tải danh sách khách hàng');
  }
  
  return response.json();
};

// Tìm kiếm khách hàng theo số điện thoại
export const searchCustomerByPhone = async (phoneNumber) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  const response = await fetch(`${API_BASE_URL}/customers/search?phoneNumber=${encodeURIComponent(phoneNumber)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      return null; // Không tìm thấy khách hàng
    }
    const errorText = await response.text();
    throw new Error(errorText || 'Không thể tìm kiếm khách hàng');
  }
  
  return response.json();
};

// Tạo khách hàng mới
export const createCustomer = async (customerData) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  // Validate required fields
  if (!customerData.fullName || !customerData.phoneNumber || !customerData.email) {
    throw new Error('Vui lòng điền đầy đủ thông tin: Họ tên, Số điện thoại, Email');
  }
  
  // Validate full name (only letters and spaces)
  const nameRegex = /^[a-zA-ZÀ-ỹ\s]+$/;
  if (!nameRegex.test(customerData.fullName)) {
    throw new Error('Họ tên chỉ được chứa chữ cái và khoảng trắng');
  }
  
  // Validate phone number (10 or 11 digits)
  const phoneRegex = /^[0-9]{10,11}$/;
  if (!phoneRegex.test(customerData.phoneNumber)) {
    throw new Error('Số điện thoại phải có 10 hoặc 11 chữ số');
  }
  
  const response = await fetch(`${API_BASE_URL}/customers`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(customerData)
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    
    // Xử lý lỗi từ backend
    let errorMessage = `Lỗi HTTP ${response.status}`;
    
    try {
      const contentType = response.headers.get('content-type');
      const responseText = await response.text();
      
      if (responseText) {
        // Thử parse JSON trước
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.message || errorData.error || responseText;
          } catch (jsonError) {
            errorMessage = responseText;
          }
        } else {
          // Nếu là plain text, loại bỏ prefix "Error: " nếu có
          errorMessage = responseText.replace(/^Error:\s*/i, '');
        }
      }
    } catch (e) {
      // Ignore parsing errors
    }
    
    throw new Error(errorMessage);
  }
  
  return response.json();
};

// Lấy thông tin khách hàng theo customerId
export const getCustomerById = async (customerId) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  // Validate customerId
  if (!customerId) {
    throw new Error('customerId là bắt buộc để lấy thông tin khách hàng');
  }
  
  const response = await fetch(`${API_BASE_URL}/customers/${customerId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Cập nhật thông tin khách hàng
export const updateCustomer = async (customerId, customerData) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  // Validate customerId
  if (!customerId) {
    throw new Error('customerId là bắt buộc để cập nhật thông tin khách hàng');
  }
  
  // Validate full name if provided
  if (customerData.fullName) {
    const nameRegex = /^[a-zA-ZÀ-ỹ\s]+$/;
    if (!nameRegex.test(customerData.fullName)) {
      throw new Error('Họ tên chỉ được chứa chữ cái và khoảng trắng');
    }
  }
  
  // Validate phone number if provided
  if (customerData.phoneNumber) {
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(customerData.phoneNumber)) {
      throw new Error('Số điện thoại phải có 10 hoặc 11 chữ số');
    }
  }
  
  const response = await fetch(`${API_BASE_URL}/customers/${customerId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(customerData)
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    
    // Xử lý lỗi từ backend
    let errorMessage = `Lỗi HTTP ${response.status}`;
    
    try {
      const contentType = response.headers.get('content-type');
      const responseText = await response.text();
      
      if (responseText) {
        // Thử parse JSON trước
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.message || errorData.error || responseText;
          } catch (jsonError) {
            errorMessage = responseText;
          }
        } else {
          // Nếu là plain text, loại bỏ prefix "Error: " nếu có
          errorMessage = responseText.replace(/^Error:\s*/i, '');
        }
      }
    } catch (e) {
      // Ignore parsing errors
    }
    
    throw new Error(errorMessage);
  }
  
  return response.json();
};

// Tạo đơn hàng rỗng (draft order) với customerId
export const createDraftOrder = async (customerId) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  // Validate customerId
  if (!customerId) {
    throw new Error('customerId là bắt buộc để tạo đơn hàng');
  }
  
  const response = await fetch(`${API_BASE_URL}/dealer/orders/draft`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ customerId })
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    
    try {
      const responseText = await response.text();
      
      try {
        const errorData = JSON.parse(responseText);
        throw new Error(errorData.message || errorData.error || responseText);
      } catch (jsonError) {
        throw new Error(responseText || `HTTP error! status: ${response.status}`);
      }
    } catch (e) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
  
  const result = await response.json();
  
  // Lưu orderId vào sessionStorage để sử dụng sau
  if (result.orderId) {
    sessionStorage.setItem('currentOrderId', result.orderId);
  }
  
  return result;
};

// Tạo order detail (thêm xe vào đơn hàng)
export const createOrderDetail = async (orderDetailData) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  // Validate required fields
  if (!orderDetailData.orderId) {
    throw new Error('orderId là bắt buộc để tạo chi tiết đơn hàng');
  }
  if (!orderDetailData.modelName || !orderDetailData.variantName || !orderDetailData.colorName) {
    throw new Error('Vui lòng điền đầy đủ thông tin xe: Dòng xe, Phiên bản, Màu sắc');
  }
  if (!orderDetailData.quantity || orderDetailData.quantity < 1) {
    throw new Error('Số lượng phải lớn hơn 0');
  }
  
  const response = await fetch(`${API_BASE_URL}/dealer/orders/details`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(orderDetailData)
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    
    try {
      const responseText = await response.text();
      
      try {
        const errorData = JSON.parse(responseText);
        throw new Error(errorData.message || errorData.error || responseText);
      } catch (jsonError) {
        throw new Error(responseText || `HTTP error! status: ${response.status}`);
      }
    } catch (e) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
  
  return response.json();
};

// Cập nhật khuyến mãi cho đơn hàng
export const updateOrderPromotion = async (orderId, promotionId) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  // Validate orderId
  if (!orderId) {
    throw new Error('orderId là bắt buộc để cập nhật khuyến mãi');
  }
  
  const response = await fetch(`${API_BASE_URL}/dealer/orders/${orderId}/promotion`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ promotionId })
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    
    try {
      const responseText = await response.text();
      
      try {
        const errorData = JSON.parse(responseText);
        throw new Error(errorData.message || errorData.error || responseText);
      } catch (jsonError) {
        throw new Error(responseText || `HTTP error! status: ${response.status}`);
      }
    } catch (e) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
  
  return response.json();
};

// Cập nhật phương thức thanh toán cho đơn hàng
export const updateOrderPaymentMethod = async (orderId, paymentMethod) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  // Validate orderId
  if (!orderId) {
    throw new Error('orderId là bắt buộc để cập nhật phương thức thanh toán');
  }
  
  // Validate paymentMethod
  if (!paymentMethod) {
    throw new Error('paymentMethod là bắt buộc');
  }
  
  const validPaymentMethods = ['Trả thẳng'];
  if (!validPaymentMethods.some(method => method.toLowerCase() === paymentMethod.toLowerCase())) {
    throw new Error('Phương thức thanh toán chỉ có thể là "Trả thẳng"');
  }
  
  const response = await fetch(`${API_BASE_URL}/dealer/orders/${orderId}/payment-method`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ paymentMethod })
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    
    try {
      const responseText = await response.text();
      
      try {
        const errorData = JSON.parse(responseText);
        throw new Error(errorData.message || errorData.error || responseText);
      } catch (jsonError) {
        throw new Error(responseText || `HTTP error! status: ${response.status}`);
      }
    } catch (e) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
  
  return response.json();
};

// Cập nhật số lượng cho order detail
export const updateOrderDetailQuantity = async (orderDetailId, quantity) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  // Validate orderDetailId
  if (!orderDetailId) {
    throw new Error('orderDetailId là bắt buộc để cập nhật số lượng');
  }
  
  // Validate quantity
  if (!quantity || quantity < 1) {
    throw new Error('Số lượng phải lớn hơn 0');
  }
  
  const response = await fetch(`${API_BASE_URL}/dealer/orders/details/${orderDetailId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ quantity })
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    
    try {
      const responseText = await response.text();
      
      try {
        const errorData = JSON.parse(responseText);
        throw new Error(errorData.message || errorData.error || responseText);
      } catch (jsonError) {
        throw new Error(responseText || `HTTP error! status: ${response.status}`);
      }
    } catch (e) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
  
  return response.json();
};

// Cập nhật trạng thái đơn hàng
export const updateOrderStatus = async (orderId, status) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  // Validate orderId
  if (!orderId) {
    throw new Error('orderId là bắt buộc để cập nhật trạng thái');
  }
  
  // Validate status
  if (!status) {
    throw new Error('status là bắt buộc');
  }
  
  const validStatuses = ['Chưa xác nhận', 'Chưa thanh toán', 'Đang trả góp', 'Đã thanh toán', 'Đã hủy'];
  if (!validStatuses.some(validStatus => validStatus.toLowerCase() === status.toLowerCase())) {
    throw new Error('Trạng thái không hợp lệ. Chỉ chấp nhận: Chưa xác nhận, Chưa thanh toán, Đang trả góp, Đã thanh toán, Đã hủy');
  }
  
  const response = await fetch(`${API_BASE_URL}/dealer/orders/${orderId}/status`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ status })
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    
    try {
      const responseText = await response.text();
      
      try {
        const errorData = JSON.parse(responseText);
        throw new Error(errorData.message || errorData.error || responseText);
      } catch (jsonError) {
        throw new Error(responseText || `HTTP error! status: ${response.status}`);
      }
    } catch (e) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
  
  return response.json();
};

// Lấy thông tin chi tiết đơn hàng theo orderId
export const getOrderById = async (orderId) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  // Validate orderId
  if (!orderId) {
    throw new Error('orderId là bắt buộc để lấy thông tin đơn hàng');
  }
  
  const response = await fetch(`${API_BASE_URL}/dealer/orders/${orderId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Lấy thông tin đơn hàng cho bước xác nhận (Step 5) - đã lọc bỏ các field không cần thiết
export const getOrderSummaryForConfirmation = async (orderId) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  // Validate orderId
  if (!orderId) {
    throw new Error('orderId là bắt buộc để lấy thông tin đơn hàng');
  }
  
  const response = await fetch(`${API_BASE_URL}/dealer/orders/${orderId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const fullData = await response.json();
  
  // Transform data - bỏ các field không cần thiết
  return {
    orderInfo: {
      orderDate: fullData.orderInfo.orderDate,
      subTotal: fullData.orderInfo.subTotal,
      discountAmount: fullData.orderInfo.discountAmount,
      totalAmount: fullData.orderInfo.totalAmount,
      paymentMethod: fullData.orderInfo.paymentMethod,
      status: fullData.orderInfo.status,
      promotionName: fullData.orderInfo.promotionName
    },
    customer: {
      customerName: fullData.customer.customerName,
      customerPhone: fullData.customer.customerPhone,
      customerEmail: fullData.customer.customerEmail
    },
    orderDetails: fullData.orderDetails.map(detail => ({
      carName: detail.carName,
      modelName: detail.modelName,
      variantName: detail.variantName,
      colorName: detail.colorName,
      quantity: detail.quantity,
      finalPrice: detail.finalPrice
    }))
  };
};

// Xóa order detail (chi tiết đơn hàng)
export const deleteOrderDetail = async (orderDetailId) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  // Validate orderDetailId
  if (!orderDetailId) {
    throw new Error('orderDetailId là bắt buộc để xóa chi tiết đơn hàng');
  }
  
  const response = await fetch(`${API_BASE_URL}/dealer/orders/details/${orderDetailId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  // Backend returns plain text message
  const textResponse = await response.text();
  return { success: true, message: textResponse };
};

// Lấy thông tin phương thức thanh toán của đơn hàng
export const getOrderPaymentMethod = async (orderId) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  // Validate orderId
  if (!orderId) {
    throw new Error('orderId là bắt buộc để lấy thông tin phương thức thanh toán');
  }
  
  const response = await fetch(`${API_BASE_URL}/dealer/orders/${orderId}/payment-method`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Lấy thông tin trả góp của đơn hàng
export const getOrderInstallment = async (orderId) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  // Validate orderId
  if (!orderId) {
    throw new Error('orderId là bắt buộc để lấy thông tin trả góp');
  }
  
  const response = await fetch(`${API_BASE_URL}/dealer/orders/${orderId}/installment`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    
    // Handle case when no installment plan exists
    if (response.status === 404) {
      const errorText = await response.text();
      throw new Error(errorText || 'Không tìm thấy kế hoạch trả góp cho đơn hàng này');
    }
    
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};
// Lấy danh sách chi tiết đơn hàng (order details)
export const getOrderDetails = async (orderId) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  // Validate orderId
  if (!orderId) {
    throw new Error('orderId là bắt buộc để lấy danh sách chi tiết đơn hàng');
  }
  
  const response = await fetch(`${API_BASE_URL}/dealer/orders/${orderId}/details`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Lấy tất cả đơn hàng của đại lý
export const getAllDealerOrders = async () => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  const response = await fetch(`${API_BASE_URL}/dealer/orders`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Lấy danh sách tên nhân viên đại lý (dealer staff names)
export const getDealerStaffNames = async () => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  const response = await fetch(`${API_BASE_URL}/dealers/my-staff-names`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Tìm kiếm đơn hàng theo tên người tạo (creator name)
export const searchOrdersByCreator = async (creatorName) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  // Validate creatorName
  if (!creatorName) {
    throw new Error('Tên nhân viên là bắt buộc');
  }
  
  const response = await fetch(`${API_BASE_URL}/dealer/orders/search/creator?creatorName=${encodeURIComponent(creatorName)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Lấy thông tin khuyến mãi theo promotionId
export const fetchPromotionById = async (promotionId) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  const response = await fetch(`${API_BASE_URL}/promotions/${promotionId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Tạo payment (hóa đơn thanh toán) cho đơn hàng
export const createPayment = async (paymentData) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  // Validate required fields
  if (!paymentData.orderId) {
    throw new Error('orderId là bắt buộc để tạo payment');
  }
  if (!paymentData.method) {
    throw new Error('Phương thức thanh toán là bắt buộc');
  }
  
  // Validate payment method
  const validPaymentMethods = ['Tiền mặt'];
  if (!validPaymentMethods.includes(paymentData.method)) {
    throw new Error('Phương thức thanh toán không hợp lệ. Chỉ chấp nhận: Tiền mặt');
  }
  
  const requestBody = {
    orderId: paymentData.orderId,
    method: paymentData.method,
    note: paymentData.note || ''
  };
  
  const response = await fetch(`${API_BASE_URL}/dealer/payments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    
    // Xử lý lỗi từ backend
    try {
      const responseText = await response.text();
      
      try {
        const errorData = JSON.parse(responseText);
        // Cải thiện thông báo lỗi cho các trường hợp phổ biến
        let errorMessage = errorData.message || errorData.error || responseText;
        
        // Xử lý các lỗi phổ biến
        if (response.status === 400) {
          if (errorMessage.toLowerCase().includes('already') || 
              errorMessage.toLowerCase().includes('đã có') ||
              errorMessage.toLowerCase().includes('đã tồn tại')) {
            errorMessage = '⚠️ Đơn hàng này đã có thanh toán rồi. Vui lòng kiểm tra lại danh sách thanh toán.';
          } else if (errorMessage.toLowerCase().includes('payment')) {
            errorMessage = `⚠️ Không thể tạo thanh toán: ${errorMessage}`;
          }
        } else if (response.status === 409) {
          errorMessage = '⚠️ Xung đột: Đơn hàng này đã có thanh toán hoặc đang được xử lý. Vui lòng kiểm tra lại.';
        }
        
        throw new Error(errorMessage);
      } catch (jsonError) {
        // Nếu không parse được JSON, dùng text response
        if (responseText) {
          throw new Error(responseText);
        }
        throw new Error(`Lỗi ${response.status}: Không thể tạo thanh toán`);
      }
    } catch (e) {
      if (e.message) throw e;
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
  
  return response.json();
};

// Cập nhật phương thức thanh toán của payment
export const updatePaymentMethod = async (paymentId, paymentData) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  // Validate required fields
  if (!paymentId) {
    throw new Error('paymentId là bắt buộc để cập nhật payment');
  }
  if (!paymentData.method) {
    throw new Error('Phương thức thanh toán là bắt buộc');
  }
  
  // Validate payment method
  const validPaymentMethods = ['Tiền mặt'];
  if (!validPaymentMethods.includes(paymentData.method)) {
    throw new Error('Phương thức thanh toán không hợp lệ. Chỉ chấp nhận: Tiền mặt');
  }
  
  const response = await fetch(`${API_BASE_URL}/dealer/payments/${paymentId}/method`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      method: paymentData.method,
      note: paymentData.note || ''
    })
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    
    // Xử lý lỗi từ backend
    try {
      const responseText = await response.text();
      
      try {
        const errorData = JSON.parse(responseText);
        throw new Error(errorData.message || errorData.error || responseText);
      } catch (jsonError) {
        throw new Error(responseText || `HTTP error! status: ${response.status}`);
      }
    } catch (e) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
  
  return response.json();
};

// Xóa payment theo paymentId
export const deletePayment = async (paymentId) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  // Validate paymentId
  if (!paymentId) {
    throw new Error('paymentId là bắt buộc để xóa payment');
  }
  
  const response = await fetch(`${API_BASE_URL}/dealer/payments/${paymentId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    
    // Xử lý lỗi từ backend
    try {
      const responseText = await response.text();
      throw new Error(responseText || `HTTP error! status: ${response.status}`);
    } catch (e) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
  
  // Backend returns plain text message
  const textResponse = await response.text();
  return { success: true, message: textResponse };
};

// Lấy tất cả thanh toán của đơn hàng theo orderId
export const getPaymentsByOrderId = async (orderId) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  // Validate orderId
  if (!orderId) {
    throw new Error('orderId là bắt buộc để lấy danh sách thanh toán');
  }
  
  const response = await fetch(`${API_BASE_URL}/dealer/payments/order/${orderId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    
    // Handle case when no payments exist (404)
    if (response.status === 404) {
      return []; // Return empty array instead of throwing error
    }
    
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Cập nhật trạng thái thanh toán (Chờ xử lý -> Hoàn thành)
export const updatePaymentStatus = async (paymentId, statusData) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  // Validate paymentId
  if (!paymentId) {
    throw new Error('paymentId là bắt buộc để cập nhật trạng thái thanh toán');
  }
  
  // Validate status
  const validStatuses = ['Chờ xử lý', 'Hoàn thành'];
  if (statusData.status && !validStatuses.includes(statusData.status)) {
    throw new Error('Trạng thái thanh toán chỉ có thể là "Chờ xử lý" hoặc "Hoàn thành"');
  }
  
  const response = await fetch(`${API_BASE_URL}/dealer/payments/${paymentId}/status`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      status: statusData.status,
      note: statusData.note || ''
    })
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    
    // Xử lý lỗi từ backend
    try {
      const responseText = await response.text();
      
      try {
        const errorData = JSON.parse(responseText);
        throw new Error(errorData.message || errorData.error || responseText);
      } catch (jsonError) {
        throw new Error(responseText || `HTTP error! status: ${response.status}`);
      }
    } catch (e) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
  
  return response.json();
};

// Tạo kế hoạch trả góp mới
export const createInstallmentPlan = async (installmentData) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  // Validate required fields
  if (!installmentData.orderId) {
    throw new Error('orderId là bắt buộc để tạo kế hoạch trả góp');
  }
  if (!installmentData.termCount || installmentData.termCount < 1) {
    throw new Error('Số kỳ trả góp phải lớn hơn 0');
  }
  if (!installmentData.interestRate || installmentData.interestRate < 0) {
    throw new Error('Lãi suất phải lớn hơn hoặc bằng 0');
  }
  
  const response = await fetch(`${API_BASE_URL}/dealer/installments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(installmentData)
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    
    try {
      const responseText = await response.text();
      
      try {
        const errorData = JSON.parse(responseText);
        throw new Error(errorData.message || errorData.error || responseText);
      } catch (jsonError) {
        throw new Error(responseText || `HTTP error! status: ${response.status}`);
      }
    } catch (e) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
  
  return response.json();
};

// Cập nhật kế hoạch trả góp
export const updateInstallmentPlan = async (orderId, installmentData) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  // Validate required fields
  if (!orderId) {
    throw new Error('orderId là bắt buộc để cập nhật kế hoạch trả góp');
  }
  if (!installmentData.termCount || installmentData.termCount < 1) {
    throw new Error('Số kỳ trả góp phải lớn hơn 0');
  }
  if (installmentData.interestRate === undefined || installmentData.interestRate < 0) {
    throw new Error('Lãi suất phải lớn hơn hoặc bằng 0');
  }
  
  const response = await fetch(`${API_BASE_URL}/dealer/installments/order/${orderId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(installmentData)
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    
    try {
      const responseText = await response.text();
      
      try {
        const errorData = JSON.parse(responseText);
        throw new Error(errorData.message || errorData.error || responseText);
      } catch (jsonError) {
        throw new Error(responseText || `HTTP error! status: ${response.status}`);
      }
    } catch (e) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
  
  return response.json();
};
// ==================== DISTRIBUTION REQUEST APIs ====================

// Get list of car variants not available at dealer (for dealer to request from manufacturer)
export const getVehiclesNotAvailableAtDealer = async () => {
  const token = getAuthToken();
  if (!token) throw new Error('Khong tim thay token. Vui long dang nhap lai.');
  
  const response = await fetch(`${API_BASE_URL}/car-variants/not-available-at-dealer`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token khong hop le hoac da het han. Vui long dang nhap lai.');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Create distribution request (dealer requests cars from manufacturer)
export const createDistributionRequest = async (requestData) => {
  const token = getAuthToken();
  if (!token) throw new Error('Khong tim thay token. Vui long dang nhap lai.');
  
  // Validate required fields
  if (!requestData.modelName || !requestData.variantName || !requestData.colorName) {
    throw new Error('Vui long dien day du thong tin xe: Dong xe, Phien ban, Mau sac');
  }
  if (!requestData.quantity || requestData.quantity < 1) {
    throw new Error('So luong phai lon hon 0');
  }
  
  const response = await fetch(`${API_BASE_URL}/distribution-requests/create`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(requestData)
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token khong hop le hoac da het han. Vui long dang nhap lai.');
    }
    
    try {
      const responseText = await response.text();
      try {
        const errorData = JSON.parse(responseText);
        throw new Error(errorData.message || errorData.error || responseText);
      } catch (jsonError) {
        throw new Error(responseText || `HTTP error! status: ${response.status}`);
      }
    } catch (e) {
      if (e.message) throw e;
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
  
  return response.json();
};

// Get all distribution requests (for EVM staff to view all requests)
export const getAllDistributionRequests = async () => {
  const token = getAuthToken();
  if (!token) throw new Error('Khong tim thay token. Vui long dang nhap lai.');
  
  const response = await fetch(`${API_BASE_URL}/distribution-requests/all`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token khong hop le hoac da het han. Vui long dang nhap lai.');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Get distribution requests for current dealer (my requests)
export const getDealerDistributionRequests = async () => {
  const token = getAuthToken();
  if (!token) throw new Error('Khong tim thay token. Vui long dang nhap lai.');
  
  const response = await fetch(`${API_BASE_URL}/distribution-requests/my-requests`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token khong hop le hoac da het han. Vui long dang nhap lai.');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Get dealer distribution requests by status (my requests by status)
export const getDealerDistributionRequestsByStatus = async (status) => {
  const token = getAuthToken();
  if (!token) throw new Error('Khong tim thay token. Vui long dang nhap lai.');
  
  if (!status) {
    throw new Error('status la bat buoc de loc yeu cau');
  }
  
  const response = await fetch(`${API_BASE_URL}/distribution-requests/my-requests/status/${encodeURIComponent(status)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token khong hop le hoac da het han. Vui long dang nhap lai.');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Get all distribution requests by status (for Admin/EVM Staff)
export const getAllDistributionRequestsByStatus = async (status) => {
  const token = getAuthToken();
  if (!token) throw new Error('Khong tim thay token. Vui long dang nhap lai.');
  
  if (!status) {
    throw new Error('status la bat buoc de loc yeu cau');
  }
  
  const response = await fetch(`${API_BASE_URL}/distribution-requests/all/status/${encodeURIComponent(status)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token khong hop le hoac da het han. Vui long dang nhap lai.');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Approve distribution request (Admin/EVM Staff approves dealer request)
export const approveDistributionRequest = async (requestId) => {
  const token = getAuthToken();
  if (!token) throw new Error('Khong tim thay token. Vui long dang nhap lai.');
  
  if (!requestId) {
    throw new Error('requestId la bat buoc de duyet yeu cau');
  }
  
  const response = await fetch(`${API_BASE_URL}/distribution-requests/${requestId}/approve`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token khong hop le hoac da het han. Vui long dang nhap lai.');
    }
    
    try {
      const responseText = await response.text();
      throw new Error(responseText || `HTTP error! status: ${response.status}`);
    } catch (e) {
      if (e.message) throw e;
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
  
  return response.json();
};

// Reject distribution request (Admin/EVM Staff rejects dealer request)
export const rejectDistributionRequest = async (requestId, reason) => {
  const token = getAuthToken();
  if (!token) throw new Error('Khong tim thay token. Vui long dang nhap lai.');
  
  if (!requestId) {
    throw new Error('requestId la bat buoc de tu choi yeu cau');
  }
  
  const response = await fetch(`${API_BASE_URL}/distribution-requests/${requestId}/reject`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ rejectionReason: reason || '' })
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token khong hop le hoac da het han. Vui long dang nhap lai.');
    }
    
    try {
      const responseText = await response.text();
      throw new Error(responseText || `HTTP error! status: ${response.status}`);
    } catch (e) {
      if (e.message) throw e;
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
  
  return response.json();
};

// Confirm received distribution (dealer confirms received cars from manufacturer)
export const confirmReceivedDistribution = async (requestId) => {
  const token = getAuthToken();
  if (!token) throw new Error('Khong tim thay token. Vui long dang nhap lai.');
  
  if (!requestId) {
    throw new Error('requestId la bat buoc de xac nhan nhan hang');
  }
  
  const response = await fetch(`${API_BASE_URL}/distribution-requests/${requestId}/confirm-received`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token khong hop le hoac da het han. Vui long dang nhap lai.');
    }
    
    try {
      const responseText = await response.text();
      throw new Error(responseText || `HTTP error! status: ${response.status}`);
    } catch (e) {
      if (e.message) throw e;
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
  
  return response.json();
};

// Set expected delivery date and start delivery (EVM Staff)
export const setExpectedDeliveryDate = async (requestId, expectedDeliveryDate) => {
  const token = getAuthToken();
  if (!token) throw new Error('Khong tim thay token. Vui long dang nhap lai.');
  
  if (!requestId) {
    throw new Error('requestId la bat buoc de thiet lap ngay giao');
  }
  
  if (!expectedDeliveryDate) {
    throw new Error('expectedDeliveryDate la bat buoc');
  }
  
  const response = await fetch(`${API_BASE_URL}/distribution-requests/${requestId}/set-delivery`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ expectedDeliveryDate })
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token khong hop le hoac da het han. Vui long dang nhap lai.');
    }
    
    try {
      const responseText = await response.text();
      throw new Error(responseText || `HTTP error! status: ${response.status}`);
    } catch (e) {
      if (e.message) throw e;
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
  
  return response.json();
};

// Confirm delivery - Dealer confirms received vehicles and updates inventory
export const confirmDelivery = async (requestId) => {
  const token = getAuthToken();
  if (!token) throw new Error('Khong tim thay token. Vui long dang nhap lai.');
  
  if (!requestId) {
    throw new Error('requestId la bat buoc de xac nhan giao hang');
  }
  
  const response = await fetch(`${API_BASE_URL}/distribution-requests/${requestId}/confirm-delivery`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token khong hop le hoac da het han. Vui long dang nhap lai.');
    }
    
    try {
      const responseText = await response.text();
      throw new Error(responseText || `HTTP error! status: ${response.status}`);
    } catch (e) {
      if (e.message) throw e;
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
  
  return response.json();
};

// ==================== SALES REPORTS APIs ====================

// Get sales report by period (month, quarter, year)
export const getSalesReportByPeriod = async (periodType, year, month = null, quarter = null) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  // Build query parameters
  let url = `${API_BASE_URL}/reports/sales/period?periodType=${periodType.toUpperCase()}&year=${year}`;
  
  if (periodType === 'MONTHLY' && month) {
    url += `&month=${month}`;
  }
  
  if (periodType === 'QUARTERLY' && quarter) {
    url += `&quarter=${quarter}`;
  }
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    
    try {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP error! status: ${response.status}`);
    } catch (e) {
      if (e.message) throw e;
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
  
  return response.json();
};

// Get revenue report details (for charts)
export const getRevenueReportByPeriod = async (periodType, year, month = null, quarter = null) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  let url = '';
  
  if (periodType === 'YEARLY') {
    url = `${API_BASE_URL}/reports/revenue/yearly?year=${year}`;
  } else if (periodType === 'QUARTERLY') {
    url = `${API_BASE_URL}/reports/revenue/quarterly?year=${year}&quarter=${quarter}`;
  } else if (periodType === 'MONTHLY') {
    url = `${API_BASE_URL}/reports/revenue/monthly?year=${year}&month=${month}`;
  }
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    
    try {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP error! status: ${response.status}`);
    } catch (e) {
      if (e.message) throw e;
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
  
  return response.json();
};



// Get revenue report by car model (for chart 2)
export const getRevenueByModel = async (periodType, year, month = null, quarter = null) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  let url = '';
  
  if (periodType === 'YEARLY') {
    url = `${API_BASE_URL}/reports/revenue/model/yearly?year=${year}`;
  } else if (periodType === 'QUARTERLY') {
    url = `${API_BASE_URL}/reports/revenue/model/quarterly?year=${year}&quarter=${quarter}`;
  } else if (periodType === 'MONTHLY') {
    url = `${API_BASE_URL}/reports/revenue/model/monthly?year=${year}&month=${month}`;
  }
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    
    try {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP error! status: ${response.status}`);
    } catch (e) {
      if (e.message) throw e;
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
  
  return response.json();
};

// Get revenue report by staff (for chart 3)
export const getRevenueByStaff = async (periodType, year, month = null, quarter = null) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  let url = '';
  
  if (periodType === 'YEARLY') {
    url = `${API_BASE_URL}/reports/revenue/staff/yearly?year=${year}`;
  } else if (periodType === 'QUARTERLY') {
    url = `${API_BASE_URL}/reports/revenue/staff/quarterly?year=${year}&quarter=${quarter}`;
  } else if (periodType === 'MONTHLY') {
    url = `${API_BASE_URL}/reports/revenue/staff/monthly?year=${year}&month=${month}`;
  }
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    
    try {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP error! status: ${response.status}`);
    } catch (e) {
      if (e.message) throw e;
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
  
  return response.json();
};

// Get import cost report (for chart 4)
export const getImportCostReport = async (periodType, year, month = null, quarter = null) => {
  const token = getAuthToken();
  if (!token) throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.');
  
  let url = '';
  
  if (periodType === 'YEARLY') {
    url = `${API_BASE_URL}/reports/import-cost/yearly?year=${year}`;
  } else if (periodType === 'QUARTERLY') {
    url = `${API_BASE_URL}/reports/import-cost/quarterly?year=${year}&quarter=${quarter}`;
  } else if (periodType === 'MONTHLY') {
    url = `${API_BASE_URL}/reports/import-cost/monthly?year=${year}&month=${month}`;
  }
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }
    
    try {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP error! status: ${response.status}`);
    } catch (e) {
      if (e.message) throw e;
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
  
  return response.json();
};
