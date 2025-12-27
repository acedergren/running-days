import SwiftUI

// MARK: - Insights View
// Main insights screen with charts, streaks, and personal bests

struct InsightsView: View {
    @State private var viewModel = InsightsViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Spacing.xl) {
                    // Streak Cards Row
                    streakSection

                    // Stats Summary
                    StatsSummaryCard(
                        totalDistance: viewModel.totalDistance,
                        totalDays: viewModel.totalDays,
                        avgDistance: viewModel.avgDistancePerRun
                    )

                    // Personal Bests
                    personalBestsSection

                    // Charts
                    chartsSection
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.vertical, Spacing.md)
            }
            .background(Color.surfaceGround)
            .navigationTitle("Insights")
            .navigationBarTitleDisplayMode(.large)
            .refreshable {
                await viewModel.refresh()
            }
            .overlay {
                if viewModel.isLoading && viewModel.monthlyData.isEmpty {
                    loadingView
                }
            }
            .task {
                await viewModel.loadData()
            }
        }
    }

    // MARK: - Streak Section

    private var streakSection: some View {
        VStack(spacing: Spacing.md) {
            // Current & Longest Streak
            HStack(spacing: Spacing.md) {
                StreakCard(days: viewModel.currentStreak, variant: .current)
                StreakCard(days: viewModel.longestStreak, variant: .longest)
            }

            // Weekly Comparison
            WeeklyComparisonCard(
                thisWeek: viewModel.thisWeekDays,
                lastWeek: viewModel.lastWeekDays
            )
        }
    }

    // MARK: - Personal Bests Section

    private var personalBestsSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            SectionHeader(title: "Personal Bests", iconName: "medal.fill")

            HStack(spacing: Spacing.md) {
                PersonalBestCard(
                    value: viewModel.formattedBestDistance,
                    date: viewModel.bestDistanceDate,
                    recordType: .longestRun
                )

                PersonalBestCard(
                    value: viewModel.formattedBestPace,
                    date: viewModel.bestPaceDate,
                    recordType: .fastestPace
                )
            }
        }
    }

    // MARK: - Charts Section

    private var chartsSection: some View {
        VStack(spacing: Spacing.lg) {
            // Monthly Distance Chart
            if !viewModel.monthlyData.isEmpty {
                ChartCard(title: "Monthly Distance", iconName: "figure.run") {
                    DistanceBarsChart(data: viewModel.monthlyData)
                }

                ChartCard(title: "Running Days", iconName: "calendar") {
                    RunningDaysChart(data: viewModel.monthlyData)
                }
            }

            // Weekly Volume Chart
            if !viewModel.weeklyData.isEmpty {
                ChartCard(title: "Weekly Volume", iconName: "chart.bar.fill") {
                    WeeklyVolumeChart(data: viewModel.weeklyData)
                }
            }

            // Pace Trend Chart
            if !viewModel.paceData.isEmpty {
                ChartCard(title: "Pace Trend", iconName: "speedometer") {
                    PaceTrendChart(data: viewModel.paceData)
                }
            }

            // Empty state for charts
            if viewModel.monthlyData.isEmpty && !viewModel.isLoading {
                ChartCard(title: "No Data Yet", iconName: "chart.bar.xaxis") {
                    EmptyChartView("Complete some runs to see your insights")
                }
            }
        }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack(spacing: Spacing.lg) {
            ProgressView()
                .scaleEffect(1.2)
                .tint(Color.accentPrimary)

            Text("Loading insights...")
                .font(AppFont.bodyMedium)
                .foregroundStyle(Color.textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.surfaceGround.opacity(0.9))
    }
}

// MARK: - Section Header

private struct SectionHeader: View {
    let title: String
    let iconName: String

    var body: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: iconName)
                .font(.system(size: 14))
                .foregroundStyle(Color.accentPrimary)

            Text(title.uppercased())
                .font(AppFont.sectionHeader)
                .foregroundStyle(Color.textSecondary)
                .tracking(0.5)
        }
    }
}

// MARK: - Preview

#Preview {
    InsightsView()
}
