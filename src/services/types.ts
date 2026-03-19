export type Tone = "neutral" | "positive" | "warning";

export type AssistantDerivedContentCategory = "habit" | "meal" | "training" | "recovery" | "mindset";

export type AssistantModalityInputType =
  | "meal_photo"
  | "body_photo"
  | "sleep_screenshot"
  | "workout_screenshot"
  | "text_note";

export type ModuleKey = "overview" | "body" | "diet" | "exercise" | "trend" | "assistant";

export type TrendMetricKey = "weightKg" | "bodyFatRate" | "waistCm" | "sleepHours" | "steps";

export type LoadingState = Record<ModuleKey, boolean>;

export interface UserScopedPayload {
  userId: number;
}

export interface SessionUser {
  userId: number;
  username: string;
  nickname: string;
  email: string;
}

export interface UserProfileRecord extends SessionUser {
  age: number;
  gender: string;
  heightCm: number;
  currentWeightKg: number;
  bodyFatRate: number | null;
  targetWeightKg: number;
  targetBodyFatRate: number | null;
  weeklyWorkoutTarget: number;
  dailyCalorieTarget: number;
  sleepTargetHours: number;
  workStyle: string;
  stressLevel: string;
  smokingStatus: string;
  drinkingFrequency: string;
  habitSleep: string;
  habitDiet: string;
  habitExercise: string;
  bmi: number | null;
  bmr: number | null;
  updatedAt: string | null;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface RegisterInput {
  username: string;
  password: string;
  email: string;
  nickname: string;
}

export interface UpdateAccountSettingsInput extends UserScopedPayload {
  email: string;
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileInput extends UserScopedPayload {
  nickname: string;
  age: number;
  gender: string;
  heightCm: number;
  currentWeightKg: number;
  bodyFatRate: number | null;
  targetWeightKg: number;
  targetBodyFatRate: number | null;
  weeklyWorkoutTarget: number;
  dailyCalorieTarget: number;
  sleepTargetHours: number;
  workStyle: string;
  stressLevel: string;
  smokingStatus: string;
  drinkingFrequency: string;
  habitSleep: string;
  habitDiet: string;
  habitExercise: string;
}

export interface ModuleDefinition {
  key: ModuleKey;
  label: string;
  description: string;
}

export interface OverviewMetric {
  label: string;
  value: string;
  note: string;
  tone: Tone;
}

export interface OverviewModuleStat {
  title: string;
  value: string;
  subtitle: string;
  progress: number;
  tone: Tone;
}

export interface OverviewTrendPoint {
  label: string;
  durationMinutes: number;
  caloriesBurned: number;
  steps: number;
}

export interface OverviewWorkoutRow {
  date: string;
  name: string;
  category: string;
  durationMinutes: number;
  caloriesBurned: number;
  intensity: string;
  status: string;
}

export interface OverviewComplianceRow {
  module: string;
  target: string;
  actual: string;
  completion: number;
  note: string;
}

export interface OverviewTodayItem {
  title: string;
  detail: string;
  meta: string;
  tone: Tone;
}

export interface OverviewPlannedItem {
  period: string;
  title: string;
  detail: string;
  tag: string;
}

export interface OverviewSummary {
  dateLabel: string;
  userName: string;
  headline: string;
  subheadline: string;
  profileUpdatedAt: string | null;
  nextReminder: string;
  momentumLabel: string;
  todayScore: number;
  todaySummary: string;
  todayCompletedCount: number;
  todayPendingCount: number;
  completionRate: number;
  weeklyConsistency: number;
  currentWeight: number;
  targetWeight: number;
  weightDelta: number;
  completedToday: OverviewTodayItem[];
  pendingToday: OverviewTodayItem[];
  plannedToday: OverviewPlannedItem[];
  metrics: OverviewMetric[];
  moduleStats: OverviewModuleStat[];
  weeklyLoad: OverviewTrendPoint[];
  recentWorkouts: OverviewWorkoutRow[];
  complianceTable: OverviewComplianceRow[];
  focusModules: string[];
}

export interface BodyGoalCard {
  label: string;
  value: string;
  description: string;
}

export interface BodyHabitInsight {
  label: string;
  value: string;
  tone: Tone;
}

export interface BodyProfile {
  nickname: string;
  age: number;
  gender: string;
  heightCm: number;
  weightKg: number;
  bodyFatRate: number | null;
  bmi: number | null;
  bmr: number | null;
  sleepHours: number;
  targetWeightKg: number;
  targetBodyFatRate: number | null;
  weeklyWorkoutTarget: number;
  dailyCalorieTarget: number;
  sleepTargetHours: number;
  workStyle: string;
  stressLevel: string;
  smokingStatus: string;
  drinkingFrequency: string;
  habitSleep: string;
  habitDiet: string;
  habitExercise: string;
  goalSummary: string;
  healthSummary: string;
  habits: string[];
  goalCards: BodyGoalCard[];
  habitInsights: BodyHabitInsight[];
}

export interface MealItem {
  id: number;
  mealType: string;
  foodName: string;
  portionLabel: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  recordedAt: string;
}

export interface DietMealGroup {
  mealType: string;
  calories: number;
  count: number;
}

export interface DietInsight {
  title: string;
  detail: string;
  tone: Tone;
}

export interface DietSummary {
  dateLabel: string;
  todayCalories: number;
  calorieTarget: number;
  remainingCalories: number;
  waterIntakeMl: number;
  waterTargetMl: number;
  protein: number;
  proteinTarget: number;
  carbs: number;
  carbsTarget: number;
  fat: number;
  fatTarget: number;
  meals: MealItem[];
  mealGroups: DietMealGroup[];
  insights: DietInsight[];
}

export interface CreateDietEntryInput {
  mealType: string;
  foodName: string;
  portionLabel: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface UpdateDietEntryInput extends CreateDietEntryInput {
  id: number;
}

export interface DeleteDietEntryInput extends UserScopedPayload {
  id: number;
}

export interface CreateDietEntryRequest extends UserScopedPayload, CreateDietEntryInput {}

export interface UpdateDietEntryRequest extends UserScopedPayload, UpdateDietEntryInput {}

export interface AddWaterIntakeInput {
  amountMl: number;
}

export interface AddWaterIntakeRequest extends UserScopedPayload, AddWaterIntakeInput {}

export interface ExerciseEntryInput {
  name: string;
  category: string;
  durationMinutes: number;
  caloriesBurned: number;
  intensity: string;
  status?: string;
  notes?: string;
}

export interface UpdateExerciseEntryInput extends ExerciseEntryInput {
  id: number;
}

export interface DeleteExerciseEntryInput extends UserScopedPayload {
  id: number;
}

export interface CreateExerciseEntryRequest extends UserScopedPayload, ExerciseEntryInput {}

export interface UpdateExerciseEntryRequest extends UserScopedPayload, UpdateExerciseEntryInput {}

export interface WorkoutItem {
  id: number;
  name: string;
  category: string;
  durationMinutes: number;
  caloriesBurned: number;
  intensity: string;
  status: string;
  notes: string;
  performedAt: string;
}

export interface ExerciseCategorySummary {
  category: string;
  sessions: number;
  totalMinutes: number;
  totalCaloriesBurned: number;
}

export interface ExerciseInsight {
  title: string;
  detail: string;
  tone: Tone;
}

export interface ExerciseSummary {
  weeklyGoalDays: number;
  completedDays: number;
  totalMinutes: number;
  totalCaloriesBurned: number;
  todayMinutes: number;
  averageMinutes: number;
  completionRate: number;
  streakDays: number;
  workouts: WorkoutItem[];
  categoryBreakdown: ExerciseCategorySummary[];
  insights: ExerciseInsight[];
}

export interface TrendPoint {
  label: string;
  value: number;
}

export interface TrendMetricCard {
  label: string;
  value: string;
  change: string;
  note: string;
  tone: Tone;
}

export interface TrendSeriesPoint {
  date: string;
  label: string;
  weightKg: number;
  bodyFatRate: number;
  waistCm: number;
  sleepHours: number;
  steps: number;
  trainingMinutes: number;
  calorieIntake: number;
  calorieBurned: number;
  calorieGap: number;
}

export interface TrendBreakdownItem {
  label: string;
  value: number;
  unit: string;
  tone: Tone;
}

export interface TrendInsight {
  title: string;
  detail: string;
  tone: Tone;
}

export interface TrendRecordRow {
  date: string;
  weightKg: number;
  bodyFatRate: number;
  waistCm: number;
  sleepHours: number;
  steps: number;
  trainingMinutes: number;
  calorieGap: number;
  status: string;
}

export interface TrendSummary {
  latestWeight: number;
  latestBodyFatRate: number;
  latestWaistCm: number;
  averageSleepHours: number;
  averageSteps: number;
  targetWeight: number;
  averageTrainingMinutes: number;
  averageCalorieGap: number;
  completionRate: number;
  weightTrend: TrendPoint[];
  metricCards: TrendMetricCard[];
  series: TrendSeriesPoint[];
  recoveryBreakdown: TrendBreakdownItem[];
  behaviorBreakdown: TrendBreakdownItem[];
  insights: TrendInsight[];
  records: TrendRecordRow[];
}

export interface AssistantPlan {
  generatedAt: string;
  title: string;
  focus: string;
  summary: string;
  agentName?: string;
  modelLabel?: string;
  persona?: string;
  capabilities?: string[];
  modalityIdeas?: AssistantModalityIdea[];
  readinessScore: number;
  riskLabel: string;
  nextCheckIn: string;
  quickQuestions: string[];
  metrics: AssistantMetric[];
  priorities: AssistantPriority[];
  insights: AssistantInsight[];
  actions: AssistantAction[];
  derivedContents: AssistantDerivedContent[];
  reminders: string[];
  conversation: AssistantConversationItem[];
}

export interface AssistantMetric {
  label: string;
  value: string;
  note: string;
  tone: Tone;
}

export interface AssistantPriority {
  title: string;
  detail: string;
  score: number;
  tone: Tone;
}

export interface AssistantInsight {
  title: string;
  detail: string;
  evidence: string;
  tone: Tone;
}

export interface AssistantAction {
  title: string;
  detail: string;
  impact: string;
  difficulty: string;
  timeline: string;
  tone: Tone;
}

export interface AssistantDerivedContent {
  title: string;
  detail: string;
  reason: string;
  category: AssistantDerivedContentCategory;
  cta: string;
}

export interface AskAssistantInput {
  question: string;
  focus?: string;
}

export interface AskAssistantRequest extends UserScopedPayload, AskAssistantInput {}

export interface AssistantConversationItem {
  id: number;
  role: "user" | "assistant";
  content: string;
  tag: string;
  createdAt: string;
}

export interface AssistantModalityIdea {
  title: string;
  detail: string;
  prompt: string;
  inputType: AssistantModalityInputType;
  why: string;
  captureTips: string[];
}

export interface GeminiProbeResult {
  ok: boolean;
  provider: string;
  model: string;
  baseUrl: string;
  endpoint: string;
  keyStatus: "present" | "missing";
  status: number | null;
  latencyMs: number;
  message: string;
  replyPreview: string;
  checkedAt: string;
}

export interface LightBalanceBridge {
  platform: string;
  login?: (payload: LoginInput) => Promise<SessionUser>;
  register?: (payload: RegisterInput) => Promise<SessionUser>;
  getBodyProfile?: (payload: UserScopedPayload) => Promise<UserProfileRecord>;
  getOverviewSummary?: (payload: UserScopedPayload) => Promise<OverviewSummary>;
  getDietSummary?: (payload: UserScopedPayload) => Promise<DietSummary>;
  getExerciseSummary?: (payload: UserScopedPayload) => Promise<ExerciseSummary>;
  getTrendSummary?: (payload: UserScopedPayload) => Promise<TrendSummary>;
  getAssistantPlan?: (payload: UserScopedPayload) => Promise<AssistantPlan>;
  askAssistant?: (payload: AskAssistantRequest) => Promise<AssistantPlan>;
  probeGeminiConnection?: () => Promise<GeminiProbeResult>;
  addDietEntry?: (payload: CreateDietEntryRequest) => Promise<DietSummary>;
  updateDietEntry?: (payload: UpdateDietEntryRequest) => Promise<DietSummary>;
  deleteDietEntry?: (payload: DeleteDietEntryInput) => Promise<DietSummary>;
  addWaterIntake?: (payload: AddWaterIntakeRequest) => Promise<DietSummary>;
  addExerciseEntry?: (payload: CreateExerciseEntryRequest) => Promise<ExerciseSummary>;
  updateExerciseEntry?: (payload: UpdateExerciseEntryRequest) => Promise<ExerciseSummary>;
  deleteExerciseEntry?: (payload: DeleteExerciseEntryInput) => Promise<ExerciseSummary>;
  updateAccountSettings?: (payload: UpdateAccountSettingsInput) => Promise<SessionUser>;
  updateProfile?: (payload: UpdateProfileInput) => Promise<UserProfileRecord>;
  notifyAuthSuccess?: () => Promise<boolean>;
  requestLogout?: () => Promise<boolean>;
  minimizeWindow?: () => Promise<boolean>;
  toggleMaximizeWindow?: () => Promise<boolean>;
  closeWindow?: () => Promise<boolean>;
}

declare global {
  interface Window {
    lightBalanceBridge?: LightBalanceBridge;
  }
}
