import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, TableCell, TableRow, Table, WidthType, ShadingType } from "docx";
import fs from "fs";
import path from "path";

const outputDir = path.resolve("docs/阶段性工作小结");
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

function heading(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    children: [new TextRun({ text, bold: true, size: 32, font: "微软雅黑" })],
  });
}

function subheading(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 120 },
    children: [new TextRun({ text, bold: true, size: 28, font: "微软雅黑" })],
  });
}

function subheading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, size: 24, font: "微软雅黑" })],
  });
}

function p(text) {
  return new Paragraph({
    spacing: { after: 120, line: 360 },
    children: [new TextRun({ text, size: 22, font: "微软雅黑" })],
  });
}

function boldP(label, text) {
  return new Paragraph({
    spacing: { after: 120, line: 360 },
    children: [
      new TextRun({ text: label, bold: true, size: 22, font: "微软雅黑" }),
      new TextRun({ text, size: 22, font: "微软雅黑" }),
    ],
  });
}

function bulletItem(text, level = 0) {
  return new Paragraph({
    spacing: { after: 60, line: 340 },
    indent: { left: 480 * (level + 1), hanging: 240 },
    children: [new TextRun({ text: "• " + text, size: 22, font: "微软雅黑" })],
  });
}

function makeDoc(title, sections) {
  return new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [new TextRun({ text: title, bold: true, size: 36, font: "微软雅黑" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
          children: [new TextRun({ text: "LightBalance 项目 — Trend & Profile 模块", size: 22, font: "微软雅黑", color: "666666" })],
        }),
        ...sections,
      ],
    }],
  });
}

