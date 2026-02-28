# 日盘系统主流程图（Mermaid格式）

## 完整业务主流程

```mermaid
graph TB
    subgraph PC后台["PC后台 - 配置管理"]
        A1[品类配置<br/>仅支持手机/平板] --> A3[保存配置<br/>无需可行性校验]
        A3 --> A5[创建盘点计划<br/>可选]
    end
    
    subgraph 任务生成["系统 - 任务生成<br/>每日04:00"]
        B1[获取未盘点SKU] --> B2[计算优先级<br/>时间/价值/销量/新品/风险]
        B2 --> B3[同步进行:<br/>选择当日SKU加决定盘点方式<br/>控制时间20到30分钟]
        B3 --> B4{盘点方式}
        B4 -->|高价值/有序列号| B5[扫码]
        B4 -->|其他| B7[填数]
        B5 --> B8[创建库存快照]
        B7 --> B8
        B8 --> B9[生成任务<br/>推送到移动端]
    end
    
    subgraph 移动端盘点["移动端 - 盘点执行"]
        C1[查看任务] --> C3[显示操作说明]
        C3 --> C5[开始盘点]
        C5 --> C6{盘点方式}
        C6 -->|扫码| C7[扫描序列号]
        C6 -->|填数| C8[输入数量]
        C7 --> C10[实时保存进度]
        C8 --> C10
        C10 --> C11{所有SKU完成?}
        C11 -->|否| C6
        C11 -->|是| C12[完成盘点]
    end
    
    subgraph 差异确认["移动端 - 差异确认"]
        D1[进入确认页面<br/>库存自动更新到最新账面库存] --> D4[计算差异<br/>库存快照+动态比对]
        D4 --> D6[显示差异列表<br/>按SKU分组]
        D6 --> D7{所有差异已确认?}
        D7 -->|否| D8[查看详情]
        D8 --> D8A{原先是否<br/>多盘或少盘?}
        D8A -->|是| D8B[可以withdraw]
        D8A -->|否| D8C[填写差异原因]
        D8B --> D8C
        D8C --> D9[确认差异]
        D9 --> D7
        D7 -->|是| D11[进入签名]
    end
    
    subgraph 签名提交["移动端 - 签名提交"]
        E1[签名确认] --> E2[保存签名]
        E2 --> E3[确认提交]
        E3 --> E4[更新任务状态]
        E4 --> E5[更新SKU盘点时间]
        E5 --> E6[更新库存快照]
        E6 --> E7[生成盘点报告]
    end
    
    subgraph 周期保障["系统 - 周期保障机制"]
        F1[周期开始前验证] --> F2{可行性检查}
        F2 -->|不可行| F3[调整配置/延长周期]
        F2 -->|可行| F4[周期进行中监控]
        F4 --> F5{风险等级}
        F5 -->|LOW| F6[正常执行]
        F5 -->|MEDIUM| F7[提示注意]
        F5 -->|HIGH| F8[调整策略]
        F5 -->|CRITICAL| F9[必须调整]
        F6 --> F10{最后2天?}
        F7 --> F10
        F8 --> F10
        F9 --> F10
        F10 -->|是| F11[强制分配剩余SKU]
        F10 -->|否| F4
        F11 --> F12[确保重要SKU完成]
    end
    
    subgraph 新商品处理["系统 - 新商品入库处理"]
        G1[检测新商品入库] --> G2{在品类范围内?}
        G2 -->|否| G3[忽略]
        G2 -->|是| G4[计算时间成本]
        G4 --> G5{时间影响}
        G5 -->|≤5分钟| G6[自动加入<br/>Toast提示]
        G5 -->|5-15分钟| G7[弹窗询问用户]
        G5 -->|>15分钟| G8[自动延迟<br/>Banner提示]
        G6 --> G9[重新计算优先级]
        G7 --> G10{用户选择}
        G10 -->|加入| G9
        G10 -->|延迟| G11[安排到明日]
        G8 --> G11
        G9 --> G12[动态调整任务]
    end
    
    A5 --> B1
    B9 --> C1
    C12 --> D1
    D11 --> E1
    E7 --> F1
    B1 -.新商品.-> G1
    G12 -.影响.-> B1
    
    style A1 fill:#e1f5ff
    style B1 fill:#fff9c4
    style C1 fill:#e1bee7
    style D1 fill:#b3e5fc
    style E1 fill:#c8e6c9
    style F1 fill:#ffccbc
    style G1 fill:#fff9c4
```

## 简化版核心流程

