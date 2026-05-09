# English Tutor 参考墨墨背单词改进方案

## 墨墨背单词核心特点分析

### 1. 记忆算法系统
- **记忆持久度**: 不只是简单复习，而是计算每个单词的记忆强度
- **遗忘曲线个性化**: 根据用户实际表现动态调整复习间隔
- **难度系数**: 不同单词有不同难度，影响复习频率

### 2. 词典与词库系统
- **多维度词典**: 四六级、考研、雅思、托福、GRE、专四专八等
- **词汇分级**: 核心词、高频词、中频词、低频词
- **词频标注**: 显示单词在考试中的出现频率

### 3. 学习辅助功能
- **助记法系统**: 词根词缀、联想记忆、谐音记忆
- **例句丰富**: 真题例句、电影例句、名著例句
- **真人发音**: 英音/美音可选
- **近义词/反义词**: 扩展学习

### 4. 学习统计与反馈
- **每日学习量**: 新词+复习的清晰展示
- **记忆持久度曲线**: 显示整体记忆强度变化
- **遗忘率统计**: 每日遗忘了多少单词
- **连续打卡**: 激励系统

### 5. 复习模式
- **看英想中**: 显示英文，想中文意思
- **看中想英**: 显示中文，想英文单词
- **拼写模式**: 听音拼写或看义拼写
- **听音辨词**: 听发音选择单词

---

## 改进实施方案

### 阶段一：词典系统增强（高优先级）

#### 1.1 词汇分级与标签系统
```typescript
// 扩展现有单词数据模型
interface WordLevel {
  word: string;
  // 新增字段
  frequency: 'high' | 'medium' | 'low';  // 词频
  difficulty: 1-5;  // 难度等级
  examTags: string[];  // 考试标签 ['cet4', 'cet6', 'ielts', 'toefl', 'gre']
  importance: number;  // 重要程度 1-100
}
```

**UI 实现**:
- 词典页面增加筛选：全部/高频词/中频词/低频词
- 单词卡片显示难度星星 ★★★☆☆
- 考试标签徽章：四六级/雅思/托福

#### 1.2 助记法系统
```typescript
interface Mnemonic {
  id: number;
  word: string;
  type: 'root' | 'association' | 'homophonic' | 'story';
  content: string;
  author: string;
  likes: number;
  isOfficial: boolean;
}
```

**UI 实现**:
- 单词详情页增加"助记"标签页
- 词根词缀解析（如：un- 表示否定，-able 表示能力）
- 联想记忆卡片
- 用户可添加自己的助记法

#### 1.3 例句系统增强
- 真题例句（标注来源：2023年6月CET-4）
- 电影例句（显示电影名称）
- 例句翻译（可开关）
- 例句朗读按钮

---

### 阶段二：记忆算法优化（核心）

#### 2.1 记忆持久度计算
基于 SM-2 算法改进：

```typescript
interface MemoryState {
  wordId: number;
  easeFactor: number;  // 简易度系数，初始 2.5
  interval: number;    // 当前间隔天数
  repetitions: number; // 连续成功次数
  nextReview: Date;    // 下次复习时间
  memoryStrength: number; // 记忆强度 0-100
}
```

**算法逻辑**:
1. 新词首次复习间隔 = 1 天
2. 连续答对后间隔递增：1天 → 3天 → 7天 → 15天 → 30天
3. 答错后间隔重置，降低 easeFactor
4. 记忆强度 = 最近复习准确率 × 间隔衰减系数

#### 2.2 智能复习提醒
```typescript
interface ReviewSchedule {
  todayNew: number;      // 今日新词上限
  todayReview: number;   // 今日复习数量
  totalDue: number;      // 到期单词总数
  urgentWords: string[]; // 急需复习（已过期）
  upcoming: number;      // 未来3天待复习
}
```

**UI 实现**:
- 首页显示今日任务卡片：新词 20 / 复习 50
- 进度环可视化
- 红色提醒：有 5 个单词已逾期，请尽快复习！

#### 2.3 遗忘曲线个性化
根据用户实际数据绘制：
- 横轴：时间（1天/2天/4天/7天/15天/30天）
- 纵轴：留存率
- 两条曲线：标准艾宾浩斯 vs 你的实际留存率
- AI 分析：你的遗忘速度比标准快 15%，建议缩短复习间隔

---

### 阶段三：学习统计与激励（UI 重点）

#### 3.1 学习数据可视化
```typescript
interface LearningStats {
  // 基础数据
  totalWords: number;
  masteredWords: number;  // 已掌握（连续多次答对）
  learningWords: number;  // 学习中
  forgottenWords: number; // 已遗忘
  
  // 时间维度
  dailyStats: {
    date: string;
    newWords: number;
    reviewWords: number;
    accuracy: number;
    duration: number; // 学习时长分钟
  }[];
  
  // 记忆维度
  memoryStrength: number; // 0-100
  averageAccuracy: number; // 平均正确率
  retentionRate: number; // 留存率
}
```

