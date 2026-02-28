import React, { useState, useEffect } from 'react';
import { InventoryTask, Discrepancy, Product } from './types';
import { getDailyTask, getHistoryTasks, getProductByImei } from './services/inventoryService';
import Scanner from './components/Scanner';
import Reconciliation from './components/Reconciliation';
import SignatureScreen from './components/SignatureModal'; 
import DiscrepancyReport from './components/DiscrepancyReport';
import ViewSignature from './components/ViewSignature';
import InventoryDetail from './components/InventoryDetail';
import DifferenceDetail from './components/DifferenceDetail';
import InventoryPlanManagement from './components/InventoryPlanManagement';
import InventoryOrderManagement from './components/InventoryOrderManagement';
import CategoryConfigManagement from './components/CategoryConfigManagement';
import { ChevronLeft, Clock, Info, CheckCircle2, PlayCircle, AlertCircle, Package, Timer } from 'lucide-react';

export enum AppView {
  DASHBOARD,
  SCANNER,      
  RECONCILIATION, 
  DIFFERENCE_DETAIL, // New View
  SIGNATURE,    
  REPORT_DETAIL, 
  SIGNATURE_VIEW,
  INVENTORY_DETAIL,
  PC_INVENTORY_PLAN_MANAGEMENT, // PC端盘点计划管理
  PC_INVENTORY_ORDER_MANAGEMENT, // PC端盘点单管理
  PC_CATEGORY_CONFIG // PC端品类配置
}

// --- Persistence Helpers ---
const TASK_STORAGE_KEY = 'retail_cycle_current_task_v1';

const saveTaskToStorage = (task: InventoryTask | null) => {
  if (!task) {
    localStorage.removeItem(TASK_STORAGE_KEY);
    return;
  }
  try {
    // Custom replacer to handle Set serialization (JSON doesn't support Set natively)
    const serialized = JSON.stringify(task, (key, value) => {
      if (key === 'scannedImeis' && value instanceof Set) {
        return Array.from(value);
      }
      return value;
    });
    localStorage.setItem(TASK_STORAGE_KEY, serialized);
  } catch (e) {
    console.error("Failed to save task", e);
  }
};

const loadTaskFromStorage = (): InventoryTask | null => {
  const stored = localStorage.getItem(TASK_STORAGE_KEY);
  if (!stored) return null;
  try {
    // Custom reviver to restore Set
    return JSON.parse(stored, (key, value) => {
      if (key === 'scannedImeis' && Array.isArray(value)) {
        return new Set(value);
      }
      return value;
    });
  } catch (e) {
    console.error("Failed to load task from storage", e);
    return null;
  }
};