```mermaid
flowchart TD
    Start([开始]) --> Config[PC后台: 品类配置<br/>仅支持手机/平板<br/>无需可行性校验]
    Config --> TaskGen[每日04:00<br/>自动生成任务]
    
    TaskGen --> SelectAndDecide[同步进行:<br/>SKU选择+决定盘点方式<br/>优先级计算]
    SelectAndDecide --> CreateSnapshot[创建库存快照]
    CreateSnapshot --> PushTask[推送任务到移动端]
    
    PushTask --> MobileStart[移动端: 开始盘点]
    MobileStart --> Count[盘点操作<br/>扫码/填数]
    Count --> Save[实时保存进度]
    Save --> Complete{完成?}
    Complete -->|否| Count
    Complete -->|是| AutoUpdate[进入差异确认<br/>库存自动更新到最新账面库存]
    
    AutoUpdate --> CalcDiff[计算差异<br/>动态比对]
    CalcDiff --> Confirm[确认差异<br/>查看详情后可withdraw]
    Confirm --> Sign[签名提交]
    
    Sign --> Update[更新数据<br/>生成报告]
    Update --> NextCycle[下一周期]
    NextCycle --> TaskGen
    
    NewGoods[新商品入库] -.->|检测| CheckTime{时间影响}
    CheckTime -->|小| AutoAdd[自动加入]
    CheckTime -->|中| AskUser[询问用户]
    CheckTime -->|大| Delay[延迟到明天]
    AutoAdd -.-> SelectSKU
    AskUser -.->|加入| SelectSKU
    Delay -.-> NextCycle
    
    CycleCheck[周期保障检查] -.->|验证| Validate
    CycleCheck -.->|监控| TaskGen
    CycleCheck -.->|兜底| Complete
    
    style Start fill:#e1f5ff
    style Config fill:#e1bee7
    style TaskGen fill:#fff9c4
    style MobileStart fill:#b3e5fc
    style Sign fill:#c8e6c9
    style NewGoods fill:#ffccbc
    style CycleCheck fill:#ffcdd2
```

## 数据流转图

```mermaid
flowchart LR
    subgraph 配置层["配置层"]
        A1[品类配置] --> A2[配置表]
    end
    
    subgraph 任务层["任务层"]
        B1[定时任务<br/>04:00] --> B2[SKU选择算法]
        B2 --> B3[任务表]
    end
    
    subgraph 执行层["执行层"]
        C1[移动端] --> C2[盘点结果<br/>本地存储]
        C2 --> C3[实时同步]
    end
    
    subgraph 计算层["计算层"]
        D1[差异计算服务] --> D2[动态比对]
        D2 --> D3[差异表]
    end
    
    subgraph 报告层["报告层"]
        E1[盘点报告] --> E2[统计分析]
    end
    
    A2 --> B1
    B3 --> C1
    C3 --> D1
    D3 --> E1
    E2 -.->|影响下一周期| B2
    
    style A1 fill:#e1f5ff
    style B1 fill:#fff9c4
    style C1 fill:#e1bee7
    style D1 fill:#b3e5fc
    style E1 fill:#c8e6c9
```

## 关键决策点汇总

```mermaid
graph TB
    subgraph 配置决策["配置决策"]
        D1{可行性比例} -->|≤80%| D2[LOW: 正常]
        D1 -->|≤100%| D3[MEDIUM: 需注意]
        D1 -->|≤120%| D4[HIGH: 有风险]
        D1 -->|>120%| D5[CRITICAL: 禁止保存]
    end
    
    subgraph SKU选择决策["SKU选择决策"]
        S1{累计时间} -->|≤20分钟| S2[继续选择]
        S1 -->|小于等于30分钟| S3[允许超时]
        S1 -->|大于30分钟| S4[停止选择]
    end
    
    subgraph 盘点方式决策["盘点方式决策"]
        M1{商品特性} -->|价格≥500元| M2[扫码]
        M1 -->|有序列号| M2
        M1 -->|数量>50件| M3[混合策略]
        M1 -->|其他| M4[填数]
    end
    
    subgraph 新商品决策["新商品入库决策"]
        N1{时间影响} -->|≤5分钟| N2[自动加入]
        N1 -->|5-15分钟| N3[询问用户]
        N1 -->|>15分钟| N4[自动延迟]
    end
    
    subgraph 周期保障决策["周期保障决策"]
        C1{风险等级} -->|LOW| C2[正常执行]
        C1 -->|MEDIUM| C3[允许超时]
        C1 -->|HIGH| C4[调整策略]
        C1 -->|CRITICAL| C5[必须调整]
    end
    
    style D5 fill:#ffcdd2
    style S4 fill:#ffccbc
    style M2 fill:#b3e5fc
    style M3 fill:#e1bee7
    style M4 fill:#ffccbc
    style N2 fill:#c8e6c9
    style N3 fill:#fff9c4
    style N4 fill:#ffccbc
    style C5 fill:#ffcdd2
```

---

## 使用说明

1. **完整业务主流程**：展示了从配置到提交的完整流程，包括所有子流程
2. **简化版核心流程**：更简洁的视图，突出核心步骤
3. **数据流转图**：展示数据在各层之间的流转
4. **关键决策点汇总**：所有关键决策点的汇总视图

这些流程图可以直接在支持Mermaid的环境中查看和编辑。
