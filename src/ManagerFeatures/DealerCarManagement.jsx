import React, { useState, useEffect } from 'react';
import { 
    updateDealerCarPriceAndStatus,
    getVehiclesNotAvailableAtDealer,
    createDistributionRequest,
    getDealerDistributionRequests,
    getDealerDistributionRequestsByStatus,
    confirmDelivery
} from '../services/carVariantApi';
import {
    getCarVariantDetails,
    searchCarVariants,
    transformCarVariantData,
    getVariantConfiguration,
    transformConfigurationData,
    getCurrentUser,
    searchCarVariantsByStatus
} from '../services/carVariantApi';
import { showNotification } from '../Components/Notification';
import {
    searchCarVariantsByVariantName,
    searchCarVariantsByModelName,
    searchCarVariantsByModelAndVariant,
    fetchAllModelNames,
    fetchVariantNamesByModel
} from '../services/carVariantApi';
import './DealerCarManagement.css';


const DealerCarManagement = () => {
    // State cho modal cập nhật giá & trạng thái
    const [updateModal, setUpdateModal] = useState({ open: false, vehicle: null, color: null });
    const [updateForm, setUpdateForm] = useState({ price: '', status: '', loading: false, error: '', success: false });
    const [vehicles, setVehicles] = useState([]);
    const [filteredVehicles, setFilteredVehicles] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterBrand, setFilterBrand] = useState('all');
    const [filterVersion, setFilterVersion] = useState('all');
    const [modelOptions, setModelOptions] = useState([]);
    const [variantOptions, setVariantOptions] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [selectedColor, setSelectedColor] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');

    // State cho Tab system
    const [activeTab, setActiveTab] = useState('dealer'); // 'dealer' hoặc 'manufacturer'
    const [manufacturerVehicles, setManufacturerVehicles] = useState([]);
    const [loadingManufacturer, setLoadingManufacturer] = useState(false);

    // State cho Request Modal (Dealer gửi yêu cầu)
    const [requestModal, setRequestModal] = useState({ open: false, vehicle: null, color: null });
    const [requestForm, setRequestForm] = useState({ quantity: 1, note: '', loading: false, error: '', success: false });

    // State cho Notification Modal (Dealer xem thông báo)
    const [notificationModal, setNotificationModal] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [loadingNotifications, setLoadingNotifications] = useState(false);

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

    useEffect(() => {
        fetchAllModelNames()
            .then(models => setModelOptions(models))
            .catch(() => setModelOptions([]));
    }, []);

    useEffect(() => {
        if (filterBrand && filterBrand !== 'all') {
            fetchVariantNamesByModel(filterBrand)
                .then(variants => setVariantOptions(Array.isArray(variants) ? variants : (variants.variantNames || [])))
                .catch(() => setVariantOptions([]));
        } else {
            setVariantOptions([]);
        }
        setFilterVersion('all');
    }, [filterBrand]);

    useEffect(() => {
        setCurrentUser(getCurrentUser());
        loadVehiclesFromAPI();
        loadNotifications(); // Load notifications on mount
    }, []);

    // Load manufacturer vehicles when switching to manufacturer tab
    useEffect(() => {
        if (activeTab === 'manufacturer' && manufacturerVehicles.length === 0) {
            loadManufacturerVehicles();
        }
    }, [activeTab]);

    const loadVehiclesFromAPI = async () => {
        setIsLoading(true);
        setError('');
        try {
            const apiData = await getCarVariantDetails();
            const transformedData = transformCarVariantData(apiData);
            const withRaw = transformedData.map((v, idx) => ({ ...v, colorPricesRaw: apiData[idx]?.colorPrices || [] }));
            if (withRaw.length === 0) {
                setVehicles([]);
                setFilteredVehicles([]);
            } else {
                setVehicles(withRaw);
                setFilteredVehicles(withRaw);
                const initialColors = {};
                withRaw.forEach(vehicle => {
                    initialColors[vehicle.id] = vehicle.colors[0];
                });
                setSelectedColor(initialColors);
            }
        } catch (err) {
            setError(err.message || 'Không thể tải danh sách xe. Vui lòng thử lại.');
            setVehicles([]);
            setFilteredVehicles([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isLoading) return;
        if (searchTerm) {
            const delaySearch = setTimeout(() => {
                handleSearch(searchTerm);
            }, 500);
            return () => clearTimeout(delaySearch);
        } else if (
            filterBrand !== 'all' &&
            filterVersion !== 'all' &&
            filterBrand && filterVersion
        ) {
            handleSearchByModelAndVariant(filterBrand, filterVersion);
        } else if (filterBrand !== 'all') {
            handleSearchByModelName(filterBrand);
        } else if (filterVersion !== 'all') {
            handleSearchByVariantName(filterVersion);
        } else if (filterStatus && filterStatus !== 'all') {
            handleSearchByStatus(filterStatus);
        } else {
            setFilteredVehicles(vehicles);
        }
    }, [searchTerm, filterBrand, filterVersion, filterStatus, isLoading]);
    const handleSearchByStatus = async (status) => {
        setIsSearching(true);
        setError('');
        try {
            let allVehicles = vehicles;
            if (!allVehicles || allVehicles.length === 0) {
                const apiData = await getCarVariantDetails();
                const transformedData = transformCarVariantData(apiData);
                allVehicles = transformedData.map((v, idx) => ({ ...v, colorPricesRaw: apiData[idx]?.colorPrices || [] }));
            }

            // Lọc và chỉ giữ lại các màu đúng trạng thái filter cho từng xe
            const filtered = allVehicles
                .map(vehicle => {
                    if (vehicle.colorPricesRaw && Array.isArray(vehicle.colorPricesRaw)) {
                        // Lấy danh sách màu đúng trạng thái
                        const validColors = vehicle.colorPricesRaw
                            .filter(cp => cp.status === status)
                            .map(cp => cp.colorName);
                        if (validColors.length === 0) return null;
                        // Chỉ giữ lại các màu, giá, tồn kho đúng trạng thái
                        return {
                            ...vehicle,
                            colors: validColors,
                            colorPricesRaw: vehicle.colorPricesRaw.filter(cp => validColors.includes(cp.colorName)),
                            colorQuantities: Object.fromEntries(Object.entries(vehicle.colorQuantities).filter(([color]) => validColors.includes(color))),
                            images: Object.fromEntries(Object.entries(vehicle.images).filter(([color]) => validColors.includes(color)))
                        };
                    }
                    return null;
                })
                .filter(Boolean);
            setFilteredVehicles(filtered);
            const newColors = {};
            filtered.forEach(vehicle => {
                if (!selectedColor[vehicle.id] || !vehicle.colors.includes(selectedColor[vehicle.id])) {
                    newColors[vehicle.id] = vehicle.colors[0];
                }
            });
            if (Object.keys(newColors).length > 0) {
                setSelectedColor(prev => ({ ...prev, ...newColors }));
            }
        } catch (err) {
            setError('Lỗi khi tìm kiếm theo trạng thái. Vui lòng thử lại.');
            setFilteredVehicles([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearchByModelName = async (modelName) => {
        setIsSearching(true);
        setError('');
        try {
            const searchResults = await searchCarVariantsByModelName(modelName);
            const transformedResults = transformCarVariantData(searchResults);
            const withRaw = transformedResults.map((v, idx) => ({ ...v, colorPricesRaw: searchResults[idx]?.colorPrices || [] }));
            setFilteredVehicles(withRaw);
            const newColors = {};
            withRaw.forEach(vehicle => {
                if (!selectedColor[vehicle.id]) {
                    newColors[vehicle.id] = vehicle.colors[0];
                }
            });
            if (Object.keys(newColors).length > 0) {
                setSelectedColor(prev => ({ ...prev, ...newColors }));
            }
        } catch (err) {
            setError('Lỗi khi tìm kiếm theo dòng xe. Vui lòng thử lại.');
            setFilteredVehicles([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearchByVariantName = async (variantName) => {
        setIsSearching(true);
        setError('');
        try {
            const searchResults = await searchCarVariantsByVariantName(variantName);
            const transformedResults = transformCarVariantData(searchResults);
            const withRaw = transformedResults.map((v, idx) => ({ ...v, colorPricesRaw: searchResults[idx]?.colorPrices || [] }));
            setFilteredVehicles(withRaw);
            const newColors = {};
            withRaw.forEach(vehicle => {
                if (!selectedColor[vehicle.id]) {
                    newColors[vehicle.id] = vehicle.colors[0];
                }
            });
            if (Object.keys(newColors).length > 0) {
                setSelectedColor(prev => ({ ...prev, ...newColors }));
            }
        } catch (err) {
            setError('Lỗi khi tìm kiếm theo phiên bản. Vui lòng thử lại.');
            setFilteredVehicles([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearchByModelAndVariant = async (modelName, variantName) => {
        setIsSearching(true);
        setError('');
        try {
            const searchResults = await searchCarVariantsByModelAndVariant(modelName, variantName);
            const transformedResults = transformCarVariantData(searchResults);
            const withRaw = transformedResults.map((v, idx) => ({ ...v, colorPricesRaw: searchResults[idx]?.colorPrices || [] }));
            setFilteredVehicles(withRaw);
            const newColors = {};
            withRaw.forEach(vehicle => {
                if (!selectedColor[vehicle.id]) {
                    newColors[vehicle.id] = vehicle.colors[0];
                }
            });
            if (Object.keys(newColors).length > 0) {
                setSelectedColor(prev => ({ ...prev, ...newColors }));
            }
        } catch (err) {
            setError('Lỗi khi tìm kiếm theo dòng xe và phiên bản. Vui lòng thử lại.');
            setFilteredVehicles([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearch = async (query) => {
        setIsSearching(true);
        setError('');
        try {
            const searchResults = await searchCarVariants(query);
            const transformedResults = transformCarVariantData(searchResults);
            const withRaw = transformedResults.map((v, idx) => ({ ...v, colorPricesRaw: searchResults[idx]?.colorPrices || [] }));
            setFilteredVehicles(withRaw);
            const newColors = {};
            withRaw.forEach(vehicle => {
                if (!selectedColor[vehicle.id]) {
                    newColors[vehicle.id] = vehicle.colors[0];
                }
            });
            if (Object.keys(newColors).length > 0) {
                setSelectedColor(prev => ({ ...prev, ...newColors }));
            }
        } catch (err) {
            setError('Lỗi khi tìm kiếm. Vui lòng thử lại.');
            setFilteredVehicles([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleViewDetail = (vehicle) => {
        // Đảm bảo selectedColor có màu đầu tiên cho vehicle này
        if (!selectedColor[vehicle.id]) {
            setSelectedColor(prev => ({
                ...prev,
                [vehicle.id]: vehicle.colors[0]
            }));
        }
        
        // MỞ MODAL NGAY LẬP TỨC - không đợi load config
        setSelectedVehicle(vehicle);
    };

    const getStatusBadge = (status, stock) => {
        if (status === 'out-of-stock' || stock === 0) {
            return <span className="status-badge out-of-stock">Hết hàng</span>;
        } else if (status === 'low-stock' || stock < 10) {
            return <span className="status-badge low-stock">Sắp hết ({stock} xe)</span>;
        } else {
            return <span className="status-badge available">Có sẵn ({stock} xe)</span>;
        }
    };

    const handleColorChange = (vehicleId, color) => {
        setSelectedColor(prev => ({
            ...prev,
            [vehicleId]: color
        }));
    };

    const getCurrentImage = (vehicle) => {
        const currentColor = selectedColor[vehicle.id] || vehicle.colors[0];
        return vehicle.images[currentColor] || vehicle.defaultImage;
    };

    const getCurrentPrice = (vehicle) => {
        const currentColor = selectedColor[vehicle.id] || vehicle.colors[0];
        
        // Tab 1: Dealer vehicles (có colorPricesRaw)
        if (vehicle.colorPricesRaw) {
            const colorObj = vehicle.colorPricesRaw.find(c => c.colorName === currentColor);
            if (colorObj) {
                // CHỈ hiển thị dealerPrice (có thể = 0)
                return colorObj.dealerPrice !== undefined ? colorObj.dealerPrice : 0;
            }
        }
        
        // Tab 2: Manufacturer vehicles (có colorPrices)
        if (vehicle.colorPrices) {
            return vehicle.colorPrices[currentColor] || 0;
        }
        
        return 0;
    };

    const getCurrentQuantity = (vehicle) => {
        const currentColor = selectedColor[vehicle.id] || vehicle.colors[0];
        return vehicle.colorQuantities[currentColor] || 0;
    };

    // Function load xe từ manufacturer (Tab 2)
    const loadManufacturerVehicles = async () => {
        setLoadingManufacturer(true);
        try {
            const response = await getVehiclesNotAvailableAtDealer();
            const transformed = transformCarVariantData(response.data || response);
            setManufacturerVehicles(transformed);
            
            // Khởi tạo màu mặc định cho tất cả xe trong Tab 2
            const newSelectedColors = {};
            transformed.forEach(vehicle => {
                if (vehicle.colors && vehicle.colors.length > 0) {
                    newSelectedColors[vehicle.id] = vehicle.colors[0];
                }
            });
            setSelectedColor(prev => ({
                ...prev,
                ...newSelectedColors
            }));
        } catch (err) {
            console.error('Error loading manufacturer vehicles:', err);
            showNotification('Không thể tải danh sách xe từ nhà máy: ' + err.message, 'error');
        } finally {
            setLoadingManufacturer(false);
        }
    };

    // Function gửi request thêm xe
    const handleSendRequest = async () => {
        if (!requestForm.quantity || requestForm.quantity < 1) {
            setRequestForm(f => ({ ...f, error: 'Số lượng phải lớn hơn 0' }));
            return;
        }

        setRequestForm(f => ({ ...f, loading: true, error: '', success: false }));

        try {
            const requestData = {
                modelName: requestModal.vehicle.modelName,
                variantName: requestModal.vehicle.variantName,
                colorName: requestModal.color,
                quantity: parseInt(requestForm.quantity),
                note: requestForm.note || ''
            };
            
            await createDistributionRequest(requestData);
            
            setRequestForm(f => ({ ...f, success: true, loading: false }));
            
            showNotification('Đã gửi yêu cầu thành công! Vui lòng chờ nhà máy phê duyệt.', 'success');
            
            // Đóng modal sau 1.5s
            setTimeout(() => {
                setRequestModal({ open: false, vehicle: null, color: null });
                setRequestForm({ quantity: 1, note: '', loading: false, error: '', success: false });
            }, 1500);
        } catch (err) {
            setRequestForm(f => ({ ...f, error: err.message || 'Có lỗi xảy ra khi gửi yêu cầu', loading: false }));
        }
    };

    // Function load notifications
    const loadNotifications = async () => {
        setLoadingNotifications(true);
        try {
            const response = await getDealerDistributionRequests();
            
            // Transform API response
            const transformedNotifications = (response.data || response).map(req => ({
                id: req.requestId,
                modelName: req.modelName,
                variantName: req.variantName,
                colorName: req.colorName,
                quantity: req.quantity,
                unitPriceAtApproval: req.unitPriceAtApproval, // Giá đơn vị
                totalAmount: req.totalAmount, // Tổng giá trị
                note: '',
                status: req.status,
                createdAt: req.requestDate,
                approvedAt: req.approvedDate,
                expectedDeliveryDate: req.expectedDeliveryDate,
                actualDeliveryDate: req.actualDeliveryDate
            }));
            
            setNotifications(transformedNotifications);
        } catch (err) {
            console.error('Error loading notifications:', err);
            showNotification('Không thể tải thông báo: ' + err.message, 'error');
        } finally {
            setLoadingNotifications(false);
        }
    };

    // Function xác nhận request (Dealer confirms received vehicles)
    const handleConfirmRequest = async (requestId) => {
        showConfirm(
            'Xác nhận nhận xe',
            'Xác nhận bạn đã nhận đủ số lượng xe?',
            async () => {
                try {
                    await confirmDelivery(requestId);
                    
                    showNotification('Đã xác nhận nhận xe thành công! Số lượng xe đã được cập nhật vào kho.', 'success');
                    await loadNotifications();
                    await loadVehiclesFromAPI(); // Reload vehicles to show updated inventory
                } catch (err) {
                    console.error('Error confirming request:', err);
                    showNotification('Có lỗi xảy ra: ' + err.message, 'error');
                }
            },
            'success'
        );
    };

    useEffect(() => {
        if (activeTab === 'manufacturer' && manufacturerVehicles.length === 0) {
            loadManufacturerVehicles();
        }
    }, [activeTab]);

    if (isLoading) {
        return (
            <div className="vehicle-info-feature">
                <div className="vehicle-info-header">
                    <div className="vehicle-header-content">
                        <div className="vehicle-header-text">
                            <h2>Đang tải dữ liệu xe...</h2>
                            <p>Vui lòng chờ trong giây lát</p>
                        </div>
                    </div>
                </div>
                <div className="loading-spinner-container">
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    if (error && vehicles.length === 0) {
        return (
            <div className="vehicle-info-feature">
                <div className="vehicle-info-header">
                    <div className="vehicle-header-content">
                        <div className="vehicle-header-text">
                            <h2>Lỗi tải dữ liệu</h2>
                            <p>{error}</p>
                        </div>
                    </div>
                </div>
                <div className="error-retry-container">
                    <button
                        className="refresh-btn"
                        onClick={loadVehiclesFromAPI}
                    >
                        Thử lại
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="vehicle-info-feature">
            <div className="vehicle-info-header">
                <div className="vehicle-header-content">
                    <div className="vehicle-header-text">
                        <h2>Quản lý xe cho đại lý</h2>
                        <p>
                            {activeTab === 'dealer' 
                                ? `Xe có sẵn tại ${currentUser?.dealerName || 'đại lý'} • ${vehicles.length} mẫu xe`
                                : `Danh mục xe từ hãng • ${manufacturerVehicles.length} mẫu xe`
                            }
                        </p>
                    </div>
                </div>
                <button 
                    className="notification-btn"
                    onClick={() => {
                        setNotificationModal(true);
                        loadNotifications();
                    }}
                    title="Xem thông báo yêu cầu thêm xe"
                >
                    Thông báo
                    {notifications.filter(n => n.status === 'Đang giao' || n.status === 'Đã duyệt').length > 0 && (
                        <span className="notification-badge">
                            {notifications.filter(n => n.status === 'Đang giao' || n.status === 'Đã duyệt').length}
                        </span>
                    )}
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="tab-navigation">
                <button 
                    className={`tab-btn ${activeTab === 'dealer' ? 'active' : ''}`}
                    onClick={() => setActiveTab('dealer')}
                >
                    Xe tại đại lý
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'manufacturer' ? 'active' : ''}`}
                    onClick={() => setActiveTab('manufacturer')}
                >
                    Danh mục xe từ hãng
                </button>
            </div>

            {activeTab === 'dealer' && (
                <>
                    <div className="search-filters">
                <div className="search-box">
                    <input
                        type="text"
                        placeholder="Tìm kiếm xe (VD: VF3, Eco, VF5 Plus)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {isSearching && (
                        <span className="searching-status">Đang tìm...</span>
                    )}
                </div>

                <div className="filters">
                    <select
                        value={filterBrand}
                        onChange={(e) => setFilterBrand(e.target.value)}
                        disabled={!!searchTerm}
                        className={searchTerm ? 'disabled-filter' : ''}
                    >
                        <option value="all">Tất cả dòng xe</option>
                        {modelOptions.map(model => (
                            <option key={model} value={model}>{model}</option>
                        ))}
                    </select>

                    <select
                        value={filterVersion}
                        onChange={(e) => setFilterVersion(e.target.value)}
                        disabled={!!searchTerm || filterBrand === 'all'}
                        className={searchTerm ? 'disabled-filter' : ''}
                    >
                        <option value="all">Tất cả phiên bản</option>
                        {variantOptions.map(variant => (
                            <option key={variant} value={variant}>{variant}</option>
                        ))}
                    </select>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className={`filter-status-select${searchTerm ? ' disabled-filter' : ''}`}
                    >
                        <option value="all">Tất cả trạng thái xe</option>
                        <option value="On Sale">On Sale</option>
                        <option value="Pending">Pending</option>
                    </select>

                    <button
                        className="refresh-btn"
                        onClick={() => {
                            setSearchTerm('');
                            setFilterBrand('all');
                            setFilterVersion('all');
                            setFilterStatus('all');
                            setError('');
                            loadVehiclesFromAPI();
                        }}
                        title="Làm mới bộ lọc và dữ liệu xe"
                    >
                        Làm mới
                    </button>
                </div>
            </div>

            {searchTerm && (
                <div className="search-result-info">
                    Tìm thấy <strong>{filteredVehicles.length}</strong> xe với từ khóa "<strong>{searchTerm}</strong>"
                </div>
            )}

            <div className="vehicle-grid">
                {filteredVehicles.map(vehicle => {
                    const currentColor = selectedColor[vehicle.id] || vehicle.colors[0];
                    // Nút Cập nhật cho từng card xe
                    return (
                        <div key={vehicle.id} className="vehicle-card">
                            <div className="vehicle-image">
                                <img
                                    src={getCurrentImage(vehicle)}
                                    alt={`${vehicle.name} - ${currentColor}`}
                                    onError={(e) => {
                                        e.target.src = vehicle.defaultImage;
                                    }}
                                />
                                {getStatusBadge(vehicle.status, getCurrentQuantity(vehicle))}
                            </div>
                            <div className="vehicle-info">
                                <h3>{vehicle.name}</h3>
                                <div className="price-and-details">
                                    <div className="vehicle-price">
                                        {new Intl.NumberFormat('vi-VN', {
                                            style: 'currency',
                                            currency: 'VND'
                                        }).format(getCurrentPrice(vehicle))}
                                    </div>
                                    <button
                                        className="action-btn view-details-btn"
                                        onClick={() => handleViewDetail(vehicle)}
                                    >
                                        Chi tiết
                                    </button>
                                </div>
                                <div className="vehicle-colors">
                                    <span className="colors-label">Màu sắc:</span>
                                    <div className="colors-list">
                                        {vehicle.colors.map((color, index) => (
                                            <span
                                                key={index}
                                                className={`color-tag clickable ${currentColor === color ? 'active' : ''}`}
                                                onClick={() => handleColorChange(vehicle.id, color)}
                                                title={`Tồn kho: ${vehicle.colorQuantities[color]} xe`}
                                            >
                                                {color}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="vehicle-stock-info">
                                    <div className="spec-item">
                                        <span className="spec-label">Tồn kho màu này:</span>
                                        <span className="spec-value">{getCurrentQuantity(vehicle)} xe</span>
                                    </div>
                                </div>
                                <div className="update-btn-row">
                                    <button
                                        className="update-btn"
                                        onClick={() => {
                                            const colorObj = vehicle.colorPricesRaw?.find(c => c.colorName === currentColor);
                                            // ✅ Hiển thị dealerPrice (kể cả = 0)
                                            const price = colorObj?.dealerPrice !== undefined ? colorObj.dealerPrice : '';
                                            setUpdateForm({
                                                price: price,
                                                status: colorObj?.status || '',
                                                loading: false,
                                                error: '',
                                                success: false
                                            });
                                            setUpdateModal({ open: true, vehicle, color: currentColor });
                                        }}
                                    >
                                        Cập nhật
                                    </button>
                                    <button
                                        className="request-btn"
                                        onClick={() => {
                                            setRequestModal({ open: true, vehicle, color: currentColor });
                                            setRequestForm({ quantity: 1, note: '', loading: false, error: '', success: false });
                                        }}
                                    >
                                        Gửi yêu cầu thêm xe
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredVehicles.length === 0 && !isSearching && !isLoading && (
                <div className="no-results">
                    <div className="no-results-icon">🔍</div>
                    <p>Không tìm thấy xe nào {searchTerm ? `với từ khóa "${searchTerm}"` : 'phù hợp với bộ lọc'}.</p>
                    {searchTerm && (
                        <button
                            className="refresh-btn"
                            onClick={() => setSearchTerm('')}
                        >
                            ← Xem tất cả xe
                        </button>
                    )}
                </div>
            )}

            {/* Modal cập nhật giá & trạng thái */}
            {updateModal.open && (
                <div className="modal-overlay" onClick={() => setUpdateModal({ open: false, vehicle: null, color: null })}>
                    <div className="modal-content update-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Cập nhật thông tin xe</h2>
                            <button className="close-btn" onClick={() => setUpdateModal({ open: false, vehicle: null, color: null })}>×</button>
                        </div>
                        <div className="update-modal-body">
                            <div className="update-form-row">
                                <input
                                    type="number"
                                    min={0}
                                    value={updateForm.price}
                                    onChange={e => setUpdateForm(f => ({ ...f, price: e.target.value, success: false, error: '' }))}
                                    placeholder="Giá mới (VND)"
                                    className="update-form-input"
                                />
                                <select
                                    value={updateForm.status}
                                    onChange={e => setUpdateForm(f => ({ ...f, status: e.target.value, success: false, error: '' }))}
                                    className="update-form-select"
                                >
                                    <option value="">Chọn trạng thái</option>
                                    <option value="On Sale">On Sale</option>
                                    <option value="Pending">Pending</option>
                                </select>
                            </div>
                            <button
                                className="update-form-btn"
                                disabled={updateForm.loading || !updateForm.price || !updateForm.status}
                                onClick={async () => {
                                    setUpdateForm(f => ({ ...f, loading: true, error: '', success: false }));
                                    try {
                                        await updateDealerCarPriceAndStatus({
                                            modelName: updateModal.vehicle.modelName,
                                            variantName: updateModal.vehicle.variantName,
                                            colorName: updateModal.color,
                                            dealerPrice: updateForm.price,
                                            status: updateForm.status
                                        });
                                        setUpdateForm(f => ({ ...f, loading: false, error: '', success: true }));
                                        setTimeout(() => setUpdateModal({ open: false, vehicle: null, color: null }), 800);
                                        await loadVehiclesFromAPI();
                                    } catch (err) {
                                        setUpdateForm(f => ({ ...f, loading: false, error: err.message || 'Lỗi cập nhật', success: false }));
                                    }
                                }}
                            >
                                {updateForm.loading ? 'Đang cập nhật...' : 'Lưu'}
                            </button>
                            {updateForm.error && <div className="update-form-error">{updateForm.error}</div>}
                            {updateForm.success && <div className="update-form-success">Cập nhật thành công!</div>}
                        </div>
                    </div>
                </div>
            )}
                </>
            )}

            {/* Tab 2: Manufacturer Vehicles */}
            {activeTab === 'manufacturer' && (
                <div className="manufacturer-tab-content">
                    {loadingManufacturer ? (
                        <div className="loading-spinner-container">
                            <div className="spinner"></div>
                            <p>Đang tải danh mục xe...</p>
                        </div>
                    ) : (
                        <>
                            <div className="vehicle-grid">
                                {manufacturerVehicles.map(vehicle => {
                                    const currentColor = selectedColor[vehicle.id] || vehicle.colors[0];
                                    return (
                                        <div key={vehicle.id} className="vehicle-card">
                                            <div className="vehicle-image">
                                                <img
                                                    src={getCurrentImage(vehicle)}
                                                    alt={`${vehicle.name} - ${currentColor}`}
                                                    onError={(e) => {
                                                        e.target.src = vehicle.defaultImage;
                                                    }}
                                                />
                                                {getStatusBadge('available', vehicle.stock)}
                                            </div>
                                            <div className="vehicle-info">
                                                <h3>{vehicle.name}</h3>
                                                <div className="price-and-details">
                                                    <div className="vehicle-price">
                                                        {new Intl.NumberFormat('vi-VN', {
                                                            style: 'currency',
                                                            currency: 'VND'
                                                        }).format(getCurrentPrice(vehicle))}
                                                    </div>
                                                    <button
                                                        className="action-btn view-details-btn"
                                                        onClick={() => handleViewDetail(vehicle)}
                                                    >
                                                        Chi tiết
                                                    </button>
                                                </div>
                                                <div className="vehicle-colors">
                                                    <span className="colors-label">Màu sắc:</span>
                                                    <div className="colors-list">
                                                        {vehicle.colors.map((color, index) => (
                                                            <span
                                                                key={index}
                                                                className={`color-tag clickable ${currentColor === color ? 'active' : ''}`}
                                                                onClick={() => handleColorChange(vehicle.id, color)}
                                                            >
                                                                {color}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="vehicle-stock-info">
                                                    <div className="spec-item">
                                                        <span className="spec-label">Tồn kho:</span>
                                                        <span className="spec-value">{getCurrentQuantity(vehicle)} xe</span>
                                                    </div>
                                                </div>
                                                <div className="update-btn-row">
                                                    <button
                                                        className="request-btn"
                                                        onClick={() => {
                                                            setRequestModal({ open: true, vehicle, color: currentColor });
                                                            setRequestForm({ quantity: 1, note: '', loading: false, error: '', success: false });
                                                        }}
                                                    >
                                                        Gửi yêu cầu
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Request Modal (Dealer gửi yêu cầu thêm xe) */}
            {requestModal.open && (
                <div className="modal-overlay" onClick={() => setRequestModal({ open: false, vehicle: null, color: null })}>
                    <div className="modal-content update-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Gửi yêu cầu thêm xe</h2>
                            <button className="close-btn" onClick={() => setRequestModal({ open: false, vehicle: null, color: null })}>×</button>
                        </div>
                        <div className="update-modal-body">
                            <div className="request-info">
                                <p><strong>Xe:</strong> {requestModal.vehicle?.name}</p>
                                <p><strong>Dòng xe:</strong> {requestModal.vehicle?.modelName}</p>
                                <p><strong>Phiên bản:</strong> {requestModal.vehicle?.variantName}</p>
                                <p><strong>Màu:</strong> {requestModal.color}</p>
                            </div>
                            <div className="update-form-row">
                                <input
                                    type="number"
                                    min={1}
                                    value={requestForm.quantity}
                                    onChange={e => setRequestForm(f => ({ ...f, quantity: e.target.value, success: false, error: '' }))}
                                    placeholder="Số lượng"
                                    className="update-form-input"
                                />
                                <textarea
                                    value={requestForm.note}
                                    onChange={e => setRequestForm(f => ({ ...f, note: e.target.value, success: false, error: '' }))}
                                    placeholder="Ghi chú (tùy chọn)"
                                    className="update-form-textarea"
                                    rows={3}
                                />
                            </div>
                            <button
                                className="update-form-btn"
                                disabled={requestForm.loading || !requestForm.quantity || requestForm.quantity < 1}
                                onClick={handleSendRequest}
                            >
                                {requestForm.loading ? 'Đang gửi...' : 'Gửi yêu cầu'}
                            </button>
                            {requestForm.error && <div className="update-form-error">{requestForm.error}</div>}
                            {requestForm.success && <div className="update-form-success">Đã gửi yêu cầu thành công!</div>}
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Modal (Dealer xem thông báo) */}
            {notificationModal && (
                <div className="modal-overlay" onClick={() => setNotificationModal(false)}>
                    <div className="modal-content notification-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Thông báo yêu cầu thêm xe</h2>
                            <button className="close-btn" onClick={() => setNotificationModal(false)}>×</button>
                        </div>
                        <div className="notification-modal-body">
                            {loadingNotifications ? (
                                <div className="loading-notifications">Đang tải thông báo...</div>
                            ) : notifications.length === 0 ? (
                                <div className="no-notifications">
                                    <p>Chưa có thông báo nào</p>
                                </div>
                            ) : (
                                <div className="notifications-list">
                                    {notifications.map(notification => {
                                        // Convert Vietnamese status to CSS class name
                                        const statusClass = notification.status === 'Chờ duyệt' ? 'pending' :
                                                           notification.status === 'Đã duyệt' ? 'approved' :
                                                           notification.status === 'Đang giao' ? 'delivering' :
                                                           notification.status === 'Đã giao' ? 'delivered' :
                                                           notification.status === 'Từ chối' ? 'rejected' : 'pending';
                                        
                                        return (
                                        <div key={notification.id} className={`notification-item notification-${statusClass}`}>
                                            <div className="notification-header-item">
                                                <h4>{notification.modelName} {notification.variantName} - {notification.colorName}</h4>
                                                <span className={`status-badge-notification status-${statusClass}`}>
                                                    {notification.status === 'Chờ duyệt' ? 'Chờ duyệt' : 
                                                     notification.status === 'Đã duyệt' ? 'Đã duyệt' : 
                                                     notification.status === 'Đang giao' ? 'Đang giao' :
                                                     notification.status === 'Đã giao' ? 'Đã giao' :
                                                     'Từ chối'}
                                                </span>
                                            </div>
                                            <div className="notification-details">
                                                <p><strong>Số lượng:</strong> {notification.quantity} xe</p>
                                                {notification.unitPriceAtApproval && (
                                                    <p>
                                                        <strong>Giá đơn vị:</strong> 
                                                        <span>
                                                            {new Intl.NumberFormat('vi-VN', { 
                                                                style: 'currency', 
                                                                currency: 'VND' 
                                                            }).format(notification.unitPriceAtApproval)}
                                                        </span>
                                                    </p>
                                                )}
                                                {notification.totalAmount && (
                                                    <p>
                                                        <strong>Tổng giá trị:</strong> 
                                                        <span>
                                                            {new Intl.NumberFormat('vi-VN', { 
                                                                style: 'currency', 
                                                                currency: 'VND' 
                                                            }).format(notification.totalAmount)}
                                                        </span>
                                                    </p>
                                                )}
                                                <p><strong>Ngày gửi:</strong> {new Date(notification.createdAt).toLocaleString('vi-VN')}</p>
                                                {notification.approvedAt && (
                                                    <p><strong>Ngày duyệt:</strong> {new Date(notification.approvedAt).toLocaleString('vi-VN')}</p>
                                                )}
                                                {notification.expectedDeliveryDate && (
                                                    <p><strong>Ngày giao dự kiến:</strong> {new Date(notification.expectedDeliveryDate).toLocaleString('vi-VN')}</p>
                                                )}
                                                {notification.actualDeliveryDate && (
                                                    <p><strong>Ngày giao thực tế:</strong> {new Date(notification.actualDeliveryDate).toLocaleString('vi-VN')}</p>
                                                )}
                                            </div>
                                            {notification.status === 'Đang giao' && (
                                                <button
                                                    className="confirm-request-btn"
                                                    onClick={() => handleConfirmRequest(notification.id)}
                                                >
                                                    ✓ Xác nhận đã nhận xe
                                                </button>
                                            )}
                                        </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Vehicle Detail Modal - Dùng chung cho cả 2 tabs */}
            {selectedVehicle && (
                <VehicleDetailModal
                    key={selectedVehicle.id}
                    vehicle={selectedVehicle}
                    onClose={() => setSelectedVehicle(null)}
                />
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


// Đã xóa component UpdatePriceStatusModal

const VehicleDetailModal = ({ vehicle, onClose }) => {
    const [selectedModalColor, setSelectedModalColor] = useState(vehicle.colors[0]);
    const [vehicleData, setVehicleData] = useState(vehicle);
    const [loadingConfig, setLoadingConfig] = useState(!vehicle.configLoaded);

    // Load config nếu chưa có
    useEffect(() => {
        if (!vehicle.configLoaded) {
            setLoadingConfig(true);
            (async () => {
                try {
                    const configData = await getVariantConfiguration(vehicle.id);
                    if (configData) {
                        const specs = transformConfigurationData(configData);
                        const updatedVehicle = {
                            ...vehicle,
                            specs: specs,
                            range: configData.rangeKm,
                            charging: `${configData.fullChargeTime} phút (AC)`,
                            power: configData.power,
                            configLoaded: true
                        };
                        setVehicleData(updatedVehicle);
                    }
                } catch (err) {
                    console.error('Error loading config:', err);
                } finally {
                    setLoadingConfig(false);
                }
            })();
        }
    }, [vehicle.id]);

    const getCurrentModalImage = () => {
        return vehicleData.images[selectedModalColor] || vehicleData.defaultImage;
    };

    const getCurrentModalPrice = () => {
        // Tab 1: Dealer vehicles (có colorPricesRaw)
        if (vehicleData.colorPricesRaw) {
            const found = vehicleData.colorPricesRaw.find(cp => cp.colorName === selectedModalColor);
            if (found) {
                // CHỈ hiển thị dealerPrice (có thể = 0)
                return found.dealerPrice !== undefined ? found.dealerPrice : 0;
            }
        }
        
        // Tab 2: Manufacturer vehicles (có colorPrices)
        if (vehicleData.colorPrices) {
            return vehicleData.colorPrices[selectedModalColor] || 0;
        }
        
        return 0;
    };

    const getCurrentModalQuantity = () => {
        return vehicleData.colorQuantities[selectedModalColor] || 0;
    };

    // Lấy giá niêm yết (manufacturerPrice) cho màu đang chọn
    const getCurrentManufacturerPrice = () => {
        // Try colorPricesRaw first (for dealer vehicles)
        if (vehicleData.colorPricesRaw) {
            const found = vehicleData.colorPricesRaw.find(cp => cp.colorName === selectedModalColor);
            if (found) {
                return found.manufacturerPrice || found.price || found.dealerPrice || 0;
            }
        }
        // Try colorPrices for manufacturer vehicles
        if (vehicleData.colorPrices) {
            return vehicleData.colorPrices[selectedModalColor] || 0;
        }
        return 0;
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{vehicleData.name}</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <div className="vehicle-detail-image">
                        <img
                            src={getCurrentModalImage()}
                            alt={`${vehicleData.name} - ${selectedModalColor}`}
                            onError={(e) => {
                                e.target.src = vehicleData.defaultImage;
                            }}
                        />
                    </div>
                    <div className="vehicle-detail-info">
                        {loadingConfig && (
                            <div className="modal-loading-detail">
                                Đang tải thông tin chi tiết...
                            </div>
                        )}
                        <div className="detail-section">
                            <h3>Thông tin cơ bản</h3>
                            <div className="detail-grid">
                                <div className="detail-item">
                                    <span>Giá niêm yết:</span>
                                    <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(getCurrentManufacturerPrice())}</span>
                                </div>
                                <div className="detail-item">
                                    <span>Tổng tồn kho:</span>
                                    <span>{vehicleData.stock} xe</span>
                                </div>
                                <div className="detail-item">
                                    <span>Trạng thái xe:</span>
                                    <span>{(() => {
                                        if (vehicleData.colorPricesRaw) {
                                            const found = vehicleData.colorPricesRaw.find(cp => cp.colorName === selectedModalColor);
                                            return found && found.status ? found.status : 'Không rõ';
                                        }
                                        return 'Không rõ';
                                    })()}</span>
                                </div>
                            </div>
                        </div>
                        <div className="detail-section">
                            <h3>Chọn màu sắc</h3>
                            <div className="color-price-grid">
                                {vehicleData.colors.map((color, index) => {
                                    let price = 0;
                                    
                                    // Tab 1: Dealer vehicles (có colorPricesRaw)
                                    if (vehicleData.colorPricesRaw) {
                                        const found = vehicleData.colorPricesRaw.find(cp => cp.colorName === color);
                                        if (found) {
                                            price = found.dealerPrice !== undefined ? found.dealerPrice : 0;
                                        }
                                    } 
                                    // Tab 2: Manufacturer vehicles (có colorPrices)
                                    else if (vehicleData.colorPrices) {
                                        price = vehicleData.colorPrices[color] || 0;
                                    }
                                    
                                    return (
                                        <div
                                            key={index}
                                            className={`color-price-item clickable ${selectedModalColor === color ? 'active' : ''}`}
                                            onClick={() => setSelectedModalColor(color)}
                                        >
                                            <div>
                                                <div className="color-name">{color}</div>
                                                <div className={`color-qty-info ${selectedModalColor === color ? 'active' : ''}`}>
                                                    Tồn: {vehicleData.colorQuantities[color]} xe
                                                </div>
                                            </div>
                                            <div className="color-price">
                                                {new Intl.NumberFormat('vi-VN', {
                                                    style: 'currency',
                                                    currency: 'VND'
                                                }).format(price)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="selected-price">
                                <strong className="selected-price-value">
                                    Giá đã chọn ({selectedModalColor}): {' '}
                                    {new Intl.NumberFormat('vi-VN', {
                                        style: 'currency',
                                        currency: 'VND'
                                    }).format(getCurrentModalPrice())}
                                </strong>
                                <div className="selected-price-qty">
                                    Tồn kho: {getCurrentModalQuantity()} xe
                                </div>
                            </div>
                        </div>
                        {vehicleData.specs && (
                            <div className="detail-section">
                                <h3>Thông số kỹ thuật</h3>
                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <span>Pin:</span>
                                        <span>{vehicleData.specs.battery}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span>Phạm vi hoạt động:</span>
                                        <span>{vehicleData.range} km</span>
                                    </div>
                                    <div className="detail-item">
                                        <span>Thời gian sạc:</span>
                                        <span>{vehicleData.charging}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span>Công suất:</span>
                                        <span>{vehicleData.power} kW</span>
                                    </div>
                                    <div className="detail-item">
                                        <span>Mô-men xoắn:</span>
                                        <span>{vehicleData.specs.torque}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span>Số ghế:</span>
                                        <span>{vehicleData.specs.seats} ghế</span>
                                    </div>
                                    <div className="detail-item">
                                        <span>Kích thước:</span>
                                        <span>{vehicleData.specs.dimensions}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span>Chiều dài cơ sở:</span>
                                        <span>{vehicleData.specs.wheelbase}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span>Trọng lượng:</span>
                                        <span>{vehicleData.specs.weight}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


export default DealerCarManagement;
