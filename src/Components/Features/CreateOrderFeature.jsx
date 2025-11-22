import React, { useState, useEffect, useRef } from 'react';
import './CreateOrderFeature.css';
import { 
  createCustomer, 
  getCustomerById, 
  updateCustomer, 
  getCarVariantDetails,
  transformCarVariantData,
  createDraftOrder,
  createOrderDetail,
  deleteOrderDetail,
  getOrderDetails,
  fetchPromotionsByDealer,
  updateOrderPromotion,
  updateOrderPaymentMethod,
  getOrderSummaryForConfirmation,
  updateOrderStatus,
  getAllCustomers,
  searchCustomerByPhone,
  getOrderById,
  updateOrderDetailQuantity
} from '../../services/carVariantApi';
import { showNotification } from '../Notification';

const CreateOrderFeature = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeries, setSelectedSeries] = useState('');
  const [customerId, setCustomerId] = useState(null); // Lưu customerId sau khi tạo
  const [orderId, setOrderId] = useState(null); // Lưu orderId sau khi tạo draft order
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);
  const [customerError, setCustomerError] = useState('');
  const [vehicles, setVehicles] = useState([]); // State cho danh sách xe từ API
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
  const [vehiclesError, setVehiclesError] = useState('');
  const [promotions, setPromotions] = useState([]); // State cho danh sách khuyến mãi
  const [isLoadingPromotions, setIsLoadingPromotions] = useState(false);
  const [promotionsError, setPromotionsError] = useState('');
  const customizationRef = useRef(null); // Ref cho phần cấu hình xe
  const [orderSummary, setOrderSummary] = useState(null); // Lưu order summary cho Step 5
  const [isLoadingOrderSummary, setIsLoadingOrderSummary] = useState(false);
  const [showCustomerListModal, setShowCustomerListModal] = useState(false); // Modal danh sách khách hàng
  const [allCustomers, setAllCustomers] = useState([]); // Danh sách tất cả khách hàng
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false); // Loading danh sách khách hàng
  const [customerListError, setCustomerListError] = useState('');
  const [customerSearchPhone, setCustomerSearchPhone] = useState(''); // Search phone trong modal
  
  // State cho modal cập nhật số lượng xe
  const [showUpdateQuantityModal, setShowUpdateQuantityModal] = useState(false);
  const [updateQuantityData, setUpdateQuantityData] = useState({
    index: null,
    currentQuantity: 1,
    newQuantity: 1,
    maxQuantity: 1,
    actualStock: 0, // Tồn kho thực tế từ API
    vehicleName: '',
    color: ''
  });
  const [isUpdatingQuantity, setIsUpdatingQuantity] = useState(false);
  
  const [orderData, setOrderData] = useState({
    customer: { name: '', phone: '', email: '' },
    selectedVehicles: [], // Mỗi item sẽ có thêm orderDetailId
    promotion: null,
    financing: { phuongThucThanhToan: 'Trả thẳng', note: '' },
    payment: { phuongThuc: 'Tiền mặt', ghiChu: '' }
  });

  // Load draft order khi có draftOrderId trong sessionStorage
  useEffect(() => {
    const loadDraftOrder = async () => {
      const draftOrderId = sessionStorage.getItem('draftOrderId');
      if (!draftOrderId) return;

      try {
        setIsLoadingCustomer(true);

        // Load full order info
        const orderData = await getOrderById(draftOrderId);
        const orderInfo = orderData.orderInfo || {};
        const customer = orderData.customer || {};
        const orderDetails = orderData.orderDetails || [];

        // Set customer info
        if (customer) {
          setCustomerId(customer.customerId);
          setOrderData(prev => ({
            ...prev,
            customer: {
              name: customer.customerName || '',
              phone: customer.customerPhone || '',
              email: customer.customerEmail || ''
            }
          }));
        }

        // Set orderId
        setOrderId(parseInt(draftOrderId));

        // Set selected vehicles from order details - Format phải khớp với addVehicleToCart
        if (orderDetails.length > 0) {
          // Load danh sách xe để lấy thông tin đầy đủ
          const apiData = await getCarVariantDetails();
          const transformedData = transformCarVariantData(apiData);
          const vehiclesData = transformedData.map((v, idx) => ({
            ...v,
            colorPricesRaw: apiData[idx]?.colorPrices || [],
            maXe: v.id
          }));
          setVehicles(vehiclesData);

          const loadedVehicles = orderDetails.map(detail => {
            // Tìm vehicle info từ API
            const vehicleInfo = vehiclesData.find(v => 
              v.modelName === detail.modelName && v.variantName === detail.variantName
            );

            const colorName = detail.colorName || detail.selectedColor;
            
            // Dùng giá trực tiếp từ API order details (unitPrice hoặc finalPrice)
            const vehiclePrice = detail.unitPrice || detail.finalPrice || 0;

            return {
              orderDetailId: detail.orderDetailId,
              carVariantId: detail.carVariantId,
              name: `${detail.modelName || ''} ${detail.variantName || ''}`.trim(),
              modelName: detail.modelName,
              variantName: detail.variantName,
              color: colorName || 'N/A',
              quantity: detail.quantity || 1,
              colorPrice: vehiclePrice, // Fix Issue 1: Đổi từ 'price' sang 'colorPrice'
              defaultImage: vehicleInfo?.defaultImage || detail.defaultImage || '',
              images: vehicleInfo?.images || {},
              maXe: detail.carId,
              colorPricesRaw: vehicleInfo?.colorPricesRaw || [],
              // Giữ nguyên vehicle object để tương thích
              vehicle: vehicleInfo || {
                id: detail.carVariantId,
                carVariantId: detail.carVariantId,
                name: `${detail.modelName} ${detail.variantName}`,
                modelName: detail.modelName,
                variantName: detail.variantName,
                defaultImage: detail.defaultImage || '',
                colorPricesRaw: []
              }
            };
          });

          setOrderData(prev => ({
            ...prev,
            selectedVehicles: loadedVehicles
          }));
        }

        // Set promotion if exists
        if (orderInfo.promotionId) {
          setOrderData(prev => ({
            ...prev,
            promotion: {
              promotionId: orderInfo.promotionId,
              promotionName: orderInfo.promotionName || 'Khuyến mãi'
            }
          }));
        }

        // Set payment method
        if (orderInfo.paymentMethod) {
          setOrderData(prev => ({
            ...prev,
            payment: {
              ...prev.payment,
              phuongThuc: orderInfo.paymentMethod
            },
            financing: {
              ...prev.financing,
              phuongThucThanhToan: 'Trả thẳng' // Mặc định
            }
          }));
        }

        // Xác định bước tiếp theo dựa trên thông tin đã có
        let nextStep = 2; // Mặc định bước 2
        let stepMessage = 'Tiếp tục từ bước chọn xe';

        if (orderDetails.length > 0) {
          // Đã có xe
          if (orderInfo.paymentMethod) {
            // Đã có payment method → Chuyển sang bước 5 (xác nhận)
            nextStep = 5;
            stepMessage = 'Tiếp tục từ bước xác nhận đơn hàng';
          } else if (orderInfo.promotionId !== undefined && orderInfo.promotionId !== null) {
            // Đã chọn khuyến mãi (có thể là null = không dùng KM) → Chuyển sang bước 4
            nextStep = 4;
            stepMessage = 'Tiếp tục từ bước thanh toán';
          } else {
            // Chỉ có xe → Chuyển sang bước 3
            nextStep = 3;
            stepMessage = 'Tiếp tục từ bước chọn khuyến mãi';
          }
        }

        setCurrentStep(nextStep);
        
        // Xóa draftOrderId trước khi show notification để tránh re-trigger
        sessionStorage.removeItem('draftOrderId');
        
        // Chỉ hiển thị 1 notification duy nhất sau khi load xong
        showNotification(`Đã tải thông tin đơn hàng. ${stepMessage}`, 'success');
      } catch (error) {
        console.error('Error loading draft order:', error);
        showNotification('Không thể tải thông tin đơn hàng: ' + error.message, 'error');
        sessionStorage.removeItem('draftOrderId');
      } finally {
        setIsLoadingCustomer(false);
      }
    };

    loadDraftOrder();
  }, []); // Chỉ chạy một lần khi component mount

  // Hàm reload vehicles - dùng để cập nhật tồn kho sau khi thêm/xóa/cập nhật xe
  const reloadVehicles = async () => {
    try {
      const apiData = await getCarVariantDetails();
      const transformedData = transformCarVariantData(apiData);
      const withRaw = transformedData.map((v, idx) => ({
        ...v,
        colorPricesRaw: apiData[idx]?.colorPrices || [],
        maXe: v.id
      }));
      setVehicles(withRaw);
      return withRaw; // Trả về dữ liệu mới
    } catch (error) {
      console.error('Error reloading vehicles:', error);
      return null;
    }
  };

  // Load vehicles từ API khi vào Step 2
  useEffect(() => {
    const loadVehicles = async () => {
      if (currentStep === 2 && vehicles.length === 0) {
        setIsLoadingVehicles(true);
        setVehiclesError('');
        try {
          const apiData = await getCarVariantDetails();
          
          // Transform API data giống VehicleInfoFeature
          const transformedData = transformCarVariantData(apiData);
          
          // Attach colorPricesRaw để lấy dealerPrice
          const withRaw = transformedData.map((v, idx) => ({
            ...v,
            colorPricesRaw: apiData[idx]?.colorPrices || [],
            maXe: v.id // Thêm maXe để tương thích với code cũ
          }));
          
          setVehicles(withRaw);
        } catch (error) {
          setVehiclesError('Không thể tải danh sách xe. Vui lòng thử lại.');
        } finally {
          setIsLoadingVehicles(false);
        }
      }
    };

    loadVehicles();
  }, [currentStep, vehicles.length]);

  // Load order details khi quay lại Step 2 để hiển thị xe đã chọn
  // DISABLED - Draft order đã load sẵn selectedVehicles
  // useEffect này chỉ dùng khi user tự tạo đơn từ đầu và quay lại bước 2
  useEffect(() => {
    const loadOrderDetails = async () => {
      // Chỉ load nếu:
      // 1. Đang ở step 2
      // 2. Đã có orderId (đã tạo draft order)
      // 3. Chưa có selectedVehicles (chưa load từ draft)
      // 4. Có vehicles data để transform
      if (currentStep === 2 && orderId && orderData.selectedVehicles.length === 0 && vehicles.length > 0) {
        try {
          const details = await getOrderDetails(orderId);
          
          if (details && details.length > 0) {
            // Transform order details thành selectedVehicles format
            const loadedVehicles = details.map(detail => {
              // Tìm xe trong danh sách vehicles
              const vehicle = vehicles.find(v => 
                v.modelName === detail.modelName && 
                v.variantName === detail.variantName
              );
              
              return {
                orderDetailId: detail.orderDetailId,
                carVariantId: detail.carVariantId || vehicle?.carVariantId,
                name: `${detail.modelName || ''} ${detail.variantName || ''}`.trim(),
                modelName: detail.modelName,
                variantName: detail.variantName,
                color: detail.colorName,
                quantity: detail.quantity,
                price: detail.unitPrice,
                defaultImage: vehicle?.defaultImage || detail.defaultImage || '',
                images: vehicle?.images || {},
                maXe: detail.carId,
                vehicle: vehicle || {
                  id: detail.carId,
                  carVariantId: detail.carVariantId,
                  name: `${detail.modelName} ${detail.variantName}`,
                  modelName: detail.modelName,
                  variantName: detail.variantName
                }
              };
            });
            
            setOrderData(prev => ({
              ...prev,
              selectedVehicles: loadedVehicles
            }));
          }
        } catch (error) {
          console.warn('⚠️ Could not load order details:', error);
          // Ignore error - user can re-select vehicles
        }
      }
    };

    loadOrderDetails();
  }, [currentStep, orderId, vehicles.length, orderData.selectedVehicles.length]);

  // Load promotions khi vào Step 3
  useEffect(() => {
    const loadPromotions = async () => {
      if (currentStep === 3) {
        // Chỉ load nếu chưa có data hoặc cần refresh
        if (promotions.length === 0 && !isLoadingPromotions) {
          setIsLoadingPromotions(true);
          setPromotionsError('');
          try {
            const data = await fetchPromotionsByDealer();
            
            // Kiểm tra dữ liệu trả về
            if (Array.isArray(data)) {
              setPromotions(data);
            } else {
              setPromotionsError('Dữ liệu khuyến mãi không hợp lệ.');
            }
          } catch (error) {
            // Hiển thị lỗi cụ thể hơn
            let errorMessage = 'Không thể tải danh sách khuyến mãi.';
            if (error.message.includes('401')) {
              errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
            } else if (error.message.includes('403')) {
              errorMessage = 'Bạn không có quyền truy cập danh sách khuyến mãi.';
            } else if (error.message.includes('Token')) {
              errorMessage = error.message;
            } else {
              errorMessage = `Lỗi: ${error.message}`;
            }
            
            setPromotionsError(errorMessage);
          } finally {
            setIsLoadingPromotions(false);
          }
        }
      }
    };

    loadPromotions();
  }, [currentStep]);

  // Cập nhật payment method khi vào Step 4
  useEffect(() => {
    const updatePaymentMethodOnStep4 = async () => {
      if (currentStep === 4 && orderId) {
        // Đảm bảo payment method luôn là "Trả thẳng"
        try {
          await updateOrderPaymentMethod(orderId, 'Trả thẳng');
        } catch (error) {
          console.error('Error updating payment method:', error);
        }
      }
    };

    updatePaymentMethodOnStep4();
  }, [currentStep, orderId]);

  // Load order summary khi vào Step 5
  useEffect(() => {
    const loadOrderSummary = async () => {
      if (currentStep === 5 && orderId) {
        setIsLoadingOrderSummary(true);
        try {
          const summary = await getOrderSummaryForConfirmation(orderId);
          setOrderSummary(summary);
        } catch (error) {
          showNotification(`Không thể tải thông tin đơn hàng: ${error.message}`, 'error');
        } finally {
          setIsLoadingOrderSummary(false);
        }
      }
    };

    loadOrderSummary();
  }, [currentStep, orderId]);

  const formatPrice = (price) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  // THÊM CÁC FUNCTIONS BỊ THIẾU
  const calculateSubtotal = () => {
    return orderData.selectedVehicles.reduce((sum, item) => sum + (item.colorPrice * item.quantity), 0);
  };

  const calculateDiscount = () => {
    if (!orderData.promotion) return 0;
    
    const subtotal = calculateSubtotal();
    if (orderData.promotion.type === 'VND') {
      return orderData.promotion.value;
    } else if (orderData.promotion.type === '%') {
      return subtotal * (orderData.promotion.value / 100);
    }
    return 0;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    return Math.max(subtotal - discount, 0);
  };

  // Helper functions
  const addVehicleToCart = async (vehicle, color, quantity) => {
    // Kiểm tra orderId
    if (!orderId) {
      showNotification('Chưa có đơn hàng. Vui lòng quay lại Step 1 để tạo khách hàng.', 'warning');
      return;
    }

    try {
      // Lấy giá từ colorPricesRaw (dealerPrice) - giống VehicleInfoFeature
      let colorPrice = vehicle.price || 0;
      if (vehicle.colorPricesRaw && Array.isArray(vehicle.colorPricesRaw)) {
        const colorObj = vehicle.colorPricesRaw.find(c => c.colorName === color);
        if (colorObj && colorObj.dealerPrice != null) {
          colorPrice = colorObj.dealerPrice;
        }
      } else if (vehicle.colorPrices && vehicle.colorPrices[color]) {
        colorPrice = vehicle.colorPrices[color];
      }

      // Gọi API createOrderDetail
      const orderDetailData = {
        orderId: orderId,
        modelName: vehicle.modelName,
        variantName: vehicle.variantName,
        colorName: color,
        quantity: quantity
      };

      const result = await createOrderDetail(orderDetailData);

      // Reload danh sách xe để cập nhật tồn kho TRƯỚC
      const updatedVehiclesList = await reloadVehicles();

      // Tìm vehicle mới với tồn kho đã cập nhật cho xe vừa thêm
      const updatedVehicle = updatedVehiclesList ? 
        updatedVehiclesList.find(v => 
          v.modelName === vehicle.modelName && 
          v.variantName === vehicle.variantName
        ) || vehicle : vehicle;

      // Thêm vào giỏ hàng và cập nhật vehicle cho TẤT CẢ items cũ
      if (updatedVehiclesList) {
        setOrderData(prev => ({
          ...prev,
          selectedVehicles: [
            // Cập nhật vehicle mới cho các items cũ
            ...prev.selectedVehicles.map(item => {
              const itemUpdatedVehicle = updatedVehiclesList.find(v => 
                v.modelName === item.vehicle.modelName && 
                v.variantName === item.vehicle.variantName
              ) || item.vehicle;
              return { ...item, vehicle: itemUpdatedVehicle };
            }),
            // Thêm item mới với vehicle đã cập nhật
            { 
              vehicle: updatedVehicle,
              color, 
              quantity, 
              colorPrice,
              orderDetailId: result.orderDetailId
            }
          ]
        }));
      } else {
        // Nếu reload thất bại, chỉ thêm item mới
        setOrderData(prev => ({
          ...prev,
          selectedVehicles: [
            ...prev.selectedVehicles, 
            { 
              vehicle: updatedVehicle,
              color, 
              quantity, 
              colorPrice,
              orderDetailId: result.orderDetailId
            }
          ]
        }));
      }

      // Hiển thị thông báo thành công
      showNotification(`Đã thêm ${vehicle.name} (${color}) vào giỏ hàng!`, 'success');
    } catch (error) {
      showNotification(`Lỗi khi thêm xe vào giỏ hàng: ${error.message}`, 'error');
    }
  };

  const removeVehicleFromCart = async (index) => {
    const item = orderData.selectedVehicles[index];
    
    if (!item.orderDetailId) {
      // Nếu không có orderDetailId (trường hợp cũ), chỉ xóa khỏi UI
      setOrderData(prev => ({
        ...prev,
        selectedVehicles: prev.selectedVehicles.filter((_, i) => i !== index)
      }));
      return;
    }

    try {
      // Gọi API deleteOrderDetail
      const result = await deleteOrderDetail(item.orderDetailId);

      // Reload danh sách xe để cập nhật tồn kho
      const updatedVehiclesList = await reloadVehicles();

      // Xóa khỏi giỏ hàng và cập nhật các vehicles còn lại
      if (updatedVehiclesList) {
        setOrderData(prev => ({
          ...prev,
          selectedVehicles: prev.selectedVehicles
            .filter((_, i) => i !== index)
            .map(item => {
              // Cập nhật vehicle với dữ liệu mới cho các item còn lại
              const updatedVehicle = updatedVehiclesList.find(v => 
                v.modelName === item.vehicle.modelName && 
                v.variantName === item.vehicle.variantName
              );
              return updatedVehicle ? { ...item, vehicle: updatedVehicle } : item;
            })
        }));
      } else {
        // Nếu reload thất bại, chỉ xóa item
        setOrderData(prev => ({
          ...prev,
          selectedVehicles: prev.selectedVehicles.filter((_, i) => i !== index)
        }));
      }

      // Hiển thị thông báo thành công
      showNotification('Đã xóa xe khỏi giỏ hàng. Số lượng xe đã được hoàn trả về kho.', 'success');
    } catch (error) {
      showNotification(`Lỗi khi xóa xe khỏi giỏ hàng: ${error.message}`, 'error');
    }
  };

  // Mở modal cập nhật số lượng
  const openUpdateQuantityModal = (index) => {
    const item = orderData.selectedVehicles[index];
    
    // Lấy tồn kho thực tế từ API (backend đã trừ đơn hàng hiện tại)
    const stockQuantity = getStockQuantity(item.vehicle, item.color);
    
    // Số lượng tối đa khi cập nhật:
    // Backend đã trừ TẤT CẢ items trong đơn (bao gồm item này)
    // Khi cập nhật, backend sẽ hoàn trả số lượng cũ của item này
    // maxQty = tồn kho hiện tại (đã trừ tất cả) + số lượng cũ của item này
    const maxQty = Math.max(0, stockQuantity + item.quantity);
    
    setUpdateQuantityData({
      index: index,
      currentQuantity: item.quantity,
      newQuantity: item.quantity,
      maxQuantity: maxQty,
      actualStock: stockQuantity, // Tồn kho thực tế từ API
      vehicleName: item.vehicle.name,
      color: item.color
    });
    setShowUpdateQuantityModal(true);
  };

  // Xử lý cập nhật số lượng từ modal
  const handleUpdateQuantity = async () => {
    const { index, newQuantity } = updateQuantityData;
    const item = orderData.selectedVehicles[index];
    
    if (!item.orderDetailId) {
      // Nếu không có orderDetailId, chỉ cập nhật local state
      setOrderData(prev => ({
        ...prev,
        selectedVehicles: prev.selectedVehicles.map((item, i) => 
          i === index ? { ...item, quantity: newQuantity } : item
        )
      }));
      setShowUpdateQuantityModal(false);
      showNotification('Đã cập nhật số lượng xe!', 'success');
      return;
    }

    try {
      setIsUpdatingQuantity(true);
      
      // Gọi API updateOrderDetailQuantity - API sẽ thay thế số lượng cũ bằng số lượng mới
      await updateOrderDetailQuantity(item.orderDetailId, newQuantity);
      
      // Reload danh sách xe để cập nhật tồn kho
      const updatedVehiclesList = await reloadVehicles();

      // Cập nhật state sau khi reload - cập nhật vehicle với dữ liệu mới cho TẤT CẢ items
      if (updatedVehiclesList) {
        setOrderData(prev => ({
          ...prev,
          selectedVehicles: prev.selectedVehicles.map((item, i) => {
            // Tìm vehicle mới từ danh sách vừa reload cho TẤT CẢ items
            const updatedVehicle = updatedVehiclesList.find(v => 
              v.modelName === item.vehicle.modelName && 
              v.variantName === item.vehicle.variantName
            ) || item.vehicle;
            
            // Cập nhật số lượng cho item đang sửa, cập nhật vehicle cho tất cả
            if (i === index) {
              return { 
                ...item, 
                quantity: newQuantity,
                vehicle: updatedVehicle
              };
            }
            // Cập nhật vehicle cho các items khác
            return { 
              ...item, 
              vehicle: updatedVehicle
            };
          })
        }));
      } else {
        // Nếu reload thất bại, vẫn cập nhật số lượng
        setOrderData(prev => ({
          ...prev,
          selectedVehicles: prev.selectedVehicles.map((item, i) => 
            i === index ? { ...item, quantity: newQuantity } : item
          )
        }));
      }

      setShowUpdateQuantityModal(false);
      showNotification('Đã cập nhật số lượng xe thành công!', 'success');
    } catch (error) {
      showNotification(`Lỗi khi cập nhật số lượng: ${error.message}`, 'error');
    } finally {
      setIsUpdatingQuantity(false);
    }
  };

  // Helper function - lấy số lượng tồn kho thực tế từ API
  // Backend đã tự động trừ các đơn hàng đang xử lý
  const getStockQuantity = (vehicle, color) => {
    if (vehicle.colorPricesRaw && Array.isArray(vehicle.colorPricesRaw)) {
      const colorObj = vehicle.colorPricesRaw.find(c => c.colorName === color);
      return colorObj ? colorObj.quantity : 0;
    }
    return vehicle.quantity || 0;
  };

  // Tính số lượng khả dụng cho việc thêm xe mới
  // = Tồn kho - số lượng các item KHÁC cùng loại xe trong giỏ
  const getColorQuantity = (vehicle, color, excludeIndex = null) => {
    const stockQuantity = getStockQuantity(vehicle, color);

    // Tính tổng số lượng các item KHÁC trong giỏ (không tính item excludeIndex)
    const otherItemsQuantity = orderData.selectedVehicles
      .filter((item, index) => {
        const isSameVehicle = item.vehicle.modelName === vehicle.modelName && 
                              item.vehicle.variantName === vehicle.variantName && 
                              item.color === color;
        const shouldExclude = excludeIndex !== null && index === excludeIndex;
        return isSameVehicle && !shouldExclude;
      })
      .reduce((sum, item) => sum + item.quantity, 0);

    // Nếu backend đã trừ các đơn hàng, chỉ cần trừ thêm các item KHÁC trong giỏ hiện tại
    return Math.max(0, stockQuantity - otherItemsQuantity);
  };

  const handleCustomerChange = async (field, value) => {
    // Clear error khi người dùng bắt đầu nhập lại
    if (customerError) {
      setCustomerError('');
    }
    
    setOrderData(prev => ({
      ...prev,
      customer: { ...prev.customer, [field]: value }
    }));

    // Tự động tìm kiếm khách hàng khi nhập số điện thoại
    if (field === 'phone' && value.length >= 10) {
      try {
        const customer = await searchCustomerByPhone(value);
        if (customer) {
          setOrderData(prev => ({
            ...prev,
            customer: {
              name: customer.fullName,
              phone: customer.phoneNumber,
              email: customer.email
            }
          }));
          setCustomerId(customer.customerId);
          setCustomerError('');
        }
      } catch (error) {
        // Không hiển thị lỗi, chỉ không tự động điền
      }
    }
  };

  // Load danh sách khách hàng
  const loadCustomerList = async () => {
    setIsLoadingCustomers(true);
    setCustomerListError('');
    try {
      const data = await getAllCustomers();
      setAllCustomers(data.customers || []);
    } catch (error) {
      setCustomerListError(error.message || 'Không thể tải danh sách khách hàng');
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  // Chọn khách hàng từ danh sách
  const selectCustomerFromList = (customer) => {
    setOrderData(prev => ({
      ...prev,
      customer: {
        name: customer.fullName,
        phone: customer.phoneNumber,
        email: customer.email
      }
    }));
    setCustomerId(customer.customerId);
    setShowCustomerListModal(false);
    setCustomerError('');
  };

  // Xử lý chọn khuyến mãi với API
  const handlePromotionSelect = async (promotion) => {
    if (!orderId) {
      showNotification('Chưa có đơn hàng. Vui lòng quay lại bước đầu.', 'warning');
      return;
    }

    if (promotion && promotion.status === 'Không hoạt động') {
      showNotification('Không thể áp dụng khuyến mãi không hoạt động. Vui lòng chọn khuyến mãi khác.', 'error');
      // Reset về mặc định (không chọn khuyến mãi)
      setOrderData(prev => ({ ...prev, promotion: null }));
      // Gọi API để bỏ chọn khuyến mãi nếu đã từng chọn
      try {
        await updateOrderPromotion(orderId, null);
      } catch (error) {
        // Không cần show lỗi ở đây, chỉ cần reset UI
      }
      return;
    }

    try {
      // Gọi API để cập nhật khuyến mãi (null nếu không chọn)
      await updateOrderPromotion(orderId, promotion?.promotionId || null);
      
      // Cập nhật state
      setOrderData(prev => ({ ...prev, promotion }));
      
      // Thông báo thành công
      if (promotion) {
        showNotification(`Đã áp dụng khuyến mãi: ${promotion.promotionName}`, 'success');
      } else {
        showNotification('Đã bỏ chọn khuyến mãi', 'info');
      }
    } catch (error) {
      showNotification(`Lỗi khi cập nhật khuyến mãi: ${error.message}`, 'error');
    }
  };

  // Filter vehicles - sử dụng vehicles từ API
  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = vehicle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (vehicle.variantName && vehicle.variantName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (vehicle.modelName && vehicle.modelName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSeries = selectedSeries === '' || (vehicle.modelName && vehicle.modelName.includes(selectedSeries));
    return matchesSearch && matchesSeries;
  });

  const vehicleSeries = [...new Set(vehicles.map(v => v.modelName).filter(Boolean))];

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1: return orderData.customer.name && orderData.customer.phone && orderData.customer.email;
      case 2: return orderData.selectedVehicles.length > 0;
      case 3: return true; // Khuyến mãi là tùy chọn
      case 4: return true; // Chỉ còn Trả thẳng nên luôn OK
      default: return true;
    }
  };

  const nextStep = async () => {
    if (currentStep < 5 && canProceedToNextStep()) {
      // Xử lý Step 1: Tạo hoặc cập nhật khách hàng
      if (currentStep === 1) {
        setIsLoadingCustomer(true);
        setCustomerError('');
        try {
          const customerData = {
            fullName: orderData.customer.name,
            phoneNumber: orderData.customer.phone,
            email: orderData.customer.email
          };

          if (customerId) {
            // Cập nhật khách hàng nếu đã tồn tại
            await updateCustomer(customerId, customerData);
            
            // Tạo draft order nếu chưa có
            if (!orderId) {
              const orderResult = await createDraftOrder(customerId);
              setOrderId(orderResult.orderId);
              // Đã xóa sessionStorage.setItem
            }
          } else {
            // Tạo khách hàng mới
            const result = await createCustomer(customerData);
            setCustomerId(result.customerId);
            // Đã xóa sessionStorage.setItem
            
            // Tạo draft order ngay sau khi tạo customer
            const orderResult = await createDraftOrder(result.customerId);
            setOrderId(orderResult.orderId);
            // Đã xóa sessionStorage.setItem
          }
        } catch (error) {
          // Xử lý và hiển thị lỗi theo định dạng cụ thể
          let userFriendlyError = error.message;
          
          // Xử lý lỗi Email
          if (error.message.includes('Invalid email format')) {
            userFriendlyError = '❌ Email không đúng định dạng. Vui lòng nhập email hợp lệ (ví dụ: example@gmail.com)';
          } else if (error.message.includes('Email already exists')) {
            const existingEmail = error.message.split(': ')[1] || orderData.customer.email;
            userFriendlyError = `❌ Email "${existingEmail}" đã được sử dụng. Vui lòng sử dụng email khác hoặc cập nhật thông tin khách hàng hiện tại.`;
          }
          // Xử lý lỗi Số điện thoại
          else if (error.message.includes('Phone number must be 10 or 11 digits')) {
            userFriendlyError = '❌ Số điện thoại phải có 10 hoặc 11 chữ số. Vui lòng nhập lại (ví dụ: 0901234567)';
          } else if (error.message.includes('Phone number already exists')) {
            const existingPhone = error.message.split(': ')[1] || orderData.customer.phone;
            userFriendlyError = `❌ Số điện thoại "${existingPhone}" đã được sử dụng. Vui lòng sử dụng số điện thoại khác.`;
          }
          // Xử lý lỗi Họ tên
          else if (error.message.includes('Họ tên chỉ được chứa chữ cái và khoảng trắng')) {
            userFriendlyError = '❌ Họ tên chỉ được chứa chữ cái và khoảng trắng. Vui lòng không nhập số hoặc ký tự đặc biệt.';
          }
          
          setCustomerError(userFriendlyError);
          setIsLoadingCustomer(false);
          return; // Không chuyển bước nếu có lỗi
        } finally {
          setIsLoadingCustomer(false);
        }
      }
      
      // Xử lý Step 4: Đảm bảo payment method được cập nhật trước khi sang Step 5
      if (currentStep === 4 && orderId) {
        try {
          await updateOrderPaymentMethod(orderId, orderData.financing.phuongThucThanhToan);
        } catch (error) {
          showNotification(`Không thể cập nhật phương thức thanh toán: ${error.message}`, 'error');
          return; // Không chuyển bước nếu có lỗi
        }
      }

      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // submitOrder - Xác nhận đơn hàng và chuyển status sang "Đang xử lý"
  const submitOrder = async () => {
    try {
      // Validation cơ bản
      if (!orderData.customer.name || !orderData.customer.phone || !orderData.customer.email) {
        showNotification('Vui lòng nhập đầy đủ thông tin khách hàng!', 'warning');
        setCurrentStep(1);
        return;
      }

      if (orderData.selectedVehicles.length === 0) {
        showNotification('Vui lòng chọn ít nhất một xe!', 'warning');
        setCurrentStep(2);
        return;
      }

      if (!orderData.financing.phuongThucThanhToan) {
        showNotification('Vui lòng chọn phương thức tài chính!', 'warning');
        setCurrentStep(4);
        return;
      }

      if (!orderId) {
        showNotification('Không tìm thấy mã đơn hàng! Vui lòng thử lại từ đầu.', 'error');
        setCurrentStep(1);
        return;
      }

      // Cập nhật trạng thái đơn hàng từ "Chưa xác nhận" sang "Chưa thanh toán"
      try {
        await updateOrderStatus(orderId, 'Chưa thanh toán');
      } catch (statusError) {
        console.error('Error updating order status:', statusError);
        // Tiếp tục thông báo thành công vì đơn hàng đã được tạo
      }

      // Tính toán tổng tiền
      const total = calculateTotal();

      // Notification thành công với thông tin chi tiết
      const orderInfo = `Mã đơn hàng: ORD-${String(orderId).padStart(6, '0')}
Khách hàng: ${orderData.customer.name}
Email: ${orderData.customer.email}
SĐT: ${orderData.customer.phone}
Số xe: ${orderData.selectedVehicles.length}
Tổng tiền: ${formatPrice(total)}
Phương thức: ${orderData.financing.phuongThucThanhToan}

Đơn hàng đã được tạo với trạng thái "Chưa thanh toán".
Vui lòng kiểm tra lại trong phần Quản lý Đơn hàng & Thanh toán!`;

      showNotification(orderInfo, 'success', 6000);
      
      // Reset form
      setOrderData({
        customer: { name: '', phone: '', email: '' },
        selectedVehicles: [],
        promotion: null,
        financing: { phuongThucThanhToan: 'Trả thẳng', note: '' },
        payment: { phuongThuc: 'Tiền mặt', ghiChu: '' }
      });
      setOrderId(null); // Reset orderId
      setCustomerId(null); // Reset customerId
      setOrderSummary(null); // Reset order summary
      
      // Đã xóa sessionStorage - không cần lưu dữ liệu nữa
      
      setCurrentStep(1);
      
    } catch (error) {
      showNotification('Có lỗi xảy ra khi xác nhận đơn hàng. Vui lòng thử lại!', 'error');
      console.error('Submit order error:', error);
    }
  };

  return (
    <div className="create-order-feature">
      {/* Header Section */}
      <div className="create-order-header">
        <div className="create-order-header-content">
          <div className="create-order-header-text">
            <h2>Tạo đơn hàng</h2>
            <p>Tạo đơn hàng mới cho khách hàng và quản lý thông tin</p>
          </div>
        </div>
      </div>

      <div className="order-progress">
        <div className="progress-steps">
          {[
            { step: 1, title: 'Thông tin KH' },
            { step: 2, title: 'Chọn xe' },
            { step: 3, title: 'Khuyến mãi' },
            { step: 4, title: 'Thanh toán' },
            { step: 5, title: 'Xác nhận' }
          ].map(({ step, title }) => (
            <div key={step} className={`progress-step ${currentStep >= step ? 'active' : ''} ${currentStep > step ? 'completed' : ''}`}>
              <div className="step-number">{step}</div>
              <div className="step-title">{title}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="order-content">
        {currentStep === 1 && <CustomerInfoStep 
          orderData={orderData} 
          handleChange={handleCustomerChange} 
          isLoadingCustomer={isLoadingCustomer} 
          customerError={customerError}
          onShowCustomerList={() => {
            setCustomerSearchPhone(''); // Reset search khi mở modal
            setShowCustomerListModal(true);
            loadCustomerList();
          }}
        />}
        {currentStep === 2 && <VehicleSelectionStep 
          vehicles={filteredVehicles} 
          selectedVehicles={orderData.selectedVehicles}
          searchTerm={searchTerm}
          selectedSeries={selectedSeries}
          vehicleSeries={vehicleSeries}
          onSearchChange={setSearchTerm}
          onSeriesChange={setSelectedSeries}
          addVehicleToCart={addVehicleToCart}
          removeVehicleFromCart={removeVehicleFromCart}
          openUpdateQuantityModal={openUpdateQuantityModal}
          isLoadingVehicles={isLoadingVehicles}
          vehiclesError={vehiclesError}
          customizationRef={customizationRef}
        />}
        {currentStep === 3 && <PromotionStep 
          promotions={promotions} 
          selectedPromotion={orderData.promotion} 
          onSelect={handlePromotionSelect}
          isLoading={isLoadingPromotions}
          error={promotionsError}
        />}
        {currentStep === 4 && <PaymentStep 
          orderData={orderData} 
          setOrderData={setOrderData} 
          total={calculateTotal()} 
        />}
        {currentStep === 5 && <OrderSummary 
          orderSummary={orderSummary}
          isLoading={isLoadingOrderSummary}
          formatPrice={formatPrice}
        />}
      </div>

      <div className="order-actions">
        {currentStep > 1 && (
          <button className="btn-secondary" onClick={prevStep}>
            Quay lại
          </button>
        )}
        {currentStep < 5 ? (
          <button className="btn-primary" onClick={nextStep} disabled={!canProceedToNextStep()}>
            Tiếp tục
          </button>
        ) : (
          <button className="btn-success" onClick={submitOrder}>
            Tạo đơn hàng
          </button>
        )}
      </div>

      {/* Modal cập nhật số lượng xe */}
      {showUpdateQuantityModal && (
        <div className="modal-overlay" onClick={() => setShowUpdateQuantityModal(false)}>
          <div className="modal-content update-quantity-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Cập nhật số lượng xe</h3>
              <button className="modal-close" onClick={() => setShowUpdateQuantityModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="update-quantity-info">
                <p><strong>Xe:</strong> {updateQuantityData.vehicleName}</p>
                <p><strong>Màu:</strong> {updateQuantityData.color}</p>
                <p><strong>Số lượng hiện tại:</strong> {updateQuantityData.currentQuantity} xe</p>
                <p><strong>Tồn kho:</strong> {updateQuantityData.actualStock} xe</p>
                <p><strong>Tối đa có thể cập nhật:</strong> {updateQuantityData.maxQuantity} xe</p>
              </div>
              <div className="form-group">
                <label>Số lượng mới *</label>
                <div className="quantity-input-group">
                  <button 
                    className="quantity-btn"
                    onClick={() => setUpdateQuantityData(prev => ({
                      ...prev,
                      newQuantity: Math.max(1, prev.newQuantity - 1)
                    }))}
                    disabled={updateQuantityData.newQuantity <= 1 || isUpdatingQuantity}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={updateQuantityData.newQuantity}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      setUpdateQuantityData(prev => ({
                        ...prev,
                        newQuantity: Math.min(Math.max(1, value), prev.maxQuantity)
                      }));
                    }}
                    min="1"
                    max={updateQuantityData.maxQuantity}
                    className="quantity-input"
                    disabled={isUpdatingQuantity}
                  />
                  <button 
                    className="quantity-btn"
                    onClick={() => setUpdateQuantityData(prev => ({
                      ...prev,
                      newQuantity: Math.min(prev.maxQuantity, prev.newQuantity + 1)
                    }))}
                    disabled={updateQuantityData.newQuantity >= updateQuantityData.maxQuantity || isUpdatingQuantity}
                  >
                    +
                  </button>
                </div>
                <span className="quantity-hint">
                  Tối đa: {updateQuantityData.maxQuantity} xe
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-cancel" 
                onClick={() => setShowUpdateQuantityModal(false)}
                disabled={isUpdatingQuantity}
              >
                Hủy
              </button>
              <button 
                className="btn-confirm" 
                onClick={handleUpdateQuantity}
                disabled={isUpdatingQuantity || updateQuantityData.newQuantity === updateQuantityData.currentQuantity}
              >
                {isUpdatingQuantity ? 'Đang cập nhật...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal danh sách khách hàng */}
      {showCustomerListModal && (
        <div className="modal-overlay-customer" onClick={() => setShowCustomerListModal(false)}>
          <div className="modal-content-customer" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-customer">
              <h3>Danh sách khách hàng</h3>
              <button className="close-modal-btn" onClick={() => setShowCustomerListModal(false)}>×</button>
            </div>
            <div className="modal-body-customer">
              {isLoadingCustomers ? (
                <div className="loading-spinner-container">
                  <div className="spinner"></div>
                  <p>Đang tải danh sách khách hàng...</p>
                </div>
              ) : customerListError ? (
                <div className="error-message-customer">{customerListError}</div>
              ) : allCustomers.length === 0 ? (
                <div className="empty-customer-list">
                  <p>Chưa có khách hàng nào trong hệ thống</p>
                </div>
              ) : (
                <>
                  <div className="customer-search-box">
                    <label>
                      🔍 Tìm kiếm theo số điện thoại:
                    </label>
                    <input
                      type="text"
                      placeholder="Nhập số điện thoại để tìm kiếm..."
                      value={customerSearchPhone}
                      onChange={(e) => setCustomerSearchPhone(e.target.value)}
                    />
                    {customerSearchPhone && (
                      <div className="customer-search-results">
                        Tìm thấy: <strong>{allCustomers.filter(c => 
                          c.phoneNumber.includes(customerSearchPhone)
                        ).length}</strong> khách hàng
                      </div>
                    )}
                  </div>
                  <div className="customer-list-table">
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Họ và tên</th>
                          <th>Số điện thoại</th>
                          <th>Email</th>
                          <th>Hành động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allCustomers
                          .filter(customer => 
                            customerSearchPhone === '' || 
                            customer.phoneNumber.includes(customerSearchPhone)
                          )
                          .map(customer => (
                            <tr key={customer.customerId}>
                              <td>{customer.customerId}</td>
                              <td>{customer.fullName}</td>
                              <td>{customer.phoneNumber}</td>
                              <td>{customer.email}</td>
                              <td>
                                <button 
                                  className="btn-select-customer"
                                  onClick={() => selectCustomerFromList(customer)}
                                >
                                  Lấy thông tin
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {allCustomers.filter(c => 
                      customerSearchPhone === '' || 
                      c.phoneNumber.includes(customerSearchPhone)
                    ).length === 0 && customerSearchPhone && (
                      <div className="no-customer-found">
                        <p>
                          Không tìm thấy khách hàng với số điện thoại: <strong>{customerSearchPhone}</strong>
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ĐÃ XÓA TRẢ GÓP - Chỉ còn Trả thẳng
const PaymentStep = ({ orderData, setOrderData, total }) => {
  const formatPrice = (price) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  return (
    <div className="step-content">
      <h3>Phương thức thanh toán</h3>
      
      {/* Phương thức tài chính */}
      <div className="payment-options">
        <h4>Hình thức tài chính</h4>
        <div className="payment-method">
          <label>
            <input
              type="radio"
              name="financingMethod"
              value="Trả thẳng"
              checked={true}
              readOnly
            />
            Trả thẳng (Thanh toán toàn bộ)
          </label>
          <p>Thanh toán 100% giá trị xe ngay khi ký hợp đồng</p>
        </div>
      </div>
      
      {/* Ghi chú */}
      <div className="form-group full-width">
        <label>Ghi chú (tùy chọn)</label>
        <textarea
          value={orderData.financing.note}
          onChange={(e) => setOrderData(prev => ({
            ...prev,
            financing: { ...prev.financing, note: e.target.value }
          }))}
          placeholder="Nhập ghi chú cho thanh toán..."
          rows={3}
        />
      </div>
      
      <div className="total-summary">
        <h4>Tổng giá trị đơn hàng: {formatPrice(total)}</h4>
      </div>
    </div>
  );
};

// Các components còn lại giữ nguyên
const CustomerInfoStep = ({ orderData, handleChange, isLoadingCustomer, customerError, onShowCustomerList }) => (
  <div className="step-content">
    <div className="customer-info-header">
      <h3>Thông tin khách hàng</h3>
      <button 
        className="btn-show-customer-list"
        onClick={onShowCustomerList}
        type="button"
      >
         Danh sách khách hàng
      </button>
    </div>
    {isLoadingCustomer && (
      <div className="customer-loading-notice">
        <p className="customer-loading-text">Đang tải thông tin khách hàng...</p>
      </div>
    )}
    {customerError && (
      <div className="customer-error-notice">
        <p>
          {customerError}
        </p>
      </div>
    )}
    <div className="form-grid">
      {[
        { key: 'name', label: 'Họ và tên *', type: 'text', placeholder: 'Nhập họ và tên (chỉ chữ cái)' },
        { key: 'phone', label: 'Số điện thoại *', type: 'tel', placeholder: 'Nhập số điện thoại (10-11 số)' },
        { key: 'email', label: 'Email *', type: 'email', placeholder: 'Nhập email (example@gmail.com)' }
      ].map(({ key, label, type, placeholder }) => (
        <div key={key} className="form-group">
          <label>{label}</label>
          <input
            type={type}
            value={orderData.customer[key]}
            onChange={(e) => handleChange(key, e.target.value)}
            placeholder={placeholder}
            disabled={isLoadingCustomer}
            className={customerError ? 'customer-search-error' : ''}
          />
        </div>
      ))}
    </div>
    {!customerError && (
      <div className="customer-note-box">
        <p className="customer-note-title"><strong>Lưu ý:</strong></p>
        <ul className="customer-note-list">
          <li>Họ tên: Chỉ chứa chữ cái và khoảng trắng</li>
          <li>Số điện thoại: Phải có 10 hoặc 11 chữ số (tự động tìm khách hàng cũ)</li>
          <li>Email: Phải đúng định dạng và chưa được sử dụng</li>
          <li><strong>Hoặc bấm "Danh sách khách hàng" để chọn từ khách hàng có sẵn</strong></li>
        </ul>
      </div>
    )}
  </div>
);

const VehicleSelectionStep = ({ 
  vehicles, selectedVehicles, searchTerm, selectedSeries, vehicleSeries,
  onSearchChange, onSeriesChange, addVehicleToCart, removeVehicleFromCart, openUpdateQuantityModal,
  isLoadingVehicles, vehiclesError, customizationRef
}) => {
  const [tempSelectedVehicle, setTempSelectedVehicle] = useState(null);
  const [tempColor, setTempColor] = useState('');
  const [tempQuantity, setTempQuantity] = useState(1);

  const formatPrice = (price) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  const handleAddToCart = () => {
    if (tempSelectedVehicle && tempColor && tempQuantity > 0) {
      addVehicleToCart(tempSelectedVehicle, tempColor, tempQuantity);
      setTempSelectedVehicle(null);
      setTempColor('');
      setTempQuantity(1);
    }
  };

  const handleVehicleSelect = (vehicle) => {
    setTempSelectedVehicle(vehicle);
    setTempColor(vehicle.colors[0]);
    
    // Scroll xuống phần cấu hình xe sau một chút delay để UI cập nhật
    setTimeout(() => {
      if (customizationRef && customizationRef.current) {
        customizationRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 100);
  };

  const getCurrentImage = (vehicle, color) => vehicle.images?.[color] || vehicle.defaultImage;
  
  // Get price from colorPricesRaw (dealerPrice) - giống VehicleInfoFeature
  const getVehiclePrice = (vehicle, color) => {
    if (vehicle.colorPricesRaw && Array.isArray(vehicle.colorPricesRaw)) {
      const colorObj = vehicle.colorPricesRaw.find(c => c.colorName === color);
      if (colorObj && colorObj.dealerPrice != null) {
        return colorObj.dealerPrice;
      }
    }
    // Fallback to colorPrices
    return vehicle.colorPrices?.[color] || vehicle.price || 0;
  };
  
  // Get quantity for specific color
  const getColorQuantity = (vehicle, color) => {
    return vehicle.colorQuantities?.[color] || 0;
  };

  return (
    <div className="step-content">
      <h3>Chọn xe</h3>
      
      {isLoadingVehicles && (
        <div className="loading-vehicles-box">
          <div className="spinner spinner-centered"></div>
          <p>Đang tải danh sách xe...</p>
        </div>
      )}
      
      {vehiclesError && (
        <div className="error-message-box">
          <p className="error-message-text">
            ⚠️ {vehiclesError}
          </p>
        </div>
      )}
      
      <div className="vehicle-search-section">
        <div className="search-controls">
          <div className="search-input-group">
            <input
              type="text"
              placeholder="Tìm kiếm xe (VF8, Plus, Eco...)"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="search-input"
              disabled={isLoadingVehicles}
            />
          </div>
          <div className="filter-group">
            <select 
              value={selectedSeries} 
              onChange={(e) => onSeriesChange(e.target.value)} 
              className="series-filter"
              disabled={isLoadingVehicles}
            >
              <option value="">Tất cả dòng xe</option>
              {vehicleSeries.map(series => (
                <option key={series} value={series}>{series}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="search-results">Tìm thấy {vehicles.length} xe phù hợp</div>
      </div>

      <div className="vehicle-selection-grid">
        {vehicles.map(vehicle => {
          const vehicleId = vehicle.maXe || vehicle.id;
          const isSelected = tempSelectedVehicle && (tempSelectedVehicle.maXe === vehicleId || tempSelectedVehicle.id === vehicleId);
          
          return (
            <div 
              key={vehicleId} 
              className={`vehicle-option ${isSelected ? 'selected' : ''}`}
              onClick={() => handleVehicleSelect(vehicle)}
            >
              <img 
                src={getCurrentImage(vehicle, vehicle.colors[0])} 
                alt={`${vehicle.name}`}
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/300x200?text=VinFast';
                }}
              />
              <div className="vehicle-option-info">
                <h4>{vehicle.name}</h4>
                <div className="price">
                  Từ {formatPrice(
                    Math.min(...vehicle.colors.map(color => getVehiclePrice(vehicle, color)))
                  )}
                </div>
                <div className="stock">Còn {vehicle.stock} xe</div>
                
                <div className="vehicle-colors">
                  <span className="colors-label">Màu sắc:</span>
                  <div className="colors-list">
                    {vehicle.colors.map((color, idx) => (
                      <span key={`${vehicleId}-${color}-${idx}`} className="color-tag-simple">{color}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {tempSelectedVehicle && (
        <div className="vehicle-customization" ref={customizationRef}>
          <div className="customization-section">
            <h4>Cấu hình xe: {tempSelectedVehicle.name}</h4>
            
            <div className="customization-controls">
              <div className="color-selection">
                <label>Chọn màu sắc:</label>
                <div className="color-options">
                  {tempSelectedVehicle.colors.map(color => (
                    <button
                      key={color}
                      className={`color-option-visual ${tempColor === color ? 'selected' : ''}`}
                      onClick={() => setTempColor(color)}
                    >
                      <div className={`color-swatch color-${color.toLowerCase().replace(/ /g, '-')}`}></div>
                      <span>{color}</span>
                    </button>
                  ))}
                </div>
                <div className="vehicle-preview">
                  <img 
                    src={getCurrentImage(tempSelectedVehicle, tempColor)} 
                    alt={`${tempSelectedVehicle.name} - ${tempColor}`}
                    className="vehicle-preview-image"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/400x250?text=VinFast';
                    }}
                  />
                </div>
              </div>
              
              <div className="quantity-selection">
                <div className="price-display">
                  <label>Giá niêm yết:</label>
                  <div className="listed-price">
                    {formatPrice(getVehiclePrice(tempSelectedVehicle, tempColor))}
                  </div>
                </div>
                <label>Số lượng:</label>
                <div className="stock-availability">
                  Tồn kho màu {tempColor}: <strong>{getColorQuantity(tempSelectedVehicle, tempColor)} xe</strong>
                </div>
                <div className="quantity-controls">
                  <button 
                    className="quantity-btn"
                    onClick={() => setTempQuantity(Math.max(1, tempQuantity - 1))}
                    disabled={tempQuantity <= 1}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={tempQuantity}
                    onChange={(e) => setTempQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                    max={getColorQuantity(tempSelectedVehicle, tempColor)}
                    className="quantity-input"
                  />
                  <button 
                    className="quantity-btn"
                    onClick={() => setTempQuantity(Math.min(getColorQuantity(tempSelectedVehicle, tempColor), tempQuantity + 1))}
                    disabled={tempQuantity >= getColorQuantity(tempSelectedVehicle, tempColor)}
                  >
                    +
                  </button>
                </div>
                <span className="quantity-limit">
                  Tối đa: {getColorQuantity(tempSelectedVehicle, tempColor)} xe
                </span>
              </div>
            </div>
            
            <div className="selection-summary">
              <div className="summary-item"><strong>Xe:</strong> {tempSelectedVehicle.name}</div>
              <div className="summary-item"><strong>Màu:</strong> {tempColor}</div>
              <div className="summary-item"><strong>Số lượng:</strong> {tempQuantity} xe</div>
              <div className="summary-item total-price">
                <strong>Thành tiền:</strong> {formatPrice(getVehiclePrice(tempSelectedVehicle, tempColor) * tempQuantity)}
              </div>
              <button 
                className="add-to-cart-btn"
                onClick={handleAddToCart}
                disabled={!tempColor || tempQuantity <= 0}
              >
                Thêm vào giỏ hàng
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedVehicles.length > 0 && (
        <div className="shopping-cart">
          <h4>Giỏ hàng ({selectedVehicles.length} mặt hàng)</h4>
          <div className="cart-items">
            {selectedVehicles.map((item, index) => (
              <div key={index} className="cart-item">
                <div className="cart-item-image">
                  <img 
                    src={getCurrentImage(item.vehicle, item.color)} 
                    alt={`${item.vehicle.name} ${item.vehicle.variant} - ${item.color}`}
                    className="cart-item-thumbnail"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/120x80?text=VinFast+' + item.vehicle.name.split(' ')[1];
                    }}
                  />
                </div>
                <div className="cart-item-info">
                  <h5>{item.vehicle.name}</h5>
                  <p>Màu: {item.color}</p>
                  <p>Đơn giá: {formatPrice(item.colorPrice)}</p>
                  <p>Số lượng: {item.quantity}</p>
                  <p className="cart-item-price">Thành tiền: {formatPrice(item.colorPrice * item.quantity)}</p>
                </div>
                <div className="cart-item-controls">
                  <button 
                    className="update-quantity-btn"
                    onClick={() => openUpdateQuantityModal(index)}
                  >
                    Cập nhật số lượng
                  </button>
                  <button 
                    className="remove-btn"
                    onClick={() => removeVehicleFromCart(index)}
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="cart-total">
            <h4>Tổng cộng: {formatPrice(selectedVehicles.reduce((sum, item) => sum + (item.colorPrice * item.quantity), 0))}</h4>
          </div>
        </div>
      )}
    </div>
  );
};

const PromotionStep = ({ promotions, selectedPromotion, onSelect, isLoading, error }) => (
  <div className="step-content">
    <h3>Chọn chương trình khuyến mãi (tùy chọn)</h3>
    
    {isLoading ? (
      <div className="loading-spinner-container">
        <div className="spinner"></div>
        <p>Đang tải danh sách khuyến mãi...</p>
      </div>
    ) : error ? (
      <div className="promotion-error-container">
        <p>
          {error}
        </p>
        <p className="discount-hint">
          Nếu bạn không muốn áp dụng khuyến mãi, hãy bấm "Tiếp tục" để qua bước tiếp theo.
        </p>
      </div>
    ) : promotions.length === 0 ? (
      <div className="empty-promotion-box">
        <h4 className="empty-promotion-title">Không có khuyến mãi nào</h4>
        <p className="empty-promotion-text">Hiện tại đại lý chưa có chương trình khuyến mãi nào đang hoạt động.</p>
      </div>
    ) : (
      <div className="promotions-grid">
        <div 
          className={`promotion-item ${!selectedPromotion ? 'selected' : ''}`}
          onClick={() => onSelect(null)}
        >
          <div className="promotion-info">
            <h4>Không áp dụng khuyến mãi</h4>
            <div className="promotion-desc">Giá niêm yết gốc</div>
          </div>
          <div className="promotion-checkbox">
            {!selectedPromotion ? '✓' : ''}
          </div>
        </div>
        
        {promotions.map(promotion => (
          <div 
            key={promotion.promotionId} 
            className={`promotion-item ${selectedPromotion?.promotionId === promotion.promotionId ? 'selected' : ''}`}
            onClick={() => onSelect(promotion)}
          >
            <div className="promotion-info">
              <h4>{promotion.promotionName}</h4>
              <div className="promotion-desc">{promotion.description}</div>
              <div className="promotion-value">
                Giảm: {promotion.type === 'VND' 
                  ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(promotion.value)
                  : `${promotion.value}%`
                }
              </div>
              <div className="promotion-period">
                Từ {new Date(promotion.startDate).toLocaleDateString('vi-VN')} đến {new Date(promotion.endDate).toLocaleDateString('vi-VN')}
              </div>
              <div className={`promotion-status-badge ${promotion.status === 'Đang hoạt động' ? 'active-status' : 'inactive-status'}`}>
                {promotion.status}
              </div>
            </div>
            <div className="promotion-checkbox">
              {selectedPromotion?.promotionId === promotion.promotionId ? '✓' : ''}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

const OrderSummary = ({ orderSummary, isLoading, formatPrice }) => {
  if (isLoading) {
    return (
      <div className="step-content">
        <h3>Xác nhận đơn hàng</h3>
        <p className="modal-loading-text">Đang tải thông tin đơn hàng...</p>
      </div>
    );
  }

  if (!orderSummary) {
    return (
      <div className="step-content">
        <h3>Xác nhận đơn hàng</h3>
        <p className="modal-error-text">
          Không thể tải thông tin đơn hàng
        </p>
      </div>
    );
  }
  
  return (
    <div className="step-content">
      <h3>Xác nhận đơn hàng</h3>
      <div className="order-summary">
        <div className="summary-section">
          <h4>Thông tin khách hàng</h4>
          <p><strong>Tên:</strong> {orderSummary.customer.customerName}</p>
          <p><strong>Điện thoại:</strong> {orderSummary.customer.customerPhone}</p>
          <p><strong>Email:</strong> {orderSummary.customer.customerEmail}</p>
        </div>
        
        <div className="summary-section">
          <h4>Xe đã chọn</h4>
          <div className="selected-vehicles-list">
            {orderSummary.orderDetails.map((detail, index) => (
              <div key={index} className="selected-vehicle-item">
                <p><strong>{detail.carName}</strong></p>
                <p>Dòng xe: {detail.modelName} {detail.variantName}</p>
                <p>Màu sắc: {detail.colorName}</p>
                <p>Số lượng: {detail.quantity} xe</p>
                <p>Thành tiền: {formatPrice(detail.finalPrice)}</p>
                <hr />
              </div>
            ))}
          </div>
          {orderSummary.orderInfo.promotionName && (
            <div className="promotion-box">
              <p className="order-detail-item">
                <strong>Khuyến mãi:</strong> {orderSummary.orderInfo.promotionName}
              </p>
            </div>
          )}
        </div>
        
        <div className="summary-section">
          <h4>Thanh toán</h4>
          <p><strong>Hình thức:</strong> {orderSummary.orderInfo.paymentMethod}</p>
          <p><strong>Ngày đặt:</strong> {new Date(orderSummary.orderInfo.orderDate).toLocaleString('vi-VN')}</p>
          <p><strong>Trạng thái:</strong> <span className={`order-status-badge ${orderSummary.orderInfo.status === 'Chưa xác nhận' ? 'status-pending' : 'status-confirmed'}`}>{orderSummary.orderInfo.status}</span></p>
        </div>
        
        <div className="summary-section summary-payment-box">
          <div className="summary-row">
            <span><strong>Tạm tính:</strong></span>
            <span>{formatPrice(orderSummary.orderInfo.subTotal)}</span>
          </div>
          
          {orderSummary.orderInfo.discountAmount > 0 && (
            <div className="summary-row discount-row">
              <span><strong>Giảm giá:</strong></span>
              <span>- {formatPrice(orderSummary.orderInfo.discountAmount)}</span>
            </div>
          )}
          
          <hr className="summary-divider" />
          
          <div className="summary-row total-row">
            <span>Tổng thanh toán:</span>
            <span>{formatPrice(orderSummary.orderInfo.totalAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateOrderFeature;