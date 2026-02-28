import React, { useMemo, useState, useEffect, useRef } from 'react';
import { InventoryTask, Discrepancy, DiscrepancyReason } from '../types';
import { checkDynamicStatus } from '../services/inventoryService';
import { RefreshCcw, Check, ChevronLeft, ChevronRight, PlayCircle, Lightbulb, Store, User, HelpCircle, AlertCircle } from 'lucide-react';

interface ReconciliationProps {
  task: InventoryTask;
  onUpdateDiscrepancies: (updated: Discrepancy[]) => void;
  onSkuSelect: (sku: string) => void;
  onConfirm: () => void;
  onBack: () => void;
  shouldAutoScroll?: boolean; // 是否需要自动滚动到第一个未确认项
  onAutoScrollComplete?: () => void; // 滚动完成后的回调
}

const Reconciliation: React.FC<ReconciliationProps> = ({ task, onUpdateDiscrepancies, onSkuSelect, onConfirm, onBack, shouldAutoScroll = false, onAutoScrollComplete }) => {
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const hasAutoScrolledRef = useRef(false);
  
  // 进入确认页面时，自动更新库存到最新账面库存
  useEffect(() => {
    // 自动同步盘点期间的销售/退货/调拨记录，更新到最新账面库存
    // 这里应该调用后端API获取最新库存
    // 暂时使用现有逻辑，但不需要用户手动点击
  }, []);

  // --- Aggregate Discrepancies by SKU ---
  const { skuGroups, stats, isAllConfirmed } = useMemo(() => {
      const groups = new Map<string, {
          sku: string;
          name: string;
          imageUrl?: string;
          price: number;
          lossCount: number;
          profitCount: number;
          withdrawCount: number; 
          pendingCount: number; 
          reasons: Set<string>; // Store unique reasons for display
      }>();

      let lossAmt = 0;
      let profitAmt = 0;
      let totalStockAmt = 0; 
      
      let totalDiscrepancies = task.discrepancies.length;
      let confirmedCount = 0;

      // We calculate stock amount based on ALL items expected in the task
      task.items.forEach(item => {
          totalStockAmt += item.price;
      });

      task.discrepancies.forEach(d => {
          if (!groups.has(d.sku)) {
              // Find original item for image if possible
              const original = task.items.find(i => i.sku === d.sku);
              groups.set(d.sku, {
                  sku: d.sku,
                  name: d.name,
                  imageUrl: original?.imageUrl || "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-14.jpg",
                  price: d.price,
                  lossCount: 0,
                  profitCount: 0,
                  withdrawCount: 0,
                  pendingCount: 0,
                  reasons: new Set()
              });
          }
          
          const group = groups.get(d.sku)!;
          
          // Logic: "Withdraw" is strictly for Auto-Resolved (System detected)
          if (d.autoResolved) {
              group.withdrawCount += 1;
              confirmedCount += 1; 
              if (d.reason) group.reasons.add(d.reason);
          } else {
              if (d.type === 'SHORTAGE') {
                  group.lossCount += 1;
                  lossAmt += d.price;
              } else {
                  group.profitCount += 1;
                  profitAmt += d.price;
              }
              
              // If reason is set, it is confirmed.
              if (d.reason) {
                  confirmedCount += 1;
                  group.reasons.add(d.reason);
              } else {
                  group.pendingCount += 1;
              }
          }
      });

      const pendingTotalCount = Array.from(groups.values()).reduce((acc, g) => acc + g.pendingCount, 0);
      const lossTotalCount = Array.from(groups.values()).reduce((acc, g) => acc + g.lossCount, 0);
      const profitTotalCount = Array.from(groups.values()).reduce((acc, g) => acc + g.profitCount, 0);
      const withdrawTotalCount = Array.from(groups.values()).reduce((acc, g) => acc + g.withdrawCount, 0);

      return {
          skuGroups: Array.from(groups.values()),
          isAllConfirmed: confirmedCount === totalDiscrepancies && totalDiscrepancies > 0,
          stats: {
              confirmed: confirmedCount,
              total: totalDiscrepancies,
              pending: pendingTotalCount,
              loss: lossTotalCount,
              profit: profitTotalCount,
              withdraw: withdrawTotalCount,
              lossAmount: lossAmt,
              profitAmount: profitAmt,
              stockAmount: totalStockAmt
          }
      };
  }, [task.discrepancies, task.items]);

  // 自动滚动到第一个未确认项（当从详情页返回时）
  useEffect(() => {
    if (shouldAutoScroll && stats.pending > 0 && !hasAutoScrolledRef.current) {
      // 延迟一小段时间确保 DOM 已渲染
      const timer = setTimeout(() => {
        const firstPending = skuGroups.find(g => g.pendingCount > 0);
        if (firstPending) {
          const el = document.getElementById(`sku-${firstPending.sku}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // 添加一个高亮效果
            el.classList.add('ring-2', 'ring-blue-400', 'ring-offset-2');
            setTimeout(() => {
              el.classList.remove('ring-2', 'ring-blue-400', 'ring-offset-2');
            }, 2000);
            hasAutoScrolledRef.current = true;
            // 通知父组件滚动完成
            if (onAutoScrollComplete) {
              onAutoScrollComplete();
            }
          }
        }
      }, 200);
      
      return () => clearTimeout(timer);
    }
    // 当 shouldAutoScroll 变为 false 时，重置标志
    if (!shouldAutoScroll) {
      hasAutoScrolledRef.current = false;
    }
  }, [shouldAutoScroll, stats.pending, skuGroups, onAutoScrollComplete]);

  // 注意：不再需要手动同步按钮，进入页面时自动更新库存到最新账面库存
  // withdraw逻辑改为在查看详情后，判断原先是不是多盘或少盘，如果是就可以withdraw

  const handleNextAction = () => {
      if (!isAllConfirmed) {
          // Scroll to first pending
          const firstPending = skuGroups.find(g => g.pendingCount > 0);
          if (firstPending) {
              const el = document.getElementById(`sku-${firstPending.sku}`);
              if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  // Add a quick flash effect or focus could be added here
              }
          }
      } else {
          setShowSubmitModal(true);
      }
  };

  const handleConfirmSubmit = () => {
      setShowSubmitModal(false);
      onConfirm();
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* Secondary Confirmation Modal */}
      {showSubmitModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-xs rounded-2xl p-6 shadow-2xl animate-in zoom-in-95">
             <div className="flex justify-center mb-4">
                 <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                     <AlertCircle size={28} />
                 </div>
             </div>
             <h3 className="text-lg font-bold text-slate-900 text-center mb-2">确认提交差异核对?</h3>
             <p className="text-slate-500 text-sm text-center mb-6">
               提交后将进入签字流程，差异结果将不可更改。
             </p>
             <div className="flex gap-3">
               <button 
                 onClick={() => setShowSubmitModal(false)}
                 className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl active:bg-slate-200"
               >
                 取消
               </button>
               <button 
                 onClick={handleConfirmSubmit}
                 className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 active:bg-blue-700"
               >
                 确认
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white pb-2 shadow-sm sticky top-0 z-20">
        <div className="flex items-center p-4">
          <button onClick={onBack} className="p-1 -ml-2 text-slate-600">
            <ChevronLeft size={24} />
          </button>
          <div className="flex-1 text-center font-bold text-slate-800 text-lg">
            {task.id.split(' ').pop()}
          </div>
          <div className="w-8"></div>
        </div>

        {/* Stepper */}
        <div className="flex justify-between items-start px-4 mb-2">
          {[
            { id: 1, label: '扫码', active: true },
            { id: 2, label: '确认', active: true },
            { id: 3, label: '签字', active: false },
            { id: 4, label: '提交', active: false }
          ].map((step, idx, arr) => (
            <div key={step.id} className="flex-1 flex flex-col items-center relative z-10">
              {idx !== arr.length - 1 && (
                <div className={`absolute top-3 left-1/2 w-full h-[1px] -z-10 ${step.id < 2 ? 'bg-blue-500' : (step.id === 2 ? 'bg-blue-500' : 'bg-slate-200')}`}></div>
              )}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1 shrink-0 ${
                step.active ? 'bg-blue-500 text-white shadow-blue-200 shadow-md' : 'bg-slate-100 text-slate-400'
              }`}>
                {step.id}
              </div>
              <span className={`text-[10px] text-center w-full break-words leading-tight px-0.5 ${step.active ? 'text-blue-600 font-medium' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        
        {/* 库存已自动更新提示 */}
        <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100 text-blue-600">
              <RefreshCcw size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500">库存已自动更新到最新账面库存</p>
            </div>
          </div>
        </div>

        {/* Store Summary Card */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-200 relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
                <Store size={16} className="text-slate-700" />
                <h3 className="font-bold text-slate-800 text-sm">Pt. Xiaomi Technology Indonesia</h3>
            </div>
            <div className="text-xs text-slate-400 mb-4 pl-6">P&L: ZPD313425346466655</div>
            
            {/* Grid Stats */}
            <div className="grid grid-cols-4 gap-2 mb-4">
                <div>
                   <div className="flex items-center gap-1 text-slate-500 text-[10px] mb-1">
                       Confirm <HelpCircle size={10} />
                   </div>
                   <div className="text-lg font-bold text-slate-800">
                       <span className={stats.confirmed === stats.total ? 'text-green-600' : 'text-blue-600'}>{stats.confirmed}</span>
                       <span className="text-slate-400 text-xs">/{stats.total}</span>
                   </div>
                </div>
                <div>
                   <div className="text-slate-500 text-[10px] mb-1">Loss</div>
                   <div className="text-lg font-bold text-slate-800">{stats.loss}</div>
                </div>
                <div>
                   <div className="text-slate-500 text-[10px] mb-1">Profit</div>
                   <div className="text-lg font-bold text-slate-800">{stats.profit}</div>
                </div>
                <div>
                   <div className="text-slate-500 text-[10px] mb-1">Withdraw</div>
                   <div className="text-lg font-bold text-slate-800">{stats.withdraw}</div>
                </div>
            </div>

            {/* Financials */}
            <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                    <span className="text-slate-500">Loss Amount</span>
                    <span className="font-mono font-bold text-slate-800">
                        {stats.lossAmount.toLocaleString()}.00 <span className="text-red-500 text-[10px]">{(stats.lossAmount/stats.stockAmount*100).toFixed(2)}%</span>
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500">Profit Amount</span>
                    <span className="font-mono font-bold text-slate-800">
                        {stats.profitAmount.toLocaleString()}.00 <span className="text-green-500 text-[10px]">{(stats.profitAmount/stats.stockAmount*100).toFixed(2)}%</span>
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500">Stock Amount</span>
                    <span className="font-mono font-bold text-slate-800">{stats.stockAmount.toLocaleString()}.00</span>
                </div>
            </div>
            
            {/* Dashed Border Decoration */}
            <div className="absolute -bottom-1 left-0 right-0 border-b-2 border-dashed border-blue-200"></div>
        </div>

        {/* SKU Cards List */}
        {skuGroups.length === 0 ? (
          <div className="text-center py-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">盘点一致</h3>
            <p className="text-slate-500">无差异商品</p>
          </div>
        ) : (
          skuGroups.map((group) => (
            <div 
                key={group.sku} 
                id={`sku-${group.sku}`} 
                className={`bg-white rounded-xl p-4 shadow-sm border relative transition-colors ${group.pendingCount > 0 ? 'border-orange-200' : 'border-slate-100'}`}
            >
                <div className="flex gap-3 mb-3">
                   {/* Product Image */}
                   <div className="w-14 h-14 bg-slate-50 rounded-lg border border-slate-100 shrink-0 overflow-hidden">
                       <img src={group.imageUrl} alt={group.name} className="w-full h-full object-cover" />
                   </div>
                   
                   {/* Info */}
                   <div className="flex-1">
                       <h3 className="font-bold text-slate-800 text-sm leading-tight mb-1 line-clamp-2">{group.name}</h3>
                       <div className="text-xs text-slate-500 font-mono mb-2">Rp {group.price.toLocaleString()}.00</div>
                       <div className="flex items-center gap-1 text-[10px] text-slate-400">
                           <User size={10} />
                           <span>Harry Potter、Harry Potter、Harry Potter</span>
                       </div>
                   </div>
                </div>

                {/* Status Counts */}
                <div className="flex items-center gap-4 text-xs text-slate-500 mb-3 pl-1">
                    <div>Loss:<span className="font-bold text-slate-800">{group.lossCount}</span></div>
                    <div>Profit:<span className="font-bold text-slate-800">{group.profitCount}</span></div>
                    <div>Withdraw:<span className="font-bold text-slate-800">{group.withdrawCount}</span></div>
                </div>

                {/* Show Reasons if present */}
                {group.reasons.size > 0 && (
                    <div className="mb-3 pl-1 flex flex-wrap gap-1">
                        {Array.from(group.reasons).map((reason, idx) => (
                            <span key={idx} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200 truncate max-w-[200px]">
                                {reason}
                            </span>
                        ))}
                    </div>
                )}

                {/* Action */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                    <div className="text-xs">
                        {group.pendingCount > 0 ? (
                            <span className="text-orange-500 font-bold flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                {group.pendingCount} 待确认
                            </span>
                        ) : (
                            <span className="text-green-500 font-bold flex items-center gap-1">
                                <Check size={12} /> 已完成
                            </span>
                        )}
                    </div>
                    <button 
                       onClick={() => onSkuSelect(group.sku)}
                       className={`px-4 py-1.5 text-xs font-bold rounded-full transition-colors ${group.pendingCount > 0 ? 'bg-blue-600 text-white shadow-blue-200 shadow-sm' : 'bg-slate-100 text-slate-500'}`}
                    >
                        {group.pendingCount > 0 ? '去确认' : '修改原因'}
                    </button>
                </div>
            </div>
          ))
        )}

      </div>

      <div className="bg-white border-t border-slate-100 p-4 pb-8 flex gap-3 shadow-lg z-20">
        <button 
          onClick={handleNextAction}
          className={`w-full py-3 rounded-full font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all bg-blue-600 active:bg-blue-700 shadow-blue-200`}
        >
           {stats.pending > 0 ? `还有 ${stats.pending} 项未确认` : '下一步：签字'} <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default Reconciliation;