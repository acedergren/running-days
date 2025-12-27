import SwiftUI
import Charts

// MARK: - Pace Trend Chart
// Line/area chart showing pace progression over time

struct PaceTrendChart: View {
    let data: [InsightsViewModel.PaceDataPoint]

    // Computed bounds for better axis display
    private var paceRange: ClosedRange<Double> {
        let paces = data.map(\.pace)
        let minPace = (paces.min() ?? 5.0) - 0.5
        let maxPace = (paces.max() ?? 7.0) + 0.5
        return minPace...maxPace
    }

    var body: some View {
        Chart(data) { point in
            // Area fill under the line
            AreaMark(
                x: .value("Date", point.date),
                y: .value("Pace", point.pace)
            )
            .foregroundStyle(
                LinearGradient(
                    colors: [
                        Color.accentSecondary.opacity(0.3),
                        Color.accentSecondary.opacity(0.05)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .interpolationMethod(.catmullRom)

            // Line on top
            LineMark(
                x: .value("Date", point.date),
                y: .value("Pace", point.pace)
            )
            .foregroundStyle(Color.accentSecondary)
            .lineStyle(StrokeStyle(lineWidth: 2))
            .interpolationMethod(.catmullRom)

            // Point markers
            PointMark(
                x: .value("Date", point.date),
                y: .value("Pace", point.pace)
            )
            .foregroundStyle(Color.accentSecondary)
            .symbolSize(20)
        }
        .chartXAxis {
            AxisMarks(values: .stride(by: .day, count: 7)) { value in
                AxisValueLabel(format: .dateTime.day())
                    .foregroundStyle(Color.textMuted)
            }
        }
        .chartYAxis {
            AxisMarks(position: .leading) { value in
                AxisGridLine()
                    .foregroundStyle(Color.borderSubtle)
                AxisValueLabel {
                    if let pace = value.as(Double.self) {
                        Text(formatPace(pace))
                            .foregroundStyle(Color.textMuted)
                            .font(AppFont.caption)
                    }
                }
            }
        }
        .chartYScale(domain: paceRange)
        .chartYAxis {
            AxisMarks(position: .leading)
        }
    }

    private func formatPace(_ minutesPerKm: Double) -> String {
        let minutes = Int(minutesPerKm)
        let seconds = Int((minutesPerKm - Double(minutes)) * 60)
        return String(format: "%d:%02d", minutes, seconds)
    }
}

// MARK: - Preview

#Preview {
    let baseDate = Date()
    let sampleData = (0..<14).map { i in
        InsightsViewModel.PaceDataPoint(
            id: "\(i)",
            date: Calendar.current.date(byAdding: .day, value: -i, to: baseDate)!,
            pace: 5.5 + Double.random(in: -0.5...0.8)
        )
    }.reversed()

    return ChartCard(title: "Pace Trend", iconName: "speedometer") {
        PaceTrendChart(data: Array(sampleData))
    }
    .padding()
    .background(Color.surfaceGround)
}
