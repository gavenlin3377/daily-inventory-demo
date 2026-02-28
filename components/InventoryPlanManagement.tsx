import React, { useState } from 'react';
import { Search, RefreshCw, Edit, Eye, FileText, Download, X, ArrowLeft, Settings } from 'lucide-react';

interface InventoryPlan {
  id: string;
  planNumber: string;
  planName: string;
  planType: string;
  institutionCount: number;
  completedInstitutionCount: number;
  status: '已创建' | '进行中' | '已完成';
  startDate: string;
  endDate: string;
  createdBy: string;
}

interface InventoryPlanManagementProps {
  onBack?: () => void;
  onNavigateToOrders?: () => void;
  onNavigateToConfig?: () => void;
}

const InventoryPlanManagement: React.FC<InventoryPlanManagementProps> = ({ onBack, onNavigateToOrders, onNavigateToConfig }) => {
  const [activeTab, setActiveTab] = useState<'DAILY' | 'GOOD' | 'BAD' | 'SAMPLE'>('DAILY');
  const [searchForm, setSearchForm] = useState({
    planName: '',
    planNumber: '',
    operator: '',
    startDate: '',
    endDate: '',
    planType: ''
  });

  // 模拟数据
  const mockPlans: InventoryPlan[] = [
    {
      id: '1',
      planNumber: 'PDJH202602030000001',
      planName: '2026年2月日度盘点计划',
      planType: '日度盘点',
      institutionCount: 10,
      completedInstitutionCount: 8,
      status: '进行中',
      startDate: '2026-02-11',
      endDate: '2026-02-16',
      createdBy: '系统管理员'
    },
    {
      id: '2',
      planNumber: 'PDJH202602030000002',
      planName: '2026年2月良品盘点计划',
      planType: '月度集中盘点',
      institutionCount: 15,
      completedInstitutionCount: 15,
      status: '已完成',
      startDate: '2026-02-01',
      endDate: '2026-02-28',
      createdBy: '系统管理员'
    },
    {
      id: '3',
      planNumber: 'PDJH202602030000003',
      planName: '2026年2月坏品盘点计划',
      planType: '月度集中盘点',
      institutionCount: 12,
      completedInstitutionCount: 10,
      status: '进行中',
      startDate: '2026-02-01',
      endDate: '2026-02-28',
      createdBy: '系统管理员'
    }
  ];

  const filteredPlans = mockPlans.filter(plan => {
    if (activeTab === 'DAILY') {
      return plan.planType === '日度盘点';
    } else if (activeTab === 'GOOD') {
      return plan.planType === '月度集中盘点' && plan.planName.includes('良品');
    } else if (activeTab === 'BAD') {
      return plan.planType === '月度集中盘点' && plan.planName.includes('坏品');
    } else if (activeTab === 'SAMPLE') {
      return plan.planType === '月度集中盘点' && plan.planName.includes('样机');
    }
    return true;
  });

  const handleSearch = () => {
    // 实现搜索逻辑
    console.log('搜索:', searchForm);
  };

  const handleReset = () => {
    setSearchForm({
      planName: '',
      planNumber: '',
      operator: '',
      startDate: '',
      endDate: '',
      planType: ''
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '已完成':
        return 'text-green-600 bg-green-50';
      case '进行中':
        return 'text-blue-600 bg-blue-50';
      case '已创建':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
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
          <h1 className="text-2xl font-bold text-gray-900">盘点计划管理</h1>
        </div>
        <div className="flex items-center gap-3">
          {onNavigateToConfig && (
            <button
              onClick={onNavigateToConfig}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 font-medium flex items-center gap-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <Settings size={16} />
              品类配置
            </button>
          )}
          {onNavigateToOrders && (
            <button
              onClick={onNavigateToOrders}
              className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              盘点单管理 →
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex space-x-1 px-6">
          <button
            onClick={() => setActiveTab('DAILY')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'DAILY'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            日度盘点
          </button>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">计划名称</label>
            <input
              type="text"
              value={searchForm.planName}
              onChange={(e) => setSearchForm({ ...searchForm, planName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入计划名称"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">计划编号</label>
            <input
              type="text"
              value={searchForm.planNumber}
              onChange={(e) => setSearchForm({ ...searchForm, planNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入计划编号"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">操作人</label>
            <input
              type="text"
              value={searchForm.operator}
              onChange={(e) => setSearchForm({ ...searchForm, operator: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入操作人"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">计划类型</label>
            <select
              value={searchForm.planType}
              onChange={(e) => setSearchForm({ ...searchForm, planType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">请选择计划类型</option>
              <option value="日度盘点">日度盘点</option>
              <option value="月度集中盘点">月度集中盘点</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">计划日期 - 开始日期</label>
            <input
              type="date"
              value={searchForm.startDate}
              onChange={(e) => setSearchForm({ ...searchForm, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">计划日期 - 结束日期</label>
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
      </div>

      {/* Data Table */}
      <div className="bg-white mx-6 my-6 rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">计划编号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">计划名称</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">计划类型</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">机构数量</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">盘点已完成机构数量</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">开始日期</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">结束日期</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                    暂无数据
                  </td>
                </tr>
              ) : (
                filteredPlans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{plan.planNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{plan.planName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{plan.planType}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{plan.institutionCount}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{plan.completedInstitutionCount}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(plan.status)}`}>
                        {plan.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{plan.startDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{plan.endDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{plan.createdBy}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-3">
                        <button className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                          <Edit size={14} />
                          编辑
                        </button>
                        <button className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                          <Eye size={14} />
                          查看
                        </button>
                        <button className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                          <FileText size={14} />
                          盘点单
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
            共 <span className="font-medium">{filteredPlans.length}</span> 条
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

export default InventoryPlanManagement;
