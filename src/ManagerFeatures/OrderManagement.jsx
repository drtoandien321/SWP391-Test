import React, { useState, useEffect } from 'react';
import './OrderManagement.css';
import { getAllDealerOrders, getDealerStaffNames, searchOrdersByCreator } from '../services/carVariantApi';

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('all'); // Chọn nhân viên
  const [staffNames, setStaffNames] = useState([]); // Danh sách nhân viên
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);

  // Load staff names khi component mount
  useEffect(() => {
    loadStaffNames();
  }, []);

  // Load orders khi component mount hoặc khi selectedStaff thay đổi
  useEffect(() => {
    loadOrders();
    
  }, [selectedStaff]);

  // Load danh sách nhân viên
  const loadStaffNames = async () => {
    try {
      const response = await getDealerStaffNames();
      setStaffNames(response.staffNames || []);
    } catch (error) {
      console.error('Error loading staff names:', error);
    }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Nếu chọn nhân viên cụ thể, dùng API search by creator
      // Nếu chọn "all", dùng API lấy tất cả đơn hàng
      const response = selectedStaff === 'all' 
        ? await getAllDealerOrders()
        : await searchOrdersByCreator(selectedStaff);
      
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
          createdBy: orderInfo.createdBy || '', // Thêm tên người tạo
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

  // Lọc đơn hàng - filter theo searchTerm (Order ID, khách hàng, nhân viên)
  const filteredPayments = payments.filter(payment => {
    if (searchTerm === '') return true;
    
    const searchLower = searchTerm.toLowerCase();
    const paymentIdStr = payment.paymentId ? payment.paymentId.toString() : '';
    const orderCodeStr = payment.orderCode ? payment.orderCode.toLowerCase() : '';
    const customerNameStr = payment.customerName ? payment.customerName.toLowerCase() : '';
    const createdByStr = payment.createdBy ? payment.createdBy.toLowerCase() : '';
    
    return paymentIdStr.includes(searchTerm) ||
           orderCodeStr.includes(searchLower) ||
           customerNameStr.includes(searchLower) ||
           createdByStr.includes(searchLower);
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

  // Placeholder functions - Manager không thực hiện xác nhận/từ chối đơn hàng
  // Chức năng này đã chuyển sang Dealer Staff
  const handleConfirmOrder = (orderId, paymentMethod) => {
    console.log('Manager không thể xác nhận đơn hàng. Chức năng này dành cho Dealer Staff.');
  };

  const handleRejectOrder = (orderId) => {
    console.log('Manager không thể từ chối đơn hàng. Chức năng này dành cho Dealer Staff.');
  };

  // ĐÃ XÓA - Chức năng xác nhận/hủy đã chuyển sang Dealer Staff

  // Render status badge - CHỈ HIỂN THỊ ORDER STATUS (không còn payment status)
  const renderStatusBadge = (status) => {
    const statusConfig = {
      'Chưa xác nhận': { text: 'Chưa xác nhận', class: 'status-pending' },
      'Chưa thanh toán': { text: 'Chưa thanh toán', class: 'status-unpaid' },
      'Đã Thanh Toán': { text: 'Đã Thanh Toán', class: 'status-success' },
      'Đã Hủy': { text: 'Đã Hủy', class: 'status-failed' }
    };
    
    const config = statusConfig[status] || { text: status, class: 'status-pending' };
    return <span className={`status-badge ${config.class}`}>{config.text}</span>;
  };

  // Render method badge
  const renderMethodBadge = (method) => {
    const methodConfig = {
      'Tiền mặt': { class: 'method-cash' },
      'Trả thẳng': { class: 'method-cash' }
    };
    
    const config = methodConfig[method] || { class: 'method-other' };
    return (
      <span className={`method-badge ${config.class}`}>
        {method || 'Chưa xác định'}
      </span>
    );
  };

  return (
    <div className="order-management-payment-feature">
      {/* Header Section */}
      <div className="order-management-payment-header">
        <div className="order-management-header-content">
          <div className="order-management-header-text">
            <h2>Quản lý Đơn hàng</h2>
            <p>Xác nhận và quản lý các đơn hàng của đại lý ({orders.length} đơn hàng)</p>
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
                  placeholder="Tìm kiếm theo Order ID, khách hàng, nhân viên..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>
            
            <div className="filter-section">
              <label className="filter-label">Nhân viên:</label>
              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                className="filter-select"
              >
                <option value="all">Tất cả nhân viên</option>
                {staffNames.map((staffName, index) => (
                  <option key={index} value={staffName}>
                    {staffName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* CARDS LAYOUT */}
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

              {/* Payment Info Section */}
              <div className="order-card-section payment-info-section">
                <div className="info-row">
                  <span className="info-label">Trạng thái:</span>
                  <span className="info-value">{renderStatusBadge(payment.status)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Thanh toán:</span>
                  <span className="info-value">{renderMethodBadge(payment.paymentMethod)}</span>
                </div>
              </div>

              {/* Summary Section */}
              <div className="order-card-summary">
                <div className="summary-row total">
                  <span className="summary-label">Tổng tiền:</span>
                  <span className="summary-amount">{formatCurrency(payment.total)}</span>
                </div>
                {payment.discountAmount > 0 && (
                  <div className="summary-row discount">
                    <span className="summary-label">Đã giảm:</span>
                    <span className="summary-value">{formatCurrency(payment.discountAmount)}</span>
                  </div>
                )}
              </div>

                  {/* Actions - Manager chỉ xem chi tiết */}
                  <div className="order-card-actions">
                    <button
                      className="btn-view"
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
                    'Chưa có đơn hàng nào được tạo.' : 
                    'Không tìm thấy đơn hàng nào phù hợp với bộ lọc.'
                  }
                </p>
              </div>
            )}
          </div>

          {/* Payment Detail Modal */}
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
                      <div>Nhân viên xử lý:</div>
                      <div><strong>{selectedPayment.createdBy || 'N/A'}</strong></div>
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
                      <div className="no-data-message">
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
                  {/* Manager không có quyền xác nhận/từ chối đơn hàng - chức năng này dành cho Dealer Staff */}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default OrderManagement;
