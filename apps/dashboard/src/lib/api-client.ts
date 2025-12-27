/**
 * Typed API Client for Running Days Dashboard
 * Handles authentication, requests, and response typing
 */

import { env } from '$env/dynamic/private';

// API Base URL from environment
const API_BASE_URL = env.API_BASE_URL || 'http://localhost:3000';

// ============================================================================
// Response Types
// ============================================================================

export interface GoalInfo {
  targetDays: number;
  year: number;
}

export interface ProgressInfo {
  daysCompleted: number;
  daysRemaining: number;
  percentComplete: number;
  onTrack: boolean;
  expectedDays: number;
  daysAhead: number;
}

export interface StatsInfo {
  totalDistanceKm: number;
  totalDurationHours: number;
  avgPaceMinPerKm: number | null;
}

export interface RunInfo {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  distanceMeters: number;
  avgPaceSecondsPerKm: number | null;
}

export interface ChartDataPoint {
  date: string;
  distance: number;
  duration: number;
  pace: number | null;
}

export interface PaceInfo {
  dailyRequired: number;
  weeklyRequired: number;
  projectedTotal: number;
  daysRemainingInYear: number;
}

export interface DashboardData {
  goal: GoalInfo;
  progress: ProgressInfo;
  stats: StatsInfo;
  recentRuns: RunInfo[];
  chartData: ChartDataPoint[];
  pace: PaceInfo;
}

export interface DailyData {
  date: string;
  distanceKm: number;
  durationMinutes: number;
  paceMinPerKm: number | null;
  runCount: number;
}

export interface MonthlyData {
  month: string;
  totalDistanceKm: number;
  totalDurationHours: number;
  runningDays: number;
  avgPaceMinPerKm: number | null;
}

export interface WeeklyData {
  week: string;
  totalDistanceKm: number;
  totalDurationHours: number;
  runningDays: number;
  avgPaceMinPerKm: number | null;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastRunDate: string | null;
}

export interface InsightsData {
  yearlyData: DailyData[];
  monthlyData: MonthlyData[];
  weeklyData: WeeklyData[];
  streaks: StreakInfo;
  stats: {
    totalDays: number;
    totalDistanceKm: number;
    totalDurationHours: number;
    bestDistanceKm: number;
    bestPaceMinPerKm: number | null;
  };
}

export interface AuthUser {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

export interface LoginResponse {
  user: AuthUser;
  message: string;
}

export interface GoalData {
  id: number;
  year: number;
  targetDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface GoalProgressData {
  goal: GoalData;
  progress: ProgressInfo;
  streaks: StreakInfo;
  achievements: {
    unlocked: Array<{ milestone: number; unlockedAt: string }>;
    next: { milestone: number; daysNeeded: number } | null;
  };
  stats: StatsInfo;
  pace: PaceInfo;
}

// ============================================================================
// API Error
// ============================================================================

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body?: unknown
  ) {
    super(`API Error: ${status} ${statusText}`);
    this.name = 'ApiError';
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

// ============================================================================
// API Client
// ============================================================================

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  cookies?: string;
}

/**
 * Server-side API client for making authenticated requests to the backend
 */
export class ApiClient {
  private cookies: string;

  constructor(cookies: string = '') {
    this.cookies = cookies;
  }

  private async fetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
    const { method = 'GET', body } = options;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Forward cookies for authentication
    if (this.cookies) {
      headers['Cookie'] = this.cookies;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include'
    });

    if (!response.ok) {
      let errorBody: unknown;
      try {
        errorBody = await response.json();
      } catch {
        // Ignore JSON parse errors
      }
      throw new ApiError(response.status, response.statusText, errorBody);
    }

    return response.json() as Promise<T>;
  }

  // ========================================================================
  // Auth Endpoints
  // ========================================================================

  async login(email: string, password: string): Promise<{ response: Response; data: LoginResponse }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    });

    if (!response.ok) {
      let errorBody: unknown;
      try {
        errorBody = await response.json();
      } catch {
        // Ignore
      }
      throw new ApiError(response.status, response.statusText, errorBody);
    }

    const data = await response.json() as LoginResponse;
    return { response, data };
  }

  async logout(): Promise<void> {
    await this.fetch('/api/v1/auth/logout', { method: 'POST' });
  }

  async refreshToken(): Promise<{ response: Response }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': this.cookies
      },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new ApiError(response.status, response.statusText);
    }

    return { response };
  }

  async getCurrentUser(): Promise<AuthUser> {
    return this.fetch<AuthUser>('/api/v1/auth/me');
  }

  // ========================================================================
  // Stats Endpoints
  // ========================================================================

  async getDashboardData(): Promise<DashboardData> {
    return this.fetch<DashboardData>('/api/v1/stats/dashboard');
  }

  async getInsightsData(): Promise<InsightsData> {
    return this.fetch<InsightsData>('/api/v1/stats/insights');
  }

  async getYearData(year: number): Promise<{
    year: number;
    goal: { targetDays: number; createdAt: string } | null;
    stats: {
      totalDays: number;
      totalDistanceKm: number;
      totalDurationHours: number;
      goalAchieved: boolean;
    };
    streaks: StreakInfo;
  }> {
    return this.fetch(`/api/v1/stats/year/${year}`);
  }

  // ========================================================================
  // Goals Endpoints
  // ========================================================================

  async listGoals(): Promise<GoalData[]> {
    return this.fetch<GoalData[]>('/api/v1/goals');
  }

  async createGoal(year: number, targetDays: number): Promise<GoalData> {
    return this.fetch<GoalData>('/api/v1/goals', {
      method: 'POST',
      body: { year, targetDays }
    });
  }

  async getGoal(year: number): Promise<GoalData> {
    return this.fetch<GoalData>(`/api/v1/goals/${year}`);
  }

  async getGoalProgress(year: number): Promise<GoalProgressData> {
    return this.fetch<GoalProgressData>(`/api/v1/goals/${year}/progress`);
  }

  async updateGoal(year: number, targetDays: number): Promise<GoalData> {
    return this.fetch<GoalData>(`/api/v1/goals/${year}`, {
      method: 'PUT',
      body: { targetDays }
    });
  }

  async deleteGoal(year: number): Promise<void> {
    await this.fetch(`/api/v1/goals/${year}`, { method: 'DELETE' });
  }
}

/**
 * Create an API client instance with cookies from the request
 */
export function createApiClient(cookies: string = ''): ApiClient {
  return new ApiClient(cookies);
}
