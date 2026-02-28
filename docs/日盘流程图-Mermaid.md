# 日盘系统流程图（Mermaid格式）

## 一、完整业务流程图

```mermaid
graph TB
    Start([开始]) --> Config[PC后台: 品类配置<br/>仅支持手机/平板]
    Config --> ConfigSave[保存配置<br/>无需可行性校验]
    ConfigSave --> PlanCreate[创建盘点计划<br/>可选]
    PlanCreate --> WaitTask[等待任务生成]
    
    WaitTask --> TaskGen[每日04:00<br/>自动生成任务]
    TaskGen --> GetSKU[获取未盘点SKU<br/>包含新入库商品]
    GetSKU --> CalcPriority[计算SKU优先级<br/>时间/价值/销量/新品/风险]
    CalcPriority --> SelectAndDecide[同步进行:<br/>选择当日SKU加决定盘点方式<br/>控制时间20到30分钟]
    SelectAndDecide --> CreateSnapshot[创建库存快照]
    CreateSnapshot --> PushTask[推送任务到移动端]
    
    PushTask --> MobileView[移动端: 查看任务]
    MobileView --> ShowInstruction[显示操作说明弹窗]
    ShowInstruction --> StartCount[开始盘点]
    
    StartCount --> CountMethod{盘点方式?}
    CountMethod -->|扫码| ScanMode[扫码盘点<br/>扫描序列号]
    CountMethod -->|填数| FillMode[填数盘点<br/>输入数量]
    
    ScanMode --> ScanResult{扫描结果?}
    ScanResult -->|正常| MoveToScanned[移到已盘点列表]
    ScanResult -->|重复| ShowDuplicate[提示重复]
    ScanResult -->|盘盈| RecordOverage[记录为盘盈]
    
    FillMode --> CalcDiff[计算数量差异]
    
    MoveToScanned --> SaveProgress[实时保存进度]
    ShowDuplicate --> SaveProgress
    RecordOverage --> SaveProgress
    CalcDiff --> SaveProgress
    
    SaveProgress --> CheckComplete{所有SKU<br/>盘点完成?}
    CheckComplete -->|否| CountMethod
    CheckComplete -->|是| FinishCount[完成盘点]
    
    FinishCount --> Reconciliation[进入差异确认<br/>库存自动更新到最新账面库存]
    Reconciliation --> CalcDiscrepancy[计算差异<br/>库存快照+动态比对]
    CalcDiscrepancy --> ShowDiffList[显示差异列表<br/>按SKU分组]
    
    ShowDiffList --> CheckDiff{所有差异<br/>已确认?}
    CheckDiff -->|否| ViewDetail[查看差异详情]
    ViewDetail --> CheckWithdraw{原先是否<br/>多盘或少盘?}
    CheckWithdraw -->|是| CanWithdraw[可以withdraw]
    CheckWithdraw -->|否| FillReason[填写差异原因<br/>上传凭证]
    CanWithdraw --> FillReason
    FillReason --> ConfirmDiff[确认差异]
    ConfirmDiff --> CheckDiff
    CheckDiff -->|是| Signature[进入签名环节]
    
    Signature --> SignArea[在签名区域签名]
    SignArea --> SaveSign[保存签名Base64]
    SaveSign --> Submit[确认提交]
    
    Submit --> UpdateStatus[更新任务状态<br/>COMPLETED]
    UpdateStatus --> UpdateSKU[更新SKU最后盘点时间]
    UpdateSKU --> UpdateSnapshot[更新库存快照]
    UpdateSnapshot --> GenReport[生成盘点报告]
    GenReport --> End([结束])
    
    style Start fill:#e1f5ff
    style End fill:#c8e6c9
    style TaskGen fill:#fff9c4
    style Reconciliation fill:#e1bee7
    style Signature fill:#b3e5fc
    style SelectAndDecide fill:#fff9c4
```

## 二、SKU选择算法流程图

