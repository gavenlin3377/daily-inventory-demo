import React, { useState, useMemo } from 'react';
import { InventoryTask, Discrepancy, DiscrepancyReason } from '../types';
import { ChevronLeft, User, HelpCircle, Upload, X, Image as ImageIcon } from 'lucide-react';

interface DifferenceDetailProps {
  task: InventoryTask;
  sku: string;
  onBack: () => void;
  onUpdateDiscrepancies: (updated: Discrepancy[]) => void;
}

const DifferenceDetail: React.FC<DifferenceDetailProps> = ({ task, sku, onBack, onUpdateDiscrepancies }) => {
  const [lossReason, setLossReason] = useState<string>('');
  const [profitReason, setProfitReason] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [images, setImages] = useState<string[]>([]);
  
  const product = task.items.find(i => i.sku === sku);
  
  // Filter discrepancies for this SKU
  const discrepancies = useMemo(() => 
     task.discrepancies.filter(d => d.sku === sku), 
  [task.discrepancies, sku]);

  const lossItems = discrepancies.filter(d => d.type === 'SHORTAGE');
  const profitItems = discrepancies.filter(d => d.type === 'OVERAGE');
  const withdrawItems = discrepancies.filter(d => d.autoResolved);

  // Pre-fill if already set (taking from the first manually edited item)
  const manualItems = [...lossItems, ...profitItems].filter(d => !d.autoResolved);
  
  useState(() => {
     if (manualItems.length > 0) {
         const first = manualItems[0];
         if (first.type === 'SHORTAGE' && first.reason) setLossReason(first.reason);
         if (first.type === 'OVERAGE' && first.reason) setProfitReason(first.reason);
         if (first.remarks) setDescription(first.remarks);
         if (first.proofImages) setImages(first.proofImages);
     }
  });

  const reasonOptions = Object.values(DiscrepancyReason).filter(r => r !== DiscrepancyReason.OTHER);
  const otherOption = DiscrepancyReason.OTHER;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (index: number) => {
      setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
      // Update all discrepancies for this SKU with the selected reasons
      const updatedAll = task.discrepancies.map(d => {
          if (d.sku === sku) {
              if (d.type === 'SHORTAGE' && !d.autoResolved) {
                  return { 
                      ...d, 
                      reason: lossReason as DiscrepancyReason, 
                      remarks: description,
                      proofImages: images 
                  };
              }
              if (d.type === 'OVERAGE' && !d.autoResolved) {
                  return { 
                      ...d, 
                      reason: profitReason as DiscrepancyReason, 
                      remarks: description,
                      proofImages: images 
                  };
              }
          }
          return d;
      });
      
      onUpdateDiscrepancies(updatedAll);
      onBack();
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans">
       {/* Header */}
       <div className="bg-white px-4 py-3 shadow-sm sticky top-0 z-10 flex items-center">
        <button onClick={onBack} className="p-1 -ml-2 text-slate-600">
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1 text-center font-bold text-slate-800 text-lg">
          Difference Confirm
        </div>
        <div className="w-8"></div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* Product Card */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
             <div className="flex gap-3 mb-3">
                 <div className="w-14 h-14 bg-slate-50 rounded-lg border border-slate-100 shrink-0 overflow-hidden">
                     <img src={product?.imageUrl || "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-14.jpg"} alt="" className="w-full h-full object-cover" />
                 </div>
                 <div className="flex-1">
                     <h3 className="font-bold text-slate-800 text-sm leading-tight mb-1 line-clamp-2">{product?.name || 'Unknown Product'}</h3>
                     <div className="text-xs text-slate-500 font-mono mb-2">Rp {product?.price.toLocaleString()}.00</div>
                 </div>
             </div>
             
             <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-4 pb-4 border-b border-slate-50">
                <User size={12} />
                <span>Harry Potter、Harry Potter、Harry Potter</span>
             </div>

             <div className="grid grid-cols-[120px_1fr] gap-y-2 text-xs">
                 <div className="text-slate-500">Original Differences</div>
                 <div className="flex gap-3">
                     <span className="text-slate-700">Loss:<span className="font-bold">{lossItems.length + withdrawItems.filter(i => i.type === 'SHORTAGE').length}</span></span>
                     <span className="text-slate-700">Profit:<span className="font-bold">{profitItems.length + withdrawItems.filter(i => i.type === 'OVERAGE').length}</span></span>
                 </div>

                 <div className="text-slate-500">Latest Differences</div>
                 <div className="flex gap-3">
                     <span className="text-slate-700">Loss:<span className="font-bold">{lossItems.length}</span></span>
                     <span className="text-slate-700">Profit:<span className="font-bold">{profitItems.length}</span></span>
                     <span className="text-slate-700">Withdraw:<span className="font-bold">{withdrawItems.length}</span></span>
                 </div>
             </div>
             
             <div className="mt-4 flex justify-center">
                 <button className="text-blue-500 text-xs font-bold px-4 py-1">Skip</button>
             </div>
          </div>

          {/* Form Section */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
             <div className="flex items-center gap-1 mb-6">
                 <h3 className="font-bold text-slate-800 text-lg">Reason</h3>
                 <span className="text-red-500">*</span>
             </div>

             <div className="space-y-6">
                 {/* Loss Dropdown */}
                 {lossItems.length > 0 && (
                     <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <label className="text-sm font-bold text-slate-700 flex gap-0.5">Loss<span className="text-red-500">*</span></label>
                        <select 
                           value={lossReason}
                           onChange={(e) => setLossReason(e.target.value)}
                           className="text-right text-sm text-slate-500 bg-transparent outline-none w-[60%]"
                        >
                           <option value="" disabled>Please select a reason</option>
                           {reasonOptions.map(r => <option key={r} value={r}>{r}</option>)}
                           <option value={otherOption}>{otherOption}</option>
                        </select>
                     </div>
                 )}

                 {/* Profit Dropdown */}
                 {profitItems.length > 0 && (
                     <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <label className="text-sm font-bold text-slate-700 flex gap-0.5">Profit<span className="text-red-500">*</span></label>
                        <select 
                           value={profitReason}
                           onChange={(e) => setProfitReason(e.target.value)}
                           className="text-right text-sm text-slate-500 bg-transparent outline-none w-[60%]"
                        >
                           <option value="" disabled>Please select a reason</option>
                           {reasonOptions.map(r => <option key={r} value={r}>{r}</option>)}
                           <option value={otherOption}>{otherOption}</option>
                        </select>
                     </div>
                 )}

                 {/* Description Input */}
                 <div>
                     <label className="text-sm font-bold text-slate-700 flex gap-0.5 mb-3">Description<span className="text-red-500">*</span></label>
                     <textarea 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Add a comment"
                        className="w-full bg-slate-50 rounded-lg p-3 text-sm outline-none resize-none h-24 placeholder:text-slate-300"
                     />
                 </div>

                 {/* Image Upload Section (New) */}
                 <div>
                     <label className="text-sm font-bold text-slate-700 flex gap-0.5 mb-3">Upload Proof</label>
                     <div className="flex gap-3 flex-wrap">
                        {/* Upload Button */}
                        <label className="w-20 h-20 bg-slate-50 border border-slate-200 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer active:bg-slate-100 transition-colors">
                            <Upload size={20} className="text-slate-300 mb-1" />
                            <span className="text-[10px] text-slate-400">Add Image</span>
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>

                        {/* Image Previews */}
                        {images.map((img, idx) => (
                            <div key={idx} className="w-20 h-20 rounded-lg overflow-hidden relative border border-slate-100">
                                <img src={img} alt="Proof" className="w-full h-full object-cover" />
                                <button 
                                    onClick={() => removeImage(idx)}
                                    className="absolute top-0 right-0 p-0.5 bg-black/50 text-white rounded-bl"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                 </div>
             </div>
          </div>

          <div className="h-20"></div>
      </div>

      <div className="bg-white border-t border-slate-100 p-4 pb-8 flex gap-3 shadow-lg z-20 sticky bottom-0">
          <button 
             onClick={handleConfirm}
             className="w-full py-3 bg-blue-50 text-blue-600 font-bold rounded-full shadow-sm hover:bg-blue-100 transition-colors"
          >
             Confirm
          </button>
      </div>

    </div>
  );
};

export default DifferenceDetail;