// ==================== 第一阶段：数据层 ====================
const doc1 = makeDoc("第1阶段个人工作小结", [
  heading("一、本阶段工作内容"),

  p("本阶段是 LightBalance 项目 Trend（趋势分析）和 Profile（个人档案）两个模块的基础建设阶段，主要完成了数据库表结构设计、后端数据服务开发、TypeScript 类型定义以及前后端 IPC 通信链路的搭建。"),

  subheading("1.1 数据库表结构设计"),

  subheading3("trend_daily_snapshot 表"),
  p("为 Trend 模块设计了 trend_daily_snapshot 日度快照表，用于存储用户每天的身体指标和行为数据。表结构包含以下核心字段：snapshot_id（主键）、user_id（关联用户）、snapshot_date（快照日期）、weight_kg（体重）、body_fat_rate（体脂率）、waist_cm（腰围）、sleep_hours（睡眠时长）、steps（步数）、calorie_intake（摄入热量）、calorie_burned（消耗热量）、training_minutes（训练时长）。同时设置了 (user_id, snapshot_date) 的唯一约束和联合索引，确保每个用户每天只有一条快照记录，并优化查询性能。"),

  subheading3("user_profile 表迁移"),
  p("Profile 模块依赖 user_profile 表存储用户个人信息。通过 ensureBodySchema 函数实现了表结构的自动迁移，确保 body_fat_rate、target_body_fat_rate、sleep_target_hours、work_style、stress_level 等字段在数据库中正确存在。对于已部署的旧数据库，采用 ALTER TABLE ADD COLUMN IF NOT EXISTS 的方式逐字段补齐，避免了破坏性迁移。"),

  subheading("1.2 后端数据服务开发"),

  subheading3("trend.cjs 核心函数"),
  p("开发了 trend.cjs（416 行）作为 Trend 模块的后端核心，实现了以下关键函数："),
  bulletItem("ensureTrendSchema：自动创建 trend_daily_snapshot 表"),
  bulletItem("ensureTrendSnapshots：基于用户档案生成 21 天窗口的模拟/真实快照数据"),
  bulletItem("getDietAggregates / getExerciseAggregates：跨表关联查询饮食和运动汇总"),
  bulletItem("buildDraftForDate：利用正弦/余弦波函数生成自然波动的模拟数据"),
  bulletItem("upsertSnapshot：基于 ON DUPLICATE KEY 语义的 upsert 操作"),
  bulletItem("getTrendSummary：主入口函数，返回完整的 TrendSummary 对象"),

  subheading3("body.cjs 用户档案服务"),
  p("开发了 body.cjs 作为 Profile 模块的后端服务，实现了用户档案的 CRUD 操作。getBodyProfile 函数从数据库读取用户信息并计算 BMI、BMR 等衍生指标。updateUserProfile 函数处理档案更新，确保所有字段正确持久化。"),

  subheading3("shared.cjs 公共工具"),
  p("实现了共享工具模块，包含 formatDateKey（日期格式化）、round（精度控制）、clamp（数值范围限制）、calculateBmr（基础代谢率计算）、getNextTableId（自增 ID 生成）等核心工具函数，被 trend.cjs 和 body.cjs 共同依赖。"),

  subheading("1.3 TypeScript 类型定义"),
  p("在 src/services/types.ts 中定义了完整的类型体系："),
  bulletItem("TrendSummary：包含 19 个字段和 7 个子结构的复杂类型"),
  bulletItem("TrendSeriesPoint：10 个字段的时间序列数据点"),
  bulletItem("TrendMetricCard / TrendBreakdownItem / TrendInsight / TrendRecordRow：展示层数据类型"),
  bulletItem("UserProfileRecord：24 个字段的用户档案类型，继承自 SessionUser"),
  bulletItem("LightBalanceBridge：IPC 通信桥接接口，定义所有前后端通信方法"),

  subheading("1.4 IPC 通信链路搭建"),
  p("建立了 Electron 环境下的 IPC 通信链路：preload.cjs 通过 contextBridge 暴露 lightBalanceBridge 对象 → main.cjs 监听 ipcMain.handle 事件并调用对应 db 模块 → 返回 Promise 结果给渲染进程。同时实现了 HTTP 回退机制，在非 Electron 环境下通过 fetch API 调用相同接口。"),

  heading("二、遇到的问题以及解决思路"),

  subheading("问题 1：跨模块数据关联"),
  p("Trend 模块的热量差（calorieGap）计算需要同时获取饮食摄入、运动消耗和基础代谢率三个数据源，分别来自 diet_meal_entry、exercise_session_log 和 user_profile 三张表。如果某张表不存在（如用户尚未记录饮食），直接 JOIN 会导致查询失败。"),
  p("解决思路：采用先查 information_schema 确认表是否存在，再分表聚合的方式。getDietAggregates 和 getExerciseAggregates 各自独立查询，返回 Map<dateString, value> 结构，最后在 buildDraftForDate 中合并。这样即使某张表不存在，也能优雅降级使用模拟数据。"),

  subheading("问题 2：日期格式不一致"),
  p("数据库中的 snapshot_date 字段在不同场景下可能返回 Date 对象或字符串，导致日期比较和格式化出现不一致。MySQL 的 DATE 类型在某些驱动配置下返回的是带时区的 Date 对象，而在 JSON 序列化后又变成 ISO 字符串。"),
  p("解决思路：实现 normalizeSnapshotDate 函数，统一处理 Date 对象和字符串两种情况。优先匹配 YYYY-MM-DD 格式的 ISO 前缀，对于其他格式则通过 new Date() 解析后再用 formatDateKey 格式化，确保所有日期最终统一为 YYYY-MM-DD 字符串。"),

  subheading("问题 3：自增 ID 生成策略"),
  p("MySQL 的 AUTO_INCREMENT 在多表场景下可能导致 ID 冲突，且不利于后续数据迁移。"),
  p("解决思路：实现 getNextTableId 工具函数，以表的起始 ID（如 110000）为基准，查询当前最大 ID 后加 1。每个表使用不同的起始值，避免了跨表 ID 冲突，也便于数据维护时按 ID 范围判断来源表。"),

  heading("三、下一阶段计划"),
  p("完成数据层建设后，下一阶段将进入组件层开发："),
  bulletItem("开发 Trend.vue 组件，实现 28 个计算属性的数据转换逻辑"),
  bulletItem("开发 ProfilePanel.vue 组件，实现双模式（profile/settings）表单"),
  bulletItem("实现 MainWindow.vue 的模块导航和数据加载机制"),
  bulletItem("建立组件间的数据流动和状态同步机制"),
]);