```mermaid
graph TB
    Start([开始选择SKU]) --> GetAllSKU[获取所有未盘点SKU<br/>包括新入库商品]
    GetAllSKU --> FilterCategory[筛选配置的品类]
    FilterCategory --> InitList[初始化SKU列表]
    
    InitList --> LoopStart{遍历每个SKU}
    LoopStart --> CalcTime[计算时间因子<br/>距离上次盘点天数]
    CalcTime --> CalcValue[计算价值因子<br/>商品价格]
    CalcValue --> CalcSales[计算销量因子<br/>最近销量]
    CalcSales --> CalcNew[计算新品因子<br/>是否新商品]
    CalcNew --> CalcRisk[计算风险因子<br/>历史差异率]
    
    CalcRisk --> SumScore[综合计算优先级分数<br/>时间30%+价值25%+销量20%+新品15%+风险10%]
    SumScore --> AddToList[添加到优先级列表]
    AddToList --> LoopStart
    
    LoopStart -->|遍历完成| SortByPriority[按优先级分数降序排序]
    SortByPriority --> InitSelected[初始化选中列表<br/>totalTime=0]
    
    InitSelected --> SelectLoop{遍历优先级列表}
    SelectLoop --> EstimateTime[估算该SKU耗时]
    EstimateTime --> CheckTime{累计时间加该SKU耗时<br/>小于等于最大时间30分钟?}
    
    CheckTime -->|是| DecideMethod[同时决定盘点方式<br/>扫码/填数]
    CheckTime -->|否| CheckTarget{累计时间<br/><目标时间20分钟?}
    
    CheckTarget -->|是且≤110%上限| AllowOvertime[允许超时<br/>同时决定盘点方式]
    CheckTarget -->|否| StopSelect[停止选择]
    
    DecideMethod --> CheckPrice{价格≥500元<br/>或有序列号?}
    CheckPrice -->|是| SetScan[设置为扫码<br/>估算时间]
    CheckPrice -->|否| SetFill[设置为填数<br/>估算时间]
    
    AllowOvertime --> CheckPrice
    
    SetScan --> UpdateTime[更新累计时间]
    SetFill --> UpdateTime
    UpdateTime --> SelectLoop
    StopSelect --> DecideMethod[决定每个SKU的盘点方式]
    
    DecideMethod --> MethodLoop{遍历选中SKU}
    MethodLoop --> CheckPrice{价格≥500元?}
    CheckPrice -->|是| SetScan[设置为扫码]
    CheckPrice -->|否| CheckSerial{有序列号?}
    
    CheckSerial -->|是| SetScan
    CheckSerial -->|否| CheckQuantity{库存数量>50件?}
    CheckQuantity -->|是| SetHybrid[设置为混合策略]
    CheckQuantity -->|否| SetFill[设置为填数]
    
    SetScan --> MethodLoop
    SetHybrid --> MethodLoop
    SetFill --> MethodLoop
    
    MethodLoop -->|遍历完成| CreateTask[创建日盘任务]
    CreateTask --> End([返回选中SKU列表])
    
    style Start fill:#e1f5ff
    style End fill:#c8e6c9
    style AllowOvertime fill:#fff9c4
    style SetScan fill:#b3e5fc
    style SetHybrid fill:#e1bee7
    style SetFill fill:#ffccbc
```

## 三、差异计算流程图

