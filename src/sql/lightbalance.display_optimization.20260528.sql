-- LightBalance display data optimization
-- Target user: admin / user_id = 10003
-- Purpose: make the demo pages show coherent, recent, and visually balanced data.

SET NAMES utf8mb4;
SET @uid := 10003;
SET @now := '2026-05-28 13:05:00';
SET @today := '2026-05-28';

UPDATE `user`
SET nickname = '小明老师',
    email = 'xiaoming@whu.edu.cn',
    updated_at = @now
WHERE user_id = @uid;

UPDATE user_profile
SET age = 24,
    gender = '男',
    height_cm = 172.00,
    current_weight_kg = 60.00,
    body_fat_rate = 18.20,
    target_weight_kg = 57.00,
    target_body_fat_rate = 15.50,
    weekly_workout_target = 4,
    daily_calorie_target = 1800,
    sleep_target_hours = 7.50,
    work_style = '久坐学习',
    stress_level = '中',
    smoking_status = '从不',
    drinking_frequency = '几乎不',
    habit_sleep = '工作日通常 00:00 前后入睡，目标是逐步提前到 23:30，并保持 7.5 小时睡眠。',
    habit_diet = '三餐基本规律，下午偶尔想喝奶茶；当前重点是稳定蛋白质摄入、减少高糖饮品。',
    habit_exercise = '每周 3-4 次力量训练，搭配快走或骑行；久坐学习日会用短拉伸补充活动量。',
    bmi = 20.28,
    bmr = 1590.00,
    updated_at = @now
WHERE user_id = @uid;

UPDATE trend_daily_snapshot
SET body_fat_rate = 18.20,
    updated_at = @now
WHERE user_id = @uid AND snapshot_date = @today;

UPDATE diet_daily_log
SET water_intake_ml = 1600,
    water_target_ml = 1920,
    updated_at = @now
WHERE user_id = @uid AND log_date = @today;

DELETE FROM diet_meal_entry
WHERE user_id = @uid AND log_date = @today;

INSERT INTO diet_meal_entry
  (entry_id, user_id, log_date, meal_type, food_name, portion_label, calories, protein_g, carbs_g, fat_g, recorded_at, created_at, updated_at)
VALUES
  (79001, @uid, @today, '早餐', '希腊酸奶燕麦杯', '酸奶 180g + 燕麦 45g + 蓝莓', 390, 26, 52, 9, '2026-05-28 08:05:00', @now, @now),
  (79002, @uid, @today, '午餐', '鸡胸藜麦能量盘', '鸡胸 130g + 藜麦 90g + 时蔬', 540, 42, 62, 13, '2026-05-28 12:20:00', @now, @now),
  (79003, @uid, @today, '加餐', '无糖豆浆坚果', '豆浆 250ml + 坚果 12g', 210, 12, 15, 11, '2026-05-28 15:40:00', @now, @now),
  (79004, @uid, @today, '晚餐', '清蒸鱼杂粮饭', '鱼肉 130g + 杂粮饭 80g + 西兰花', 455, 36, 45, 12, '2026-05-28 18:45:00', @now, @now);

DELETE FROM exercise_session_log
WHERE user_id = @uid;

INSERT INTO exercise_session_log
  (session_id, user_id, performed_on, performed_at, name, category, duration_minutes, calories_burned, intensity, status, notes, created_at, updated_at)
VALUES
  (99001, @uid, '2026-05-25', '2026-05-25 19:20:00', '上肢力量循环', '力量', 42, 294, '中高强度', '已完成', '推拉组合为主，兼顾肩背稳定和核心控制。', @now, @now),
  (99002, @uid, '2026-05-26', '2026-05-26 21:10:00', '睡前恢复拉伸', '恢复', 18, 72, '低强度', '已完成', '放松肩颈、髋部和下背，帮助久坐后的恢复。', @now, @now),
  (99003, @uid, '2026-05-27', '2026-05-27 18:40:00', '快走有氧', '有氧', 35, 220, '中等', '已完成', '控制心率，保持能连续完成的稳定节奏。', @now, @now),
  (99004, @uid, '2026-05-28', '2026-05-28 07:30:00', '晨间核心稳定', '功能', 26, 182, '中等', '已完成', '平板支撑、死虫和臀桥组合，唤醒核心与臀腿。', @now, @now),
  (99005, @uid, '2026-05-28', '2026-05-28 19:30:00', '晚间轻松散步', '恢复', 15, 55, '低强度', '计划中', '饭后散步，帮助消化并补足今日活动量。', @now, @now);