// ==================== 第二阶段：组件层 ====================
const doc2 = makeDoc("第2阶段个人工作小结", [
  heading("一、本阶段工作内容"),

  p("本阶段在数据层基础上，完成了 Trend 和 Profile 两个模块的 Vue 3 组件开发。重点包括 Trend.vue 的复杂数据转换逻辑、ProfilePanel.vue 的双模式表单设计，以及 MainWindow.vue 中的模块集成。"),

  subheading("1.1 Trend.vue 组件开发"),

  subheading3("计算属性体系"),
  p("Trend.vue 是项目中最复杂的组件之一，共实现了 28 个计算属性来完成后端数据到展示数据的转换。这些计算属性分为以下几个层次："),
  bulletItem("基础数据提取：从 trendSummary 中提取 weightTrend、series、metricCards 等原始数据"),
  bulletItem("派生计算：sleepScore、stepScore、calorieScore 等评分指标"),
  bulletItem("图表数据转换：将原始数据转换为 SVG 折线图所需的坐标点"),
  bulletItem("条件判断：根据数据状态决定 UI 展示的颜色和文案"),

  subheading3("模板结构设计"),
  p("Trend.vue 的模板分为四大区域：Overview Bar（概览栏，展示最新体重、体脂、腰围三个核心指标）、Chart Grid（图表网格，包含体重趋势折线图和恢复节律脉冲环）、Bottom Grid（底部网格，包含恢复达标、行为分析、智能洞察三个卡片）、Records Table（记录表格，展示 21 天的详细数据）。"),

  subheading3("自定义 SVG 折线图"),
  p("未引入第三方图表库，而是基于 SVG 原生实现折线图。通过 computed 属性将 21 个数据点映射为 SVG 坐标，使用 polyline 元素绘制折线，circle 元素绘制交互点，text 元素标注数值。图表支持三种交互状态：默认展示全部数据、hover 时高亮单个数据点并显示 tooltip、点击锁定当前 tooltip。"),

  subheading("1.2 ProfilePanel.vue 组件开发"),

  subheading3("双模式设计"),
  p("ProfilePanel.vue 支持两种使用模式：profile 模式（在主界面中展示个人档案的只读/编辑视图）和 settings 模式（作为独立设置页面）。通过 mode prop 区分两种模式，控制不同区域的显隐和交互行为。"),

  subheading3("表单数据绑定"),
  p("使用 reactive() 创建表单对象，包含 nickname、age、gender、heightCm、currentWeightKg 等所有用户可编辑字段。通过 watch 监听 profile 数据变化，当后端数据更新时自动同步到表单，避免手动管理数据流。"),

  subheading3("区域划分"),
  p("表单按功能分为六个 section-card：基本信息（昵称、年龄、性别、身高）、目标设定（目标体重、目标体脂、每周训练目标）、生活方式（工作方式、压力水平、吸烟状态、饮酒频率）、习惯记录（睡眠习惯、饮食习惯、运动习惯）、账号信息（只读展示用户名、邮箱）、账号操作（修改邮箱、修改密码、退出登录）。"),

  subheading("1.3 MainWindow.vue 模块集成"),
  p("在 MainWindow.vue 中实现了模块导航系统，通过 Tab 切换控制 Overview、Body、Diet、Exercise、Trend、Assistant 六个模块的显示。每个模块对应一个独立的 Vue 组件，通过 activeTab 状态控制加载时机。实现了 LoadingState 机制，在数据加载完成前显示骨架屏，提升用户体验。"),

  heading("二、遇到的问题以及解决思路"),

  subheading("问题 1：计算属性数据重复"),
  p("Trend.vue 的 28 个计算属性中，部分属性存在数据重复计算的问题。例如体重趋势数据在 weightTrend、series、metricCards 三个地方都有涉及，导致每次数据更新时触发大量不必要的重计算。"),
  p("解决思路：梳理计算属性的依赖链，将中间结果提取为独立的 computed 属性。例如将最新的体重、体脂、腰围提取为 latestWeight 等基础属性，其他属性依赖这些基础属性而非直接从原始数据中提取，减少重复计算。"),

  subheading("问题 2：选中日期的状态同步"),
  p("Trend.vue 中图表的 tooltip 和底部记录表格需要联动显示同一天的数据。但图表交互（hover/click）和表格选中是两个独立的事件源，容易出现状态不一致。"),
  p("解决思路：使用 ref 维护统一的 selectedDate 状态，图表的 tooltip 显示逻辑和表格的高亮逻辑都依赖这个共享状态。图表 hover 时实时更新 selectedDate，点击时锁定；表格行的点击事件也更新同一个 selectedDate，实现双向联动。"),

  subheading("问题 3：表单响应式数据丢失"),
  p("ProfilePanel.vue 使用 reactive() 创建表单对象，但当通过 watch 同步后端数据时，部分嵌套属性的响应式代理丢失，导致视图不更新。"),
  p("解决思路：避免直接替换 reactive 对象的引用，而是逐字段赋值。watch 回调中遍历 profile 对象的 key，逐一将值赋给 form 对象的对应属性，保持 reactive 代理的完整性。"),

  heading("三、下一阶段计划"),
  p("完成组件层开发后，下一阶段将聚焦 UI 优化："),
  bulletItem("为 Trend.vue 添加渐变背景、毛玻璃效果等视觉装饰"),
  bulletItem("优化 SVG 折线图的样式（渐变填充、平滑曲线、动画效果）"),
  bulletItem("为 ProfilePanel.vue 的 section-card 添加彩色左边线和 emoji 图标"),
  bulletItem("实现加载状态的骨架屏和 shimmer 动画"),
  bulletItem("完善响应式布局，适配移动端（≤1180px、≤780px）"),
]);

