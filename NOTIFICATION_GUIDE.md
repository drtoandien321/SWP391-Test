# Hệ thống Notification - Hướng dẫn sử dụng

## 📋 Tổng quan

Hệ thống notification hiện đại thay thế cho `alert()` trong dự án. Hỗ trợ 4 loại thông báo: **success**, **error**, **warning**, và **info**.

## 🎨 Tính năng

- ✅ Giao diện đẹp, hiện đại
- ✅ Tự động đóng sau thời gian định sẵn
- ✅ Thanh tiến trình countdown
- ✅ Hỗ trợ nhiều thông báo cùng lúc
- ✅ Animation mượt mà (slide in/out)
- ✅ Responsive trên mọi thiết bị
- ✅ Có thể đóng thủ công
- ✅ Hỗ trợ hiển thị text nhiều dòng

## 🚀 Cách sử dụng

### 1. Import function

```jsx
import { showNotification } from '../Notification';
```

### 2. Gọi function

```jsx
// Cú pháp cơ bản
showNotification(message, type, duration);

// message: Nội dung thông báo (string)
// type: 'success' | 'error' | 'warning' | 'info' (mặc định: 'info')
// duration: Thời gian hiển thị (ms) (mặc định: 4000ms)
```

### 3. Ví dụ cụ thể

```jsx
// Thành công
showNotification('Đơn hàng đã được tạo thành công!', 'success');

// Lỗi
showNotification('Không thể kết nối tới server', 'error');

// Cảnh báo
showNotification('Vui lòng nhập đầy đủ thông tin', 'warning');

// Thông tin
showNotification('Đang tải dữ liệu...', 'info');

// Tùy chỉnh thời gian hiển thị (6 giây)
showNotification('Thông báo quan trọng', 'info', 6000);

// Text nhiều dòng
showNotification(`Đơn hàng #123 đã tạo thành công!
Khách hàng: Nguyễn Văn A
Tổng tiền: 500,000,000 VNĐ`, 'success', 5000);
```

## 🎯 Các loại thông báo

### Success (Thành công)
- **Icon**: ✓
- **Màu**: Xanh lá (#28a745)
- **Dùng khi**: Tạo/cập nhật/xóa thành công, thanh toán thành công

```jsx
showNotification('Cập nhật thành công!', 'success');
```

### Error (Lỗi)
- **Icon**: ✕
- **Màu**: Đỏ (#dc3545)
- **Dùng khi**: Lỗi xảy ra, validation thất bại, API error

```jsx
showNotification('Có lỗi xảy ra: ' + error.message, 'error');
```

### Warning (Cảnh báo)
- **Icon**: ⚠
- **Màu**: Vàng (#ffc107)
- **Dùng khi**: Cảnh báo người dùng, validation warning

```jsx
showNotification('Vui lòng nhập email hợp lệ', 'warning');
```

### Info (Thông tin)
- **Icon**: ℹ
- **Màu**: Xanh dương (#17a2b8)
- **Dùng khi**: Thông tin chung, trạng thái

```jsx
showNotification('Đang xử lý yêu cầu...', 'info');
```

## 📱 Responsive Design

- **Desktop**: Hiển thị góc trên bên phải
- **Mobile**: Hiển thị full width ở trên cùng
- Animation tự động điều chỉnh theo thiết bị

## ⚙️ Cấu hình

### Thay đổi thời gian hiển thị mặc định

Mở file `Notification.jsx` và sửa:

```jsx
const Notification = ({ message, type = 'info', duration = 4000, onClose }) => {
  // Thay đổi duration = 4000 thành giá trị mong muốn (ms)
}
```

### Thay đổi màu sắc

Mở file `Notification.css` và sửa các class:

```css
.notification-success { border-left-color: #28a745; }
.notification-error { border-left-color: #dc3545; }
.notification-warning { border-left-color: #ffc107; }
.notification-info { border-left-color: #17a2b8; }
```

## 📂 Cấu trúc file

```
src/
  Components/
    Notification.jsx      # Component chính
    Notification.css      # Styling
  App.jsx                 # Đã thêm <NotificationContainer />
```

## 🔄 Đã thay thế alert() trong các file:

1. ✅ `CreateOrderFeature.jsx` - 17 alerts → notifications
2. ✅ `OrderFeatureManagement&Payment.jsx` - 12 alerts → notifications
3. ✅ `UserManagement.jsx` (Admin) - 4 alerts → notifications
4. ✅ `CarManagement.jsx` (EVMStaff) - 9 alerts → notifications
5. ✅ `DealerCarManagement.jsx` (Manager) - 5 alerts → notifications

**Tổng cộng: 59 alerts đã được thay thế bằng notification system!** 🎉

## 💡 Tips & Best Practices

### 1. Message ngắn gọn
```jsx
// ✅ Tốt
showNotification('Đã lưu thành công!', 'success');

// ❌ Tránh quá dài
showNotification('Đơn hàng của bạn đã được lưu thành công vào hệ thống và đang chờ xác nhận từ quản lý...', 'success');
```

### 2. Sử dụng đúng type
```jsx
// ✅ Tốt
showNotification('Email không hợp lệ', 'warning'); // validation
showNotification('Kết nối thất bại', 'error');     // lỗi hệ thống

// ❌ Sai
showNotification('Email không hợp lệ', 'error');   // nên dùng warning
```

### 3. Thời gian hiển thị hợp lý
```jsx
// ✅ Tốt
showNotification('Đã lưu', 'success', 2000);        // Message ngắn
showNotification(longText, 'info', 6000);           // Message dài

// ❌ Sai
showNotification(longText, 'info', 1000);           // Quá nhanh
showNotification('OK', 'success', 10000);           // Quá lâu
```

### 4. Xử lý lỗi API
```jsx
try {
  await someAPICall();
  showNotification('Thành công!', 'success');
} catch (error) {
  showNotification(`Lỗi: ${error.message}`, 'error');
}
```

## 🐛 Troubleshooting

### Notification không hiển thị?
1. Kiểm tra `<NotificationContainer />` đã được thêm vào `App.jsx`
2. Kiểm tra import: `import { showNotification } from '../Notification'`
3. Kiểm tra console có lỗi không

### Animation không mượt?
1. Kiểm tra file `Notification.css` đã được import
2. Xóa cache browser và reload

### Z-index bị chồng lấp?
File `Notification.css` đã set `z-index: 10000`, nếu vẫn bị chồng, tăng giá trị này lên.

## 📝 Changelog

### Version 1.0.0 (2025-11-12)
- ✅ Tạo component Notification với 4 loại thông báo
- ✅ Thêm NotificationContainer vào App.jsx
- ✅ Thay thế alert() trong CreateOrderFeature.jsx
- ✅ Thay thế alert() trong OrderFeatureManagement&Payment.jsx
- ✅ Hỗ trợ responsive design
- ✅ Thêm animation và progress bar

## 🤝 Đóng góp

Nếu muốn thêm tính năng mới hoặc báo lỗi, vui lòng liên hệ team.

---

**Tác giả**: GitHub Copilot  
**Ngày tạo**: 12/11/2025  
**Dự án**: Electric Vehicle Dealer Management System
