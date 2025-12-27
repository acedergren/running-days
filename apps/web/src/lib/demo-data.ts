// Demo data for the landing page dashboard preview
// Used when prerendering for static deployment

const currentYear = new Date().getFullYear();

// Dashboard demo data
export const demoData = {
	goal: {
		targetDays: 300,
		year: currentYear
	},
	progress: {
		daysCompleted: 247,
		daysRemaining: 53,
		percentComplete: 82
	},
	stats: {
		totalDistanceKm: 1847.3,
		totalDurationHours: 186,
		avgPaceMinPerKm: 6.05
	},
	recentRuns: [
		{
			id: 1,
			date: getRecentDate(0),
			distanceMeters: 8200,
			durationSeconds: 2820,
			startTime: new Date().toISOString(),
			endTime: new Date().toISOString(),
			avgPaceSecondsPerKm: 344,
			source: 'demo'
		},
		{
			id: 2,
			date: getRecentDate(1),
			distanceMeters: 5100,
			durationSeconds: 1740,
			startTime: new Date().toISOString(),
			endTime: new Date().toISOString(),
			avgPaceSecondsPerKm: 341,
			source: 'demo'
		},
		{
			id: 3,
			date: getRecentDate(2),
			distanceMeters: 10500,
			durationSeconds: 3780,
			startTime: new Date().toISOString(),
			endTime: new Date().toISOString(),
			avgPaceSecondsPerKm: 360,
			source: 'demo'
		},
		{
			id: 4,
			date: getRecentDate(4),
			distanceMeters: 6800,
			durationSeconds: 2340,
			startTime: new Date().toISOString(),
			endTime: new Date().toISOString(),
			avgPaceSecondsPerKm: 344,
			source: 'demo'
		},
		{
			id: 5,
			date: getRecentDate(5),
			distanceMeters: 7200,
			durationSeconds: 2520,
			startTime: new Date().toISOString(),
			endTime: new Date().toISOString(),
			avgPaceSecondsPerKm: 350,
			source: 'demo'
		}
	],
	chartData: generateChartData()
};

function getRecentDate(daysAgo: number): string {
	const date = new Date();
	date.setDate(date.getDate() - daysAgo);
	return date.toISOString().split('T')[0];
}

function generateChartData() {
	const data = [];
	for (let i = 29; i >= 0; i--) {
		// Simulate ~80% of days having runs
		if (Math.random() > 0.2) {
			const date = new Date();
			date.setDate(date.getDate() - i);
			data.push({
				date: date.toISOString().split('T')[0],
				distance: 5000 + Math.random() * 8000,
				duration: 1800 + Math.random() * 2400,
				pace: 320 + Math.random() * 60
			});
		}
	}
	return data;
}

// Insights page demo data
export const insightsDemoData = {
	yearlyData: generateYearlyData(),
	monthlyData: generateMonthlyData(),
	weeklyData: generateWeeklyData(),
	stats: {
		totalDays: 247,
		totalDistance: 1847300, // meters
		totalDuration: 669600, // seconds (186 hours)
		currentStreak: 5,
		longestStreak: 14,
		bestDistance: 21100, // meters (half marathon)
		bestPace: 285 // seconds per km (4:45/km)
	}
};

function generateYearlyData() {
	const data = [];
	const startOfYear = new Date(currentYear, 0, 1);
	const today = new Date();

	// Generate data for ~80% of days
	for (let d = new Date(startOfYear); d <= today; d.setDate(d.getDate() + 1)) {
		if (Math.random() > 0.18) { // ~82% of days
			data.push({
				date: d.toISOString().split('T')[0],
				distance: 5000 + Math.random() * 10000,
				duration: 1500 + Math.random() * 3000,
				pace: 300 + Math.random() * 80,
				runCount: 1
			});
		}
	}
	return data;
}

function generateMonthlyData() {
	const data = [];
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	const currentMonth = new Date().getMonth();

	for (let m = 0; m <= currentMonth; m++) {
		const daysInMonth = new Date(currentYear, m + 1, 0).getDate();
		const runningDays = Math.floor(daysInMonth * 0.82);
		data.push({
			month: `${currentYear}-${String(m + 1).padStart(2, '0')}`,
			totalDistance: runningDays * (5000 + Math.random() * 3000),
			totalDuration: runningDays * (1800 + Math.random() * 600),
			runningDays,
			avgPace: 320 + Math.random() * 40
		});
	}
	return data;
}

function generateWeeklyData() {
	const data = [];
	const today = new Date();

	for (let w = 11; w >= 0; w--) {
		const weekStart = new Date(today);
		weekStart.setDate(today.getDate() - (w * 7));
		const weekNum = Math.ceil((weekStart.getTime() - new Date(currentYear, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));

		const runningDays = 4 + Math.floor(Math.random() * 3); // 4-6 days per week
		data.push({
			week: `${currentYear}-W${String(weekNum).padStart(2, '0')}`,
			totalDistance: runningDays * (5000 + Math.random() * 4000),
			totalDuration: runningDays * (1800 + Math.random() * 900),
			runningDays,
			avgPace: 315 + Math.random() * 45
		});
	}
	return data;
}
