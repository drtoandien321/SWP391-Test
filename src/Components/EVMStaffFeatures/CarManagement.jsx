import React, { useEffect, useState } from 'react';
import { addCarToDealer, getVariantConfiguration, transformConfigurationData, getCarVariantDetails, transformCarVariantData, searchCarVariantsByModelAndVariant, getCarVariantsByDealerName, fetchDealerNames, addCompleteCar, fetchAllModelNames, fetchSegmentByModelName, fetchDescriptionByModelAndVariant, fetchConfigurationByModelAndVariant, fetchVariantNamesByModel, updateConfigurationByModelAndVariant, fetchColorsByModelAndVariant, updateManufacturerPriceByModelVariantColor, fetchManufacturerPriceByModelVariantColor, uploadImage, deleteCarByModelVariantColor, getAllDistributionRequests, getAllDistributionRequestsByStatus, approveDistributionRequest, rejectDistributionRequest, setExpectedDeliveryDate} from '../../services/carVariantApi';
import './CarManagement.css';
import { showNotification } from '../Notification';
// Modal hiển thị chi tiết xe (đồng bộ style user VehicleInfoFeature)
const VehicleDetailModal = ({ vehicle, selectedColor, onColorChange, loading, onClose }) => {
	const [selectedModalColor, setSelectedModalColor] = useState(selectedColor || (vehicle.colors && vehicle.colors[0]));
	if (!vehicle) return null;
	const handleOverlayClick = (e) => {
		if (e.target.classList.contains('modal-overlay')) {
			onClose();
		}
	};
	// Lấy giá và tồn kho cho từng màu
	const getCurrentModalPrice = () => {
		if (vehicle.colorPricesRaw) {
			const colorObj = vehicle.colorPricesRaw.find(c => c.colorName === selectedModalColor);
			if (colorObj && colorObj.dealerPrice != null) return colorObj.dealerPrice;
		}
		if (vehicle.colorPrices) {
			return vehicle.colorPrices[selectedModalColor] || 0;
		}
		return 0;
	};
	const getCurrentModalQuantity = () => {
		if (vehicle.colorQuantities) {
			return vehicle.colorQuantities[selectedModalColor] || 0;
		}
		return 0;
	};
	const getCurrentModalImage = () => {
		return vehicle.images && vehicle.images[selectedModalColor] ? vehicle.images[selectedModalColor] : vehicle.defaultImage;
	};
	// Khi chọn màu mới
	const handleColorClick = (color) => {
		setSelectedModalColor(color);
		if (onColorChange) onColorChange(color);
	};
	return (
		<div className="modal-overlay" onClick={handleOverlayClick}>
			<div className="modal-content" onClick={e => e.stopPropagation()}>
				<div className="modal-header">
					<h2>{vehicle.name || vehicle.modelName}</h2>
					<button className="close-btn" onClick={onClose}>×</button>
				</div>
				<div className="modal-body">
					<div className="vehicle-detail-image">
						<img
							src={getCurrentModalImage()}
							alt={`${vehicle.name || vehicle.modelName} - ${selectedModalColor}`}
							onError={e => { e.target.src = vehicle.defaultImage; }}
							className="vehicle-detail-img"
						/>
					</div>
					<div className="vehicle-detail-info">
						{loading && (
							<div className="vehicle-detail-loading">Đang tải thông tin chi tiết...</div>
						)}
									{/* Đã xóa phần thông tin cơ bản theo yêu cầu */}
									<div className="detail-section">
										<h3>Chọn màu sắc</h3>
										<div className="colors-list">
											{vehicle.colors && vehicle.colors.map((color, idx) => (
												<span
													key={color}
													className={`color-tag${selectedModalColor === color ? ' active' : ''}`}
													onClick={() => handleColorClick(color)}
												>
													{color}
												</span>
											))}
										</div>
									</div>
						{vehicle.specs && (
							<div className="detail-section">
								<h3>Thông số kỹ thuật</h3>
								<div className="detail-grid">
									{vehicle.specs.battery && (
										<div className="detail-item"><span>Pin:</span><span>{vehicle.specs.battery}</span></div>
									)}
									{vehicle.range && (
										<div className="detail-item"><span>Phạm vi hoạt động:</span><span>{vehicle.range} km</span></div>
									)}
									{vehicle.charging && (
										<div className="detail-item"><span>Thời gian sạc:</span><span>{vehicle.charging}</span></div>
									)}
									{vehicle.power && (
										<div className="detail-item"><span>Công suất:</span><span>{vehicle.power} kW</span></div>
									)}
									{vehicle.specs.torque && (
										<div className="detail-item"><span>Mô-men xoắn:</span><span>{vehicle.specs.torque}</span></div>
									)}
									{vehicle.specs.seats && (
										<div className="detail-item"><span>Số ghế:</span><span>{vehicle.specs.seats} ghế</span></div>
									)}
									{vehicle.specs.dimensions && (
										<div className="detail-item"><span>Kích thước:</span><span>{vehicle.specs.dimensions}</span></div>
									)}
									{vehicle.specs.wheelbase && (
										<div className="detail-item"><span>Chiều dài cơ sở:</span><span>{vehicle.specs.wheelbase}</span></div>
									)}
									{vehicle.specs.weight && (
										<div className="detail-item"><span>Trọng lượng:</span><span>{vehicle.specs.weight}</span></div>
									)}
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
// End of VehicleDetailModal (chuẩn user)

const CarManagement = () => {
	// 1. State khai báo
	const [showAddCarModal, setShowAddCarModal] = useState(false);
	const [addCarFormData, setAddCarFormData] = useState({ modelName: '', variantName: '', colorName: '', dealerName: '', quantity: 1 });
	const [addCarVehicle, setAddCarVehicle] = useState(null);
	const [addCarLoading, setAddCarLoading] = useState(false);
	const [addCarMessage, setAddCarMessage] = useState('');
	const [selectedVehicle, setSelectedVehicle] = useState(null);
	const [vehicleDetail, setVehicleDetail] = useState(null);
	const [vehicleDetailLoading, setVehicleDetailLoading] = useState(false);
	const [dealerNames, setDealerNames] = useState([]);
	const [selectedDealer, setSelectedDealer] = useState("");
	const [vehicles, setVehicles] = useState([]);
	const [selectedColor, setSelectedColor] = useState({});
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");
	const [searchTerm, setSearchTerm] = useState("");
	const [searchModel, setSearchModel] = useState("all");
	const [searchVariant, setSearchVariant] = useState("all");
	const [allModels, setAllModels] = useState([]);
	const [allVariants, setAllVariants] = useState([]);
	const [searching, setSearching] = useState(false);
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [showUpdateConfigModal, setShowUpdateConfigModal] = useState(false);
	const [updateConfigData, setUpdateConfigData] = useState({ modelName: '', variantName: '', configuration: {} });
	const [updateConfigMessage, setUpdateConfigMessage] = useState('');
	const [updateConfigLoading, setUpdateConfigLoading] = useState(false);
	const [updateVariantOptions, setUpdateVariantOptions] = useState([]);

	// Update price modal state
	const [showUpdatePriceModal, setShowUpdatePriceModal] = useState(false);
	const [updatePriceData, setUpdatePriceData] = useState({ modelName: '', variantName: '', colorName: '' });
	const [newPrice, setNewPrice] = useState('');
	const [manufacturerPrice, setManufacturerPrice] = useState(null);
	const [updatePriceMessage, setUpdatePriceMessage] = useState('');
	const [updatePriceLoading, setUpdatePriceLoading] = useState(false);
	const [priceVariantOptions, setPriceVariantOptions] = useState([]);
	const [priceColorOptions, setPriceColorOptions] = useState([]);

	// Delete car modal state
	const [showDeleteCarModal, setShowDeleteCarModal] = useState(false);
	const [deleteCarData, setDeleteCarData] = useState({ modelName: '', variantName: '', colorName: '' });
	const [deleteCarMessage, setDeleteCarMessage] = useState('');
	const [deleteCarLoading, setDeleteCarLoading] = useState(false);
	const [deleteVariantOptions, setDeleteVariantOptions] = useState([]);
	const [deleteColorOptions, setDeleteColorOptions] = useState([]);

	// ...existing code...
	const [createCarData, setCreateCarData] = useState({
		model: { modelName: "", segment: "" },
		variant: { variantName: "", description: "" },
		configuration: {
			batteryCapacity: "", batteryType: "", fullChargeTime: "", rangeKm: "", power: "", torque: "", lengthMm: "", widthMm: "", heightMm: "", wheelbaseMm: "", weightKg: "", trunkVolumeL: "", seats: ""
		},
		color: "",
		car: { productionYear: "", price: "", status: "", imagePath: "" }
	});
	const [createCarLoading, setCreateCarLoading] = useState(false);
	const [createCarError, setCreateCarError] = useState("");
	const [createCarSuccess, setCreateCarSuccess] = useState("");
	const [modelOptions, setModelOptions] = useState([]);
	const [variantOptions, setVariantOptions] = useState([]);
	const [isCustomModel, setIsCustomModel] = useState(false);
	const [customModelName, setCustomModelName] = useState("");
	const [isCustomVariant, setIsCustomVariant] = useState(false);
	const [customVariantName, setCustomVariantName] = useState("");

	// Staff Notification States
	const [showStaffNotificationModal, setShowStaffNotificationModal] = useState(false);
	const [staffNotifications, setStaffNotifications] = useState([]);
	const [loadingStaffNotifications, setLoadingStaffNotifications] = useState(false);
	const [rejectModal, setRejectModal] = useState({ open: false, requestId: null });
	const [rejectReason, setRejectReason] = useState('');
	const [rejectLoading, setRejectLoading] = useState(false);
	const [deliveryModal, setDeliveryModal] = useState({ open: false, requestId: null });
	const [deliveryDate, setDeliveryDate] = useState('');
	const [deliveryLoading, setDeliveryLoading] = useState(false);
	const [statusFilter, setStatusFilter] = useState('all'); // Filter notifications by status

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

	// 2. Các hàm xử lý logic

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

	// Handler for modelName select in update config modal
	const handleUpdateModelChange = async (modelName) => {
		setUpdateConfigData(d => ({ ...d, modelName, variantName: '' }));
		setUpdateVariantOptions([]);
		if (modelName) {
			try {
				const variantRes = await fetchVariantNamesByModel(modelName);
				setUpdateVariantOptions(Array.isArray(variantRes) ? variantRes : (variantRes.variantNames || []));
			} catch {
				setUpdateVariantOptions([]);
			}
		}
	};

	// Handler for variantName select in update config modal
	const handleUpdateVariantChange = async (variantName) => {
		setUpdateConfigData(d => ({ ...d, variantName }));
		const modelName = updateConfigData.modelName;
		if (modelName && variantName) {
			try {
				const configRes = await fetchConfigurationByModelAndVariant(modelName, variantName);
				setUpdateConfigData(d => ({
					...d,
					configuration: {
						batteryCapacity: configRes.batteryCapacity || '',
						batteryType: configRes.batteryType || '',
						fullChargeTime: configRes.fullChargeTime || '',
						rangeKm: configRes.rangeKm || '',
						power: configRes.power || '',
						torque: configRes.torque || '',
						lengthMm: configRes.lengthMm || '',
						widthMm: configRes.widthMm || '',
						heightMm: configRes.heightMm || '',
						wheelbaseMm: configRes.wheelbaseMm || '',
						weightKg: configRes.weightKg || '',
						trunkVolumeL: configRes.trunkVolumeL || '',
						seats: configRes.seats || ''
					}
				}));
			} catch {
				setUpdateConfigData(d => ({
					...d,
					configuration: {
						batteryCapacity: '', batteryType: '', fullChargeTime: '', rangeKm: '', power: '', torque: '', lengthMm: '', widthMm: '', heightMm: '', wheelbaseMm: '', weightKg: '', trunkVolumeL: '', seats: ''
					}
				}));
			}
		}
	};

	// Handlers for update price modal
	const handlePriceModelChange = async (modelName) => {
		setUpdatePriceData(d => ({ ...d, modelName, variantName: '', colorName: '' }));
		setPriceVariantOptions([]);
		setPriceColorOptions([]);
		setManufacturerPrice(null);
		setNewPrice('');
		if (modelName) {
			try {
				const variantRes = await fetchVariantNamesByModel(modelName);
				setPriceVariantOptions(Array.isArray(variantRes) ? variantRes : (variantRes.variantNames || []));
			} catch {
				setPriceVariantOptions([]);
			}
		}
	};

	const handlePriceVariantChange = async (variantName) => {
		setUpdatePriceData(d => ({ ...d, variantName, colorName: '' }));
		setPriceColorOptions([]);
		setManufacturerPrice(null);
		setNewPrice('');
		const modelName = updatePriceData.modelName;
		if (modelName && variantName) {
			try {
				const colors = await fetchColorsByModelAndVariant(modelName, variantName);
				let opts = [];
				if (Array.isArray(colors)) {
					if (colors.length && typeof colors[0] === 'string') opts = colors;
					else if (colors.length && colors[0].colorName) opts = colors.map(c => c.colorName);
					else opts = colors;
				}
				setPriceColorOptions(opts);
			} catch {
				setPriceColorOptions([]);
			}
		}
	};
	// Khi chọn colorName, tự động lấy giá nhà máy
	useEffect(() => {
		const { modelName, variantName, colorName } = updatePriceData;
		if (modelName && variantName && colorName) {
			setManufacturerPrice('Đang tải...');
			fetchManufacturerPriceByModelVariantColor(modelName, variantName, colorName)
				.then(res => {
					// Đúng trường trả về từ backend là manufacturerPrice
					let price = null;
					if (res && typeof res === 'object' && 'manufacturerPrice' in res) {
						price = res.manufacturerPrice;
					} else if (typeof res === 'number') {
						price = res;
					}
					if (price !== null && price !== undefined && price !== '') {
						setManufacturerPrice(price);
					} else {
						setManufacturerPrice('Không có dữ liệu');
					}
					setNewPrice('');
				})
				.catch(() => {
					setManufacturerPrice('Không có dữ liệu');
					setNewPrice('');
				});
		} else {
			setManufacturerPrice(null);
			setNewPrice('');
		}
	}, [updatePriceData.modelName, updatePriceData.variantName, updatePriceData.colorName]);

	const handleUpdatePriceSubmit = async (e) => {
		e.preventDefault();
		setUpdatePriceLoading(true);
		setUpdatePriceMessage('');
		try {
			if (!updatePriceData.modelName || !updatePriceData.variantName || !updatePriceData.colorName) {
				setUpdatePriceMessage('Vui lòng chọn model, variant và màu.');
				setUpdatePriceLoading(false);
				return;
			}
			if (!newPrice || isNaN(Number(newPrice))) {
				setUpdatePriceMessage('Vui lòng nhập giá mới hợp lệ.');
				setUpdatePriceLoading(false);
				return;
			}
			const priceValue = Number(newPrice);
			if (priceValue <= 0) {
				setUpdatePriceMessage('Giá phải lớn hơn 0.');
				setUpdatePriceLoading(false);
				return;
			}
			await updateManufacturerPriceByModelVariantColor(
				updatePriceData.modelName, 
				updatePriceData.variantName, 
				updatePriceData.colorName, 
				priceValue
			);
			setUpdatePriceMessage('Cập nhật giá thành công!');
			loadVehicles();
		} catch (err) {
			setUpdatePriceMessage(err.message || 'Cập nhật thất bại!');
		} finally {
			setUpdatePriceLoading(false);
		}
	};

	// Handlers for delete car modal
	const handleDeleteModelChange = async (modelName) => {
		setDeleteCarData(d => ({ ...d, modelName, variantName: '', colorName: '' }));
		setDeleteVariantOptions([]);
		setDeleteColorOptions([]);
		if (!modelName) return;
		try {
			const variants = await fetchVariantNamesByModel(modelName);
			setDeleteVariantOptions(variants || []);
		} catch (err) {
			setDeleteVariantOptions([]);
		}
	};

	const handleDeleteVariantChange = async (variantName) => {
		setDeleteCarData(d => ({ ...d, variantName, colorName: '' }));
		setDeleteColorOptions([]);
		if (!variantName || !deleteCarData.modelName) return;
		try {
			const colors = await fetchColorsByModelAndVariant(deleteCarData.modelName, variantName);
			setDeleteColorOptions(colors || []);
		} catch (err) {
			setDeleteColorOptions([]);
		}
	};

	const handleDeleteCarSubmit = async (e) => {
		e.preventDefault();
		setDeleteCarLoading(true);
		setDeleteCarMessage('');
		try {
			if (!deleteCarData.modelName) {
				setDeleteCarMessage('Vui lòng chọn ít nhất modelName!');
				setDeleteCarLoading(false);
				return;
			}
			
			// Xác nhận trước khi xóa
			let confirmMessage = '';
			let confirmTitle = 'Xác nhận xóa xe';
			if (!deleteCarData.variantName && !deleteCarData.colorName) {
				confirmMessage = `Bạn có chắc chắn muốn xóa TOÀN BỘ MODEL "${deleteCarData.modelName}"?\n\nHành động này sẽ xóa tất cả các variant và màu xe thuộc model này!`;
			} else if (!deleteCarData.colorName) {
				confirmMessage = `Bạn có chắc chắn muốn xóa TOÀN BỘ VARIANT "${deleteCarData.variantName}" của model "${deleteCarData.modelName}"?\n\nHành động này sẽ xóa tất cả màu xe thuộc variant này!`;
			} else {
				confirmMessage = `Bạn có chắc chắn muốn xóa xe "${deleteCarData.modelName} ${deleteCarData.variantName}" màu "${deleteCarData.colorName}"?`;
			}
			
			showConfirm(confirmTitle, confirmMessage, async () => {
				try {
					setDeleteCarLoading(true);
					await deleteCarByModelVariantColor({
						modelName: deleteCarData.modelName,
						variantName: deleteCarData.variantName || null,
						colorName: deleteCarData.colorName || null
					});
					
					// Hiển thị thông báo chi tiết hơn
					if (!deleteCarData.variantName && !deleteCarData.colorName) {
						setDeleteCarMessage(`Xóa toàn bộ model "${deleteCarData.modelName}" thành công!`);
					} else if (!deleteCarData.colorName) {
						setDeleteCarMessage(`Xóa variant "${deleteCarData.variantName}" của model "${deleteCarData.modelName}" thành công!`);
					} else {
						setDeleteCarMessage(`Xóa xe màu "${deleteCarData.colorName}" thành công!`);
					}
					
					// Reload vehicles and model options
					loadVehicles();
					// Cập nhật lại danh sách modelOptions sau khi xóa xe
					fetchAllModelNames().then(models => setModelOptions(models)).catch(() => setModelOptions([]));
					
					// Reset form xóa xe sau khi xóa thành công
					setDeleteCarData({ modelName: '', variantName: '', colorName: '' });
					setDeleteVariantOptions([]);
					setDeleteColorOptions([]);
					
					// Reset form tạo xe mới về trạng thái ban đầu
					setCreateCarData({
						model: { modelName: "", segment: "" },
						variant: { variantName: "", description: "" },
						configuration: {
							batteryCapacity: "", batteryType: "", fullChargeTime: "", rangeKm: "", power: "", torque: "", lengthMm: "", widthMm: "", heightMm: "", wheelbaseMm: "", weightKg: "", trunkVolumeL: "", seats: ""
						},
						color: "",
						car: { productionYear: "", price: "", status: "", imagePath: "" }
					});
					setVariantOptions([]);
					setIsCustomModel(false);
					setCustomModelName("");
					setIsCustomVariant(false);
					setCustomVariantName("");
					setCreateCarError("");
					setCreateCarSuccess("");
				} catch (err) {
					setDeleteCarMessage(err.message || 'Xóa xe thất bại!');
				} finally {
					setDeleteCarLoading(false);
				}
			}, 'error');
			
			setDeleteCarLoading(false);
		} catch (err) {
			setDeleteCarMessage(err.message || 'Lỗi khi xử lý xóa xe!');
			setDeleteCarLoading(false);
		}
	};	const handleViewDetail = async (vehicle) => {
		setSelectedVehicle(vehicle);
		setVehicleDetailLoading(true);
		try {
			const configData = await getVariantConfiguration(vehicle.id);
			if (configData) {
				setVehicleDetail({
					...vehicle,
					specs: transformConfigurationData(configData),
					range: configData.rangeKm,
					charging: `${configData.fullChargeTime} phút (AC)`,
					power: configData.power
				});
			} else {
				setVehicleDetail(vehicle);
			}
		} catch {
			setVehicleDetail(vehicle);
		} finally {
			setVehicleDetailLoading(false);
		}
	};

	const handleModelChange = async (modelName) => {
		if (modelName === "__custom__") {
			setIsCustomModel(true);
			setCustomModelName("");
			setCreateCarData(d => ({ ...d, model: { ...d.model, modelName: "", segment: "" }, variant: { ...d.variant, variantName: "", description: "" } }));
			setVariantOptions([]);
			return;
		} else {
			setIsCustomModel(false);
			setCustomModelName("");
		}
		setCreateCarData(d => ({ ...d, model: { ...d.model, modelName }, variant: { ...d.variant, variantName: "", description: "" } }));
		setVariantOptions([]);
		if (modelName) {
			try {
				const segmentRes = await fetchSegmentByModelName(modelName);
				setCreateCarData(d => ({ ...d, model: { ...d.model, segment: segmentRes || "" } }));
			} catch (err) {
				setCreateCarData(d => ({ ...d, model: { ...d.model, segment: "" } }));
			}
			try {
				const variantRes = await fetchVariantNamesByModel(modelName);
				setVariantOptions(Array.isArray(variantRes) ? variantRes : (variantRes.variantNames || []));
			} catch {
				setVariantOptions([]);
			}
		} else {
			setCreateCarData(d => ({ ...d, model: { ...d.model, segment: "" } }));
			setVariantOptions([]);
		}
	};

	const handleVariantChange = async (variantName) => {
		if (variantName === "__custom__") {
			setIsCustomVariant(true);
			setCustomVariantName("");
			setCreateCarData(d => ({ ...d, variant: { ...d.variant, variantName: "", description: "" } }));
			return;
		} else {
			setIsCustomVariant(false);
			setCustomVariantName("");
		}
		setCreateCarData(d => ({ ...d, variant: { ...d.variant, variantName } }));
		const modelName = isCustomModel ? customModelName : createCarData.model.modelName;
		if (modelName && variantName) {
			try {
				const descRes = await fetchDescriptionByModelAndVariant(modelName, variantName);
				const description = typeof descRes === 'string' ? descRes : (descRes.description || "");
				setCreateCarData(d => ({ ...d, variant: { ...d.variant, description } }));
			} catch {
				setCreateCarData(d => ({ ...d, variant: { ...d.variant, description: "" } }));
			}
			try {
				const configRes = await fetchConfigurationByModelAndVariant(modelName, variantName);
				setCreateCarData(d => ({
					...d, configuration: {
						batteryCapacity: configRes.batteryCapacity || "",
						batteryType: configRes.batteryType || "",
						fullChargeTime: configRes.fullChargeTime || "",
						rangeKm: configRes.rangeKm || "",
						power: configRes.power || "",
						torque: configRes.torque || "",
						lengthMm: configRes.lengthMm || "",
						widthMm: configRes.widthMm || "",
						heightMm: configRes.heightMm || "",
						wheelbaseMm: configRes.wheelbaseMm || "",
						weightKg: configRes.weightKg || "",
						trunkVolumeL: configRes.trunkVolumeL || "",
						seats: configRes.seats || ""
					}
				}));
			} catch {
				setCreateCarData(d => ({
					...d, configuration: {
						batteryCapacity: "", batteryType: "", fullChargeTime: "", rangeKm: "", power: "", torque: "", lengthMm: "", widthMm: "", heightMm: "", wheelbaseMm: "", weightKg: "", trunkVolumeL: "", seats: ""
					}
				}));
			}
		}
	};

	const loadVehicles = async (opts = {}) => {
		try {
			setIsLoading(true);
			setError('');
			let apiData;
			if (selectedDealer) {
				apiData = await getCarVariantsByDealerName(selectedDealer);
			} else {
				apiData = await getCarVariantDetails();
			}
			const transformed = transformCarVariantData(apiData);
			setVehicles(transformed);
			const initialColors = {};
			transformed.forEach(v => {
				initialColors[v.id] = v.colors[0];
			});
			setSelectedColor(initialColors);
		} catch (err) {
			setError('Không thể tải danh sách xe. Vui lòng thử lại.');
			setVehicles([]);
		} finally {
			setIsLoading(false);
		}
	};

	// Load staff notifications (all dealer requests)
	const loadStaffNotifications = async (status = null) => {
		setLoadingStaffNotifications(true);
		try {
			let response;
			if (status && status !== 'all') {
				response = await getAllDistributionRequestsByStatus(status);
			} else {
				response = await getAllDistributionRequests();
			}
			
			// Extract data array from response
			const dataArray = response.data || response;
			
			// Transform API response to match our format
			const transformedNotifications = (Array.isArray(dataArray) ? dataArray : []).map(req => ({
				id: req.requestId,
				dealerName: req.dealerName,
				modelName: req.modelName,
				variantName: req.variantName,
				colorName: req.colorName,
				quantity: req.quantity,
				unitPriceAtApproval: req.unitPriceAtApproval, // NEW: Giá đơn vị
				totalAmount: req.totalAmount, // NEW: Tổng giá trị
				note: req.note || '', // API might have note field
				rejectionReason: req.rejectionReason || '',
				status: req.status,
				createdAt: req.requestDate,
				approvedAt: req.approvedDate,
				expectedDeliveryDate: req.expectedDeliveryDate,
				actualDeliveryDate: req.actualDeliveryDate
			}));
			
			// Sắp xếp theo ngày tạo mới nhất lên trên
			transformedNotifications.sort((a, b) => {
				return new Date(b.createdAt) - new Date(a.createdAt);
			});
			
			setStaffNotifications(transformedNotifications);
		} catch (error) {
			console.error("Error loading staff notifications:", error);
			showNotification("Không thể tải danh sách yêu cầu: " + error.message, "error");
		} finally {
			setLoadingStaffNotifications(false);
		}
	};

	// Approve dealer request
	const handleApproveRequest = async (requestId) => {
		showConfirm(
			'Xác nhận duyệt yêu cầu',
			'Bạn có chắc chắn muốn duyệt yêu cầu này?',
			async () => {
				try {
					await approveDistributionRequest(requestId);
					
					// Reload notifications to get updated status
					await loadStaffNotifications(statusFilter !== 'all' ? statusFilter : null);
					showNotification("Đã duyệt yêu cầu thành công!", "success");
				} catch (error) {
					console.error("Error approving request:", error);
					showNotification("Có lỗi xảy ra khi duyệt yêu cầu: " + error.message, "error");
				}
			},
			'success'
		);
	};

	// Set delivery date and start delivery
	const handleSetDeliveryDate = async () => {
		if (!deliveryDate) {
			showNotification("Vui lòng chọn ngày giao dự kiến!", "warning");
			return;
		}

		setDeliveryLoading(true);
		try {
			// Xử lý datetime-local: thêm timezone offset để giữ đúng giờ local
			// datetime-local trả về "2025-11-22T17:35" (không có timezone)
			// Cần chuyển thành ISO với timezone để backend nhận đúng giờ
			const localDateTime = new Date(deliveryDate);
			
			// Lấy offset timezone (VN là -420 phút = -7 giờ so với UTC)
			const timezoneOffset = localDateTime.getTimezoneOffset();
			
			// Bù lại offset để có đúng giờ local trong UTC
			const adjustedDate = new Date(localDateTime.getTime() - (timezoneOffset * 60 * 1000));
			const isoDate = adjustedDate.toISOString();
			
			await setExpectedDeliveryDate(deliveryModal.requestId, isoDate);
			
			setDeliveryModal({ open: false, requestId: null });
			setDeliveryDate('');
			await loadStaffNotifications(statusFilter !== 'all' ? statusFilter : null);
			showNotification("Đã thiết lập ngày giao và bắt đầu giao xe thành công!", "success");
		} catch (error) {
			console.error("Error setting delivery date:", error);
			showNotification("Có lỗi xảy ra khi thiết lập ngày giao: " + (error.message || "Vui lòng chọn thời gian trong tương lai"), "error");
		} finally {
			setDeliveryLoading(false);
		}
	};

	// Reject dealer request
	const handleRejectRequest = async (requestId, reason) => {
		if (!reason || reason.trim() === '') {
			showNotification("Vui lòng nhập lý do từ chối", "warning");
			return;
		}
		
		setRejectLoading(true);
		try {
			await rejectDistributionRequest(requestId, reason);
			
			// Close reject modal
			setRejectModal({ open: false, requestId: null });
			setRejectReason('');
			
			// Reload notifications to get updated status
			await loadStaffNotifications(statusFilter !== 'all' ? statusFilter : null);
			showNotification("Đã từ chối yêu cầu thành công", "success");
		} catch (error) {
			console.error("Error rejecting request:", error);
			showNotification("Có lỗi xảy ra khi từ chối yêu cầu: " + error.message, "error");
		} finally {
			setRejectLoading(false);
		}
	};

	const getCurrentImage = (vehicle) => {
		const currentColor = selectedColor[vehicle.id] || vehicle.colors[0];
		return vehicle.images[currentColor] || vehicle.defaultImage;
	};
	const getCurrentPrice = (vehicle) => {
		const currentColor = selectedColor[vehicle.id] || vehicle.colors[0];
		return vehicle.colorPrices[currentColor];
	};
	const getCurrentQuantity = (vehicle) => {
		const currentColor = selectedColor[vehicle.id] || vehicle.colors[0];
		return vehicle.colorQuantities[currentColor] || 0;
	};
	const handleColorChange = (vehicleId, color) => {
		setSelectedColor(prev => ({ ...prev, [vehicleId]: color }));
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

	// 3. useEffect cho dữ liệu
	useEffect(() => {
		loadVehicles();
		fetchDealerNames().then(names => setDealerNames(names)).catch(() => setDealerNames([]));
		fetchAllModelNames().then(models => setModelOptions(models)).catch(() => setModelOptions([]));
		// Load notifications ngay khi component mount để hiển thị badge
		loadStaffNotifications();
	}, [])

	useEffect(() => {
		const models = Array.from(new Set(vehicles.map(v => v.modelName))).filter(Boolean);
		setAllModels(models);
		const variants = Array.from(new Set(vehicles.map(v => v.variantName))).filter(Boolean);
		setAllVariants(variants);
	}, [vehicles]);

	// 4. Render UI
	if (isLoading) {
		return <div className="car-loading">Đang tải dữ liệu xe...</div>;
	}
	if (error) {
		return <div className="car-error">{error}</div>;
	}

	const filteredVehicles = vehicles.filter(vehicle => {
		let match = true;
		if (searchTerm && searchTerm.trim() !== "") {
			const term = searchTerm.toLowerCase();
			match = (
				vehicle.name.toLowerCase().includes(term) ||
				(vehicle.code && vehicle.code.toLowerCase().includes(term)) ||
				(vehicle.modelName && vehicle.modelName.toLowerCase().includes(term)) ||
				(vehicle.variantName && vehicle.variantName.toLowerCase().includes(term))
			);
		}
		if (searchModel !== "all" && vehicle.modelName !== searchModel) {
			match = false;
		}
		if (searchVariant !== "all" && vehicle.variantName !== searchVariant) {
			match = false;
		}
		return match;
	});

	return (
		<div className="car-management">
			<div className="car-management-container">
				<div className="car-management-header-wrapper">
					<h2 className="car-management-title">Quản lý xe</h2>
					<button
						className="notification-btn"
						onClick={() => {
							setShowStaffNotificationModal(true);
							loadStaffNotifications();
						}}
						title="Xem yêu cầu từ đại lý"
					>
						🔔 Yêu cầu
						{staffNotifications.filter(n => n.status === 'Chờ duyệt').length > 0 && (
							<span className="notification-badge">
								{staffNotifications.filter(n => n.status === 'Chờ duyệt').length}
							</span>
						)}
					</button>
				</div>
				<div className="search-create-row">
					<div className="search-form-container">
						<form className="search-form" onSubmit={e => e.preventDefault()}>
							<input
								type="text"
								placeholder="🔍 Tìm kiếm xe (VD: VF3, Eco, VF5 Plus)..."
								value={searchTerm}
								onChange={e => setSearchTerm(e.target.value)}
								className="car-search-input search-main-input"
							/>
							<select
								className="car-search-input car-search-dealer"
								value={selectedDealer}
								onChange={async e => {
									setSelectedDealer(e.target.value);
									setSearchTerm("");
									setSearchModel("all");
									setSearchVariant("all");
									setIsLoading(true);
									try {
										let apiData = e.target.value ? await getCarVariantsByDealerName(e.target.value) : await getCarVariantDetails();
										const transformed = transformCarVariantData(apiData);
										setVehicles(transformed);
										const initialColors = {};
										transformed.forEach(v => {
											initialColors[v.id] = v.colors[0];
										});
										setSelectedColor(initialColors);
									} catch {
										setVehicles([]);
									} finally {
										setIsLoading(false);
									}
								}}
							>
								<option value="">Chọn đại lý để xem xe</option>
								{dealerNames.map(name => (
									<option key={name} value={name}>{name}</option>
								))}
							</select>
							<div className="search-model-variant-row">
								<select
									className="car-search-input car-search-model"
									value={searchModel}
									onChange={e => setSearchModel(e.target.value)}
								>
									<option value="all">Tất cả dòng xe</option>
									{allModels.map(model => (
										<option key={model} value={model}>{model}</option>
									))}
								</select>
								<select
									className="car-search-input car-search-variant"
									value={searchVariant}
									onChange={e => setSearchVariant(e.target.value)}
								>
									<option value="all">Tất cả phiên bản</option>
									{allVariants.map(variant => (
										<option key={variant} value={variant}>{variant}</option>
									))}
								</select>
							</div>
							<div className="search-action-group">
								<button type="button" className="reset-search-btn" onClick={() => {
									setSearchTerm("");
									setSearchModel("all");
									setSearchVariant("all");
									setSelectedDealer("");
									setIsLoading(true);
									loadVehicles();
								}}>Làm mới</button>
							</div>
						</form>
					</div>
				</div>
			</div>
			<div className="create-car-btn-row">
				<button className="create-car-btn" onClick={() => {
					setShowCreateForm(true);
					setCreateCarError("");
					setCreateCarSuccess("");
				}}>
					Tạo xe mới
				</button>
				<button className="update-car-btn" onClick={() => {
					setShowUpdateConfigModal(true);
					setUpdateConfigMessage('');
					setUpdateConfigData({ modelName: '', variantName: '', configuration: {} });
					setUpdateVariantOptions([]);
				}}>
					Cập nhật cấu hình
				</button>
				<button className="update-price-btn" onClick={() => {
					setShowUpdatePriceModal(true);
					setUpdatePriceMessage('');
					setUpdatePriceData({ modelName: '', variantName: '', colorName: '', price: '' });
					setPriceVariantOptions([]);
					setPriceColorOptions([]);
				}}>
					Cập nhật giá tiền
				</button>
				<button className="delete-car-btn" onClick={() => {
					setShowDeleteCarModal(true);
					setDeleteCarMessage('');
					setDeleteCarData({ modelName: '', variantName: '', colorName: '' });
					setDeleteVariantOptions([]);
					setDeleteColorOptions([]);
				}}>
					Xóa xe
				</button>
			</div>
			{showUpdateConfigModal && (
				<div className="user-modal-overlay">
					<div className="create-user-modal">
						<div className="create-user-modal-header">
							<h3>Cập nhật cấu hình </h3>
							<button className="create-user-modal-close" onClick={() => setShowUpdateConfigModal(false)}>&times;</button>
						</div>
						<form className="create-user-form" onSubmit={async e => {
							e.preventDefault();
							setUpdateConfigLoading(true);
							setUpdateConfigMessage('');
							try {
								if (!updateConfigData.modelName || !updateConfigData.variantName) {
									setUpdateConfigMessage('Vui lòng nhập modelName và variantName!');
									setUpdateConfigLoading(false);
									return;
								}
								await updateConfigurationByModelAndVariant(updateConfigData.modelName, updateConfigData.variantName, updateConfigData.configuration);
								setUpdateConfigMessage('Cập nhật thành công!');
							} catch (err) {
								setUpdateConfigMessage(err.message || 'Cập nhật thất bại!');
							} finally {
								setUpdateConfigLoading(false);
							}
						}}>
							<div className="form-section">
								<h4 className="form-section-title">Model</h4>
								<div className="form-row">
									<select
										required
										value={updateConfigData.modelName}
										onChange={e => handleUpdateModelChange(e.target.value)}
									>
										<option value="">Chọn dòng xe</option>
										{modelOptions.map(model => (
											<option key={model} value={model}>{model}</option>
										))}
									</select>
								</div>
							</div>
							<div className="form-section">
								<h4 className="form-section-title">Variant</h4>
								<div className="form-row">
									<select
										required
										value={updateConfigData.variantName}
										onChange={e => handleUpdateVariantChange(e.target.value)}
										disabled={!updateConfigData.modelName}
									>
										<option value="">Chọn phiên bản</option>
										{updateVariantOptions.map(variant => (
											<option key={variant} value={variant}>{variant}</option>
										))}
									</select>
								</div>
							</div>
							<div className="form-section">
								<h4 className="form-section-title">Configuration</h4>
								<div className="form-row">
									<input type="number" placeholder="Dung lượng pin" value={updateConfigData.configuration.batteryCapacity || ''} onChange={e => setUpdateConfigData(d => ({ ...d, configuration: { ...d.configuration, batteryCapacity: e.target.value } }))} />
									<input type="text" placeholder="Loại pin" value={updateConfigData.configuration.batteryType || ''} onChange={e => setUpdateConfigData(d => ({ ...d, configuration: { ...d.configuration, batteryType: e.target.value } }))} />
									<input type="number" placeholder="Thời gian sạc" value={updateConfigData.configuration.fullChargeTime || ''} onChange={e => setUpdateConfigData(d => ({ ...d, configuration: { ...d.configuration, fullChargeTime: e.target.value } }))} />
									<input type="number" placeholder="Quãng đường" value={updateConfigData.configuration.rangeKm || ''} onChange={e => setUpdateConfigData(d => ({ ...d, configuration: { ...d.configuration, rangeKm: e.target.value } }))} />
									<input type="number" placeholder="Công suất" value={updateConfigData.configuration.power || ''} onChange={e => setUpdateConfigData(d => ({ ...d, configuration: { ...d.configuration, power: e.target.value } }))} />
									<input type="number" placeholder="Mô men xoắn" value={updateConfigData.configuration.torque || ''} onChange={e => setUpdateConfigData(d => ({ ...d, configuration: { ...d.configuration, torque: e.target.value } }))} />
									<input type="number" placeholder="Chiều dài" value={updateConfigData.configuration.lengthMm || ''} onChange={e => setUpdateConfigData(d => ({ ...d, configuration: { ...d.configuration, lengthMm: e.target.value } }))} />
									<input type="number" placeholder="Chiều rộng" value={updateConfigData.configuration.widthMm || ''} onChange={e => setUpdateConfigData(d => ({ ...d, configuration: { ...d.configuration, widthMm: e.target.value } }))} />
									<input type="number" placeholder="Chiều cao" value={updateConfigData.configuration.heightMm || ''} onChange={e => setUpdateConfigData(d => ({ ...d, configuration: { ...d.configuration, heightMm: e.target.value } }))} />
									<input type="number" placeholder="Chiều dài cơ sở" value={updateConfigData.configuration.wheelbaseMm || ''} onChange={e => setUpdateConfigData(d => ({ ...d, configuration: { ...d.configuration, wheelbaseMm: e.target.value } }))} />
									<input type="number" placeholder="Khối lượng" value={updateConfigData.configuration.weightKg || ''} onChange={e => setUpdateConfigData(d => ({ ...d, configuration: { ...d.configuration, weightKg: e.target.value } }))} />
									<input type="number" placeholder="Dung tích cốp" value={updateConfigData.configuration.trunkVolumeL || ''} onChange={e => setUpdateConfigData(d => ({ ...d, configuration: { ...d.configuration, trunkVolumeL: e.target.value } }))} />
									<input type="number" placeholder="Số ghế" value={updateConfigData.configuration.seats || ''} onChange={e => setUpdateConfigData(d => ({ ...d, configuration: { ...d.configuration, seats: e.target.value } }))} />
								</div>
							</div>
							{updateConfigMessage && <div className="error-message">{updateConfigMessage}</div>}
							<button className="create-user-submit-btn" type="submit" disabled={updateConfigLoading}>
								{updateConfigLoading ? 'Đang cập nhật...' : 'Cập nhật'}
							</button>
						</form>
					</div>
				</div>
			)}
			{/* Hiển thị danh sách xe */}
			<div className="vehicle-grid">
				{filteredVehicles.map(vehicle => (
					<div key={vehicle.id} className="vehicle-card">
						<div className="vehicle-image">
							<img
								src={getCurrentImage(vehicle)}
								alt={`${vehicle.name} - ${selectedColor[vehicle.id] || vehicle.colors[0]}`}
								onError={e => { e.target.src = vehicle.defaultImage; }}
							/>
							{selectedDealer && getStatusBadge(vehicle.status, getCurrentQuantity(vehicle))}
						</div>
						<div className="vehicle-info">
							<h3>{vehicle.name}</h3>
							<div className="price-and-details">
								<div className="vehicle-price">
									{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(getCurrentPrice(vehicle))}
								</div>
								<div className="card-action-btns">
									{!selectedDealer && (
										<div className="add-car-btn-wrapper">
											<button
												className="action-btn add-car-btn"
												onClick={() => {
													setAddCarFormData({
														modelName: vehicle.modelName || '',
														variantName: vehicle.variantName || '',
														colorName: '', // Để mặc định là 'Chọn màu xe'
														dealerName: '',
														quantity: 1
													});
													setAddCarMessage('');
													setAddCarVehicle(vehicle); // Chỉ dùng cho modal Thêm xe
													setShowAddCarModal(true);
												}}
											>
												Thêm xe
											</button>
										</div>
									)}
									<div className="view-details-btn-wrapper">
										<button
											className="action-btn view-details-btn"
											onClick={() => handleViewDetail(vehicle)}
										>
											Chi tiết
										</button>
									</div>
								</div>
							</div>
							<div className="vehicle-colors">
								<span className="colors-label">Màu sắc:</span>
								<div className="colors-list">
									{vehicle.colors.map((color, idx) => (
										<span
											key={idx}
											className={`color-tag${selectedColor[vehicle.id] === color ? ' active' : ''}`}
											onClick={() => handleColorChange(vehicle.id, color)}
											title={selectedDealer ? `Tồn kho: ${vehicle.colorQuantities[color]} xe` : undefined}
										>
											{color}
										</span>
									))}
								</div>
							</div>
							{selectedDealer && (
								<div className="vehicle-stock-info">
									<div className="spec-item">
										<span className="spec-label">Tồn kho màu này:</span>
										<span className="spec-value">{getCurrentQuantity(vehicle)} xe</span>
									</div>
								</div>
							)}
						</div>
					</div>
				))}
				{/* Modal chi tiết xe - render outside the map, only when selectedVehicle is set */}
				{selectedVehicle && (
					<VehicleDetailModal
						vehicle={vehicleDetail || selectedVehicle}
						selectedColor={selectedColor[selectedVehicle.id] || selectedVehicle.colors[0]}
						onColorChange={color => handleColorChange(selectedVehicle.id, color)}
						loading={vehicleDetailLoading}
						onClose={() => { setSelectedVehicle(null); setVehicleDetail(null); }}
					/>
				)}
				{/* Modal thêm xe vào đại lý */}
				{showAddCarModal && (
					<div className="user-modal-overlay">
						<div className="create-user-modal">
							<div className="create-user-modal-header">
								<h3>Thêm xe vào đại lý</h3>
								<button className="create-user-modal-close" onClick={() => setShowAddCarModal(false)}>&times;</button>
							</div>
							<form className="create-user-form" onSubmit={async e => {
								e.preventDefault();
								setAddCarLoading(true);
								setAddCarMessage('');
								try {
									// Gọi API thêm xe vào đại lý
									await addCarToDealer({
										modelName: addCarFormData.modelName,
										variantName: addCarFormData.variantName,
										colorName: addCarFormData.colorName,
										dealerName: addCarFormData.dealerName,
										quantity: addCarFormData.quantity
									});
									setAddCarMessage('Thêm xe thành công!');
									// Không đóng modal, chỉ cập nhật lại danh sách xe
									loadVehicles();
								} catch (err) {
									setAddCarMessage('Thêm xe thất bại. Vui lòng thử lại.');
								} finally {
									setAddCarLoading(false);
								}
							}}>
								<div className="form-section">
									<h4 className="form-section-title">Thông tin xe cần thêm</h4>
									<div className="form-row">
										<div className="form-group">
											<label>Dòng xe </label>
											<input type="text" value={addCarFormData.modelName} readOnly />
										</div>
										<div className="form-group">
											<label>Phiên bản </label>
											<input type="text" value={addCarFormData.variantName} readOnly />
										</div>
										<div className="form-group">
											<label htmlFor="colorName-select">Màu xe</label>
											<select id="colorName-select" required value={addCarFormData.colorName} onChange={e => setAddCarFormData(f => ({ ...f, colorName: e.target.value }))}>
												<option value="">Chọn màu xe</option>
												{addCarVehicle && addCarVehicle.colors && addCarVehicle.colors.map(color => (
													<option key={color} value={color}>{color}</option>
												))}
											</select>
										</div>
										<div className="form-group">
											<label htmlFor="dealerName-select">Đại lý</label>
											<select id="dealerName-select" required value={addCarFormData.dealerName} onChange={e => setAddCarFormData(f => ({ ...f, dealerName: e.target.value }))}>
												<option value="">Chọn đại lý</option>
												{dealerNames.map(name => (
													<option key={name} value={name}>{name}</option>
												))}
											</select>
										</div>
										<div className="form-group">
											<label htmlFor="quantity-input">Số lượng </label>
											<input id="quantity-input" type="number" placeholder="Nhập số lượng" required min={1} value={addCarFormData.quantity} onChange={e => setAddCarFormData(f => ({ ...f, quantity: Number(e.target.value) }))} />
										</div>
									</div>
								</div>
								{addCarMessage && <div className="error-message">{addCarMessage}</div>}
								<button className="create-user-submit-btn" type="submit" disabled={addCarLoading}>
									{addCarLoading ? "Đang thêm..." : "Thêm xe"}
								</button>
							</form>
						</div>
					</div>
				)}
			</div>
			{/* Modal tạo xe mới */}
			{showCreateForm && (
				<div className="user-modal-overlay">
					<div className="create-user-modal">
						<div className="create-user-modal-header">
							<h3>Tạo xe mới</h3>
							<button className="create-user-modal-close" onClick={() => setShowCreateForm(false)}>&times;</button>
						</div>
						<form className="create-user-form" onSubmit={async e => {
							e.preventDefault();
							setCreateCarLoading(true);
							setCreateCarError("");
							setCreateCarSuccess("");
							try {
								// Chuyển đổi kiểu dữ liệu cho các trường số
								const carData = {
									model: {
										modelName: createCarData.model.modelName,
										segment: createCarData.model.segment
									},
									variant: {
										variantName: createCarData.variant.variantName,
										description: createCarData.variant.description
									},
									configuration: {
										batteryCapacity: Number(createCarData.configuration.batteryCapacity),
										batteryType: createCarData.configuration.batteryType,
										fullChargeTime: Number(createCarData.configuration.fullChargeTime),
										rangeKm: Number(createCarData.configuration.rangeKm),
										power: Number(createCarData.configuration.power),
										torque: Number(createCarData.configuration.torque),
										lengthMm: Number(createCarData.configuration.lengthMm),
										widthMm: Number(createCarData.configuration.widthMm),
										heightMm: Number(createCarData.configuration.heightMm),
										wheelbaseMm: Number(createCarData.configuration.wheelbaseMm),
										weightKg: Number(createCarData.configuration.weightKg),
										trunkVolumeL: Number(createCarData.configuration.trunkVolumeL),
										seats: Number(createCarData.configuration.seats)
									},
									color: createCarData.color,
									car: {
										productionYear: Number(createCarData.car.productionYear),
										price: Number(createCarData.car.price),
										imagePath: createCarData.car.imagePath
									}
								};
								await addCompleteCar(carData);
								setCreateCarSuccess("Tạo xe mới thành công!");
								setCreateCarData({
									model: { modelName: "", segment: "" },
									variant: { variantName: "", description: "" },
									configuration: {
										batteryCapacity: "", batteryType: "", fullChargeTime: "", rangeKm: "", power: "", torque: "", lengthMm: "", widthMm: "", heightMm: "", wheelbaseMm: "", weightKg: "", trunkVolumeL: "", seats: ""
									},
									color: "",
									car: { productionYear: "", price: "", status: "", imagePath: "" }
								});
								// Reset các custom state
								setIsCustomModel(false);
								setCustomModelName("");
								setIsCustomVariant(false);
								setCustomVariantName("");
								setVariantOptions([]);
								loadVehicles();
								// Cập nhật lại danh sách modelOptions sau khi tạo xe mới
								fetchAllModelNames().then(models => setModelOptions(models)).catch(() => { });
							} catch (err) {
								setCreateCarError(err.message || "Lỗi khi tạo xe mới");
							} finally {
								setCreateCarLoading(false);
							}
						}}>
							<div className="reset-create-car-btn-row">
								<button
									type="button"
									className="reset-create-car-btn margin-right-8"
									onClick={() => {
										setCreateCarData({
											model: { modelName: "", segment: "" },
											variant: { variantName: "", description: "" },
											configuration: {
												batteryCapacity: "", batteryType: "", fullChargeTime: "", rangeKm: "", power: "", torque: "", lengthMm: "", widthMm: "", heightMm: "", wheelbaseMm: "", weightKg: "", trunkVolumeL: "", seats: ""
											},
											color: "",
											car: { productionYear: "", price: "", status: "", imagePath: "" }
										});
										setCreateCarError("");
										setCreateCarSuccess("");
									}}
								>
									Làm mới
								</button>
							</div>
							<div className="form-section">
								<h4 className="form-section-title">Model</h4>
								<div className="form-row">
									<select
										required={!isCustomModel}
										value={isCustomModel ? "__custom__" : createCarData.model.modelName}
										onChange={e => handleModelChange(e.target.value)}
									>
										<option value="">Chọn dòng xe</option>
										{modelOptions.map(model => (
											<option key={model} value={model}>{model}</option>
										))}
										<option value="__custom__">Tạo mới...</option>
									</select>
									{isCustomModel ? (
										<>
											<input
												type="text"
												placeholder="Nhập dòng xe mới"
												required
												value={customModelName}
												onChange={e => {
													setCustomModelName(e.target.value);
													setCreateCarData(d => ({ ...d, model: { ...d.model, modelName: e.target.value } }));
												}}
											/>
											<input
												type="text"
												placeholder="Nhập phân khúc"
												required
												value={createCarData.model.segment}
												onChange={e => setCreateCarData(d => ({ ...d, model: { ...d.model, segment: e.target.value } }))}
											/>
										</>
									) : (
										<input type="text" placeholder="Phân khúc" required value={createCarData.model.segment} readOnly />
									)}
								</div>
							</div>
							<div className="form-section">
								<h4 className="form-section-title">Variant</h4>
								<div className="form-row">
									<select
										required={!isCustomVariant}
										value={isCustomVariant ? "__custom__" : createCarData.variant.variantName}
										onChange={e => handleVariantChange(e.target.value)}
										disabled={isCustomModel ? !customModelName : !createCarData.model.modelName}
									>
										<option value="">Chọn phiên bản</option>
										{variantOptions.map(variant => (
											<option key={variant} value={variant}>{variant}</option>
										))}
										<option value="__custom__">Tạo mới...</option>
									</select>
									{isCustomVariant ? (
										<>
											<input
												type="text"
												placeholder="Nhập phiên bản mới"
												required
												value={customVariantName}
												onChange={e => {
													setCustomVariantName(e.target.value);
													setCreateCarData(d => ({ ...d, variant: { ...d.variant, variantName: e.target.value } }));
												}}
											/>
											<input
												type="text"
												placeholder="Nhập mô tả phiên bản"
												required
												value={createCarData.variant.description}
												onChange={e => setCreateCarData(d => ({ ...d, variant: { ...d.variant, description: e.target.value } }))}
											/>
										</>
									) : (
										<input type="text" placeholder="Mô tả phiên bản" required value={createCarData.variant.description} readOnly />
									)}
								</div>
							</div>
							<div className="form-section">
								<h4 className="form-section-title">Configuration</h4>
								<div className="form-row">
									<input type="number" placeholder="Dung lượng pin" required value={createCarData.configuration.batteryCapacity} onChange={e => setCreateCarData(d => ({ ...d, configuration: { ...d.configuration, batteryCapacity: e.target.value } }))} />
									<input type="text" placeholder="Loại pin" required value={createCarData.configuration.batteryType} onChange={e => setCreateCarData(d => ({ ...d, configuration: { ...d.configuration, batteryType: e.target.value } }))} />
									<input type="number" placeholder="Thời gian sạc" required value={createCarData.configuration.fullChargeTime} onChange={e => setCreateCarData(d => ({ ...d, configuration: { ...d.configuration, fullChargeTime: e.target.value } }))} />
									<input type="number" placeholder="Quãng đường" required value={createCarData.configuration.rangeKm} onChange={e => setCreateCarData(d => ({ ...d, configuration: { ...d.configuration, rangeKm: e.target.value } }))} />
									<input type="number" step="0.01" placeholder="Công suất" required value={createCarData.configuration.power} onChange={e => setCreateCarData(d => ({ ...d, configuration: { ...d.configuration, power: e.target.value } }))} />
									<input type="number" step="0.01" placeholder="Mô men xoắn" required value={createCarData.configuration.torque} onChange={e => setCreateCarData(d => ({ ...d, configuration: { ...d.configuration, torque: e.target.value } }))} />
									<input type="number" placeholder="Chiều dài" required value={createCarData.configuration.lengthMm} onChange={e => setCreateCarData(d => ({ ...d, configuration: { ...d.configuration, lengthMm: e.target.value } }))} />
									<input type="number" placeholder="Chiều rộng" required value={createCarData.configuration.widthMm} onChange={e => setCreateCarData(d => ({ ...d, configuration: { ...d.configuration, widthMm: e.target.value } }))} />
									<input type="number" placeholder="Chiều cao" required value={createCarData.configuration.heightMm} onChange={e => setCreateCarData(d => ({ ...d, configuration: { ...d.configuration, heightMm: e.target.value } }))} />
									<input type="number" placeholder="Chiều dài cơ sở" required value={createCarData.configuration.wheelbaseMm} onChange={e => setCreateCarData(d => ({ ...d, configuration: { ...d.configuration, wheelbaseMm: e.target.value } }))} />
									<input type="number" placeholder="Khối lượng" required value={createCarData.configuration.weightKg} onChange={e => setCreateCarData(d => ({ ...d, configuration: { ...d.configuration, weightKg: e.target.value } }))} />
									<input type="number" placeholder="Dung tích cốp" required value={createCarData.configuration.trunkVolumeL} onChange={e => setCreateCarData(d => ({ ...d, configuration: { ...d.configuration, trunkVolumeL: e.target.value } }))} />
									<input type="number" placeholder="Số ghế" required value={createCarData.configuration.seats} onChange={e => setCreateCarData(d => ({ ...d, configuration: { ...d.configuration, seats: e.target.value } }))} />
								</div>
							</div>
							<div className="form-section">
								<h4 className="form-section-title">Color</h4>
								<div className="form-row">
									<input type="text" placeholder="Màu xe" required value={createCarData.color} onChange={e => setCreateCarData(d => ({ ...d, color: e.target.value }))} />
								</div>
							</div>
							<div className="form-section">
								<h4 className="form-section-title">Car</h4>
								<div className="form-row">
									<input type="number" placeholder="Năm sản xuất" required value={createCarData.car.productionYear} onChange={e => setCreateCarData(d => ({ ...d, car: { ...d.car, productionYear: e.target.value } }))} />
									<input type="number" placeholder="Giá xe" required value={createCarData.car.price} onChange={e => setCreateCarData(d => ({ ...d, car: { ...d.car, price: e.target.value } }))} />
									<div className="image-picker-row">
										<button
											type="button"
											className="select-image-btn"
											onClick={() => {
												document.getElementById('car-image-file-input').click();
											}}
										>
											Chọn ảnh từ máy
										</button>
										<input
											id="car-image-file-input"
											type="file"
											accept="image/*"
											className="hidden-file-input"
											onChange={async e => {
												const file = e.target.files && e.target.files[0];
												if (file) {
													try {
														setCreateCarData(d => ({ ...d, car: { ...d.car, imagePath: 'Đang upload...' } }));
														const fileName = await uploadImage(file);
														setCreateCarData(d => ({ ...d, car: { ...d.car, imagePath: fileName } }));
													} catch (err) {
														setCreateCarData(d => ({ ...d, car: { ...d.car, imagePath: '' } }));
														showNotification('Upload ảnh thất bại: ' + (err.message || 'Lỗi không xác định'), 'error');
													}
												}
											}}
										/>
										<span className="selected-image-label">{createCarData.car.imagePath ? createCarData.car.imagePath : 'Chưa chọn ảnh'}</span>
									</div>
								</div>
							</div>
							{createCarError && <div className="error-message">{createCarError}</div>}
							{createCarSuccess && <div className="create-car-success-message">{createCarSuccess}</div>}
							<button className="create-user-submit-btn" type="submit" disabled={createCarLoading}>
								{createCarLoading ? "Đang tạo..." : "Tạo xe mới"}
							</button>
						</form>
					</div>
				</div>
			)}
			{showUpdatePriceModal && (
				<div className="user-modal-overlay">
					<div className="create-user-modal">
						<div className="create-user-modal-header">
							<h3>Cập nhật giá tiền</h3>
							<button className="create-user-modal-close" onClick={() => setShowUpdatePriceModal(false)}>&times;</button>
						</div>
						<form className="create-user-form" onSubmit={handleUpdatePriceSubmit}>
							<div className="form-section">
								<h4 className="form-section-title">Thông tin xe</h4>
								<div className="form-row">
									<select required value={updatePriceData.modelName} onChange={e => handlePriceModelChange(e.target.value)}>
										<option value="">Chọn dòng xe</option>
										{modelOptions.map(m => (<option key={m} value={m}>{m}</option>))}
									</select>
									<select required value={updatePriceData.variantName} onChange={e => handlePriceVariantChange(e.target.value)} disabled={!updatePriceData.modelName}>
										<option value="">Chọn phiên bản</option>
										{priceVariantOptions.map(v => (<option key={v} value={v}>{v}</option>))}
									</select>
									<select required value={updatePriceData.colorName} onChange={e => setUpdatePriceData(d => ({ ...d, colorName: e.target.value }))} disabled={!updatePriceData.variantName}>
										<option value="">Chọn màu</option>
										{priceColorOptions.map(c => (<option key={c} value={c}>{c}</option>))}
									</select>
								</div>
							</div>
							<div className="form-section">
								<h4 className="form-section-title">Giá tiền hiện tại</h4>
								<div className="form-row">
									<input type="text" value={manufacturerPrice === null ? '' : (manufacturerPrice === 'Đang tải...' || manufacturerPrice === 'Không có dữ liệu' ? manufacturerPrice : new Intl.NumberFormat('vi-VN').format(manufacturerPrice))} readOnly />
								</div>
							</div>
							<div className="form-section">
								<h4 className="form-section-title">Giá mới</h4>
								<div className="form-row">
									<input type="number" min="0" placeholder="Nhập giá mới (VND)" value={newPrice} onChange={e => setNewPrice(e.target.value)} required />
								</div>
							</div>
							{updatePriceMessage && <div className="error-message">{updatePriceMessage}</div>}
							<button className="create-user-submit-btn" type="submit" disabled={updatePriceLoading}>{updatePriceLoading ? 'Đang cập nhật...' : 'Cập nhật giá'}</button>
						</form>
					</div>
				</div>
			)}
			{showDeleteCarModal && (
				<div className="user-modal-overlay">
					<div className="create-user-modal">
						<div className="create-user-modal-header">
							<h3>Xóa xe</h3>
							<button className="create-user-modal-close" onClick={() => setShowDeleteCarModal(false)}>&times;</button>
						</div>
						<form className="create-user-form" onSubmit={handleDeleteCarSubmit}>
							<div className="form-section">
								<h4 className="form-section-title">Thông tin xe cần xóa</h4>
								<div className="delete-car-instruction">
									<p><strong>Lưu ý:</strong></p>
									<ul>
										<li>Chỉ chọn <strong>Dòng xe</strong> → Xóa toàn bộ model</li>
										<li>Chọn <strong>Dòng xe + Phiên bản</strong> → Xóa toàn bộ variant</li>
										<li>Chọn <strong>Dòng xe + Phiên bản + Màu</strong> → Xóa xe theo màu cụ thể</li>
									</ul>
								</div>
								<div className="form-row">
									<select required value={deleteCarData.modelName} onChange={e => handleDeleteModelChange(e.target.value)}>
										<option value="">Chọn dòng xe</option>
										{modelOptions.map(m => (<option key={m} value={m}>{m}</option>))}
									</select>
									<select value={deleteCarData.variantName} onChange={e => handleDeleteVariantChange(e.target.value)} disabled={!deleteCarData.modelName}>
										<option value="">Chọn phiên bản (Optional)</option>
										{deleteVariantOptions.map(v => (<option key={v} value={v}>{v}</option>))}
									</select>
									<select value={deleteCarData.colorName} onChange={e => setDeleteCarData(d => ({ ...d, colorName: e.target.value }))} disabled={!deleteCarData.variantName}>
										<option value="">Chọn màu (Optional)</option>
										{deleteColorOptions.map(c => (<option key={c} value={c}>{c}</option>))}
									</select>
								</div>
							</div>
							{deleteCarMessage && <div className="error-message">{deleteCarMessage}</div>}
							<button className="create-user-submit-btn" type="submit" disabled={deleteCarLoading}>{deleteCarLoading ? 'Đang xóa...' : 'Xóa xe'}</button>
						</form>
					</div>
				</div>
			)}

			{/* Staff Notification Modal */}
			{showStaffNotificationModal && (
				<div className="modal-overlay" onClick={(e) => {
					if (e.target.classList.contains('modal-overlay')) {
						setShowStaffNotificationModal(false);
					}
				}}>
					<div className="modal-content notification-modal-content staff-notification-modal" onClick={e => e.stopPropagation()}>
						<div className="modal-header">
							<h2>Yêu cầu từ đại lý</h2>
							<button className="close-btn" onClick={() => setShowStaffNotificationModal(false)}>×</button>
						</div>
						
						{/* Filter by Status */}
						<div className="notification-filter">
							<select 
								value={statusFilter} 
								onChange={(e) => {
									setStatusFilter(e.target.value);
									loadStaffNotifications(e.target.value !== 'all' ? e.target.value : null);
								}}
								className="filter-status-select"
							>
								<option value="all">Tất cả trạng thái</option>
								<option value="Chờ duyệt">Chờ duyệt</option>
								<option value="Đã duyệt">Đã duyệt</option>
								<option value="Đang giao">Đang giao</option>
								<option value="Đã giao">Đã giao</option>
								<option value="Từ chối">Từ chối</option>
							</select>
						</div>

						<div className="modal-body notification-modal-body">
							{loadingStaffNotifications ? (
								<div className="loading-notifications">Đang tải...</div>
							) : staffNotifications.length === 0 ? (
								<div className="no-notifications">Không có yêu cầu nào</div>
							) : (
								<div className="notifications-list">
									{staffNotifications.map(notif => {
										// Convert Vietnamese status to CSS class name
										const statusClass = notif.status === 'Chờ duyệt' ? 'pending' :
										                   notif.status === 'Đã duyệt' ? 'approved' :
										                   notif.status === 'Đang giao' ? 'delivering' :
										                   notif.status === 'Đã giao' ? 'delivered' :
										                   notif.status === 'Từ chối' ? 'rejected' : 'pending';
										
										return (
										<div 
											key={notif.id} 
											className={`notification-item notification-${statusClass}`}
										>
											<div className="notification-header-item">
												<h4>{notif.dealerName}</h4>
												<span className={`status-badge-notification status-${statusClass}`}>
													{notif.status === 'Chờ duyệt' && 'Chờ duyệt'}
													{notif.status === 'Đã duyệt' && 'Đã duyệt'}
													{notif.status === 'Đang giao' && 'Đang giao'}
													{notif.status === 'Đã giao' && 'Đã giao'}
													{notif.status === 'Từ chối' && 'Từ chối'}
												</span>
											</div>
											
											<div className="notification-details">
												<p>
													<strong>Thông tin xe:</strong> 
													<span>{notif.modelName} {notif.variantName} - {notif.colorName}</span>
												</p>
												<p>
													<strong>Số lượng:</strong> 
													<span>{notif.quantity} xe</span>
												</p>
												{notif.unitPriceAtApproval && (
													<p>
														<strong>Giá đơn vị:</strong> 
														<span>
															{new Intl.NumberFormat('vi-VN', { 
																style: 'currency', 
																currency: 'VND' 
															}).format(notif.unitPriceAtApproval)}
														</span>
													</p>
												)}
												{notif.totalAmount && (
													<p>
														<strong>Tổng giá trị:</strong> 
														<span>
															{new Intl.NumberFormat('vi-VN', { 
																style: 'currency', 
																currency: 'VND' 
															}).format(notif.totalAmount)}
														</span>
													</p>
												)}
												<p>
													<strong>Ngày yêu cầu:</strong> 
													<span>{new Date(notif.createdAt).toLocaleString('vi-VN', {
														year: 'numeric',
														month: '2-digit',
														day: '2-digit',
														hour: '2-digit',
														minute: '2-digit'
													})}</span>
												</p>
												{notif.approvedAt && (
													<p>
														<strong>Ngày duyệt:</strong> 
														<span>{new Date(notif.approvedAt).toLocaleString('vi-VN', {
															year: 'numeric',
															month: '2-digit',
															day: '2-digit',
															hour: '2-digit',
															minute: '2-digit'
														})}</span>
													</p>
												)}
												{notif.expectedDeliveryDate && (
													<p>
														<strong>Ngày giao dự kiến:</strong> 
														<span>{new Date(notif.expectedDeliveryDate).toLocaleString('vi-VN', {
															year: 'numeric',
															month: '2-digit',
															day: '2-digit',
															hour: '2-digit',
															minute: '2-digit'
														})}</span>
													</p>
												)}
												{notif.actualDeliveryDate && (
													<p>
														<strong>Ngày giao thực tế:</strong> 
														<span>{new Date(notif.actualDeliveryDate).toLocaleString('vi-VN', {
															year: 'numeric',
															month: '2-digit',
															day: '2-digit',
															hour: '2-digit',
															minute: '2-digit'
														})}</span>
													</p>
												)}
											{notif.note && (
												<p>
													<strong>Ghi chú:</strong> 
													<span>{notif.note}</span>
												</p>
											)}
											{notif.rejectionReason && (
												<p className="rejection-reason">
													<strong> Lý do từ chối:</strong> 
													<span>{notif.rejectionReason}</span>
												</p>
											)}
										</div>											{notif.status === 'Chờ duyệt' && (
												<div className="approve-reject-buttons">
													<button
														className="approve-request-btn"
														onClick={() => handleApproveRequest(notif.id)}
													>
														Duyệt
													</button>
													<button
														className="reject-request-btn"
														onClick={() => setRejectModal({ open: true, requestId: notif.id })}
													>
														Từ chối
													</button>
												</div>
											)}

											{notif.status === 'Đã duyệt' && (
												<div className="approve-reject-buttons">
													<button
														className="delivery-date-btn"
														onClick={() => {
															setDeliveryModal({ open: true, requestId: notif.id });
															setDeliveryDate('');
														}}
													>
														Thiết lập ngày giao
													</button>
												</div>
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

			{/* Reject Reason Modal */}
			{rejectModal.open && (
				<div className="modal-overlay" onClick={(e) => {
					if (e.target.classList.contains('modal-overlay')) {
						setRejectModal({ open: false, requestId: null });
						setRejectReason('');
					}
				}}>
					<div className="modal-content reject-modal-content" onClick={e => e.stopPropagation()}>
						<div className="modal-header">
							<h3>Lý do từ chối</h3>
							<button className="close-btn" onClick={() => {
								setRejectModal({ open: false, requestId: null });
								setRejectReason('');
							}}>×</button>
						</div>
						<div className="modal-body">
							<textarea
								className="update-form-textarea reject-reason-textarea"
								placeholder="Nhập lý do từ chối yêu cầu..."
								value={rejectReason}
								onChange={(e) => setRejectReason(e.target.value)}
								rows="4"
							/>
							<button
								className="reject-submit-btn"
								onClick={() => handleRejectRequest(rejectModal.requestId, rejectReason)}
								disabled={rejectLoading}
							>
								{rejectLoading ? 'Đang xử lý...' : '✓ Xác nhận từ chối'}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Delivery Date Modal */}
			{deliveryModal.open && (
				<div className="modal-overlay" onClick={(e) => {
					if (e.target.classList.contains('modal-overlay')) {
						setDeliveryModal({ open: false, requestId: null });
						setDeliveryDate('');
					}
				}}>
					<div className="modal-content delivery-modal-content" onClick={e => e.stopPropagation()}>
						<div className="modal-header">
							<h3>Thiết lập ngày giao dự kiến</h3>
							<button className="close-btn" onClick={() => {
								setDeliveryModal({ open: false, requestId: null });
								setDeliveryDate('');
							}}>×</button>
						</div>
						<div className="modal-body">
							<input
								type="datetime-local"
								className="update-form-input delivery-date-input"
								value={deliveryDate}
								onChange={(e) => setDeliveryDate(e.target.value)}
							/>
							<button
								className="delivery-submit-btn"
								onClick={handleSetDeliveryDate}
								disabled={deliveryLoading || !deliveryDate}
							>
								{deliveryLoading ? 'Đang xử lý...' : '✓ Xác nhận và bắt đầu giao'}
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
					</div>						<div className="confirm-dialog-footer">
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
}
export default CarManagement;