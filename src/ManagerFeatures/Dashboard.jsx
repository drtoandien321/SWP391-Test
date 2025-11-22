import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Clock, 
  Car, 
  DollarSign, 
  TrendingUp, 
  Package 
} from 'lucide-react';
import {
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { 
  getSalesReportByPeriod, 
  getRevenueReportByPeriod, 
  getRevenueByModel,
  getRevenueByStaff,
  getImportCostReport
} from '../services/carVariantApi';
import './Dashboard.css';

const Dashboard = () => {
  const [timeFilter, setTimeFilter] = useState('year'); // month, quarter, year
  const [selectedPeriod, setSelectedPeriod] = useState(new Date().getFullYear());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()); // Năm riêng cho month/quarter
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, [timeFilter, selectedPeriod, selectedYear]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let periodType, month, quarter;
      const year = timeFilter === 'year' ? selectedPeriod : selectedYear;
      
      if (timeFilter === 'month') {
        periodType = 'MONTHLY';
        month = selectedPeriod;
      } else if (timeFilter === 'quarter') {
        periodType = 'QUARTERLY';
        quarter = selectedPeriod;
      } else {
        periodType = 'YEARLY';
      }
      
      // Gọi API để lấy dữ liệu summary
      const apiData = await getSalesReportByPeriod(periodType, year, month, quarter);
      
      // Gọi tất cả API song song
      const [revenueData, modelData, staffData, importData] = await Promise.all([
        getRevenueReportByPeriod(periodType, year, month, quarter),
        getRevenueByModel(periodType, year, month, quarter),
        getRevenueByStaff(periodType, year, month, quarter),
        getImportCostReport(periodType, year, month, quarter)
      ]);
      
      // Transform revenue data cho biểu đồ 1
      const revenueLabels = revenueData.revenueDetails.map(detail => 
        timeFilter === 'month' ? detail.periodNumber.toString() : detail.periodName
      );
      const revenues = revenueData.revenueDetails.map(detail => detail.revenue);
      
      // Transform model data cho biểu đồ 2
      const modelNames = modelData.modelRevenueDetails.map(model => model.modelName);
      const carsSoldByModel = modelData.modelRevenueDetails.map(model => model.carsSold);
      const revenueByModel = modelData.modelRevenueDetails.map(model => model.revenue);
      
      // Transform staff data cho biểu đồ 3
      const staffNames = staffData.staffRevenueDetails.map(staff => staff.staffName);
      const carsSoldByStaff = staffData.staffRevenueDetails.map(staff => staff.carsSold);
      const revenueByStaff = staffData.staffRevenueDetails.map(staff => staff.revenue);
      
      // Transform import cost data cho biểu đồ 4
      const importLabels = importData.importCostDetails.map(detail => 
        timeFilter === 'month' ? detail.periodNumber.toString() : detail.periodName
      );
      const importCosts = importData.importCostDetails.map(detail => detail.importCost);
      const carsImported = importData.importCostDetails.map(detail => detail.carsImported);
      
      // Transform API data sang format hiển thị
      const transformedData = {
        summary: {
          completedOrders: apiData.totalCompletedOrders || 0,
          pendingOrders: apiData.totalPendingOrders || 0,
          totalCarsSold: apiData.totalCarsSold || 0,
          totalRevenue: apiData.totalRevenue || 0,
          totalProfit: apiData.totalProfit || 0,
          totalCarsImported: apiData.totalCarsDistributed || 0
        },
        charts: {
          revenue: { labels: revenueLabels, data: revenues },
          carsSoldRevenue: { labels: modelNames, carsSold: carsSoldByModel, revenue: revenueByModel },
          staffRevenue: { labels: staffNames, carsSold: carsSoldByStaff, revenue: revenueByStaff },
          revenueImport: { labels: importLabels, revenue: revenues, import: importCosts, carsImported }
        }
      };
      
      setDashboardData(transformedData);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err.message || 'Không thể tải dữ liệu báo cáo');
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  // Helper function để format số tiền cho biểu đồ (tự động chọn đơn vị phù hợp)
  const formatChartValue = (value) => {
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(1)}B`; // Tỷ
    } else if (value >= 1000000) {
      return `${(value / 1000000).toFixed(0)}M`; // Triệu
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`; // Nghìn
    }
    return value.toString();
  };

  // Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="custom-tooltip-label">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="custom-tooltip-item" style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === 'number' && entry.value > 1000 
                ? formatCurrency(entry.value) 
                : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const getPeriodOptions = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    if (timeFilter === 'month') {
      return Array.from({ length: 12 }, (_, i) => ({
        value: i + 1,
        label: `Tháng ${i + 1}`
      }));
    } else if (timeFilter === 'quarter') {
      return [
        { value: 1, label: 'Quý 1 (T1-T3)' },
        { value: 2, label: 'Quý 2 (T4-T6)' },
        { value: 3, label: 'Quý 3 (T7-T9)' },
        { value: 4, label: 'Quý 4 (T10-T12)' }
      ];
    } else {
      return Array.from({ length: 5 }, (_, i) => ({
        value: currentYear - i,
        label: `Năm ${currentYear - i}`
      }));
    }
  };

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => ({
      value: currentYear - i,
      label: `Năm ${currentYear - i}`
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600 text-lg">⏳ Đang tải dữ liệu báo cáo...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <p className="text-gray-600 text-lg">Không có dữ liệu</p>
      </div>
    );
  }

  // Prepare data for charts
  const revenueChartData = dashboardData.charts.revenue.labels.map((label, index) => ({
    name: label,
    doanhThu: dashboardData.charts.revenue.data[index]
  }));

  const modelChartData = dashboardData.charts.carsSoldRevenue.labels.map((label, index) => ({
    name: label,
    soXeBan: dashboardData.charts.carsSoldRevenue.carsSold[index],
    doanhThu: dashboardData.charts.carsSoldRevenue.revenue[index]
  }));

  const staffChartData = dashboardData.charts.staffRevenue.labels.map((label, index) => ({
    name: label,
    soXeBan: dashboardData.charts.staffRevenue.carsSold[index],
    doanhThu: dashboardData.charts.staffRevenue.revenue[index]
  }));

  const importChartData = dashboardData.charts.revenueImport.labels.map((label, index) => ({
    name: label,
    soXeNhap: dashboardData.charts.revenueImport.carsImported[index],
    chiPhiNhap: dashboardData.charts.revenueImport.import[index]
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
          Dashboard Báo Cáo
        </h1>
        <p className="text-gray-600">Tổng quan về hiệu suất kinh doanh</p>
      </div>

      {error && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Time Filter */}
      <div className="bg-white rounded-xl shadow-card p-6 mb-8">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Chọn loại thời gian
            </label>
            <select 
              value={timeFilter} 
              onChange={(e) => {
                setTimeFilter(e.target.value);
                if (e.target.value === 'year') {
                  setSelectedPeriod(new Date().getFullYear());
                } else if (e.target.value === 'quarter') {
                  setSelectedPeriod(1);
                } else {
                  setSelectedPeriod(new Date().getMonth() + 1);
                }
              }}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            >
              <option value="month">Theo tháng</option>
              <option value="quarter">Theo quý</option>
              <option value="year">Theo năm</option>
            </select>
          </div>
          {timeFilter !== 'year' && (
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Chọn năm
              </label>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              >
                {getYearOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Chọn {timeFilter === 'year' ? 'năm' : timeFilter === 'quarter' ? 'quý' : 'tháng'}
            </label>
            <select 
              value={selectedPeriod} 
              onChange={(e) => setSelectedPeriod(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            >
              {getPeriodOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
        {/* Card 1: Completed Orders */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 p-6 border border-green-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-500 bg-opacity-20 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Đơn hàng hoàn thành</h3>
          <p className="text-3xl font-bold text-gray-900">{dashboardData.summary.completedOrders}</p>
        </div>

        {/* Card 2: Pending Orders */}
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 p-6 border border-orange-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-500 bg-opacity-20 rounded-lg">
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Đơn hàng chưa hoàn thành</h3>
          <p className="text-3xl font-bold text-gray-900">{dashboardData.summary.pendingOrders}</p>
        </div>

        {/* Card 3: Cars Sold */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 p-6 border border-blue-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500 bg-opacity-20 rounded-lg">
              <Car className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Tổng xe bán được</h3>
          <p className="text-3xl font-bold text-gray-900">{dashboardData.summary.totalCarsSold}</p>
        </div>

        {/* Card 4: Revenue */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 p-6 border border-purple-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500 bg-opacity-20 rounded-lg">
              <DollarSign className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Doanh thu</h3>
          <p className="text-2xl font-bold text-gray-900">{formatChartValue(dashboardData.summary.totalRevenue)}</p>
          <p className="text-xs text-gray-500 mt-1">{formatCurrency(dashboardData.summary.totalRevenue)}</p>
        </div>

        {/* Card 5: Profit */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 p-6 border border-indigo-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-500 bg-opacity-20 rounded-lg">
              <TrendingUp className="w-8 h-8 text-indigo-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Lợi nhuận</h3>
          <p className="text-2xl font-bold text-gray-900">{formatChartValue(dashboardData.summary.totalProfit)}</p>
          <p className="text-xs text-gray-500 mt-1">{formatCurrency(dashboardData.summary.totalProfit)}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="space-y-8">
        {/* Chart 1: Total Revenue - ComposedChart with Bar + Line */}
        <div className="bg-white rounded-xl shadow-card p-6 lg:p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b-2 border-gray-100">
            📈 Tổng doanh thu theo thời gian
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={revenueChartData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#764ba2" stopOpacity={0.6}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => formatChartValue(value)} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" />
              <Bar 
                dataKey="doanhThu" 
                fill="url(#colorRevenue)" 
                radius={[8, 8, 0, 0]}
                name="Doanh thu"
              />
              <Line 
                type="monotone" 
                dataKey="doanhThu" 
                stroke="#667eea" 
                strokeWidth={3}
                dot={{ fill: '#667eea', r: 5 }}
                activeDot={{ r: 7 }}
                name="Xu hướng"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2: Cars Sold and Revenue by Model */}
        <div className="bg-white rounded-xl shadow-card p-6 lg:p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b-2 border-gray-100">
            🚗 Hiệu suất bán hàng theo mẫu xe
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={modelChartData}>
              <defs>
                <linearGradient id="colorCars" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4facfe" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#00f2fe" stopOpacity={0.7}/>
                </linearGradient>
                <linearGradient id="colorModelRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#43e97b" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#38f9d7" stopOpacity={0.7}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" />
              <YAxis 
                yAxisId="left"
                label={{ value: 'Số xe', angle: -90, position: 'insideLeft' }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tickFormatter={(value) => formatChartValue(value)}
                label={{ value: 'Doanh thu', angle: 90, position: 'insideRight' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" />
              <Bar 
                yAxisId="left"
                dataKey="soXeBan" 
                fill="url(#colorCars)" 
                radius={[8, 8, 0, 0]}
                name="Số xe bán"
              />
              <Bar 
                yAxisId="right"
                dataKey="doanhThu" 
                fill="url(#colorModelRevenue)" 
                radius={[8, 8, 0, 0]}
                name="Doanh thu"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 3: Revenue by Staff */}
        <div className="bg-white rounded-xl shadow-card p-6 lg:p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b-2 border-gray-100">
            👥 Hiệu suất bán hàng theo nhân viên
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={staffChartData}>
              <defs>
                <linearGradient id="colorStaffCars" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fa709a" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#fee140" stopOpacity={0.7}/>
                </linearGradient>
                <linearGradient id="colorStaffRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#30cfd0" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#330867" stopOpacity={0.7}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" />
              <YAxis 
                yAxisId="left"
                label={{ value: 'Số xe', angle: -90, position: 'insideLeft' }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tickFormatter={(value) => formatChartValue(value)}
                label={{ value: 'Doanh thu', angle: 90, position: 'insideRight' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" />
              <Bar 
                yAxisId="left"
                dataKey="soXeBan" 
                fill="url(#colorStaffCars)" 
                radius={[8, 8, 0, 0]}
                name="Số xe bán"
              />
              <Bar 
                yAxisId="right"
                dataKey="doanhThu" 
                fill="url(#colorStaffRevenue)" 
                radius={[8, 8, 0, 0]}
                name="Doanh thu"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 4: Import Cars and Cost - ComposedChart with Bar + Line */}
        <div className="bg-white rounded-xl shadow-card p-6 lg:p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b-2 border-gray-100">
            📦 Số lượng xe nhập và Chi phí nhập hàng
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={importChartData}>
              <defs>
                <linearGradient id="colorImport" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a8edea" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#fed6e3" stopOpacity={0.7}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" />
              <YAxis 
                yAxisId="left"
                label={{ value: 'Số xe', angle: -90, position: 'insideLeft' }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tickFormatter={(value) => formatChartValue(value)}
                label={{ value: 'Chi phí', angle: 90, position: 'insideRight' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" />
              <Bar 
                yAxisId="left"
                dataKey="soXeNhap" 
                fill="url(#colorImport)" 
                radius={[8, 8, 0, 0]}
                name="Số xe nhập"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="chiPhiNhap" 
                stroke="#a8edea" 
                strokeWidth={3}
                dot={{ fill: '#a8edea', r: 5 }}
                activeDot={{ r: 7 }}
                name="Chi phí nhập"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