// ==================== 第三阶段：UI优化 ====================
const doc3 = makeDoc("第3阶段个人工作小结", [
  heading("一、本阶段工作内容"),

  p("本阶段在组件层基础上，对 Trend 和 Profile 两个模块进行了全面的 UI 美化和视觉效果提升，涵盖渐变背景、毛玻璃效果、自定义图表样式、彩色分区设计、加载动画和响应式适配。"),

  subheading("1.1 Trend.vue 视觉优化"),

  subheading3("渐变背景与毛玻璃效果"),
  p("为 Trend 模块的四个主要区域（Overview Bar、Chart Grid、Bottom Grid、Records Table）分别设计了 radial-gradient 渐变背景，营造层次分明的视觉空间感。所有卡片使用 backdrop-filter: blur() 实现毛玻璃效果，配合半透明背景色和精细的 border 设计，打造现代感的 UI 风格。"),

  subheading3("SVG 折线图样式优化"),
  p("对自定义 SVG 折线图进行了多维度的样式提升：为折线添加渐变色（stroke 使用线性渐变而非纯色）；在折线下方添加半透明填充区域（使用 defs/linearGradient 定义渐变，polygon 绘制填充）；为交互点添加 hover 放大动画和阴影效果；tooltip 使用圆角卡片设计并带有小箭头指示。"),

  subheading3("脉冲环（conic-gradient）"),
  p("恢复节律卡片中实现了 conic-gradient 脉冲环可视化组件。通过 CSS conic-gradient 属性绘制扇形进度环，根据睡眠达标率动态计算角度。环中心展示达标百分比数值，外围标注各项指标的达标天数。添加了 CSS 动画使环形在数据更新时有平滑的过渡效果。"),

  subheading3("底部卡片视觉区分"),
  p("为恢复达标、行为分析、智能洞察三张底部卡片分别设计了不同的配色方案：恢复卡片使用蓝紫色系（呼应睡眠主题）、行为卡片使用绿色系（呼应热量主题）、洞察卡片使用暖色系（呼应提醒主题）。每个卡片内部使用 CSS 变量 --pill-accent 控制强调色，保持主题一致性。"),

  subheading("1.2 ProfilePanel.vue 视觉优化"),

  subheading3("Section-Card 彩色左边线"),
  p("为每个 section-card 添加了 ::before 伪元素实现的彩色左边线装饰。不同功能区使用不同颜色：基本信息=绿色（#3d6b4a）、目标设定=橙色（#c67a2e）、生活方式=蓝色（#3a7bd5）、习惯记录=紫色（#7c4dff）、账号相关=红色系。左边线使用渐变色增强视觉效果。"),

  subheading3("Emoji 图标装饰"),
  p("为所有 section-card 标题添加了 emoji 图标前缀：基本信息 👤、目标设定 🎯、生活方式 🏠、习惯记录 📝、账号信息 🔑、修改邮箱 ✉️、修改密码 🔒、账号操作 🚪。同时为账号信息的只读行添加了 emoji 前缀（🆔 用户名、👤 昵称、💬 昵称、✉️ 邮箱），增强信息辨识度。"),

  subheading3("头像区域渐变"),
  p("为 identity-card__avatar 设计了三段式渐变背景（#1a2e22 → #3d6b4a → #5a9a6a），配合多层 box-shadow（外发光 + 内高光），营造出立体感和品质感。"),

  subheading3("表单控件美化"),
  p("为输入框添加了聚焦状态的 border 颜色变化和 box-shadow 发光效果，使用 transition 确保动画流畅。为 select 元素使用 appearance: none 移除原生样式，替换为自定义 SVG 下拉箭头。为只读输入框添加了左侧色条装饰（border-left: 3px solid），明确区分可编辑和只读字段。"),

  subheading("1.3 加载状态与响应式"),

  subheading3("Shimmer 加载动画"),
  p("为数据加载过程设计了 shimmer 骨架屏动画。使用 CSS linear-gradient 实现从左到右的光泽扫过效果，配合 @keyframes 动画循环播放。骨架屏的布局与实际内容保持一致，减少加载完成后的布局跳动。"),

  subheading3("响应式适配"),
  p("定义了两个关键断点：1180px（中等屏幕，调整卡片间距和字体大小）和 780px（移动设备，切换为单列布局）。在移动端隐藏了部分装饰性元素（如 Overview Bar 的分隔线），简化了图表的交互提示文案，确保触屏操作的可用性。"),

  heading("二、遇到的问题以及解决思路"),

  subheading("问题 1：跨平台 select 样式不一致"),
  p("原生 select 元素在不同操作系统下的渲染差异很大，Windows 下的下拉箭头与 macOS 下完全不同，且无法通过常规 CSS 修改样式。"),
  p("解决思路：使用 appearance: none 彻底移除原生样式，然后通过 background-image 嵌入自定义 SVG 箭头（使用 data URI 编码），配合 padding-right 预留箭头空间。这样在所有平台上都能获得一致的视觉效果。"),

  subheading("问题 2：加载闪烁"),
  p("组件挂载时，由于数据异步加载，用户会先看到骨架屏，然后突然切换到实际内容，产生明显的视觉闪烁。"),
  p("解决思路：为实际内容添加进入动画（opacity 从 0 到 1，配合 translateY 从 8px 到 0），使用 transition 平滑过渡。同时骨架屏使用 fade-out 动画退出，两个动画时长和缓动函数保持一致，营造自然的过渡效果。"),

  subheading("问题 3：移动端 SVG 图表缩放"),
  p("SVG 折线图在移动端由于 viewBox 和容器宽度不匹配，导致图表被裁剪或变形。tooltip 在小屏幕上也容易溢出边界。"),
  p("解决思路：为 SVG 设置 preserveAspectRatio=\"xMidYMid meet\" 确保等比缩放。将 viewBox 宽度与实际数据范围绑定，而非固定值。对于 tooltip，改为在数据点上方固定位置显示，而非跟随鼠标，并在接近边界时自动调整水平位置。"),

  heading("三、下一阶段计划"),
  p("完成 UI 优化后，下一阶段将进行交互完善和跨模块集成："),
  bulletItem("修复进度条 100% 溢出 bug"),
  bulletItem("完善图表的三态交互（默认/hover/锁定）"),
  bulletItem("实现跨组件的日期同步机制"),
  bulletItem("添加表单验证和保存状态管理"),
  bulletItem("修复 Tab/Space 缩进不一致导致的渲染问题"),
  bulletItem("进行最终的跨模块集成测试和 bug 修复"),
]);

