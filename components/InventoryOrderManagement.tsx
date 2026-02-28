import React, { useState } from 'react';
import { Search, Eye, X, Download, ArrowLeft } from 'lucide-react';

interface InventoryOrder {
  id: string;
  storeType: string;
  inventoryType: string;
  inventoryCategory: string;
  orderStatus: '已完成' | '进行中' | '已取消';
  orderNumber: string;
  hasDiscrepancy: '有差异' | '无差异';
  profitLossOrderNumber: string;
  inventoryAmount: number;
  actualAmount: number;
  inventoryQuantity: number;
  actualQuantity: number;
  lossAmount: number;
  lossRate: number;
}

interface InventoryOrderManagementProps {
  onBack?: () => void;
}

const InventoryOrderManagement: React.FC<InventoryOrderManagementProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'GOOD' | 'BAD' | 'SAMPLE'>('GOOD');
  const [searchForm, setSearchForm] = useState({
    storeType: '',
    planId: 'PDJH202602030000001',
    storeName: '',
    inventoryStatus: '',
    startDate: '2026-02-11',
    endDate: '2026-02-16'
  });

  // 模拟数据
  const mockOrders: InventoryOrder[] = [
    {
      id: '1',
      storeType: '广场',
      inventoryType: '良品',
      inventoryCategory: '月度集中盘点',
      orderStatus: '已完成',
      orderNumber: 'PDD202602110000007',
      hasDiscrepancy: '有差异',
      profitLossOrderNumber: 'PDSY202602120000001',
      inventoryAmount: 7585973,
      actualAmount: 7582221,
      inventoryQuantity: 1650,
      actualQuantity: 1649,
      lossAmount: 3752,
      lossRate: 0.05
    },
    {
      id: '2',
      storeType: '广场',
      inventoryType: '良品',
      inventoryCategory: '月度集中盘点',
      orderStatus: '已完成',
      orderNumber: 'PDD202602110000008',
      hasDiscrepancy: '有差异',
      profitLossOrderNumber: 'PDSY202602150000001',
      inventoryAmount: 11390620,
      actualAmount: 11384921,
      inventoryQuantity: 2480,
      actualQuantity: 2478,
      lossAmount: 5699,
      lossRate: 0.05
    },
    {
      id: '3',
      storeType: '广场',
      inventoryType: '良品',
      inventoryCategory: '月度集中盘点',
      orderStatus: '已完成',
      orderNumber: 'PDD202602110000009',
      hasDiscrepancy: '无差异',
      profitLossOrderNumber: '-',
      inventoryAmount: 9448480,
      actualAmount: 9448480,
      inventoryQuantity: 2056,
      actualQuantity: 2056,
      lossAmount: 0,
      lossRate: 0
    }
  ];

  const filteredOrders = mockOrders.filter(order => {
    if (activeTab === 'GOOD') {
      return order.inventoryType === '良品';
    } else if (activeTab === 'BAD') {
      return order.inventoryType === '坏品';
    } else if (activeTab === 'SAMPLE') {
      return order.inventoryType === '样机';
    }
    return true;
  });

  const handleSearch = () => {
    console.log('搜索:', searchForm);
  };

  const handleReset = () => {
    setSearchForm({
      storeType: '',
      planId: '',
      storeName: '',
      inventoryStatus: '',
      startDate: '',
      endDate: ''
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '已完成':
        return 'text-green-600 bg-green-50';
      case '进行中':
        return 'text-blue-600 bg-blue-50';
      case '已取消':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('zh-CN');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
          )}
          <h1 className="text-2xl font-bold text-gray-900">盘点单管理</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex space-x-1 px-6">
          <button
            onClick={() => setActiveTab('GOOD')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'GOOD'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            良品
          </button>
          <button
            onClick={() => setActiveTab('BAD')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'BAD'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            坏品
          </button>
          <button
            onClick={() => setActiveTab('SAMPLE')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'SAMPLE'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            样机
          </button>
        </div>
      </div>

      {/* Search/Filter Section */}
      <div className="bg-white p-6 border-b border-gray-200">
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">门店类型</label>
            <select
              value={searchForm.storeType}
              onChange={(e) => setSearchForm({ ...searchForm, storeType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">请选择门店类型</option>
              <option value="广场">广场</option>
              <option value="旗舰店">旗舰店</option>
              <option value="专卖店">专卖店</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">盘点计划ID</label>
            <input
              type="text"
              value={searchForm.planId}
              onChange={(e) => setSearchForm({ ...searchForm, planId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入盘点计划ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">门店名称</label>
            <input
              type="text"
              value={searchForm.storeName}
              onChange={(e) => setSearchForm({ ...searchForm, storeName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请选择门店名称"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">盘点状态</label>
            <select
              value={searchForm.inventoryStatus}
              onChange={(e) => setSearchForm({ ...searchForm, inventoryStatus: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">请选择盘点状态</option>
              <option value="已完成">已完成</option>
              <option value="进行中">进行中</option>
              <option value="已取消">已取消</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
            <input
              type="date"
              value={searchForm.startDate}
              onChange={(e) => setSearchForm({ ...searchForm, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
            <input
              type="date"
              value={searchForm.endDate}
              onChange={(e) => setSearchForm({ ...searchForm, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              重置
            </button>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Search size={16} />
              查询
            </button>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-3 mt-4">
          <button className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Download size={16} />
            盘点报告导出
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Download size={16} />
            取消原因导出
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white mx-6 my-6 rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">库存类型</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">盘点类型</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">盘点单状态</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">盘点单号</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">是否差异</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">损益单号</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">库存金额</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">实盘金额</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">库存数量</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">实盘数量</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">盘亏金额</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">盘亏率</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-6 py-8 text-center text-gray-500">
                    暂无数据
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{order.inventoryType}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{order.inventoryCategory}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.orderStatus)}`}>
                        {order.orderStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-mono">{order.orderNumber}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className={order.hasDiscrepancy === '有差异' ? 'text-orange-600' : 'text-gray-600'}>
                        {order.hasDiscrepancy}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-mono">{order.profitLossOrderNumber}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{formatNumber(order.inventoryAmount)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{formatNumber(order.actualAmount)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{formatNumber(order.inventoryQuantity)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{formatNumber(order.actualQuantity)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{formatNumber(order.lossAmount)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{order.lossRate}%</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-3">
                        <button className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                          <Eye size={14} />
                          查看
                        </button>
                        <button className="text-red-600 hover:text-red-800 flex items-center gap-1">
                          <X size={14} />
                          取消
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-white px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            共 <span className="font-medium">{filteredOrders.length}</span> 条
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">每页显示</span>
              <select className="px-2 py-1 border border-gray-300 rounded-md text-sm">
                <option>20条/页</option>
                <option>50条/页</option>
                <option>100条/页</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                上一页
              </button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm">
                1
              </button>
              <button className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                下一页
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryOrderManagement;
