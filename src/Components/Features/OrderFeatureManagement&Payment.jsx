import React, { useState, useEffect } from 'react';
import './OrderFeatureManagement&Payment.css';
import {
  getAllDealerOrders,
  createPayment,
  deletePayment,
  getPaymentsByOrderId,
  updatePaymentStatus,
  updatePaymentMethod,
  updateOrderStatus,
  getOrderById
} from '../../services/carVariantApi';
import { showNotification } from '../Notification';

const OrderFeatureManagementPayment = () => {
  const [orders, setOrders] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMethod, setFilterMethod] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(null); // Track which order is being processed

  // Payment form modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [paymentFormData, setPaymentFormData] = useState({
    paymentId: null,
    method: 'Tiền mặt',
    note: '',
    isExisting: false
  });
  const [paymentFormLoading, setPaymentFormLoading] = useState(false);

  // Payment list modal states (hiển thị danh sách thanh toán của đơn hàng)
  const [showPaymentListModal, setShowPaymentListModal] = useState(false);
  const [currentPayments, setCurrentPayments] = useState([]);
  const [paymentListLoading, setPaymentListLoading] = useState(false);
  const [currentOrderStatus, setCurrentOrderStatus] = useState(''); // Lưu trạng thái đơn hàng

  // Update payment modal states
  const [showUpdatePaymentModal, setShowUpdatePaymentModal] = useState(false);
  const [updatePaymentData, setUpdatePaymentData] = useState({
    paymentId: null,
    method: 'Tiền mặt',
    note: ''
  });
  const [updatePaymentLoading, setUpdatePaymentLoading] = useState(false);

  // Confirm dialog states
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'Xác nhận',
    cancelText: 'Hủy',
    type: 'warning' // success, warning, error, info
  });

  // Cache key constant (để xóa cache cũ khi load orders)
  const PAYMENT_CACHE_KEY = 'dealer_payment_cache';

  // Load orders từ API khi component mount
  useEffect(() => {
    loadOrders();

    // Tắt auto-refresh để tránh reload liên tục
    // Người dùng có thể dùng nút "Làm mới" để refresh thủ công
    // const interval = setInterval(loadOrders, 30000);
    // return () => clearInterval(interval);
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      // Clear payment cache khi load orders để tránh hiển thị data cũ
      localStorage.removeItem(PAYMENT_CACHE_KEY);

      const response = await getAllDealerOrders();

      // Transform API data to match expected format
      const transformedOrders = response.map(order => {
        const orderInfo = order.orderInfo || {};
        const customer = order.customer || {};
        const dealer = order.dealer || {};
        const orderDetails = order.orderDetails || [];

        return {
          paymentId: orderInfo.orderId,
          orderId: orderInfo.orderId,
          orderCode: `ORD-${String(orderInfo.orderId).padStart(6, '0')}`,
          customerName: customer.customerName,
          customerEmail: customer.customerEmail,
          customerPhone: customer.customerPhone,
          dealerName: dealer.dealerName,
          dealerAddress: dealer.dealerAddress,
          dealerPhone: dealer.dealerPhone,
          subTotal: orderInfo.subTotal || 0,
          discountAmount: orderInfo.discountAmount || 0,
          total: orderInfo.totalAmount || 0,
          paymentMethod: orderInfo.paymentMethod,
          createdDate: orderInfo.orderDate,
          completedDate: orderInfo.completedDate,
          status: orderInfo.status,
          promotionId: orderInfo.promotionId,
          promotionName: orderInfo.promotionName,
          vehicles: orderDetails.map(detail => ({
            orderDetailId: detail.orderDetailId,
            carId: detail.carId,
            name: detail.carName,
            modelName: detail.modelName,
            variant: detail.variantName,
            color: detail.colorName,
            quantity: detail.quantity,
            unitPrice: detail.unitPrice,
            finalPrice: detail.finalPrice,
            totalPrice: detail.finalPrice
          }))
        };
      });

      setOrders(transformedOrders);
    } catch (error) {
      setError(error.message || 'Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  // Sử dụng trực tiếp orders, không cần transform lại
  const payments = orders;

  // Lọc đơn hàng
  const filteredPayments = payments.filter(payment => {
    const searchLower = searchTerm.toLowerCase();
    const paymentIdStr = payment.paymentId ? payment.paymentId.toString() : '';
    const orderCodeStr = payment.orderCode ? payment.orderCode.toLowerCase() : '';
    const customerNameStr = payment.customerName ? payment.customerName.toLowerCase() : '';

    const matchesSearch = paymentIdStr.includes(searchTerm) ||
      orderCodeStr.includes(searchLower) ||
      customerNameStr.includes(searchLower);

    const matchesStatus = filterStatus === 'all' || payment.status === filterStatus;
    const matchesMethod = filterMethod === 'all' || payment.paymentMethod === filterMethod;

    return matchesSearch && matchesStatus && matchesMethod;
  });

  // Format tiền tệ
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  // Format ngày giờ
  const formatDateTime = (dateTime) => {
    return new Date(dateTime).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Render status badge - CHỈ HIỂN THỊ ORDER STATUS (không còn payment status)
  const renderStatusBadge = (status) => {
    const statusConfig = {
      'Chưa xác nhận': { text: 'Chưa xác nhận', class: 'status-pending' },
      'Chưa thanh toán': { text: 'Chưa thanh toán', class: 'status-unpaid' },
      'Đã Thanh Toán': { text: 'Đã Thanh Toán', class: 'status-success' },
      'Đã thanh toán': { text: 'Đã thanh toán', class: 'status-success' },
      'Đã Hủy': { text: 'Đã Hủy', class: 'status-failed' },
      'Đã hủy': { text: 'Đã hủy', class: 'status-failed' }
    };

    const config = statusConfig[status] || { text: status, class: 'status-pending' };
    return <span className={`status-badge ${config.class}`}>{config.text}</span>;
  };

  // Render method badge
  const renderMethodBadge = (method) => {
    const methodConfig = {
      'Tiền mặt': { class: 'method-cash' },
      'Trả thẳng': { class: 'method-cash' },
      'Thanh toán trả góp': { class: 'method-ewallet' }
    };

    const config = methodConfig[method] || {class: 'method-other' };
    return (
      <span className={`method-badge ${config.class}`}>
        {method || 'Chưa xác định'}
      </span>
    );
  };

  // Xử lý mở danh sách thanh toán
  const handleOpenPaymentList = async (orderId, orderStatus) => {
    setCurrentOrderId(orderId);
    setCurrentOrderStatus(orderStatus);
    setShowPaymentListModal(true);
    setPaymentListLoading(true);

    try {
      // KHÔNG dùng cache nữa - Luôn gọi API để lấy data mới nhất
      const payments = await getPaymentsByOrderId(orderId);

      if (payments && payments.length > 0) {
        setCurrentPayments(payments);
      } else {
        setCurrentPayments([]);
      }
    } catch (error) {
      setCurrentPayments([]);
      showNotification(`Lỗi: ${error.message}`, 'error');
    } finally {
      setPaymentListLoading(false);
    }
  };

  // Đóng danh sách thanh toán
  const handleClosePaymentList = () => {
    setShowPaymentListModal(false);
    setCurrentOrderId(null);
    setCurrentOrderStatus('');
    setCurrentPayments([]);
  };

  // Xử lý mở form tạo thanh toán mới
  const handleOpenCreatePaymentForm = () => {
    setShowPaymentListModal(false); // Đóng danh sách
    setShowPaymentModal(true); // Mở form tạo mới
    setPaymentFormData({
      paymentId: null,
      method: 'Tiền mặt',
      note: '',
      isExisting: false
    });
  };

  // Đóng form thanh toán
  const handleClosePaymentForm = () => {
    setShowPaymentModal(false);
    setCurrentOrderId(null);
    setPaymentFormData({
      paymentId: null,
      method: 'Tiền mặt',
      note: '',
      isExisting: false
    });
  };

  // Xử lý thay đổi input trong form
  const handlePaymentFormChange = (field, value) => {
    setPaymentFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

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

  // Xử lý tạo payment mới
  const handleCreatePayment = async () => {
    if (!currentOrderId) return;

    showConfirm(
      'Xác nhận tạo thanh toán',
      'Bạn có chắc chắn muốn tạo thanh toán cho đơn hàng này?',
      async () => {
        try {
          setPaymentFormLoading(true);

      const paymentData = {
        orderId: currentOrderId,
        method: paymentFormData.method,
        note: paymentFormData.note
      };

      const result = await createPayment(paymentData);

      const paymentInfo = `Payment ID: ${result.paymentId}
Order ID: ${result.orderId}
Số tiền: ${formatCurrency(result.amount)}
Ngày thanh toán: ${formatDateTime(result.paymentDate)}
Phương thức: ${result.method}
Trạng thái: ${result.status}
Ghi chú: ${result.note}

${result.message}`;

      showNotification(paymentInfo, 'success', 5000);

          // Reload orders
          await loadOrders();

          // Đóng form và mở lại danh sách (không cần cache nữa vì đã luôn gọi API)
          handleClosePaymentForm();
          await handleOpenPaymentList(currentOrderId, currentOrderStatus);

        } catch (error) {
          showNotification(`Lỗi tạo thanh toán: ${error.message}`, 'error');
        } finally {
          setPaymentFormLoading(false);
        }
      }
    );
  };

  // Xử lý xóa payment
  const handleDeletePayment = async (paymentId) => {
    if (!paymentId) return;

    showConfirm(
      'Xác nhận xóa thanh toán',
      'Bạn có chắc chắn muốn XÓA thanh toán này?\n\nHành động này không thể hoàn tác!',
      async () => {
        try {
          setPaymentListLoading(true);

      const result = await deletePayment(paymentId);

      showNotification(result.message || 'Xóa thanh toán thành công!', 'success');

      // Reload orders
      await loadOrders();

          // Reload payment list để lấy data mới nhất từ API
          if (currentOrderId) {
            await handleOpenPaymentList(currentOrderId, currentOrderStatus);
          }

        } catch (error) {
          showNotification(`Lỗi xóa thanh toán: ${error.message}`, 'error');
        } finally {
          setPaymentListLoading(false);
        }
      },
      'error'
    );
  };

  // Xử lý cập nhật trạng thái thanh toán (Chờ xử lý -> Hoàn thành)
  const handleUpdatePaymentStatus = async (paymentId, currentStatus) => {
    if (!paymentId) return;

    // Chỉ cho phép cập nhật từ "Chờ xử lý" -> "Hoàn thành"
    if (currentStatus === 'Hoàn thành') {
      showNotification('Thanh toán này đã được hoàn thành!', 'info');
      return;
    }

    showConfirm(
      'Xác nhận thanh toán',
      'Xác nhận khách hàng đã thanh toán?\n\nTrạng thái sẽ được chuyển sang "Hoàn thành".',
      async () => {
        try {
          setPaymentListLoading(true);

      const result = await updatePaymentStatus(paymentId, {
        status: 'Hoàn thành',
        note: 'Khách hàng đã thanh toán'
      });

      const statusInfo = `Payment ID: ${result.paymentId}
Trạng thái: ${result.status}
Order Status: ${result.orderStatus}

${result.message}`;

      showNotification(statusInfo, 'success', 4000);

      // Reload orders để cập nhật order status
      await loadOrders();

          // Reload payment list để lấy data mới nhất từ API
          if (currentOrderId) {
            await handleOpenPaymentList(currentOrderId, currentOrderStatus);
          }

        } catch (error) {
          showNotification(`Lỗi cập nhật trạng thái: ${error.message}`, 'error');
        } finally {
          setPaymentListLoading(false);
        }
      },
      'success'
    );
  };

  // Xử lý mở modal cập nhật phương thức thanh toán
  const handleOpenUpdatePayment = (payment) => {
    setUpdatePaymentData({
      paymentId: payment.paymentId,
      method: payment.method,
      note: payment.note || ''
    });
    setShowUpdatePaymentModal(true);
  };

  // Xử lý đóng modal cập nhật
  const handleCloseUpdatePayment = () => {
    setShowUpdatePaymentModal(false);
    setUpdatePaymentData({
      paymentId: null,
      method: 'Tiền mặt',
      note: ''
    });
  };

  // Xử lý cập nhật phương thức thanh toán
  const handleUpdatePayment = async () => {
    if (!updatePaymentData.paymentId) return;

    showConfirm(
      'Xác nhận cập nhật',
      'Xác nhận cập nhật thông tin thanh toán?',
      async () => {
        try {
          setUpdatePaymentLoading(true);

      const result = await updatePaymentMethod(updatePaymentData.paymentId, {
        method: updatePaymentData.method,
        note: updatePaymentData.note
      });

      const updateInfo = `Payment ID: ${result.paymentId}
Phương thức: ${result.method}
Số tiền: ${formatCurrency(result.amount)}`;

      showNotification(updateInfo, 'success');

      // Đóng modal và reload
      handleCloseUpdatePayment();
      await loadOrders();

          // Reload payment list để lấy data mới nhất từ API
          if (currentOrderId) {
            await handleOpenPaymentList(currentOrderId, currentOrderStatus);
          }

        } catch (error) {
          showNotification(`Lỗi cập nhật thanh toán: ${error.message}`, 'error');
        } finally {
          setUpdatePaymentLoading(false);
        }
      }
    );
  };

  // Hủy đơn hàng
  const handleRejectOrder = async (orderId) => {
    showConfirm(
      'Xác nhận hủy đơn hàng',
      'Bạn có chắc chắn muốn hủy đơn hàng này?\n\nSố lượng xe trong đơn hàng sẽ được hoàn trả về kho.',
      async () => {
        try {
          // API sẽ tự động cập nhật lại số lượng xe khi chuyển trạng thái sang "Đã hủy"
          await updateOrderStatus(orderId, 'Đã hủy');
          await loadOrders(); // Reload data để hiển thị trạng thái mới
          showNotification('Hủy đơn hàng thành công!\n\nSố lượng xe đã được hoàn trả về kho.', 'success');
        } catch (error) {
          showNotification('Lỗi khi hủy đơn hàng: ' + error.message, 'error');
        }
      },
      'error'
    );
  };

  // Tiếp tục xử lý đơn hàng Chưa xác nhận
  const handleContinueOrder = (orderId) => {
    // Lưu orderId vào sessionStorage để CreateOrderFeature load lại
    sessionStorage.setItem('draftOrderId', orderId.toString());
    // Chuyển sang trang tạo đơn hàng
    window.location.hash = 'create-order';
  };

  return (
    <div className="order-management-payment-feature">
      {/* Header Section */}
      <div className="order-management-payment-header">
        <div className="order-management-header-content">
          <div className="order-management-header-icon">💳</div>
          <div className="order-management-header-text">
            <h2>Quản lý Đơn hàng & Thanh toán</h2>
            <p>Theo dõi và xử lý các giao dịch thanh toán đơn hàng ({orders.length} đơn hàng)</p>
          </div>
          <button
            className="refresh-btn-order"
            onClick={loadOrders}
            disabled={loading}
            title="Làm mới dữ liệu"
          >
            Làm mới
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="no-orders">
          <h3>Đang tải dữ liệu...</h3>
          <p>Vui lòng chờ trong giây lát</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="no-orders">
          <h3>Có lỗi xảy ra</h3>
          <p>{error}</p>
        </div>
      )}

      {/* Main Content - Only show when not loading and no error */}
      {!loading && !error && (
        <>
          {/* Search and Filter Controls */}
          <div className="order-management-controls">
            <div className="search-section">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Tìm kiếm theo Payment ID, Order ID, khách hàng..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>

            <div className="filter-section">
              <label className="filter-label">Trạng thái:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">Tất cả</option>
                <option value="Chưa thanh toán">Chưa thanh toán</option>
                <option value="Đã Thanh Toán">Đã Thanh Toán</option>
                <option value="Đã thanh toán">Đã thanh toán</option>
                <option value="Đã Hủy">Đã Hủy</option>
                <option value="Đã hủy">Đã hủy</option>
              </select>
            </div>

            <div className="filter-section">
              <label className="filter-label">Phương thức:</label>
              <select
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
                className="filter-select"
              >
                <option value="all">Tất cả</option>
                <option value="Trả thẳng">Trả thẳng</option>
              </select>
            </div>
          </div>

          {/* CARDS LAYOUT - THAY THẾ TABLE */}
          <div className="orders-content">
            <div className="orders-grid">
              {filteredPayments.map(payment => (
                <div key={payment.paymentId} className="order-card">
                  {/* Card Header */}
                  <div className="order-card-header">
                    <div className="order-code-section">
                      <h3>{payment.orderCode}</h3>
                      <span className="payment-id-badge">
                        ID: {payment.orderId}
                      </span>
                    </div>
                  </div>

                  {/* Customer Info Section */}
                  <div className="order-card-section customer-section">
                    <div className="section-icon">👤</div>
                    <div className="section-content">
                      <h4>Khách hàng</h4>
                      <div className="info-row">
                        <span className="info-label">Họ tên:</span>
                        <span className="info-value">{payment.customerName}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">SĐT:</span>
                        <span className="info-value">{payment.customerPhone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Vehicles Section */}
                  <div className="order-card-section vehicles-section">
                    <div className="section-content">
                      <h4>Xe đã đặt</h4>
                      <div className="vehicles-list">
                        {payment.vehicles.length > 0 ? (
                          <>
                            {payment.vehicles.slice(0, 1).map((vehicle, index) => (
                              <div key={index} className="vehicle-item">
                                <span className="vehicle-name">
                                  {vehicle.name}
                                </span>
                                <span className="vehicle-details">
                                  ({vehicle.color}) x{vehicle.quantity}
                                </span>
                              </div>
                            ))}
                            {payment.vehicles.length > 1 && (
                              <div className="more-vehicles">
                                +{payment.vehicles.length - 1} xe khác
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="vehicle-item">
                            <span className="vehicle-name vehicle-name-empty">
                              Chưa có xe nào
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Payment Info Section - Thêm grid layout */}
                  <div className="order-card-section payment-info-section">
                    <div className="payment-info-grid">
                      <div className="info-row">
                        <span className="info-label">Trạng thái:</span>
                        <span className="info-value">{renderStatusBadge(payment.status)}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Thanh toán:</span>
                        <span className="info-value">{renderMethodBadge(payment.paymentMethod)}</span>
                      </div>

                      {/* Nút quản lý thanh toán - chỉ hiển thị cho trạng thái cụ thể */}
                      {(payment.status === 'Đã thanh toán' ||
                        payment.status === 'Chưa thanh toán' ||
                        payment.status === 'Đang trả góp') && (
                          <button
                            className="btn-payment-inline"
                            onClick={() => handleOpenPaymentList(payment.orderId, payment.status)}
                            disabled={processingPayment === payment.orderId}
                          >
                            Quản lý thanh toán
                          </button>
                        )}
                    </div>
                  </div>

                  {/* Summary Section */}
                  <div className="order-card-summary">
                    <div className="summary-row total">
                      <span className="summary-label">Tổng tiền:</span>
                      <span className="summary-amount">{formatCurrency(payment.total)}</span>
                    </div>
                    {payment.discountAmount > 0 && payment.status !== 'Đang trả góp' && (
                      <div className="summary-row discount">
                        <span className="summary-label">Đã giảm:</span>
                        <span className="summary-value">{formatCurrency(payment.discountAmount)}</span>
                      </div>
                    )}

                    {/* Hiển thị số tiền KH đã trả cho đơn "Đang trả góp" */}
                    {payment.status === 'Đang trả góp' && (() => {
                      const completedAmount = currentPayments
                        .filter(p => p.status === 'Hoàn thành')
                        .reduce((sum, p) => sum + (p.amount || 0), 0);

                      return (
                        <div className="summary-row paid">
                          <span className="summary-label">KH đã trả:</span>
                          <span className="summary-value">
                            {formatCurrency(completedAmount)}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Actions - Nút tiếp tục xử lý, chi tiết và hủy */}
                  <div className="order-card-actions">
                    {payment.status === 'Chưa xác nhận' && (
                      <button
                        className="btn-primary btn-flex-1"
                        onClick={() => handleContinueOrder(payment.orderId)}
                      >
                        Tiếp tục xử lý
                      </button>
                    )}
                    {payment.status === 'Chưa thanh toán' && (
                      <button
                        className="btn-failed"
                        onClick={() => handleRejectOrder(payment.orderId)}
                      >
                        Hủy
                      </button>
                    )}
                    <button
                      className="btn-view-full"
                      onClick={() => setSelectedPayment(payment)}
                    >
                      Chi tiết
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filteredPayments.length === 0 && (
              <div className="no-orders">
                <h3>
                  {orders.length === 0 ?
                    'Chưa có đơn hàng nào' :
                    'Không tìm thấy đơn hàng phù hợp'
                  }
                </h3>
                <p>
                  {orders.length === 0 ?
                    'Chưa có đơn hàng nào được tạo. Hãy tạo đơn hàng mới để bắt đầu!' :
                    'Không tìm thấy giao dịch nào phù hợp với bộ lọc.'
                  }
                </p>
              </div>
            )}
          </div>

          {/* Payment Detail Modal - GIỮ NGUYÊN */}
          {selectedPayment && (
            <div className="modal-overlay" onClick={() => setSelectedPayment(null)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>Chi tiết đơn hàng #{selectedPayment.orderCode}</h3>
                  <button className="modal-close" onClick={() => setSelectedPayment(null)}>×</button>
                </div>

                <div className="modal-body">
                  <div className="order-summary">
                    <h4>Thông tin đơn hàng</h4>
                    <div className="summary-grid">
                      <div>Mã đơn hàng:</div>
                      <div><strong>{selectedPayment.orderCode}</strong></div>
                      <div>Trạng thái:</div>
                      <div>{renderStatusBadge(selectedPayment.status)}</div>
                      <div>Ngày tạo:</div>
                      <div>{formatDateTime(selectedPayment.createdDate)}</div>
                      {selectedPayment.completedDate && (
                        <>
                          <div>Ngày hoàn thành:</div>
                          <div>{formatDateTime(selectedPayment.completedDate)}</div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="order-summary">
                    <h4>Thông tin khách hàng</h4>
                    <div className="summary-grid">
                      <div>Họ tên:</div>
                      <div><strong>{selectedPayment.customerName}</strong></div>
                      <div>Số điện thoại:</div>
                      <div>{selectedPayment.customerPhone}</div>
                      <div>Email:</div>
                      <div>{selectedPayment.customerEmail}</div>
                    </div>
                  </div>

                  <div className="order-summary">
                    <h4>Thông tin đại lý</h4>
                    <div className="summary-grid">
                      <div>Tên đại lý:</div>
                      <div><strong>{selectedPayment.dealerName}</strong></div>
                      <div>Địa chỉ:</div>
                      <div>{selectedPayment.dealerAddress}</div>
                      <div>Số điện thoại:</div>
                      <div>{selectedPayment.dealerPhone}</div>
                    </div>
                  </div>

                  <div className="vehicles-detail">
                    <h4>Danh sách xe</h4>
                    {selectedPayment.vehicles && selectedPayment.vehicles.length > 0 ? (
                      selectedPayment.vehicles.map((vehicle, index) => (
                        <div key={index} className="vehicle-detail-item">
                          <div><strong>Xe:</strong> {vehicle.name}</div>
                          <div><strong>Dòng xe:</strong> {vehicle.modelName}</div>
                          <div><strong>Phiên bản:</strong> {vehicle.variant}</div>
                          <div><strong>Màu sắc:</strong> {vehicle.color}</div>
                          <div><strong>Số lượng:</strong> {vehicle.quantity}</div>
                          <div><strong>Đơn giá:</strong> {formatCurrency(vehicle.unitPrice)}</div>
                          <div><strong>Thành tiền:</strong> {formatCurrency(vehicle.finalPrice)}</div>
                          <hr />
                        </div>
                      ))
                    ) : (
                      <div className="no-vehicles-text">
                        Chưa có xe nào trong đơn hàng
                      </div>
                    )}
                  </div>

                  {selectedPayment.promotionName && (
                    <div className="promotion-detail">
                      <h4>Khuyến mãi</h4>
                      <div><strong>Chương trình:</strong> {selectedPayment.promotionName}</div>
                      <div><strong>Giá trị giảm:</strong> {formatCurrency(selectedPayment.discountAmount)}</div>
                    </div>
                  )}

                  <div className="financing-detail">
                    <h4>Thông tin thanh toán</h4>
                    <div className="summary-grid">
                      <div>Phương thức:</div>
                      <div>{renderMethodBadge(selectedPayment.paymentMethod)}</div>
                      <div>Tạm tính:</div>
                      <div>{formatCurrency(selectedPayment.subTotal)}</div>
                      {selectedPayment.discountAmount > 0 && (
                        <>
                          <div>Giảm giá:</div>
                          <div className="discount-text">-{formatCurrency(selectedPayment.discountAmount)}</div>
                        </>
                      )}
                      <div><strong>Tổng cộng:</strong></div>
                      <div className="highlight"><strong>{formatCurrency(selectedPayment.total)}</strong></div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button className="cancel-btn" onClick={() => setSelectedPayment(null)}>
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Payment List Modal - Danh sách thanh toán của đơn hàng */}
          {showPaymentListModal && (
            <div className="modal-overlay" onClick={handleClosePaymentList}>
              <div className="modal-content payment-list-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>Danh sách thanh toán - Order #{currentOrderId}</h3>
                  <button className="modal-close" onClick={handleClosePaymentList}>×</button>
                </div>

                <div className="modal-body">
                  {paymentListLoading ? (
                    <div className="loading-container">
                      <p>Đang tải danh sách thanh toán...</p>
                    </div>
                  ) : currentPayments.length === 0 ? (
                    <div className="empty-state">
                      <p>Chưa có thanh toán nào cho đơn hàng này</p>
                      <button
                        className="btn-create-payment"
                        onClick={handleOpenCreatePaymentForm}
                      >
                        Tạo thanh toán mới
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="payments-list">
                        {currentPayments.map((payment, index) => (
                          <div key={payment.paymentId} className="payment-item">
                            <div className="payment-item-header">
                              <div className="payment-item-title">
                                <span className="payment-number">#{index + 1}</span>
                                <span className="payment-id">ID: {payment.paymentId}</span>
                              </div>
                              <span className={`payment-status-badge status-${payment.status === 'Hoàn thành' ? 'completed' : 'pending'}`}>
                                {payment.status === 'Hoàn thành' ? 'Hoàn thành' : 'Chờ xử lý'}
                              </span>
                            </div>

                            <div className="payment-item-body">
                              <div className="payment-info-row">
                                <span className="label">Số tiền:</span>
                                <span className="value amount">{formatCurrency(payment.amount)}</span>
                              </div>
                              <div className="payment-info-row">
                                <span className="label">Phương thức:</span>
                                <span className="value">{payment.method}</span>
                              </div>
                              <div className="payment-info-row">
                                <span className="label">Ngày tạo:</span>
                                <span className="value">{formatDateTime(payment.paymentDate)}</span>
                              </div>
                              {payment.note && (
                                <div className="payment-info-row">
                                  <span className="label">Ghi chú:</span>
                                  <span className="value">{payment.note}</span>
                                </div>
                              )}
                            </div>

                            <div className="payment-item-actions">
                              {payment.status === 'Chờ xử lý' && (
                                <button
                                  className="btn-complete-payment"
                                  onClick={() => handleUpdatePaymentStatus(payment.paymentId, payment.status)}
                                  disabled={paymentListLoading}
                                >
                                  Xác nhận đã thanh toán
                                </button>
                              )}

                              {/* Chỉ cho phép Cập nhật và Xóa khi đơn hàng CHƯA "Đã thanh toán" */}
                              {currentOrderStatus !== 'Đã thanh toán' && (
                                <>
                                  <button
                                    className="btn-update-payment-small"
                                    onClick={() => handleOpenUpdatePayment(payment)}
                                    disabled={paymentListLoading}
                                  >
                                    Cập nhật
                                  </button>
                                  <button
                                    className="btn-delete-payment-small"
                                    onClick={() => handleDeletePayment(payment.paymentId)}
                                    disabled={paymentListLoading}
                                  >
                                    Xóa
                                  </button>
                                </>
                              )}

                              {/* Hiển thị thông báo khi đơn đã thanh toán */}
                              {currentOrderStatus === 'Đã thanh toán' && (
                                <div className="order-completed-notice">
                                  Đơn hàng đã thanh toán - Không thể chỉnh sửa
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Nút thêm thanh toán mới */}
                      {/* Ẩn khi: "Chưa thanh toán" có 1 payment HOẶC đơn "Đã thanh toán" */}
                      {!(
                        (currentOrderStatus === 'Chưa thanh toán' && currentPayments.length >= 1) ||
                        currentOrderStatus === 'Đã thanh toán'
                      ) && (
                          <div className="modal-footer">
                            <button
                              className="btn-create-payment"
                              onClick={handleOpenCreatePaymentForm}
                              disabled={paymentListLoading}
                            >
                              Thêm thanh toán mới
                            </button>
                          </div>
                        )}
                    </>
                  )}
                </div>

                <div className="modal-footer">
                  <button className="cancel-btn" onClick={handleClosePaymentList}>
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Payment Form Modal */}
          {showPaymentModal && (
            <div className="modal-overlay" onClick={handleClosePaymentForm}>
              <div className="modal-content payment-form-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>Tạo thanh toán mới</h3>
                  <button className="modal-close" onClick={handleClosePaymentForm}>×</button>
                </div>

                <div className="modal-body">
                  {paymentFormLoading ? (
                    <div className="loading-container">
                      <div className="loading-icon">⏳</div>
                      <p>Đang tải thông tin...</p>
                    </div>
                  ) : (
                    <div className="payment-form">
                      <div className="form-group">
                        <label className="form-label">
                          <span className="required">*</span> Phương thức thanh toán:
                        </label>
                        <select
                          className="form-select"
                          value={paymentFormData.method}
                          onChange={(e) => handlePaymentFormChange('method', e.target.value)}
                          disabled={paymentFormLoading}
                        >
                          <option value="Tiền mặt">Tiền mặt</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Ghi chú:</label>
                        <textarea
                          className="form-textarea"
                          rows="4"
                          placeholder="Nhập ghi chú cho thanh toán (tùy chọn)..."
                          value={paymentFormData.note}
                          onChange={(e) => handlePaymentFormChange('note', e.target.value)}
                          disabled={paymentFormLoading}
                        />
                      </div>

                      <div className="form-info">
                        <div className="info-text">
                          Thanh toán sẽ được tạo với trạng thái <strong>"Chờ xử lý"</strong>.
                          <br />
                          Chỉ được tạo 1 thanh toán duy nhất với số tiền = Tổng đơn hàng (Phương thức thanh toán: <strong>Tiền mặt</strong>).
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-footer payment-form-footer">
                  <button
                    className="cancel-btn"
                    onClick={handleClosePaymentForm}
                    disabled={paymentFormLoading}
                  >
                    Đóng
                  </button>

                  <button
                    className="btn-create-payment"
                    onClick={handleCreatePayment}
                    disabled={paymentFormLoading}
                  >
                    {paymentFormLoading ? 'Đang xử lý...' : 'Tạo thanh toán'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal cập nhật phương thức thanh toán */}
          {showUpdatePaymentModal && (
            <div className="modal-overlay" onClick={handleCloseUpdatePayment}>
              <div className="modal-content payment-form-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>Cập nhật thông tin thanh toán</h3>
                  <button className="modal-close" onClick={handleCloseUpdatePayment}>×</button>
                </div>

                <div className="modal-body">
                  <div className="payment-form">
                    <div className="form-group">
                      <label className="form-label">
                        <span className="required">*</span> Phương thức thanh toán:
                      </label>
                      <select
                        className="form-select"
                        value={updatePaymentData.method}
                        onChange={(e) => setUpdatePaymentData({ ...updatePaymentData, method: e.target.value })}
                        disabled={updatePaymentLoading}
                      >
                        <option value="Tiền mặt">Tiền mặt</option>
                        <option value="Chuyển khoản">Chuyển khoản</option>
                        {currentOrderStatus === 'Chưa thanh toán' && (
                          <option value="Thẻ tín dụng">Thẻ tín dụng</option>
                        )}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Ghi chú:</label>
                      <textarea
                        className="form-textarea"
                        rows="4"
                        placeholder="Nhập ghi chú (tùy chọn)..."
                        value={updatePaymentData.note}
                        onChange={(e) => setUpdatePaymentData({ ...updatePaymentData, note: e.target.value })}
                        disabled={updatePaymentLoading}
                      />
                    </div>

                    <div className="form-info">
                      <div className="info-icon"></div>
                      <div className="info-text">
                        Cập nhật phương thức thanh toán và ghi chú. Số tiền thanh toán không thể thay đổi.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer payment-form-footer">
                  <button
                    className="cancel-btn"
                    onClick={handleCloseUpdatePayment}
                    disabled={updatePaymentLoading}
                  >
                    Hủy
                  </button>

                  <button
                    className="btn-update-payment"
                    onClick={handleUpdatePayment}
                    disabled={updatePaymentLoading}
                  >
                    {updatePaymentLoading ? 'Đang xử lý...' : 'Cập nhật'}
                  </button>
                </div>
              </div>
            </div>
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
        </>
      )}
    </div>
  );
};

export default OrderFeatureManagementPayment;