```mermaid
graph TB
    Start([开始计算差异]) --> GetSnapshot[获取库存快照<br/>任务创建时的库存状态]
    GetSnapshot --> GetChanges[获取盘点期间的<br/>库存变化记录]
    
    GetChanges --> ChangeTypes{变化类型}
    ChangeTypes -->|销售| SalesChange[销售记录<br/>库存减少]
    ChangeTypes -->|入库| InboundChange[入库记录<br/>库存增加]
    ChangeTypes -->|出库| OutboundChange[出库记录<br/>库存减少]
    ChangeTypes -->|调拨| TransferChange[调拨记录<br/>库存变化]
    ChangeTypes -->|返仓| ReturnChange[返仓记录<br/>库存减少]
    
    SalesChange --> CalcTheoretical[计算理论库存<br/>快照+变化记录]
    InboundChange --> CalcTheoretical
    OutboundChange --> CalcTheoretical
    TransferChange --> CalcTheoretical
    ReturnChange --> CalcTheoretical
    
    CalcTheoretical --> CompareActual[比对实际盘点结果]
    
    CompareActual --> CheckShortage[检查短缺<br/>任务中有但实际未找到]
    CheckShortage --> ShortageLoop{遍历任务中的商品}
    ShortageLoop --> MarkShortage[标记为短缺<br/>需要填写原因]
    MarkShortage --> ShortageLoop
    ShortageLoop -->|遍历完成| CheckOverage
    
    CheckOverage[检查盘盈<br/>实际找到但任务中没有]
    CheckOverage --> OverageLoop{遍历实际扫描的商品}
    OverageLoop --> InTask{在任务列表中?}
    InTask -->|是| Normal[正常商品]
    InTask -->|否| MarkOverage[标记为盘盈<br/>需要填写原因]
    
    Normal --> OverageLoop
    MarkOverage --> OverageLoop
    OverageLoop -->|遍历完成| CheckQuantity
    
    Note1[注意: withdraw不在差异计算时自动标记<br/>而是在查看详情后，判断原先是否多盘或少盘]
    
    CheckQuantity[检查数量差异<br/>填数盘点不一致]
    CheckQuantity --> QuantityLoop{遍历填数盘点的SKU}
    QuantityLoop --> CompareQty{实际数量<br/>vs 任务数量}
    CompareQty -->|不一致| MarkQtyDiff[标记数量差异<br/>需要填写原因]
    CompareQty -->|一致| NormalQty[正常]
    
    MarkQtyDiff --> QuantityLoop
    NormalQty --> QuantityLoop
    QuantityLoop -->|遍历完成| GenDiffList
    
    GenDiffList[生成差异列表<br/>按SKU分组]
    GenDiffList --> End([返回差异列表])
    
    style Start fill:#e1f5ff
    style End fill:#c8e6c9
    style MarkWithdraw fill:#fff9c4
    style MarkWithdraw2 fill:#fff9c4
    style MarkShortage fill:#ffcdd2
    style MarkOverage fill:#ffcdd2
    style MarkQtyDiff fill:#ffcdd2
```

## 四、新商品入库处理流程图

```mermaid
graph TB
    Start([检测到新商品入库]) --> CheckCategory{是否在配置的<br/>品类范围内?}
    CheckCategory -->|否| Ignore[忽略]
    CheckCategory -->|是| CalcTimeCost[计算时间成本<br/>估算加入当前任务的时间]
    
    CalcTimeCost --> AssessImpact[评估对周期的影响<br/>计算可行性比例]
    AssessImpact --> CheckImpact{时间影响?}
    
    CheckImpact -->|≤5分钟| AutoAdd[自动加入当前任务]
    AutoAdd --> ToastNotify[Toast提示<br/>检测到新商品，已自动加入]
    ToastNotify --> RecalcPriority[重新计算优先级]
    RecalcPriority --> AdjustList[动态调整当日SKU列表]
    AdjustList --> UpdateTime[更新预估时间]
    UpdateTime --> End1([处理完成])
    
    CheckImpact -->|5-15分钟| ShowModal[弹窗询问用户]
    ShowModal --> UserChoice{用户选择?}
    UserChoice -->|加入今日任务| AddToday[加入当前任务]
    UserChoice -->|延迟到明天| DelayTomorrow[延迟到明天]
    
    AddToday --> RecalcPriority
    DelayTomorrow --> ScheduleNext[安排到明日任务]
    ScheduleNext --> BannerNotify[Banner提示<br/>新商品已安排到明日]
    BannerNotify --> End2([处理完成])
    
    CheckImpact -->|>15分钟| AutoDelay[自动延迟到明天]
    AutoDelay --> BannerNotify2[Banner提示<br/>新商品数量较大，已安排到明日]
    BannerNotify2 --> ScheduleNext
    
    Ignore --> End3([处理完成])
    
    style Start fill:#e1f5ff
    style End1 fill:#c8e6c9
    style End2 fill:#c8e6c9
    style End3 fill:#c8e6c9
    style AutoAdd fill:#fff9c4
    style ShowModal fill:#e1bee7
    style AutoDelay fill:#ffccbc
```

## 五、周期覆盖保障流程图