DELETE FROM assistant_chat_message
WHERE user_id = @uid;

DELETE FROM assistant_plan_snapshot
WHERE snapshot_id = 129001;

INSERT INTO assistant_chat_message
  (message_id, user_id, role, tag, content, created_at)
VALUES
  (139001, @uid, 'assistant', '今日开场', '我已经同步了你的身体档案、今日饮食、训练和趋势数据。今天整体节奏不错：热量接近目标、蛋白质充足，训练也已经启动，接下来重点是补水和晚间恢复。', '2026-05-28 08:10:00'),
  (139002, @uid, 'user', '饮食咨询', '今天晚餐还需要注意什么？', '2026-05-28 12:30:00'),
  (139003, @uid, 'assistant', '晚餐建议', '午餐和加餐已经把蛋白质打得比较稳，晚餐建议保持清淡：一份鱼肉或豆腐、一拳头杂粮饭、两拳头蔬菜。这样既能补足营养，也不会让全天热量明显超标。', '2026-05-28 12:31:00'),
  (139004, @uid, 'user', '训练咨询', '今天早上练了核心，晚上还要运动吗？', '2026-05-28 16:20:00'),
  (139005, @uid, 'assistant', '训练建议', '早上的核心训练已经很好，晚上不需要再做高强度训练。更推荐 15-20 分钟轻松散步或拉伸，把久坐后的紧张感放下来，也有助于睡前恢复。', '2026-05-28 16:21:00'),
  (139006, @uid, 'user', '恢复咨询', '今晚怎样更容易早睡？', '2026-05-28 21:00:00'),
  (139007, @uid, 'assistant', '睡眠建议', '建议把睡前 40 分钟留给固定流程：关掉高刺激内容、补最后一小杯水、做 5 分钟拉伸或呼吸练习。目标不是一下子完美早睡，而是把入睡时间稳定提前 15 分钟。', '2026-05-28 21:01:00');

INSERT INTO assistant_plan_snapshot
  (snapshot_id, user_id, focus, title, summary, readiness_score, risk_label, next_check_in,
   quick_questions_json, metrics_json, priorities_json, insights_json, actions_json,
   derived_contents_json, modality_ideas_json, reminders_json, generated_at, created_at)
