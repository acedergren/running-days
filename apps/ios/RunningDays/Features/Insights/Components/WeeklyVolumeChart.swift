import SwiftUI
import Charts

// MARK: - Weekly Volume Chart
// Last 12 weeks distance bar visualization

struct WeeklyVolumeChart: View {
    let data: [InsightsViewModel.WeeklyDataPoint]

    var body: some View {
        Chart(data) { point in
            BarMark(
                x: .value("Week", point.week),
                y: .value("Distance", point.distance)
            )
            .foregroundStyle(
                LinearGradient(
                    colors: [Color.accentTertiary, Color.accentTertiary.opacity(0.6)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .cornerRadius(CornerRadius.sm)

            // Optional: Add annotation for days
            if point.days > 0 {
                BarMark(
                    x: .value("Week", point.week),
                    y: .value("Distance", point.distance)
                )
                .annotation(position: .top, spacing: 4) {
                    Text("\(point.days)d")
                        .font(AppFont.captionSmall)
                        .foregroundStyle(Color.textMuted)
                }
                .opacity(0) // Hide the actual bar, just show annotation
            }
        }
        .chartXAxis {
            AxisMarks(values: .automatic) { _ in
                AxisValueLabel()
                    .foregroundStyle(Color.textMuted)
            }
        }
        .chartYAxis {
            AxisMarks(position: .leading) { value in
                AxisGridLine()
                    .foregroundStyle(Color.borderSubtle)
                AxisValueLabel {
                    if let km = value.as(Double.self) {
                        Text("\(Int(km))")
                            .foregroundStyle(Color.textMuted)
                            .font(AppFont.caption)
                    }
                }
            }
        }
        .chartYAxisLabel("km", position: .leading)
    }
}

// MARK: - Preview

#Preview {
    ChartCard(title: "Weekly Volume", iconName: "chart.bar.fill") {
        WeeklyVolumeChart(data: [
            .init(week: "W1", distance: 18.5, days: 3),
            .init(week: "W2", distance: 22.1, days: 4),
            .init(week: "W3", distance: 15.2, days: 2),
            .init(week: "W4", distance: 28.7, days: 5),
            .init(week: "W5", distance: 24.3, days: 4),
            .init(week: "W6", distance: 19.8, days: 3),
            .init(week: "W7", distance: 31.2, days: 5),
            .init(week: "W8", distance: 26.4, days: 4)
        ])
    }
    .padding()
    .background(Color.surfaceGround)
}