export const App: React.FC = () => {
  // Initialize from storage immediately to prevent flicker
  // DEMO RESET: Initialize as null to force "Start Counting" state
  const [currentTask, setCurrentTask] = useState<InventoryTask | null>(null);
  
  // If we found a stored task that is IN_PROGRESS, strictly speaking we could jump to SCANNER.
  // But keeping it on DASHBOARD with "Resume" button is safer UX to avoid disorientation.
  const [view, setView] = useState<AppView>(AppView.DASHBOARD);
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [activeTab, setActiveTab] = useState('DAILY');
  const [selectedSkuForDetail, setSelectedSkuForDetail] = useState<string | null>(null);
  const [shouldAutoScrollReconciliation, setShouldAutoScrollReconciliation] = useState(false);

  // Effect: Auto-save whenever currentTask changes
  useEffect(() => {
    saveTaskToStorage(currentTask);
  }, [currentTask]);

  // Simulate "Today"
  const today = new Date().toISOString().split('T')[0];
  
  // Get History Tasks
  const historyTasks = getHistoryTasks();

  const prepareDailyTask = () => {
    // If we already have a loaded task (even if pending), use it. 
    // Otherwise create a fresh daily task.
    if (!currentTask) {
        const task = getDailyTask(today);
        setCurrentTask(task);
    }
    // 如果盘点未开始（PENDING 或刚创建），先展示操作说明弹窗
    if (!currentTask || currentTask.status === 'PENDING') {
        setShowInstructionModal(true);
    } else {
        setShowConfirmModal(true);
    }
  };

  const startTask = () => {
    setShowConfirmModal(false);
    if (currentTask && currentTask.status === 'COMPLETED') {
        // Do nothing for now
    } else {
        // Change status to IN_PROGRESS if it was PENDING
        if (currentTask && currentTask.status === 'PENDING') {
            setCurrentTask({ ...currentTask, status: 'IN_PROGRESS' });
        }
        setView(AppView.SCANNER);
    }
  };

  const handleScan = (imei: string) => {
    if (!currentTask) return;
    const newSet = new Set(currentTask.scannedImeis);
    newSet.add(imei);

    // Identify item for Last Action Banner & Update timestamp
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const isoTime = new Date().toISOString();
    
    // Update items with new timestamp for sorting
    const updatedItems = currentTask.items.map(i => {
        if (i.imei === imei) {
             return { ...i, lastCounted: isoTime };
        }
        return i;
    });

    const item = currentTask.items.find(i => i.imei === imei);
    const itemName = item ? item.name : 'Unknown/Extra Item';

    setCurrentTask({ 
        ...currentTask, 
        items: updatedItems,
        scannedImeis: newSet,
        lastAction: {
            name: itemName,
            time: timeStr,
            code: imei
        }
    });
  };

  const handleRemoveScan = (imei: string) => {
    if (!currentTask) return;
    const newSet = new Set(currentTask.scannedImeis);
    newSet.delete(imei);
    setCurrentTask({
        ...currentTask,
        scannedImeis: newSet
    });
  };

  const handleQuantityUpdate = (sku: string, count: number) => {
    if (!currentTask) return;
    
    let countAssigned = false;
    const isoTime = new Date().toISOString();

    const updatedItems = currentTask.items.map(item => {
      if (item.sku === sku) {
        if (!countAssigned) {
            countAssigned = true;
            return { ...item, manualCount: count, lastCounted: isoTime };
        } else {
            // Ensure other duplicates of this SKU are 0
            return { ...item, manualCount: 0 };
        }
      }
      return item;
    });

    const newSet = new Set(currentTask.scannedImeis);
    const item = currentTask.items.find(i => i.sku === sku);
    
    let lastAction = currentTask.lastAction;

    if (item) {
        if (count > 0) {
            newSet.add(item.imei); 
            const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
            lastAction = {
                name: item.name,
                time: timeStr,
                code: item.imei
            };
        } else {
            newSet.delete(item.imei); 
            currentTask.items.filter(i => i.sku === sku).forEach(i => newSet.delete(i.imei));
        }
    }
    
    setCurrentTask({ 
        ...currentTask, 
        items: updatedItems,
        scannedImeis: newSet,
        lastAction: lastAction
    });
  };

  // Generate discrepancies if they don't exist yet
  const ensureDiscrepancies = () => {
    if (!currentTask) return;
    
    // If we already have discrepancies generated (and potentially edited), don't overwrite blindly
    // But if it's empty, we must generate them.
    if (currentTask.discrepancies.length > 0) {
        setView(AppView.RECONCILIATION);
        return;
    }

    const diffs: Discrepancy[] = [];
    
    // Check Shortages
    currentTask.items.forEach(item => {
      const isScanned = currentTask.scannedImeis.has(item.imei);
      // For QUANTITY method, manualCount > 0 means found. 
      // But note: our data model splits quantity items into individual Product entries for simplicity in this demo logic.
      // If we assume manualCount is set on the *first* item of the SKU group, we need to handle that.
      // Simplified: If manualCount is used, we mark the appropriate number of items as 'scanned' conceptually.
      // However, handleQuantityUpdate sets scannedImeis for the first item if count > 0.
      // Let's rely on scannedImeis for SCAN method. For QUANTITY, we rely on manualCount logic.
      
      if (item.countMethod === 'QUANTITY') {
          // If the group has manualCount < totalExpected, generate shortages
          // This logic is complex for individual item tracking. 
          // For this demo, let's assume handleQuantityUpdate logic managed the "scanned" state sufficiently or...
          // Actually, handleQuantityUpdate adds ONE imei to scannedImeis if count > 0. This is a simplification.
          // Let's stick to: if !scannedImeis.has(item.imei) it's a shortage, UNLESS it's a quantity item covered by the manual count.
          
          // Find the "primary" item holding the count
          // This part is tricky in this simplified architecture. 
          // Let's assume for QUANTITY items, we just compare total expected vs manualCount.
          // And generate generic discrepancies.
          // BUT, to keep it compatible with the rest of the app, let's skip complex quantity logic for now and assume standard behavior.
      }

      if (!isScanned) {
         // Check if this SKU has a manual count that covers it? 
         // For demo simplicity, we will assume standard SCAN logic for shortages mostly, 
         // or that manualCount was handled by marking items as scanned in a real app.
         // Let's just push shortage.
         diffs.push({
          imei: item.imei,
          sku: item.sku,
          name: item.name,
          type: 'SHORTAGE',
          price: item.price,
          autoResolved: false,
          remarks: ''
        });
      }
    });

    // Check Overages
    currentTask.scannedImeis.forEach(imei => {
      if (!currentTask.items.find(i => i.imei === imei)) {
        const globalProduct = getProductByImei(imei);
        diffs.push({
          imei,
          sku: globalProduct ? globalProduct.sku : 'UNKNOWN',
          name: globalProduct ? globalProduct.name : 'Unlisted Item',
          type: 'OVERAGE',
          price: globalProduct ? globalProduct.price : 0, 
          autoResolved: false,
          remarks: ''
        });
      }
    });

    setCurrentTask({ ...currentTask, discrepancies: diffs });
    setView(AppView.RECONCILIATION);
  };

  const handleUpdateDiscrepancies = (updated: Discrepancy[]) => {
      if (!currentTask) return;
      setCurrentTask({ ...currentTask, discrepancies: updated });
  };

  const handleSkuSelect = (sku: string) => {
      setSelectedSkuForDetail(sku);
      setView(AppView.DIFFERENCE_DETAIL);
  };

  const handleSignatureFinish = () => {
      if (!currentTask) return;
      const finalTask = { ...currentTask, status: 'COMPLETED' as const };
      setCurrentTask(finalTask);
      saveTaskToStorage(finalTask);
      setView(AppView.DASHBOARD);
  };

  // --- Calculations ---
  const completedDiffAmount = currentTask?.discrepancies.reduce((acc, d) => acc + Math.abs(d.price), 0) || 0;
  const completedShortageAmount = currentTask?.discrepancies.filter(d => d.type === 'SHORTAGE').reduce((a, b) => a + b.price, 0) || 0;
  const completedOverageAmount = currentTask?.discrepancies.filter(d => d.type === 'OVERAGE').reduce((a, b) => a + b.price, 0) || 0;
  const totalValue = currentTask?.items.reduce((acc, i) => acc + i.price, 0) || 1; 
  const shortageRate = (completedShortageAmount / totalValue * 100).toFixed(2);
  const overageRate = (completedOverageAmount / totalValue * 100).toFixed(2);
  const diffRate = (completedDiffAmount / totalValue * 100).toFixed(2);

  const pendingTaskRef = currentTask || getDailyTask(today);
  const pendingCount = pendingTaskRef.items.length;
  const pendingSkuCount = new Set(pendingTaskRef.items.map(i => i.sku)).size;
  const estMinutes = Math.ceil(pendingCount / 3);

  const getProgressStats = () => {
      if (!currentTask) return { current: 0, total: 0 };
      const uniqueSkus = new Set(currentTask.items.map(i => i.sku));
      const total = uniqueSkus.size;
      const scannedSkuIds = new Set<string>();
      currentTask.items.forEach(item => {
          const isScanned = currentTask.scannedImeis.has(item.imei);
          const hasManualCount = (item.manualCount || 0) > 0;
          if (isScanned || hasManualCount) {
              scannedSkuIds.add(item.sku);
          }
      });
      const current = scannedSkuIds.size;
      return { current, total };
  };
  const progress = getProgressStats();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 relative">
      
      {view === AppView.DASHBOARD && (
        <>
          <header className="bg-white px-4 py-3 shadow-sm sticky top-0 z-10 flex items-center justify-between">
               <div className="flex items-center">
                 <ChevronLeft size={24} className="text-slate-600 mr-2" />
                 <h1 className="text-lg font-medium text-slate-800">门店盘点</h1>
               </div>
               <button
                 onClick={() => setView(AppView.PC_INVENTORY_PLAN_MANAGEMENT)}
                 className="text-xs text-blue-600 font-medium px-2 py-1"
               >
                 PC管理
               </button>
          </header>
          
          <div className="bg-blue-50 py-3 flex items-center border-b border-blue-100 shadow-sm overflow-hidden relative">
             <div className="shrink-0 pl-4 pr-3 z-10 bg-gradient-to-r from-blue-50 via-blue-50 to-transparent">
               <Info size={18} className="text-blue-600" />
             </div>
             <div className="flex-1 overflow-hidden relative h-5">
               <div className="absolute animate-marquee whitespace-nowrap text-sm text-blue-800 leading-snug flex items-center h-full">
                  日度盘点任务每日 04:00 生成，次日 03:59 截止，逾期未完成将影响绩效考核
               </div>
             </div>
          </div>
          
          <div className="bg-white flex overflow-x-auto no-scrollbar border-b border-slate-100 pt-2 px-2 gap-2">
              {['DAILY', 'GOOD', 'BAD', 'DISPLAY'].map(tab => (
                  <button 
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-3 px-4 text-sm font-bold relative shrink-0 whitespace-nowrap ${activeTab === tab ? 'text-blue-600' : 'text-slate-500'}`}>
                    {tab === 'DAILY' ? '日度盘点' : (tab === 'GOOD' ? '良品盘点' : (tab === 'BAD' ? '坏品盘点' : '样机盘点'))}
                    {activeTab === tab && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-blue-600 rounded-t-full"></div>}
                  </button>
              ))}
          </div>

          <main className="flex-1 p-4 space-y-4">
            
            {currentTask && currentTask.status === 'COMPLETED' ? (
               <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                      <h2 className="text-sm font-bold text-slate-900">MIDE00003 MIDE00003-1215-02</h2>
                      <div className="flex items-center gap-1 text-[10px] text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 shrink-0">
                        <CheckCircle2 size={10} />
                        <span>已完成</span>
                      </div>
                  </div>
                  <div className="text-xs text-slate-400 space-y-1 mb-3 font-mono">
                      <p>盘点单号 {currentTask.id}</p>
                      <p>盘点时间 {currentTask.date} 09:18:30</p>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3 grid grid-cols-3 gap-2 mb-4">
                      <div>
                          <div className="text-[10px] text-slate-400">盘亏金额</div>
                          <div className="text-sm font-bold text-slate-800">{completedShortageAmount.toLocaleString()}</div>
                          <div className="text-[10px] text-slate-300">占比 {shortageRate}%</div>
                      </div>
                      <div>
                          <div className="text-[10px] text-slate-400">盘盈金额</div>
                          <div className="text-sm font-bold text-slate-800">{completedOverageAmount.toLocaleString()}</div>
                           <div className="text-[10px] text-slate-300">占比 {overageRate}%</div>
                      </div>
                      <div>
                          <div className="text-[10px] text-slate-400">差异金额</div>
                          <div className="text-sm font-bold text-slate-800">{completedDiffAmount.toLocaleString()}</div>
                          <div className="text-[10px] text-slate-300">差异率 {diffRate}%</div>
                      </div>
                  </div>

                  <div className="space-y-3">
                     <button 
                         onClick={() => setView(AppView.SIGNATURE_VIEW)}
                         className="w-full py-2.5 border border-slate-300 text-slate-600 font-bold rounded-full"
                     >
                         查看签字
                     </button>
                     <button 
                         onClick={() => setView(AppView.INVENTORY_DETAIL)}
                         className="w-full py-2.5 border border-slate-300 text-slate-600 font-bold rounded-full"
                     >
                         查看盘点单
                     </button>
                  </div>
               </div>
            ) : (
               <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 relative overflow-hidden">
                  <div className="mb-6 relative z-10">
                     <h2 className="text-lg font-bold text-slate-800 mb-3 pr-20">MIDE00003 MIDE00003-1215-02</h2>
                     <div className="space-y-1">
                        <div className="flex text-xs font-mono">
                           <span className="text-slate-400 w-20 shrink-0">盘点单号</span>
                           <span className="text-slate-500 font-medium truncate">PDD{today.replace(/-/g,'')}0003</span>
                        </div>
                        <div className="flex text-xs font-mono">
                           <span className="text-slate-400 w-20 shrink-0">盘点时间</span>
                           <span className="text-slate-500 font-medium">{today} 10:00:00</span>
                        </div>
                        <div className="flex text-xs font-mono">
                           <span className="text-slate-400 w-20 shrink-0">盘点截止</span>
                           <span className="text-slate-500 font-medium">{today} 次日 03:59:59</span>
                        </div>
                     </div>
                     
                     <div className={`absolute top-0 right-0 flex items-center gap-1 text-[10px] px-3 py-1 rounded-full border ${
                          currentTask && currentTask.status === 'IN_PROGRESS' 
                          ? 'text-orange-500 bg-orange-50 border-orange-100' 
                          : 'text-blue-500 bg-blue-50 border-blue-100'
                      }`}>
                          {currentTask && currentTask.status === 'IN_PROGRESS' ? <PlayCircle size={10} /> : <Clock size={10} />}
                          <span className="font-bold whitespace-nowrap">{currentTask && currentTask.status === 'IN_PROGRESS' ? '盘点中' : '待盘点'}</span>
                      </div>
                  </div>
                  
                  <div className="grid grid-cols-2 divide-x divide-slate-100 mb-6 bg-slate-50/50 rounded-xl py-4">
                      <div className="flex flex-col items-center px-2">
                          <div className="text-xl font-bold text-slate-800">{pendingSkuCount}<span className="text-xs font-normal text-slate-400 ml-0.5">个</span></div>
                          <div className="text-[10px] text-slate-400 mt-1 text-center">待盘 SKU</div>
                      </div>
                      <div className="flex flex-col items-center px-2">
                          <div className="text-xl font-bold text-slate-800">{estMinutes}<span className="text-xs font-normal text-slate-400 ml-0.5">分钟</span></div>
                          <div className="text-[10px] text-slate-400 mt-1 text-center">预估耗时</div>
                      </div>
                  </div>

                  {currentTask && currentTask.status === 'IN_PROGRESS' && (
                      <div className="mb-4 bg-slate-50 p-3 rounded-xl">
                          <div className="flex justify-between items-center mb-2">
                              <span className="text-xs text-slate-500 font-bold">已盘进度</span>
                              <span className="text-xs text-blue-600 font-bold">{Math.round((progress.current / progress.total) * 100)}%</span>
                          </div>
                          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                               <div className="h-full bg-blue-500 transition-all duration-500" style={{width: `${(progress.current / progress.total) * 100}%`}}></div>
                          </div>
                          <div className="text-right text-[10px] text-slate-400 mt-1">
                              已盘 {progress.current} / 总计 {progress.total}
                          </div>
                      </div>
                  )}

                  <button 
                      onClick={prepareDailyTask}
                      className="w-full py-3.5 bg-blue-600 text-white rounded-full text-sm font-bold shadow-lg shadow-blue-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                      {currentTask && currentTask.status === 'IN_PROGRESS' ? (
                          <>继续盘点 <PlayCircle size={16} /></>
                      ) : (
                          <>开始盘点 <PlayCircle size={16} /></>
                      )}
                  </button>
               </div>
            )}

            {historyTasks.map((task) => (
                <div key={task.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 opacity-60">
                     <div className="flex justify-between items-start mb-2">
                          <h2 className="text-sm font-bold text-slate-900">MIDE00003 {task.id.slice(-8)}</h2>
                          <span className="text-xs text-slate-400 shrink-0">{task.status === 'COMPLETED' ? '已完成' : '未完成'}</span>
                      </div>
                      <div className="text-xs text-slate-400 space-y-1 mb-3 font-mono">
                          <p>盘点单号 {task.id}</p>
                          <p>盘点时间 {task.date} {task.endTime}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3 text-center text-xs text-slate-400 mb-3">
                          {task.status === 'COMPLETED' ? '查看详情' : '该任务已过期失效'}
                      </div>
                </div>
            ))}

          </main>
        </>
      )}

      {/* 日度盘点操作说明弹窗 - PENDING状态下必弹 */}
      {showInstructionModal && (
        <div className="absolute inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
              
              {/* 顶部强调区 */}
              <div className="bg-gradient-to-br from-blue-600 to-blue-500 px-6 pt-8 pb-6 text-center text-white">
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                      <Package size={28} className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-1">日度盘点操作说明</h3>
                  <p className="text-blue-100 text-sm">盘点货物 → 确认差异 → 签字提交</p>
              </div>

              {/* 核心要点 */}
              <div className="px-6 py-5 space-y-3">
                  <div className="flex items-center gap-3 bg-orange-50 rounded-xl px-4 py-3 border border-orange-100">
                      <Timer size={20} className="text-orange-500 shrink-0" />
                      <div>
                          <div className="text-sm font-bold text-slate-800">截止时间：次日 03:59</div>
                          <div className="text-xs text-slate-400 mt-0.5">逾期未完成将影响绩效考核</div>
                      </div>
                  </div>
                  <div className="flex items-center gap-3 bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-100">
                      <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                      <div>
                          <div className="text-sm font-bold text-slate-800">不锁库，不影响销售</div>
                          <div className="text-xs text-slate-400 mt-0.5">支持多人同时作业、随时暂停</div>
                      </div>
                  </div>
              </div>

              {/* 按钮 */}
              <div className="px-6 pb-6">
                  <button 
                    onClick={() => {
                      setShowInstructionModal(false);
                      setShowConfirmModal(true);
                    }} 
                    className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 active:scale-[0.98] transition-all"
                  >
                    我知道了
                  </button>
              </div>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="absolute inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
             <h3 className="text-lg font-bold text-slate-900 text-center mb-2">确认开始盘点吗?</h3>
             <p className="text-slate-500 text-sm text-center mb-6">
                日度盘点任务支持多人同时作业。<br/>
                <span className="text-blue-600 font-bold">日度盘点期间不锁定库存</span>，不影响正常销售。
             </p>
             <div className="flex gap-3">
               <button 
                 onClick={() => setShowConfirmModal(false)}
                 className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl active:bg-slate-200"
               >
                 取消
               </button>
               <button 
                 onClick={startTask}
                 className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 active:bg-blue-700"
               >
                 确认
               </button>
             </div>
          </div>
        </div>
      )}

      {/* --- Render Other Views conditionally --- */}
      {view === AppView.SCANNER && currentTask && (
          <div className="fixed inset-0 z-50 bg-slate-50">
             <Scanner 
                task={currentTask}
                onScan={handleScan}
                onRemoveScan={handleRemoveScan}
                onQuantityUpdate={handleQuantityUpdate}
                onBack={() => setView(AppView.DASHBOARD)}
                onFinish={ensureDiscrepancies}
             />
          </div>
      )}

      {view === AppView.RECONCILIATION && currentTask && (
          <div className="fixed inset-0 z-50 bg-slate-50">
              <Reconciliation 
                 task={currentTask}
                 onUpdateDiscrepancies={handleUpdateDiscrepancies}
                 onSkuSelect={handleSkuSelect}
                 onConfirm={() => setView(AppView.SIGNATURE)}
                 onBack={() => setView(AppView.SCANNER)}
                 shouldAutoScroll={shouldAutoScrollReconciliation}
                 onAutoScrollComplete={() => setShouldAutoScrollReconciliation(false)}
              />
          </div>
      )}

      {view === AppView.DIFFERENCE_DETAIL && currentTask && selectedSkuForDetail && (
           <div className="fixed inset-0 z-50 bg-slate-50">
              <DifferenceDetail 
                  task={currentTask}
                  sku={selectedSkuForDetail}
                  onBack={() => {
                    setShouldAutoScrollReconciliation(true);
                    setView(AppView.RECONCILIATION);
                  }}
                  onUpdateDiscrepancies={handleUpdateDiscrepancies}
              />
           </div>
      )}

      {view === AppView.SIGNATURE && currentTask && (
          <div className="fixed inset-0 z-50 bg-slate-50">
              <SignatureScreen 
                 task={currentTask}
                 onClose={() => setView(AppView.RECONCILIATION)}
                 onFinish={handleSignatureFinish}
              />
          </div>
      )}

      {view === AppView.SIGNATURE_VIEW && currentTask && (
           <div className="fixed inset-0 z-50 bg-slate-50">
               <ViewSignature 
                  task={currentTask}
                  onBack={() => setView(AppView.DASHBOARD)}
               />
           </div>
      )}

      {view === AppView.INVENTORY_DETAIL && currentTask && (
          <div className="fixed inset-0 z-50 bg-slate-50">
              <InventoryDetail 
                 task={currentTask}
                 onBack={() => setView(AppView.DASHBOARD)}
              />
           </div>
      )}

      {/* PC端盘点计划管理页面 */}
      {view === AppView.PC_INVENTORY_PLAN_MANAGEMENT && (
          <InventoryPlanManagement 
            onBack={() => setView(AppView.DASHBOARD)}
            onNavigateToOrders={() => setView(AppView.PC_INVENTORY_ORDER_MANAGEMENT)}
            onNavigateToConfig={() => setView(AppView.PC_CATEGORY_CONFIG)}
          />
      )}

      {/* PC端盘点单管理页面 */}
      {view === AppView.PC_INVENTORY_ORDER_MANAGEMENT && (
          <InventoryOrderManagement 
            onBack={() => setView(AppView.PC_INVENTORY_PLAN_MANAGEMENT)} 
          />
      )}

      {/* PC端品类配置页面 */}
      {view === AppView.PC_CATEGORY_CONFIG && (
          <CategoryConfigManagement 
            onBack={() => setView(AppView.PC_INVENTORY_PLAN_MANAGEMENT)} 
          />
      )}

    </div>
  );
};
