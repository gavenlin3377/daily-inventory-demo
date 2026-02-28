import React, { useState, useMemo, useEffect, useRef } from 'react';
import { InventoryTask } from '../types';
import { ScanBarcode, ChevronLeft, Search, PenLine, CheckCircle2, AlertCircle, XCircle, ListChecks, Info, X, Flashlight, Clock, History, ChevronDown, ChevronUp } from 'lucide-react';

interface ScannerProps {
  task: InventoryTask;
  onScan: (imei: string) => void;
  onRemoveScan: (imei: string) => void;
  onQuantityUpdate?: (sku: string, count: number) => void;
  onFinish: () => void;
  onBack: () => void;
}

// Helper interface for grouped display
interface SkuGroup {
  sku: string;
  name: string;
  imageUrl: string;
  countMethod: 'SCAN' | 'QUANTITY';
  totalExpected: number;
  scannedCount: number;
  items: any[]; // Original items references
  isFullyScanned: boolean;
  isJustCompleted: boolean; // For animation
  latestTimestamp: number; // For sorting
}

const Scanner: React.FC<ScannerProps> = ({ task, onScan, onRemoveScan, onQuantityUpdate, onFinish, onBack }) => {
  const [activeTab, setActiveTab] = useState<'unscanned' | 'scanned'>('unscanned');
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<'VIEWFINDER' | 'MANUAL'>('VIEWFINDER');
  const [manualInput, setManualInput] = useState('');
  const [scanResult, setScanResult] = useState<{ code: string; isDuplicate: boolean } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false); // New state for confirmation
  const [expandedSkus, setExpandedSkus] = useState<Set<string>>(new Set()); // Track expanded SN lists

  // Banner State: Frozen snapshot of lastAction when component mounts
  const [resumeContext] = useState(task.lastAction);
  const [showResumeBanner, setShowResumeBanner] = useState(false);

  // Trigger banner auto-hide timer on mount if resume context exists
  useEffect(() => {
    if (resumeContext) {
      setShowResumeBanner(true);
      const timer = setTimeout(() => {
        setShowResumeBanner(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  // 操作说明弹窗已移至 App.tsx 在 PENDING 状态下自动展示
  // Scanner 内仅保留手动点击「操作说明」按钮触发

  // Refactored: Store SKU ID instead of object to prevent stale state during updates
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  
  // State for quantity editing
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Visual Persistence State ---
  const [recentlyCompletedSkus, setRecentlyCompletedSkus] = useState<Set<string>>(new Set());

  // Cleanup effect for recently moved items
  useEffect(() => {
    if (recentlyCompletedSkus.size > 0) {
      const timer = setTimeout(() => {
        setRecentlyCompletedSkus(prev => {
           const next = new Set(prev);
           next.clear();
           return next;
        }); 
      }, 1000); 
      return () => clearTimeout(timer);
    }
  }, [recentlyCompletedSkus]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingSku && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingSku]);

  // --- GROUPING LOGIC ---
  const { unscannedGroups, scannedGroups, overageImeis } = useMemo(() => {
      const groupsMap = new Map<string, SkuGroup>();
      const scannedSet = task.scannedImeis;

      // 1. Group Items by SKU
      task.items.forEach(item => {
          if (!groupsMap.has(item.sku)) {
              groupsMap.set(item.sku, {
                  sku: item.sku,
                  name: item.name,
                  imageUrl: item.imageUrl || '',
                  countMethod: item.countMethod,
                  totalExpected: 0,
                  scannedCount: 0,
                  items: [],
                  isFullyScanned: false,
                  isJustCompleted: false,
                  latestTimestamp: 0
              });
          }
          const group = groupsMap.get(item.sku)!;
          group.items.push(item);
          group.totalExpected += 1;

          // Calculate Scanned Count & Timestamp for this item
          let isContributing = false;
          if (item.countMethod === 'SCAN') {
              if (scannedSet.has(item.imei)) {
                  group.scannedCount += 1;
                  isContributing = true;
              }
          } else {
              group.scannedCount += (item.manualCount || 0);
              if ((item.manualCount || 0) > 0) isContributing = true;
          }

          if (isContributing) {
              const t = new Date(item.lastCounted).getTime();
              if (t > group.latestTimestamp) group.latestTimestamp = t;
          }
      });

      // 2. Determine Status (Unscanned vs Scanned)
      const unscanned: SkuGroup[] = [];
      const scanned: SkuGroup[] = [];

      groupsMap.forEach(group => {
          // MODIFIED: Move to Scanned list if count > 0 (Blind Count Logic)
          const isStarted = group.scannedCount > 0;
          
          group.isFullyScanned = isStarted; // Reusing this flag to mean "In Scanned List" for animation purposes
          group.isJustCompleted = recentlyCompletedSkus.has(group.sku);

          // CRITICAL FIX: If we are editing this SKU, keep it in the list it currently belongs to relative to the user's view.
          // If activeTab is 'unscanned', and we are editing it, force it to stay 'unscanned' effectively until done.
          // This prevents the item from disappearing while typing.
          let placedInScanned = isStarted;

          if (editingSku === group.sku) {
             // If we are editing, we usually want it to stay where the user found it.
             // If the user is on 'unscanned' tab, force it to behave like 'unscanned' (false) even if count > 0.
             if (activeTab === 'unscanned') {
                placedInScanned = false;
             }
          }

          if (placedInScanned) {
              scanned.push(group);
          } else {
              unscanned.push(group);
          }
      });

      // 3. Handle Overage
      const overage = Array.from(scannedSet).filter(id => !task.items.find(i => i.imei === id));

      // 4. Sort
      unscanned.sort((a, b) => a.sku.localeCompare(b.sku)); // Unscanned by SKU
      scanned.sort((a, b) => b.latestTimestamp - a.latestTimestamp); // Scanned by Time Descending (Newest First)
      
      return {
          unscannedGroups: unscanned,
          scannedGroups: scanned,
          overageImeis: overage
      };
  }, [task.items, task.scannedImeis, recentlyCompletedSkus, editingSku, activeTab]);

  // Derive Active Group for Focus Mode
  const activeGroup = useMemo(() => {
      if (!selectedSku) return null;
      return unscannedGroups.find(g => g.sku === selectedSku) || 
             scannedGroups.find(g => g.sku === selectedSku);
  }, [selectedSku, unscannedGroups, scannedGroups]);

  // Apply Search
  const baseList = activeTab === 'unscanned' ? unscannedGroups : scannedGroups;
  const displayList = useMemo(() => {
    if (!searchQuery.trim()) return baseList;
    const lowerQ = searchQuery.toLowerCase();
    return baseList.filter(g => 
      g.sku.toLowerCase().includes(lowerQ) || 
      g.name.toLowerCase().includes(lowerQ)
    );
  }, [baseList, searchQuery]); 

  const handleManualScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.length > 4) {
      processScan(manualInput);
      setManualInput('');
      setCameraMode('VIEWFINDER');
    }
  };

  const processScan = (code: string) => {
      if (navigator.vibrate) navigator.vibrate(50);
      if (task.scannedImeis.has(code)) {
          setScanResult({ code, isDuplicate: true });
          if (navigator.vibrate) navigator.vibrate([50, 50, 50]); 
      } else {
          onScan(code);
          setScanResult({ code, isDuplicate: false });
      }
  };

  // Global Scan Simulation
  const handleSimulatedCameraScan = () => {
      for (const group of unscannedGroups) {
          if (group.countMethod === 'SCAN') {
              const targetItem = group.items.find(i => !task.scannedImeis.has(i.imei));
              if (targetItem) {
                  processScan(targetItem.imei);
                  return;
              }
          }
      }
      processScan('86542105100099');
  };

  // --- FEATURE: Simulate Overage Scan ---
  const handleSimulatedOverageScan = (e: React.MouseEvent) => {
      e.stopPropagation();
      // Generate a random SN that is unlikely to exist
      const randomOverageSn = `OV-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      processScan(randomOverageSn);
  };

  // Focus Mode Scan Simulation
  const handleFocusScan = () => {
      if (!activeGroup) return;
      // 1. Try to find an unscanned item in this specific group
      const targetItem = activeGroup.items.find(i => !task.scannedImeis.has(i.imei));
      
      if (targetItem) {
          processScan(targetItem.imei);
      } else {
          // 2. If all scanned, simulate a DUPLICATE scan of an existing item
          // This prevents accidental "Overage" creation during demo when user clicks too many times
          if (activeGroup.items.length > 0) {
              const randomExisting = activeGroup.items[Math.floor(Math.random() * activeGroup.items.length)];
              processScan(randomExisting.imei);
          } else {
             // Fallback for empty groups (unlikely in this view)
             processScan('UNKNOWN_OVERAGE_CODE');
          }
      }
  };

  const handleQuantityInputChange = (sku: string, val: string) => {
      if (val === '') {
         if (onQuantityUpdate) onQuantityUpdate(sku, 0);
         return; 
      }
      const num = parseInt(val);
      if (!isNaN(num) && onQuantityUpdate) {
          onQuantityUpdate(sku, num);
      }
  };

  const finishEditing = (group: SkuGroup) => {
      setEditingSku(null);
      // Trigger animation if item moves lists (count > 0)
      if (group.scannedCount > 0) {
          setRecentlyCompletedSkus(prev => new Set(prev).add(group.sku));
      }
  };

  const handleCardClick = (group: SkuGroup) => {
      // Access Control: Only 'SCAN' method items open the Focus Scan Page.
      // 'QUANTITY' items are handled inline.
      if (group.countMethod === 'SCAN') {
          setSelectedSku(group.sku);
      }
  };

  const toggleExpand = (sku: string) => {
      setExpandedSkus(prev => {
          const next = new Set(prev);
          if (next.has(sku)) {
              next.delete(sku);
          } else {
              next.add(sku);
          }
          return next;
      });
  };

  // --- Render Modals ---

  const renderHelpModal = () => {
    if (!showHelpModal) return null;
    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 relative">
               <button onClick={() => setShowHelpModal(false)} className="absolute top-4 right-4 p-2 text-slate-400 active:text-slate-800"><X size={20} /></button>
                <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">日度盘点操作说明</h3>
               
               <div className="space-y-5">
                  {/* Time */}
                  <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-bold text-center">
                      ⏱️ 预计耗时：约20分钟
                  </div>

                  {/* Process */}
                  <div>
                      <h4 className="font-bold text-slate-800 text-sm mb-2">操作流程</h4>
                      <div className="flex flex-col gap-2 text-xs text-slate-600 pl-2 border-l-2 border-slate-100">
                           <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>点击「开始日度盘点」</div>
                          <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>扫码/输入数量</div>
                          <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>确认差异原因</div>
                          <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>签字提交</div>
                      </div>
                  </div>

                  {/* Features */}
                  <div>
                      <h4 className="font-bold text-slate-800 text-sm mb-2">特点</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                           <div className="bg-slate-50 p-2 rounded">👥 多人协作，不锁库</div>
                           <div className="bg-slate-50 p-2 rounded">💾 实时保存，可暂停</div>
                           <div className="bg-slate-50 p-2 rounded col-span-2 text-center text-orange-600 font-bold">⏰ 截止时间：次日 03:59</div>
                      </div>
                  </div>

                  {/* Tips */}
                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 text-xs space-y-1.5">
                      <h4 className="font-bold text-amber-800 mb-1">💡 温馨提示</h4>
                      <div className="text-amber-700 flex gap-2 items-center">✅ 盘点期间可正常销售</div>
                      <div className="text-amber-700 flex gap-2 items-center">✅ 网络中断时自动离线保存</div>
                      <div className="text-amber-700 flex gap-2 items-center">⚠️ 扫码失败可手动输入SN码</div>
                  </div>
               </div>

               <button onClick={() => setShowHelpModal(false)} className="w-full mt-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200">我知道了</button>
           </div>
        </div>
    );
  };

  const renderFinishConfirmModal = () => {
    if (!showFinishConfirm) return null;
    return (
        <div className="absolute inset-0 z-[80] flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
             <div className="flex justify-center mb-4">
                 <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                     <ListChecks size={24} />
                 </div>
             </div>
             <h3 className="text-lg font-bold text-slate-900 text-center mb-2">确认提交盘点吗?</h3>
             <p className="text-slate-500 text-sm text-center mb-6">
               <span className="block mb-1">未盘商品: <span className="text-orange-600 font-bold">{unscannedGroups.length}</span></span>
               <span className="block">提交后将进入差异核对流程。</span>
             </p>
             <div className="flex gap-3">
               <button 
                 onClick={() => setShowFinishConfirm(false)}
                 className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl active:bg-slate-200"
               >
                 继续盘点
               </button>
               <button 
                 onClick={() => {
                     setShowFinishConfirm(false);
                     onFinish();
                 }}
                 className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 active:bg-blue-700"
               >
                 确认提交
               </button>
             </div>
          </div>
        </div>
    );
  };

  const renderScanResultModal = () => {
    // Suppress global result modal when in Focus Mode (local feedback is sufficient)
    if (!scanResult || selectedSku) return null;
    
    const currentItem = task.items.find(i => i.imei === scanResult.code);
    const name = currentItem ? currentItem.name : 'Unknown / Overage Item';
    const handleCloseModal = () => {
        setScanResult(null);
        setShowCamera(false);
        setCameraMode('VIEWFINDER');
    };

    return (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" onClick={handleCloseModal}></div>
            <div className="bg-white rounded-t-2xl shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-300 p-5 pb-8">
                <div className="flex justify-center mb-4"><div className="w-10 h-1 bg-slate-200 rounded-full"></div></div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">{currentItem ? `扫描成功` : '盘盈商品'}</h2>
                <div className="flex items-start gap-3 mb-6">
                    {scanResult.isDuplicate ? <AlertCircle className="text-orange-500 shrink-0" /> : <CheckCircle2 className="text-green-500 shrink-0" />}
                    <div>
                        <div className="font-bold text-slate-700">{name}</div>
                        <div className="text-xs text-slate-400 font-mono mt-1">SN: {scanResult.code}</div>
                        <div className="mt-2 text-xs bg-slate-100 inline-block px-2 py-1 rounded text-slate-500">{scanResult.isDuplicate ? '重复扫描' : '扫描成功'}</div>
                    </div>
                </div>
                <button onClick={handleCloseModal} className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl">继续盘点</button>
            </div>
        </div>
    );
  };

  // --- FOCUS SCAN MODE (The requested feature) ---
  const renderFocusScanning = () => {
    if (!activeGroup) return null;
    
    // Extract actual scanned SNs for this SKU for the list
    const scannedSns = task.items
      .filter(i => i.sku === activeGroup.sku && task.scannedImeis.has(i.imei))
      .map(i => i.imei);
    
    return (
      <div className="fixed inset-0 z-[60] flex flex-col bg-zinc-900 animate-in fade-in duration-200">
         
         {/* Top: Camera Viewfinder */}
         <div className="flex-1 relative flex flex-col items-center justify-center">
             {/* Header */}
             <div className="absolute top-0 left-0 right-0 p-4 pt-safe-top flex justify-between items-center z-10 text-white">
                <button 
                  onClick={() => setSelectedSku(null)} 
                  className="w-10 h-10 flex items-center justify-center bg-black/20 rounded-full backdrop-blur-md active:bg-black/40"
                >
                    <ChevronLeft size={24} />
                </button>
                <span className="font-bold text-lg drop-shadow-md">扫码盘点</span>
                <button className="w-10 h-10 flex items-center justify-center bg-black/20 rounded-full backdrop-blur-md">
                    <PenLine size={20} />
                </button>
             </div>

             {/* Flashlight/Tools (Visual only) */}
             <div className="absolute top-20 flex flex-col gap-4 text-white/80">
                 <div className="w-10 h-10 bg-black/30 rounded-full flex items-center justify-center backdrop-blur-md">
                    <Flashlight size={20} />
                 </div>
             </div>

             {/* Viewfinder Frame */}
             <div 
                onClick={handleFocusScan}
                className="w-72 h-44 border border-white/30 rounded-lg relative cursor-pointer active:scale-95 transition-transform bg-transparent"
             >
                {/* Corners */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white -mt-[2px] -ml-[2px]"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white -mt-[2px] -mr-[2px]"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white -mb-[2px] -ml-[2px]"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white -mb-[2px] -mr-[2px]"></div>
                
                {/* Scan Line Animation */}
                <div className="absolute top-1/2 left-2 right-2 h-[2px] bg-red-500/80 shadow-[0_0_10px_rgba(239,68,68,1)] animate-pulse"></div>
                
                <div className="absolute -top-12 w-full text-center text-amber-400 text-sm font-medium tracking-wide drop-shadow-md">
                    请将条码放入框内
                </div>
                <div className="absolute top-2 w-full text-center text-white/50 text-xs">
                    Place the SN/IMEI within the frame
                </div>
             </div>
             
             <div className="absolute bottom-6 text-white/30 text-xs">
                (点击方框模拟扫码)
             </div>

             {/* Focus Mode Toast for Result (Replacing Modal) */}
             {scanResult && !scanResult.isDuplicate && (
                 <div className="absolute bottom-20 px-4 py-2 bg-green-500/90 text-white rounded-full text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
                     <CheckCircle2 size={16} /> 扫描成功
                 </div>
             )}
             {scanResult && scanResult.isDuplicate && (
                 <div className="absolute bottom-20 px-4 py-2 bg-orange-500/90 text-white rounded-full text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
                     <AlertCircle size={16} /> 重复扫描
                 </div>
             )}
         </div>

         {/* Bottom: SN List Sheet */}
         <div className="bg-white rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.5)] flex flex-col max-h-[55%] min-h-[40%] animate-in slide-in-from-bottom duration-300 relative z-20">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>

            {/* Title & Product Info */}
            <div className="px-5 pb-4 shrink-0">
                <h2 className="text-xl font-bold text-slate-800 mb-2">
                    Scanned {activeGroup.scannedCount}
                </h2>
                <div className="flex items-start gap-2">
                    <CheckCircle2 className="text-emerald-500 fill-emerald-50 mt-0.5 shrink-0" size={18} />
                    <span className="text-sm text-slate-700 font-medium leading-tight">
                        {activeGroup.name}
                    </span>
                </div>
            </div>

            {/* Scrollable SN List */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
               <div className="grid grid-cols-2 gap-2.5 content-start">
                  {scannedSns.map(sn => (
                     <div key={sn} className="bg-slate-50 text-slate-600 text-xs py-2 px-2 rounded-[4px] font-mono border border-slate-100 flex items-center justify-between gap-1 animate-in zoom-in-50 duration-200">
                        <span className="truncate">{sn}</span>
                        <button 
                           onClick={() => onRemoveScan(sn)}
                           className="text-slate-300 hover:text-red-500 active:text-red-600 shrink-0 p-1 -mr-1"
                        >
                           <XCircle size={14} />
                        </button>
                     </div>
                  ))}
                  {/* Empty State */}
                  {scannedSns.length === 0 && (
                     <div className="col-span-2 py-8 text-center text-slate-300 text-sm border-2 border-dashed border-slate-100 rounded-xl">
                        暂无扫描记录
                     </div>
                  )}
               </div>
            </div>

            {/* Footer Action */}
            <div className="p-4 border-t border-slate-100 bg-white pb-6 safe-bottom">
                <button 
                   onClick={() => setSelectedSku(null)}
                   className="w-full py-3.5 bg-blue-600 text-white text-base font-bold rounded-xl shadow-lg shadow-blue-200 active:scale-[0.98] transition-transform active:bg-blue-700"
                >
                   Check
                </button>
            </div>
         </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#F2F4F8] relative">
      {renderHelpModal()}
      {renderFinishConfirmModal()}
      {renderFocusScanning()}

      {/* 1. Header Area */}
      <div className="bg-white sticky top-0 z-20 shadow-sm">
        <div className="flex items-center px-4 py-3">
          <button onClick={onBack} className="p-1 -ml-2 text-slate-600 active:bg-slate-100 rounded-full">
            <ChevronLeft size={24} />
          </button>
          <div className="flex-1 text-center">
             <span className="font-bold text-lg text-slate-800">扫码盘点</span>
          </div>
          <button 
             onClick={() => setShowHelpModal(true)}
             className="text-sm font-bold text-blue-600 active:text-blue-700"
          >
             操作说明
          </button>
        </div>

        <div className="flex justify-between items-center px-8 pb-4">
          {[
            { id: 1, label: '扫码', active: true },
            { id: 2, label: '确认', active: false },
            { id: 3, label: '签字', active: false },
            { id: 4, label: '提交', active: false }
          ].map((step, idx, arr) => (
            <div key={step.id} className="flex-1 flex flex-col items-center relative">
              {idx !== arr.length - 1 && (
                <div className={`absolute top-3 left-1/2 w-full h-[1px] -z-10 bg-slate-200`}></div>
              )}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${
                step.active ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-slate-100 text-slate-400'
              }`}>
                {step.id}
              </div>
              <span className={`text-[10px] ${step.active ? 'text-blue-600 font-bold' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center px-4 py-2 gap-4 border-t border-slate-50">
           <div className="flex items-center gap-6 shrink-0">
               <button onClick={() => setActiveTab('unscanned')} className="relative py-2">
                   <span className={`text-base font-bold ${activeTab === 'unscanned' ? 'text-slate-800' : 'text-slate-400'}`}>
                      未盘 <span className="text-xs font-normal">({unscannedGroups.length})</span>
                   </span>
                   {activeTab === 'unscanned' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-orange-500 rounded-full"></div>}
               </button>
               <button onClick={() => setActiveTab('scanned')} className="relative py-2">
                   <span className={`text-base font-bold ${activeTab === 'scanned' ? 'text-slate-800' : 'text-slate-400'}`}>
                      已盘 <span className="text-xs font-normal">({scannedGroups.length})</span>
                   </span>
                   {activeTab === 'scanned' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-blue-500 rounded-full"></div>}
               </button>
           </div>
           <div className="flex-1 relative">
               <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
               <input 
                  className="w-full bg-slate-100 rounded-lg py-2 pl-8 pr-7 text-xs text-slate-700 outline-none placeholder:text-slate-400"
                  placeholder="搜索SKU..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
               />
               {searchQuery && (
                   <button 
                     onClick={() => setSearchQuery('')}
                     className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                   >
                       <XCircle size={12} className="fill-slate-300 text-white" />
                   </button>
               )}
           </div>
        </div>
      </div>

      {/* 2. List Content - SKU GROUPS */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-24">
        
        {/* LAST ACTION BANNER (Resume Activity Context) */}
        {showResumeBanner && resumeContext && !searchQuery && (
             <div className="bg-gradient-to-r from-blue-50 to-white border border-blue-100 rounded-xl p-3 shadow-sm flex items-center justify-between relative overflow-hidden animate-in slide-in-from-top-2">
                 <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                 <div className="absolute top-0 right-0 p-1 bg-blue-100/50 rounded-bl-lg">
                    <History size={12} className="text-blue-400" />
                 </div>
                 
                 <div className="flex flex-col pl-2">
                     <div className="flex items-center gap-2 mb-0.5">
                         <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold">上次操作</span>
                         <span className="text-xs text-slate-400 font-mono">{resumeContext.time}</span>
                     </div>
                     <div className="font-bold text-slate-800 text-sm line-clamp-1">{resumeContext.name}</div>
                     <div className="text-[10px] text-slate-400 font-mono mt-0.5">{resumeContext.code}</div>
                 </div>
                 
                 <div className="pl-2">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                        <CheckCircle2 size={18} />
                    </div>
                 </div>
             </div>
        )}

        {/* OVERAGE ITEMS in Scanned Tab */}
        {activeTab === 'scanned' && overageImeis.map(imei => (
           <div key={imei} className="bg-white rounded-xl p-3 shadow-sm border border-orange-100 flex flex-col gap-2 relative overflow-hidden">
             <div className="absolute top-0 right-0 px-2 py-1 bg-orange-100 text-orange-600 text-[10px] font-bold rounded-bl-lg">盘盈</div>
             <div className="flex gap-3">
                <div className="w-16 h-16 bg-slate-100 rounded-lg shrink-0 flex items-center justify-center">
                    <AlertCircle className="text-slate-300" />
                </div>
                <div className="flex-1 flex flex-col justify-center">
                    <div className="font-bold text-slate-800 text-sm">未知商品 / 盘盈</div>
                    <div className="text-xs text-slate-500 mt-1">SN: {imei}</div>
                </div>
             </div>
             {/* Delete Button for Overage */}
             <div className="flex justify-end pt-2 border-t border-slate-50">
                <button 
                    onClick={() => onRemoveScan(imei)}
                    className="flex items-center gap-1 text-xs text-red-500 px-3 py-1 bg-red-50 rounded-full active:bg-red-100"
                >
                    <XCircle size={12} /> 删除
                </button>
             </div>
           </div>
        ))}

        {displayList.length === 0 && overageImeis.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
             <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                 <Search size={24} className="text-slate-300" />
             </div>
             <p className="text-sm">暂无商品数据</p>
          </div>
        ) : (
          displayList.map(group => {
            const scannedSns = group.items.filter(i => task.scannedImeis.has(i.imei)).map(i => i.imei);
            
            return (
            <div 
                key={group.sku} 
                onClick={() => handleCardClick(group)}
                className={`bg-white rounded-xl p-3 shadow-sm border transition-all duration-300 relative overflow-hidden flex flex-col gap-3 ${group.countMethod === 'SCAN' ? 'cursor-pointer active:scale-[0.99]' : ''} ${group.isJustCompleted ? 'bg-green-50 border-green-200 translate-x-full opacity-0' : 'border-transparent'}`}
            >
              <div className="flex gap-3">
                  <div className="w-16 h-16 bg-slate-50 rounded-lg shrink-0 overflow-hidden border border-slate-100 relative">
                      <img src={group.imageUrl} alt={group.name} className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] text-center py-0.5">
                          {activeTab === 'scanned' ? '已盘' : '待盘'}
                      </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                        <div className="text-sm font-bold text-slate-800 leading-snug line-clamp-1">{group.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">SKU: {group.sku}</div>
                    </div>

                    <div className="mt-2" onClick={(e) => e.stopPropagation()}> 
                        {group.countMethod === 'SCAN' ? (
                            activeTab === 'unscanned' ? (
                              <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                                 <div className="flex items-center gap-1.5 text-slate-500">
                                    <ScanBarcode size={14} />
                                    <span className="text-xs font-bold">扫码录入</span>
                                 </div>
                                 <div className="text-xs font-bold text-blue-600">已扫: {group.scannedCount}</div>
                              </div>
                            ) : (
                              // Scanned Tab: Show Scanned Quantity
                              <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-1.5 text-blue-600">
                                    <CheckCircle2 size={14} />
                                    <span className="text-xs font-bold">已盘点</span>
                                 </div>
                                 <div className="text-lg font-bold text-slate-800">
                                    x{group.scannedCount} 
                                 </div>
                              </div>
                            )
                        ) : (
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-400">手动清点</span>
                                <div className="flex items-center gap-2">
                                    {editingSku === group.sku ? (
                                        <input 
                                            ref={inputRef}
                                            type="number" 
                                            value={group.scannedCount === 0 ? '' : group.scannedCount.toString()}
                                            onChange={(e) => handleQuantityInputChange(group.sku, e.target.value)}
                                            onBlur={() => finishEditing(group)}
                                            onKeyDown={(e) => { if(e.key === 'Enter') finishEditing(group); }}
                                            className="w-20 border border-blue-500 rounded px-2 py-1 text-center font-bold text-slate-800 text-sm outline-none bg-white shadow-sm ring-2 ring-blue-100"
                                        />
                                    ) : (
                                        <button 
                                           onClick={() => setEditingSku(group.sku)}
                                           className="border border-slate-300 rounded-lg px-3 py-1 flex items-center gap-2 bg-white active:bg-slate-50 transition-colors"
                                        >
                                            <span className={`font-bold text-sm ${group.scannedCount > 0 ? 'text-slate-800' : 'text-slate-500'}`}>{group.scannedCount}</span>
                                            <PenLine size={12} className="text-blue-500" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                  </div>
              </div>

              {/* Scanned SN List (Only for Scanned Tab and SCAN method) */}
              {activeTab === 'scanned' && group.countMethod === 'SCAN' && scannedSns.length > 0 && (
                  <div className="border-t border-slate-100 pt-3 mt-1" onClick={(e) => e.stopPropagation()}>
                      <div 
                        className="flex justify-between items-center mb-2 cursor-pointer select-none"
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(group.sku);
                        }}
                      >
                         <span className="text-[10px] text-slate-400 font-bold">SN 列表</span>
                         <div className="flex items-center text-blue-500 font-bold text-[10px] gap-0.5">
                            SN
                            {expandedSkus.has(group.sku) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                         </div>
                      </div>
                      
                      {expandedSkus.has(group.sku) && (
                        <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            {scannedSns.map(sn => (
                                <div key={sn} className="bg-slate-50 border border-slate-100 rounded px-2 py-2 flex justify-between items-center group">
                                    <span className="text-xs font-mono text-slate-600 truncate mr-1">{sn}</span>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemoveScan(sn);
                                        }} 
                                        className="text-slate-300 hover:text-red-500 active:text-red-600 p-0.5"
                                    >
                                        <XCircle size={14} className="fill-slate-100" />
                                    </button>
                                </div>
                            ))}
                        </div>
                      )}
                  </div>
              )}
            </div>
            );
          })
        )}
      </div>

      {/* 3. Bottom Action Bar (Fixed) */}
      <div className="absolute bottom-0 left-0 right-0 bg-white px-4 py-3 pb-6 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] flex gap-3 z-30">
          <button 
             onClick={() => {
               setCameraMode('VIEWFINDER');
               setShowCamera(true);
             }}
             className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-full shadow-sm active:bg-slate-50 flex items-center justify-center gap-2"
          >
            <ScanBarcode size={20} /> 扫码盘点
          </button>
          <button 
             onClick={() => setShowFinishConfirm(true)}
             className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-full shadow-lg shadow-blue-200 flex items-center justify-center gap-2 active:bg-blue-700 transition-transform active:scale-95"
          >
             <ListChecks size={18} /> 提交盘点
          </button>
      </div>

      {/* Global Camera Full Screen Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="p-4 flex justify-between items-center text-white relative">
            <button onClick={() => setShowCamera(false)}><ChevronLeft size={28} /></button>
            <span className="font-medium">{cameraMode === 'VIEWFINDER' ? '扫码盘点' : '手动输入条码'}</span>
            <button onClick={() => setCameraMode(cameraMode === 'VIEWFINDER' ? 'MANUAL' : 'VIEWFINDER')} className={`p-2 rounded-full ${cameraMode === 'MANUAL' ? 'bg-white text-black' : 'bg-white/20 text-white'}`}><PenLine size={20} /></button>
          </div>

          {cameraMode === 'VIEWFINDER' ? (
            <div className="flex-1 relative flex flex-col items-center justify-center animate-in fade-in">
                <div onClick={handleSimulatedCameraScan} className="w-72 h-40 border-2 border-white/80 rounded-lg relative cursor-pointer active:scale-95 transition-transform">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-white -mt-1 -ml-1"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-white -mt-1 -mr-1"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-white -mb-1 -ml-1"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-white -mb-1 -mr-1"></div>
                    <div className="absolute inset-0 flex items-center justify-center"><div className="w-full h-[1px] bg-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div></div>
                    <p className="absolute -top-8 w-full text-center text-yellow-400 text-xs">请对准一个条码，或遮挡其他条码</p>
                    <p className="absolute top-2 w-full text-center text-white/50 text-xs">请将SN/IMEI置于框内</p>
                    <p className="absolute bottom-2 w-full text-center text-white/30 text-[10px]">(点击方框模拟扫码)</p>
                </div>
                
                {/* --- Added Simulation Button for Overage --- */}
                <div className="absolute bottom-16 w-full flex justify-center gap-4 z-20">
                    <button onClick={handleSimulatedOverageScan} className="px-3 py-1 bg-orange-500/80 text-white text-xs rounded-full backdrop-blur-md border border-white/30 active:bg-orange-600">
                        模拟扫盘盈
                    </button>
                </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center pt-20 px-8 animate-in slide-in-from-right duration-300">
                <h3 className="text-white text-lg font-bold mb-6">请输入商品条码/SN</h3>
                <form onSubmit={handleManualScan} className="w-full max-w-sm">
                   <div className="bg-white rounded-xl p-2 flex items-center mb-6">
                      <input autoFocus type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" value={manualInput} onChange={e => setManualInput(e.target.value)} placeholder="点击输入..." className="flex-1 bg-transparent text-slate-900 text-lg px-2 outline-none"/>
                      {manualInput && <button type="button" onClick={() => setManualInput('')} className="p-2 text-slate-400"><CheckCircle2 className="rotate-45" /></button>}
                   </div>
                   <button type="submit" className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-900/50 active:scale-95 transition-transform">确认</button>
                </form>
            </div>
          )}
          {renderScanResultModal()}
        </div>
      )}
    </div>
  );
};

export default Scanner;