VALUES
  (
    129001,
    @uid,
    '综合平衡',
    '今日健康节奏已同步',
    '小明老师，今天的数据整体比较完整：饮食记录覆盖四个餐次，热量接近目标，蛋白质摄入充足；早间核心训练已经完成，晚间适合用轻恢复收尾。当前最值得推进的是继续补水，并把睡眠窗口稳定到 7.5 小时左右。',
    82,
    '节奏良好',
    '今晚睡前 30 分钟',
    JSON_ARRAY('晚餐这样安排合理吗？', '今晚适合做什么恢复训练？', '今天饮水还差多少？', '睡前怎么减少饥饿感？'),
    JSON_ARRAY(
      JSON_OBJECT('label','距目标体重','value','3.0 kg','tone','neutral','note','当前体重稳定，适合继续稳步推进。'),
      JSON_OBJECT('label','今日热量余量','value','205 kcal','tone','positive','note','全天摄入接近目标，晚间避免额外高糖加餐。'),
      JSON_OBJECT('label','蛋白质进度','value','116/96 g','tone','positive','note','蛋白质充足，有利于训练恢复和饱腹。'),
      JSON_OBJECT('label','训练完成度','value','4/4','tone','positive','note','本周训练频率达标，接下来关注恢复质量。'),
      JSON_OBJECT('label','饮水进度','value','1600/1920 ml','tone','neutral','note','睡前分次补 300ml 左右即可。')
    ),
    JSON_ARRAY(
      JSON_OBJECT('title','补齐今日饮水','detail','当前饮水 1600ml，距离目标还差 320ml，建议分 2 次完成，避免临睡前一次性喝太多。','score',88,'tone','neutral'),
      JSON_OBJECT('title','晚间轻恢复','detail','今天已经完成核心训练，晚上做轻松散步或拉伸即可，不需要追加高强度训练。','score',84,'tone','positive'),
      JSON_OBJECT('title','守住睡眠窗口','detail','今晚尽量提前 15 分钟结束屏幕使用，给身体一个稳定入睡信号。','score',80,'tone','neutral')
    ),
    JSON_ARRAY(
      JSON_OBJECT('title','饮食结构较均衡','detail','今日四餐总热量约 1595 kcal，蛋白质、碳水和脂肪分布比较清晰，适合继续沿用这种记录方式。','evidence','今日饮食记录','tone','positive'),
      JSON_OBJECT('title','训练节奏已经建立','detail','本周已有力量、有氧和恢复训练，结构比单一刷时长更健康。','evidence','本周训练日志','tone','positive'),
      JSON_OBJECT('title','恢复仍是关键变量','detail','近期睡眠在 6.6-7.6 小时之间波动，若能稳定到 7.5 小时，体重和训练表现会更容易保持。','evidence','趋势记录','tone','neutral')
    ),
    JSON_ARRAY(
      JSON_OBJECT('title','补水收尾','detail','睡前 2 小时内分两次补水，每次 150-180ml。','timeline','今晚','impact','medium','difficulty','low','tone','neutral'),
      JSON_OBJECT('title','晚间恢复 15 分钟','detail','选择散步、肩颈拉伸或髋部放松，帮助从学习/工作状态切换到恢复状态。','timeline','晚饭后','impact','medium','difficulty','low','tone','positive'),
      JSON_OBJECT('title','记录睡眠截图','detail','明早补一张睡眠截图或记录入睡时间，方便判断恢复是否跟上训练节奏。','timeline','明早','impact','medium','difficulty','low','tone','neutral')
    ),
    JSON_ARRAY(
      JSON_OBJECT('category','meal','title','高蛋白清爽晚餐模板','detail','鱼肉或豆腐 + 杂粮饭 + 双份蔬菜，适合在热量接近目标时收尾。','cta','查看搭配','reason','今日饮食已接近目标，晚餐需要稳住结构。'),
      JSON_OBJECT('category','training','title','久坐后的 15 分钟恢复训练','detail','肩颈、髋部和下背放松组合，适合晚间轻恢复。','cta','开始恢复','reason','今天已完成核心训练，不需要再叠加强度。'),
      JSON_OBJECT('category','recovery','title','睡前 40 分钟降噪流程','detail','固定关屏、拉伸、呼吸和记录步骤，帮助入睡时间逐步提前。','cta','设置流程','reason','睡眠稳定性会影响体重趋势和训练恢复。')
    ),
    JSON_ARRAY(
      JSON_OBJECT('title','餐盘照片','detail','如果晚餐临时变化，可以拍下餐盘辅助判断份量和结构。','prompt','我准备记录晚餐照片，你帮我看份量是否合适。','inputType','meal_photo','why','适合减少手动估算误差。','captureTips',JSON_ARRAY('包含主食、蛋白质和蔬菜','拍到饮品和酱料','尽量在开吃前拍')),
      JSON_OBJECT('title','睡眠截图','detail','明早上传睡眠截图，帮助判断恢复和训练安排是否匹配。','prompt','这是昨晚睡眠截图，你帮我看恢复情况。','inputType','sleep_screenshot','why','适合解释疲劳和食欲波动。','captureTips',JSON_ARRAY('包含总时长','包含入睡和醒来时间','包含清醒次数')),
      JSON_OBJECT('title','体态记录','detail','每周固定角度记录一次，配合体重和体脂观察塑形变化。','prompt','我想用体态照追踪变化，应该固定哪些条件？','inputType','body_photo','why','适合观察围度和平台期变化。','captureTips',JSON_ARRAY('固定光线','固定角度','每周同一时间'))
    ),
    JSON_ARRAY('今天结构不错，晚间重点是补水和恢复。', '本周训练频率已经达标，避免临时加量。', '睡眠稳定到 7.5 小时，会让趋势更好看。'),
    @now,
    @now
  );