**UI 组件**:
1. **学习日历热力图** (GitHub style)
   - 颜色深浅表示学习量
   - 悬停显示当天数据：新词 20，复习 50，准确率 85%

2. **记忆持久度曲线**
   - 折线图：横轴时间，纵轴记忆强度
   - 多条线：已掌握词/学习中词/难记词

3. **词汇掌握分布饼图**
   - 已掌握 45% / 学习中 35% / 已遗忘 20%

4. **每日学习趋势图**
   - 柱状图：新词 vs 复习
   - 折线叠加：准确率趋势

#### 3.2 打卡系统
```typescript
interface CheckInSystem {
  currentStreak: number;  // 当前连续打卡天数
  maxStreak: number;     // 历史最高连续天数
  totalCheckIns: number; // 累计打卡天数
  lastCheckIn: string;   // 上次打卡日期
  rewards: {
    daily: number;       // 每日奖励（单词上限）
    streakBonus: number; // 连续打卡加成
  };
}
```

**UI 实现**:
- 首页顶部显示：🔥 连续打卡 15 天（最高 30 天）
- 打卡按钮：今日已打卡 / 点击打卡
- 打卡动画：星星特效 + 获得 +5 单词上限
- 里程碑：连续 7 天/30 天/100 天特殊徽章

---

### 阶段四：复习模式多样化

#### 4.1 四种复习模式
```typescript
type ReviewMode = 
  | 'flashcard'    // 看英想中（默认）
  | 'reverse'      // 看中文想英文
  | 'spelling'     // 拼写模式
  | 'listening';   // 听音辨词

interface ReviewSettings {
  mode: ReviewMode;
  autoPlayAudio: boolean;  // 自动播放发音
  showPhonetic: boolean;   // 显示音标
  shuffle: boolean;        // 随机顺序
  dailyLimit: number;      // 每日复习上限
}
```

**各模式 UI 设计**:

1. **看英想中（当前模式）**
   - 显示单词 + 音标 + 发音按钮
   - 点击显示释义按钮
   - 底部：认识 / 模糊 / 忘记

2. **看中文想英文（反向复习）**
   - 显示中文释义
   - 输入框：输入英文单词
   - 提交后显示正确单词对比

3. **拼写模式**
   - 显示中文释义 + 播放发音
   - 字母键盘：逐个输入字母
   - 提示功能：显示首字母或长度

4. **听音辨词**
   - 播放发音（不显示单词）
   - 四个选项选择
   - 可用于听力训练

#### 4.2 复习流程优化
```typescript
interface ReviewFlow {
  // 预学习：先看今天要复习的单词列表
  preview: {
    total: number;
    newWords: number;    // 新词
    reviewWords: number; // 复习词
    forgotten: number;   // 遗忘需强化
  };
  
  // 学习顺序
  order: 'mixed' | 'newFirst' | 'reviewFirst' | 'forgottenFirst';
  
  // 中途休息
  restPrompt: {
    interval: number; // 每 N 个单词休息
    duration: number; // 休息时长秒
  };
  
  // 完成总结
  summary: {
    totalReviewed: number;
    correctCount: number;
    accuracy: number;
    duration: number; // 用时
    nextReview: Date; // 下次复习时间
  };
}
```

---

### 阶段五：界面与交互优化

#### 5.1 墨墨风格 UI 设计
```scss
// 色彩系统（参考墨墨）
:root {
  // 主色调
  --mm-primary: #4A90D9;      // 墨墨蓝
  --mm-primary-light: #E8F1FA;
  --mm-primary-dark: #3A7BC8;
  
  // 状态色
  --mm-success: #7ED321;      // 认识 - 绿色
  --mm-warning: #F5A623;        // 模糊 - 黄色  
  --mm-danger: #D0021B;       // 忘记 - 红色
  --mm-new: #BD10E0;          // 新词 - 紫色
  
  // 中性色
  --mm-bg: #F5F6F8;
  --mm-card: #FFFFFF;
  --mm-text: #2C3E50;
  --mm-text-secondary: #7F8C8D;
  --mm-border: #E5E8EB;
}
```

**关键 UI 组件**:

1. **单词卡片（核心交互）**
```tsx
// 正面（初始显示）
<WordCard>
  <Word>{word}</Word>
  <Phonetic>/fəˈnɛtɪk/</Phonetic>
  <AudioButton />
  <Hint>点击显示释义</Hint>
</WordCard>

// 背面（点击后显示）
<WordCardBack>
  <Meaning>n. 意思；含义</Meaning>
  <Example>例句展示</Example>
  <Mnemonic>助记：谐音...</Mnemonic>
  
  <ActionButtons>
    <Button type="danger">忘记</Button>
    <Button type="warning">模糊</Button>
    <Button type="success">认识</Button>
  </ActionButtons>
</WordCardBack>
```

