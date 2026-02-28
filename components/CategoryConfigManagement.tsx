import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Info, 
  Save, 
  RefreshCw, 
  ArrowLeft,
  TrendingUp,
  Clock,
  Package,
  AlertCircle
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  code: string;
  isHighValue: boolean; // 是否高净值商品
  currentSkuCount?: number; // 当前SKU数量（可选，用于预估）
  avgTimePerSku?: number; // 平均每个SKU耗时（分钟）
}

interface CategoryConfig {
  enabledCategories: string[]; // 启用的品类ID列表
  cycleDays: number; // 周期天数
  targetTimePerDay: number; // 每天目标时间（分钟）
  maxTimePerDay: number; // 每天最大时间（分钟）
  lastUpdated?: string;
  lastUpdatedBy?: string;
}

interface ValidationResult {
  isValid: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  totalSkuCount: number;
  estimatedTotalTime: number; // 预估总时间（分钟）
  availableTime: number; // 可用时间（分钟）
  feasibilityRatio: number; // 可行性比例
  warnings: string[];
  suggestions: string[];
  canSave: boolean;
}

const CategoryConfigManagement: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  // 模拟品类数据（暂时只支持手机和平板）
  const [allCategories] = useState<Category[]>([
    { id: '1', name: '手机', code: 'PHONE', isHighValue: true, currentSkuCount: 150, avgTimePerSku: 0.67 },
    { id: '2', name: '平板电脑', code: 'PAD', isHighValue: true, currentSkuCount: 50, avgTimePerSku: 0.67 },
  ]);

  // 当前配置（从后端获取或默认值）
  const [config, setConfig] = useState<CategoryConfig>({
    enabledCategories: ['1', '2'], // 默认只选手机和平板
    cycleDays: 7,
    targetTimePerDay: 20,
    maxTimePerDay: 25,
    lastUpdated: '2026-02-03 10:00:00',
    lastUpdatedBy: '系统管理员'
  });

  // 临时配置（编辑中的配置）
  const [tempConfig, setTempConfig] = useState<CategoryConfig>(config);
  const [hasChanges, setHasChanges] = useState(false);

  // 注意：手机和平板不需要可行性校验，因为库存数量不会太多，盘点时间是合理的

  // 检测配置变更
  useEffect(() => {
    const changed = JSON.stringify(tempConfig.enabledCategories) !== JSON.stringify(config.enabledCategories) ||
                    tempConfig.cycleDays !== config.cycleDays ||
                    tempConfig.targetTimePerDay !== config.targetTimePerDay ||
                    tempConfig.maxTimePerDay !== config.maxTimePerDay;
    setHasChanges(changed);
  }, [tempConfig, config]);

  // 切换品类选择
  const toggleCategory = (categoryId: string) => {
    const newEnabled = tempConfig.enabledCategories.includes(categoryId)
      ? tempConfig.enabledCategories.filter(id => id !== categoryId)
      : [...tempConfig.enabledCategories, categoryId];
    
    setTempConfig({
      ...tempConfig,
      enabledCategories: newEnabled
    });
  };

  // 保存配置
  const handleSave = () => {
    // 确认保存
    const confirmMessage = `确定要保存配置吗？\n\n` +
      `启用品类：${tempConfig.enabledCategories.map(id => 
        allCategories.find(c => c.id === id)?.name
      ).join('、')}\n` +
      `周期天数：${tempConfig.cycleDays}天\n` +
      `每天目标时间：${tempConfig.targetTimePerDay}分钟\n` +
      `每天最大时间：${tempConfig.maxTimePerDay}分钟`;

    if (window.confirm(confirmMessage)) {
      // 保存到后端
      setConfig({
        ...tempConfig,
        lastUpdated: new Date().toLocaleString('zh-CN'),
        lastUpdatedBy: '当前用户' // 实际应从用户上下文获取
      });
      setHasChanges(false);
      alert('配置保存成功！');
    }
  };

  // 重置配置
  const handleReset = () => {
    if (hasChanges && window.confirm('确定要放弃当前修改吗？')) {
      setTempConfig(config);
      setHasChanges(false);
    }
  };

  // 获取风险等级颜色
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'text-green-600 bg-green-50 border-green-200';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'CRITICAL': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // 获取风险等级图标
  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'LOW': return <CheckCircle size={20} className="text-green-600" />;
      case 'MEDIUM': return <AlertCircle size={20} className="text-yellow-600" />;
      case 'HIGH': return <AlertTriangle size={20} className="text-orange-600" />;
      case 'CRITICAL': return <XCircle size={20} className="text-red-600" />;
      default: return <Info size={20} className="text-gray-600" />;
    }
  };

  const selectedCategories = allCategories.filter(c => 
    tempConfig.enabledCategories.includes(c.id)
  );

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
          <h1 className="text-2xl font-bold text-gray-900">日度盘点品类配置</h1>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-sm text-orange-600 flex items-center gap-1">
              <AlertCircle size={16} />
              有未保存的修改
            </span>
          )}
          <button
            onClick={handleReset}
            disabled={!hasChanges}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <RefreshCw size={16} />
            重置
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save size={16} />
            保存配置
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-3 gap-6">
          {/* 左侧：品类选择 */}
          <div className="col-span-2 space-y-6">
            {/* 品类选择卡片 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                选择日度盘点品类
                <span className="text-sm font-normal text-gray-500 ml-2">
                  （仅高净值商品可配置）
                </span>
              </h2>
              
              <div className="space-y-3">
                {allCategories
                  .filter(c => c.isHighValue)
                  .map(category => {
                    const isSelected = tempConfig.enabledCategories.includes(category.id);
                    return (
                      <label
                        key={category.id}
                        className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleCategory(category.id)}
                            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div>
                            <div className="font-medium text-gray-900">{category.name}</div>
                            <div className="text-sm text-gray-500">
                              代码：{category.code}
                              {category.currentSkuCount !== undefined && (
                                <span className="ml-3">
                                  当前SKU数量：<span className="font-medium">{category.currentSkuCount}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle size={20} className="text-blue-600" />
                        )}
                      </label>
                    );
                  })}
              </div>

              {allCategories.filter(c => c.isHighValue).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  暂无高净值商品品类
                </div>
              )}
            </div>

            {/* 周期参数配置 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">周期参数</h2>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    周期天数
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={tempConfig.cycleDays}
                    onChange={(e) => setTempConfig({
                      ...tempConfig,
                      cycleDays: parseInt(e.target.value) || 7
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    每天目标时间（分钟）
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={tempConfig.targetTimePerDay}
                    onChange={(e) => setTempConfig({
                      ...tempConfig,
                      targetTimePerDay: parseInt(e.target.value) || 20
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    每天最大时间（分钟）
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={tempConfig.maxTimePerDay}
                    onChange={(e) => setTempConfig({
                      ...tempConfig,
                      maxTimePerDay: parseInt(e.target.value) || 25
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：配置信息 */}
          <div className="space-y-6">
            {/* 当前配置信息 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">配置说明</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <p>
                  目前仅支持配置手机和平板两个品类。由于这两个品类的库存数量通常不会太多，盘点时间是合理的，因此不需要进行可行性校验。
                </p>
                <div className="pt-3 border-t">
                  <div className="mb-2">
                    <span className="text-gray-600">已选品类：</span>
                    <span className="font-medium text-gray-900 ml-2">
                      {selectedCategories.length > 0 
                        ? selectedCategories.map(c => c.name).join('、')
                        : '无'
                      }
                    </span>
                  </div>
                  {config.lastUpdated && (
                    <div>
                      <span className="text-gray-600">最后更新：</span>
                      <span className="text-gray-900 ml-2">{config.lastUpdated}</span>
                    </div>
                  )}
                  {config.lastUpdatedBy && (
                    <div>
                      <span className="text-gray-600">更新人：</span>
                      <span className="text-gray-900 ml-2">{config.lastUpdatedBy}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 配置校验函数
function validateConfiguration(
  config: CategoryConfig,
  allCategories: Category[]
): ValidationResult {
  const selectedCategories = allCategories.filter(c => 
    config.enabledCategories.includes(c.id)
  );

  // 计算总SKU数量
  const totalSkuCount = selectedCategories.reduce((sum, c) => 
    sum + (c.currentSkuCount || 0), 0
  );

  // 计算预估总时间（假设平均每个SKU耗时）
  const avgTimePerSku = selectedCategories.length > 0
    ? selectedCategories.reduce((sum, c) => sum + (c.avgTimePerSku || 0.67), 0) / selectedCategories.length
    : 0.67;
  
  const estimatedTotalTime = totalSkuCount * avgTimePerSku;

  // 计算周期可用时间
  const availableTime = config.maxTimePerDay * config.cycleDays;

  // 计算可行性比例
  const feasibilityRatio = availableTime > 0 
    ? estimatedTotalTime / availableTime 
    : 999;

  // 判断风险等级
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let canSave = true;

  if (selectedCategories.length === 0) {
    riskLevel = 'CRITICAL';
    warnings.push('未选择任何品类，日度盘点将无法生成任务');
    canSave = false;
  } else if (feasibilityRatio <= 0.8) {
    riskLevel = 'LOW';
    // 低风险，无需警告
  } else if (feasibilityRatio <= 1.0) {
    riskLevel = 'MEDIUM';
    warnings.push('预估时间接近周期上限，建议监控实际执行情况');
    suggestions.push('可以考虑适当延长周期天数');
  } else if (feasibilityRatio <= 1.2) {
    riskLevel = 'HIGH';
    warnings.push('预估时间超过周期上限，最后几天可能需要超时完成');
    suggestions.push(`建议将周期从${config.cycleDays}天延长到${Math.ceil(config.cycleDays * feasibilityRatio)}天`);
    suggestions.push('或者减少部分品类的选择');
  } else {
    riskLevel = 'CRITICAL';
    warnings.push(`预估时间严重超过周期上限（超出${((feasibilityRatio - 1) * 100).toFixed(0)}%），无法在周期内完成`);
    suggestions.push(`必须将周期延长到至少${Math.ceil(config.cycleDays * feasibilityRatio)}天`);
    suggestions.push(`或者减少品类选择，建议只保留${Math.floor(selectedCategories.length * 0.8)}个品类`);
    canSave = false;
  }

  // 检查品类数量
  if (selectedCategories.length > 5) {
    warnings.push(`已选择${selectedCategories.length}个品类，可能导致日度盘点任务量过大`);
    suggestions.push('建议优先选择最重要的2-3个品类');
  }

  // 检查SKU数量
  if (totalSkuCount > 500) {
    warnings.push(`预估SKU数量${totalSkuCount}件，数量较大`);
    suggestions.push('可以考虑分批盘点，或延长周期天数');
  }

  return {
    isValid: riskLevel !== 'CRITICAL',
    riskLevel,
    totalSkuCount,
    estimatedTotalTime,
    availableTime,
    feasibilityRatio,
    warnings,
    suggestions,
    canSave
  };
}

export default CategoryConfigManagement;