// ==================== 第四阶段：交互与完善 ====================
const doc4 = makeDoc("第4阶段个人工作小结", [
  heading("一、本阶段工作内容"),

  p("本阶段是 Trend 和 Profile 模块的最终完善阶段，重点解决交互 bug、优化用户体验细节、实现跨模块数据同步，并进行最终的集成测试和质量把控。"),

  subheading("1.1 图表交互完善"),

  subheading3("三态交互机制"),
  p("为 SVG 折线图实现了完整的三态交互：默认状态下展示全部数据点和折线；hover 状态下高亮当前数据点（放大 + 发光效果），显示详细数值的 tooltip；点击状态锁定当前 tooltip，即使鼠标移开也保持显示，再次点击其他数据点则切换锁定位置，点击空白区域解锁。通过 selectedDate 和 lockedDate 两个 ref 状态协同控制。"),

  subheading3("Tooltip 防溢出"),
  p("实现了 tooltip 的智能定位逻辑：默认显示在数据点正上方，当检测到 tooltip 可能超出图表边界时，自动切换到数据点下方显示。同时为 tooltip 添加了小箭头指示器（CSS border 实现的三角形），箭头方向随 tooltip 位置自动翻转。"),

  subheading("1.2 跨组件数据同步"),

  subheading3("日期选择联动"),
  p("实现了 Overview Bar、Chart Grid 和 Records Table 三个区域之间的日期选择联动。当用户在折线图中选择某一天时，底部记录表格自动滚动到对应行并高亮显示；反之点击表格行也会更新图表的 tooltip 位置。通过在 MainWindow.vue 中维护全局 selectedDate 状态，各子组件通过 props/emit 与父组件同步。"),

  subheading3("Profile 数据同步"),
  p("当用户在 ProfilePanel.vue 中修改个人信息并保存后，Trend 模块的相关数据（如目标体重、每日热量目标）需要实时更新。实现了通过 MainWindow.vue 的全局状态管理，在 profile 更新成功后触发 trendSummary 的重新获取，确保两个模块的数据一致性。"),

  subheading("1.3 Bug 修复"),

  subheading3("进度条 100% 溢出修复"),
  p("修复了 Overview 模块中完成率进度条在 100% 时宽度溢出容器的 bug。原因是进度条宽度使用 style=\"width: {percent}%\" 内联样式，当 percent 为 100 时，由于四舍五入和子像素渲染，实际宽度可能超过容器。修复方式是添加 Math.min(percent, 100) 的上限约束，并为进度条容器添加 overflow: hidden 作为兜底。"),

  subheading3("Tab/Space 缩进不一致"),
  p("修复了 Trend.vue 中部分区域混用 Tab 和 Space 缩进导致的模板渲染异常。Vue 模板编译器对空白节点的处理在缩进不一致时可能产生意外的文本节点，影响条件渲染的逻辑。统一将所有缩进转换为 2 空格，与项目 ESLint 配置保持一致。"),

  subheading3("数据类型强制转换"),
  p("修复了从后端获取的数据在前端计算时出现的类型问题。MySQL 返回的 DECIMAL 类型在经过 JSON 序列化后变为字符串，直接参与数学运算会导致字符串拼接而非数值相加。在所有计算属性的入口处添加 Number() 强制转换，确保数值类型正确。"),

  subheading("1.4 表单交互优化"),

  subheading3("表单验证"),
  p("为 ProfilePanel.vue 的表单添加了客户端验证：年龄范围 1-120、身高范围 50-250cm、体重范围 20-300kg、体脂率范围 5-60%。验证不通过时在对应字段下方显示红色错误提示，并阻止保存操作。"),

  subheading3("保存状态管理"),
  p("实现了保存按钮的完整状态机：默认状态（可点击）→ 保存中（禁用 + loading 动画）→ 保存成功（绿色对勾，1.5 秒后恢复默认）或保存失败（红色错误提示 + 重试按钮）。通过 saving 状态 ref 控制整个流程，确保用户在保存完成前无法重复提交。"),

  subheading3("退出登录确认"),
  p("为退出登录操作添加了二次确认对话框，避免用户误触。对话框使用自定义模态框而非原生 confirm()，保持 UI 风格统一。确认后清除本地存储的用户数据并跳转到登录页面。"),

  subheading("1.5 集成测试与质量把控"),
  p("完成了两个模块的端到端测试："),
  bulletItem("登录 → 查看 Profile → 修改目标体重 → 保存 → 切换到 Trend → 确认目标体重已更新"),
  bulletItem("Trend 图表 hover → tooltip 显示 → 点击锁定 → 表格联动高亮 → 点击空白解锁"),
  bulletItem("Profile 表单输入非法值 → 显示验证错误 → 修正后保存成功 → 返回 Overview 确认数据更新"),
  bulletItem("移动端（≤780px）下所有功能的可用性测试"),
  bulletItem("Electron 窗口大小变化时的布局自适应测试"),

  heading("二、遇到的问题以及解决思路"),

  subheading("问题 1：进度条 100% 溢出"),
  p("完成率进度条在数据完美达标（100%）时，宽度计算值为 100%，但由于 CSS 子像素渲染的精度问题，实际渲染宽度可能略超容器宽度，导致进度条右侧出现微小溢出。"),
  p("解决思路：双重防护——在 JavaScript 层面对百分比值应用 Math.min(value, 100) 约束；在 CSS 层面对进度条容器添加 overflow: hidden，即使子像素溢出也会被裁剪。同时为进度条添加 border-radius: 999px 确保圆角不被裁切。"),

  subheading("问题 2：tooltip 重叠与遮挡"),
  p("当折线图中相邻两个数据点距离较近时，hover 一个数据点的 tooltip 会遮挡相邻数据点，导致用户无法准确选择。"),
  p("解决思路：增大数据点的交互区域（透明的较大 circle 覆盖在可见的较小 circle 之上），确保用户意图明确。对于 tooltip，添加 z-index 层级管理，并在 tooltip 显示时将相邻数据点的交互区域暂时缩小，降低误触概率。"),

  subheading("问题 3：跨模块数据一致性"),
  p("用户在 Profile 中修改目标体重后，Trend 模块的 metricCards 中的「距离目标体重」数值不会自动更新，因为 trendSummary 在组件挂载时获取一次后不再刷新。"),
  p("解决思路：在 MainWindow.vue 中实现模块级别的数据刷新机制。当 Profile 保存成功时，通过事件总线通知 Trend 模块重新获取数据。同时为 trendSummary 添加缓存失效逻辑，确保下次访问时获取最新数据。"),

  heading("三、下一阶段计划"),
  p("Trend 和 Profile 两个模块的开发工作已基本完成。下一阶段的计划包括："),
  bulletItem("编写模块的使用文档和 API 说明"),
  bulletItem("与 Diet、Exercise、Assistant 模块进行更深度的数据集成"),
  bulletItem("探索添加数据导出功能（PDF/Excel 报告）"),
  bulletItem("优化后端查询性能，添加数据库索引优化"),
  bulletItem("收集用户反馈，迭代优化交互细节"),
]);

// Write all documents
const docs = [
  { name: "第1阶段个人工作小结", doc: doc1 },
  { name: "第2阶段个人工作小结", doc: doc2 },
  { name: "第3阶段个人工作小结", doc: doc3 },
  { name: "第4阶段个人工作小结", doc: doc4 },
];

for (const { name, doc } of docs) {
  const buffer = await Packer.toBuffer(doc);
  const filePath = path.join(outputDir, `${name}.docx`);
  fs.writeFileSync(filePath, buffer);
  console.log(`Generated: ${filePath} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

console.log("All 4 documents generated successfully!");
