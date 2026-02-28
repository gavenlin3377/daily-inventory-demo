import { Product, ProductType, InventoryTask, Discrepancy, DiscrepancyReason } from '../types';
import * as XLSX from 'xlsx';

// --- DEMO DATA GENERATION CONFIG ---
// Target: 18 minutes estimated time @ 3 items/min = 54 Total Items.
// Target: 20 Unique SKUs.
// Structure: 
// 1. One "Star" SKU with 10 items (for aggregation demo).
// 2. Remaining 44 items distributed across 19 SKUs.
//    - 6 SKUs * 3 items = 18 items
//    - 13 SKUs * 2 items = 26 items
// Total Items: 10 + 18 + 26 = 54.
// Total SKUs: 1 + 6 + 13 = 20.

const generateDemoProducts = (): Product[] => {
  const products: Product[] = [];
  
  // 1. The "Star" SKU (Xiaomi 15 Green) - 10 Items
  const starSkuId = '1000101';
  for (let i = 0; i < 10; i++) {
    products.push({
      sku: starSkuId,
      name: 'Xiaomi 15 Green 12GB RAM 256GB ROM',
      type: ProductType.PHONE,
      price: 4599,
      imei: `865421051000${String(i).padStart(2, '0')}`, // SNs 00-09
      lastCounted: new Date().toISOString(),
      priority: 'HIGH',
      countMethod: 'SCAN',
      imageUrl: "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-14.jpg"
    });
  }

  // 2. Remaining 19 SKUs
  let imeiCounter = 2000;
  
  // Helper to create other SKUs
  const otherSkusInfo = Array.from({ length: 19 }).map((_, i) => ({
      id: `1000${200 + i}`,
      // Alternate names for variety
      name: i < 6 
        ? `Xiaomi 15 Pro ${256 + i*128}GB Titanium` // High end
        : `Xiaomi Redmi Note 13 ${i % 2 === 0 ? 'Pro' : 'Plus'} 5G`, // Mid range
      price: i < 6 ? 6499 : 1999,
      // Use different images for accessory/quantity types (simulated by last few items)
      imageUrl: i < 6
        ? "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-14-pro.jpg"
        : "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note-13-pro.jpg"
  }));

  otherSkusInfo.forEach((skuInfo, index) => {
      // Logic: First 6 SKUs get 3 items, Rest (13 SKUs) get 2 items
      const quantity = index < 6 ? 3 : 2;
      
      // CONFIG: Set the last 5 SKUs to be 'QUANTITY' method (Manual Input)
      // Total SKUs in loop is 19. Indices 0-18.
      // Last 5 are 14, 15, 16, 17, 18.
      const isQuantityMethod = index >= 14; 
      
      for (let q = 0; q < quantity; q++) {
          products.push({
            sku: skuInfo.id,
            name: skuInfo.name,
            // For demo purposes, we still call them PHONE type, but method is QUANTITY
            type: ProductType.PHONE,
            price: skuInfo.price,
            imei: `86542105${imeiCounter++}`,
            lastCounted: new Date().toISOString(),
            priority: 'HIGH',
            countMethod: isQuantityMethod ? 'QUANTITY' : 'SCAN',
            imageUrl: isQuantityMethod ? "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-watch-s3.jpg" : skuInfo.imageUrl
          });
      }
  });

  return products;
};

const MOCK_PRODUCTS: Product[] = generateDemoProducts();

export const getDailyTask = (dateStr: string): InventoryTask => {
  // Return ALL generated items for the specific demo scenario
  const taskItems = MOCK_PRODUCTS.map(item => ({...item}));
  
  return {
    id: `PDD${dateStr.replace(/-/g, '')}0001`,
    date: dateStr,
    items: taskItems, 
    status: 'PENDING',
    scannedImeis: new Set(),
    discrepancies: []
  };
};

// --- NEW: Generate History Tasks ---
export const getHistoryTasks = (): InventoryTask[] => {
    return [
        {
            id: 'PDD20251214000001',
            date: '12-14-2025',
            items: [], // Empty for summary view
            status: 'PENDING', // Using PENDING to simulate expired/unfinished in UI logic
            scannedImeis: new Set(),
            discrepancies: [],
            endTime: '10:00:00' 
        },
        {
            id: 'PDD20251212000001',
            date: '12-12-2025',
            items: MOCK_PRODUCTS.slice(0, 20), // Simulate a larger previous task
            status: 'COMPLETED',
            scannedImeis: new Set(),
            discrepancies: [
                { imei: '1', sku: '1001', name: 'Item A', type: 'SHORTAGE', price: 4000, autoResolved: false }
            ],
            endTime: '09:47:21'
        }
    ];
};

export const getProductByImei = (imei: string): Product | undefined => {
  return MOCK_PRODUCTS.find(p => p.imei === imei);
};

// Simulate Dynamic Reconciliation with specific reasons
export const checkDynamicStatus = (imei: string): DiscrepancyReason | null => {
  try {
    const lastDigit = parseInt(imei.slice(-1));
    
    // Simulate finding different system logs based on IMEI
    if (lastDigit === 0) return DiscrepancyReason.SALES_FLOW; // Sold
    if (lastDigit === 1) return DiscrepancyReason.TRANSFER_OUT; // Transferred out
    if (lastDigit === 2) return DiscrepancyReason.RETURN_WAREHOUSE; // Returned to warehouse
    
    return null;
  } catch (e) {
    return null;
  }
};

export const exportToExcel = (task: InventoryTask) => {
  const ws = XLSX.utils.json_to_sheet(task.discrepancies);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Discrepancies");
  XLSX.writeFile(wb, `Report_${task.date}.xlsx`);
};