2. **学习统计仪表盘**
```tsx
<StatsDashboard>
  {/* 日历热力图 */}
  <CalendarHeatMap 
    data={dailyStats}
    colorScale={['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39']}
  />
  
  {/* 今日任务卡片 */}
  <TodayCard>
    <TaskItem type="new" count={20} label="新词" />
    <TaskItem type="review" count={50} label="复习" />
    <TaskItem type="forgotten" count={5} label="遗忘" />
    <ProgressRing percent={65} />
  </TodayCard>
  
  {/* 记忆持久度 */}
  <MemoryStrength>
    <LineChart data={memoryStrengthOverTime} />
    <Stats>
      <Stat label="已掌握" value={245} />
      <Stat label="学习中" value={180} />
      <Stat label="已遗忘" value={23} />
    </Stats>
  </MemoryStrength>
</StatsDashboard>
```

3. **词典选择页面**
```tsx
<DictionarySelect>
  <CategoryTabs>
    <Tab>全部</Tab>
    <Tab>国内考试</Tab>
    <Tab>出国留学</Tab>
    <Tab>专业词汇</Tab>
  </CategoryTabs>
  
  <DictGrid>
    {dictionaries.map(dict => (
      <DictCard 
        key={dict.id}
        selected={selectedDict === dict.id}
        onClick={() => selectDict(dict.id)}
      >
        <DictIcon type={dict.category} />
        <DictName>{dict.name}</DictName>
        <DictDesc>{dict.description}</DictDesc>
        <WordCount>{dict.wordCount} 词</WordCount>
        
        {dict.progress && (
          <ProgressBar percent={dict.progress} />
        )}
      </DictCard>
    ))}
  </DictGrid>
</DictionarySelect>
```

---

## 数据库结构扩展

### 新增表

```sql
-- 用户学习统计表
CREATE TABLE user_stats (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL,
  new_words INTEGER DEFAULT 0,
  review_words INTEGER DEFAULT 0,
  accuracy REAL DEFAULT 0,
  duration INTEGER DEFAULT 0, -- 学习时长（分钟）
  UNIQUE(date)
);

-- 打卡记录表
CREATE TABLE check_ins (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL,
  streak INTEGER DEFAULT 1,
  reward INTEGER DEFAULT 0,
  UNIQUE(date)
);

-- 助记法表
CREATE TABLE mnemonics (
  id INTEGER PRIMARY KEY,
  word TEXT NOT NULL,
  type TEXT NOT NULL, -- root, association, homophonic, story
  content TEXT NOT NULL,
  author TEXT,
  likes INTEGER DEFAULT 0,
  is_official INTEGER DEFAULT 0
);

-- 例句表（扩展）
CREATE TABLE word_sentences (
  id INTEGER PRIMARY KEY,
  word TEXT NOT NULL,
  sentence TEXT NOT NULL,
  translation TEXT,
  source TEXT, -- 真题/电影/名著
  audio_url TEXT
);
```

---

## 实施优先级

### P0（核心功能，立即实施）
1. **单词卡片优化** - 改进背单词界面，增加"模糊"选项
2. **词典选择界面** - 网格布局，分类筛选，进度显示
3. **学习统计卡片** - 首页今日任务概览
4. **记忆持久度算法** - 优化复习间隔计算

### P1（重要功能，下周实施）
5. **日历热力图** - 学习记录可视化
6. **助记法系统** - 词根词缀展示
7. **例句系统** - 真题例句、发音
8. **打卡系统** - 连续打卡、奖励

### P2（增强功能，后续实施）
9. **复习模式多样化** - 拼写、听音、反向
10. **社交功能** - 助记法分享、排行榜
11. **AI 深度集成** - 智能推荐、个性化分析
12. **多设备同步** - 云端备份、跨平台

---

## 明天开始实施建议

### 第一步：优化背单词界面（2小时）
当前只有"认识/不认识"，改为三级：
- 不认识（红色）→ 返回第一阶段
- 模糊（黄色）→ 保持当前阶段
- 认识（绿色）→ 进入下一阶段

### 第二步：词典选择界面重构（2小时）
从当前按钮列表改为卡片网格：
- 分类标签：国内考试/出国留学/专业词汇
- 每个词典卡片显示：图标、名称、词数、学习进度
- 选中状态明显

### 第三步：首页添加今日任务卡片（1小时）
在首页或背单词页面顶部显示：
- 今日新词：20（目标 30）
- 今日复习：45（目标 50）
- 预计用时：15 分钟
- 进度条：65%

这三个改进完成后，用户体验会有明显提升，然后再逐步添加日历热力图、助记法等功能。