```mermaid
graph TB
    Start([周期开始]) --> Layer1[第一层: 周期开始前验证]
    
    Layer1 --> GetAllSKU[获取周期开始时的<br/>所有SKU]
    GetAllSKU --> CalcTotalTime[计算每个SKU的<br/>预估耗时]
    CalcTotalTime --> CalcCapacity[计算周期总容量<br/>最大时间×周期天数]
    CalcCapacity --> CalcRatio[计算可行性比例<br/>总时间需求/总容量]
    
    CalcRatio --> CheckFeasible{可行性比例?}
    CheckFeasible -->|≤100%| Normal[正常分配]
    CheckFeasible -->|≤120%| AllowOvertime[允许最后几天超时]
    CheckFeasible -->|>120%| Adjust[调整周期或采用混合策略]
    
    Normal --> Layer2
    AllowOvertime --> Layer2
    Adjust --> Suggest[生成调整建议]
    Suggest --> Layer2
    
    Layer2[第二层: 周期进行中监控]
    Layer2 --> DailyMonitor[每天监控进度]
    DailyMonitor --> CalcUsed[计算已用时间]
    CalcUsed --> CalcRemaining[计算剩余SKU]
    CalcRemaining --> CalcNeeded[计算剩余时间需求]
    CalcNeeded --> CalcAvailable[计算剩余容量]
    CalcAvailable --> AssessRisk[评估风险等级]
    
    AssessRisk --> RiskLevel{风险等级?}
    RiskLevel -->|LOW ≤80%| NormalProgress[进度正常]
    RiskLevel -->|MEDIUM ≤100%| TightProgress[进度紧张]
    RiskLevel -->|HIGH ≤120%| LagProgress[进度严重滞后]
    RiskLevel -->|CRITICAL >120%| CannotComplete[无法完成]
    
    NormalProgress --> Continue[继续正常执行]
    TightProgress --> Action1[允许最后几天超时]
    LagProgress --> Action2[优先高价值SKU<br/>低价值改为填数]
    CannotComplete --> Action3[延迟低优先级SKU<br/>延长周期]
    
    Continue --> CheckDays{剩余天数?}
    Action1 --> CheckDays
    Action2 --> CheckDays
    Action3 --> CheckDays
    
    CheckDays -->|>2天| DailyMonitor
    CheckDays -->|≤2天| Layer3
    
    Layer3[第三层: 最后几天兜底]
    Layer3 --> ForceAllocate[强制分配剩余SKU]
    ForceAllocate --> SortByPriority[按优先级排序]
    SortByPriority --> CheckCanComplete{是否可全部完成?<br/>时间需求≤130%容量}
    
    CheckCanComplete -->|是| AllocateAll[平均分配<br/>允许超时30%]
    CheckCanComplete -->|否| AllocateHigh[只保证高优先级SKU]
    
    AllocateAll --> CompleteAll[确保所有SKU完成]
    AllocateHigh --> DeferLow[低优先级延迟到下周期]
    
    CompleteAll --> End1([周期完成])
    DeferLow --> End2([周期完成<br/>部分SKU延迟])
    
    style Start fill:#e1f5ff
    style End1 fill:#c8e6c9
    style End2 fill:#fff9c4
    style Layer1 fill:#e1bee7
    style Layer2 fill:#b3e5fc
    style Layer3 fill:#ffccbc
    style CannotComplete fill:#ffcdd2
```

## 六、品类配置流程图

```mermaid
graph TB
    Start([进入品类配置页面]) --> SelectCategory[选择日盘品类]
    SelectCategory --> ShowCategories[显示可选品类列表<br/>仅高净值商品]
    
    ShowCategories --> UserSelect{用户选择品类}
    UserSelect --> ConfigParams[配置周期参数]
    ConfigParams --> SetCycleDays[设置周期天数<br/>默认7天]
    SetCycleDays --> SetTargetTime[设置每天目标时间<br/>默认20分钟]
    SetTargetTime --> SetMaxTime[设置每天最大时间<br/>默认30分钟]
    
    SetMaxTime --> RealTimeValidate[实时校验]
    RealTimeValidate --> CalcSkuCount[计算预估SKU数量]
    CalcSkuCount --> CalcTotalTime[计算预估总时间]
    CalcTotalTime --> CalcAvailable[计算周期可用时间<br/>最大时间×周期天数]
    CalcAvailable --> CalcRatio[计算可行性比例<br/>总时间/可用时间]
    
    CalcRatio --> CheckRisk{判断风险等级}
    CheckRisk -->|≤80%| LowRisk[LOW风险<br/>配置正常]
    CheckRisk -->|≤100%| MediumRisk[MEDIUM风险<br/>配置需注意]
    CheckRisk -->|≤120%| HighRisk[HIGH风险<br/>配置有风险]
    CheckRisk -->|>120%| CriticalRisk[CRITICAL风险<br/>配置不可行]
    
    LowRisk --> CanSave1[可以保存]
    MediumRisk --> ShowWarning1[显示警告提示]
    ShowWarning1 --> CanSave2[可以保存]
    HighRisk --> ShowWarning2[显示风险提示]
    ShowWarning2 --> CanSave3[可以保存<br/>最后几天需超时]
    CriticalRisk --> ShowError[显示错误提示<br/>禁止保存]
    ShowError --> Suggest[生成优化建议]
    Suggest --> UserAdjust[用户调整配置]
    UserAdjust --> RealTimeValidate
    
    CanSave1 --> UserSave{用户点击保存?}
    CanSave2 --> UserSave
    CanSave3 --> UserSave
    
    UserSave -->|是| ConfirmSave[确认保存]
    UserSave -->|否| Wait[等待用户操作]
    Wait --> UserSave
    
    ConfirmSave --> SaveConfig[保存配置到数据库]
    SaveConfig --> UpdateEffect[配置生效<br/>影响后续任务生成]
    UpdateEffect --> End([配置完成])
    
    style Start fill:#e1f5ff
    style End fill:#c8e6c9
    style CriticalRisk fill:#ffcdd2
    style ShowError fill:#ffcdd2
    style LowRisk fill:#c8e6c9
    style MediumRisk fill:#fff9c4
    style HighRisk fill:#ffccbc
```

## 七、完整系统交互流程图

```mermaid
sequenceDiagram
    participant PC as PC后台
    participant DB as 数据库
    participant Scheduler as 定时任务
    participant Algorithm as SKU选择算法
    participant Mobile as 移动端
    participant Service as 后端服务
    
    PC->>DB: 保存品类配置
    PC->>DB: 创建盘点计划
    
    Note over Scheduler: 每日04:00
    Scheduler->>DB: 读取品类配置
    Scheduler->>DB: 获取未盘点SKU
    Scheduler->>Algorithm: 计算SKU优先级
    Algorithm->>Algorithm: 选择当日SKU
    Algorithm->>Algorithm: 决定盘点方式
    Algorithm->>DB: 创建库存快照
    Algorithm->>DB: 生成日盘任务
    Scheduler->>Mobile: 推送任务通知
    
    Mobile->>DB: 查询任务列表
    Mobile->>Mobile: 开始盘点
    loop 盘点过程
        Mobile->>Mobile: 扫码/填数
        Mobile->>DB: 实时保存进度
    end
    Mobile->>Mobile: 完成盘点
    
    Mobile->>Service: 请求同步库存变化
    Service->>DB: 查询销售/退货/调拨记录
    Service->>Service: 动态比对差异
    Service->>Service: 标记withdraw
    Service->>Mobile: 返回差异列表
    
    Mobile->>Mobile: 填写差异原因
    Mobile->>Mobile: 签名确认
    Mobile->>DB: 提交盘点结果
    
    DB->>DB: 更新SKU最后盘点时间
    DB->>DB: 更新库存快照
    DB->>DB: 生成盘点报告
```

---

## 使用说明

以上流程图使用Mermaid格式编写，可以在以下环境中查看：

1. **GitHub/GitLab**: 直接支持Mermaid渲染
2. **VS Code**: 安装Mermaid Preview插件
3. **在线工具**: https://mermaid.live/
4. **Markdown编辑器**: Typora、Obsidian等

每个流程图都涵盖了日盘系统的关键环节，可以根据需要单独使用或组合使用。
