import SwiftUI
import Charts

// MARK: - Distance Bars Chart
// Monthly distance visualization using bar marks

struct DistanceBarsChart: View {
    let data: [InsightsViewModel.MonthlyDataPoint]

    var body: some View {
        Chart(data) { point in
            BarMark(
                x: .value("Month", point.month),
                y: .value("Distance", point.distance)
            )
            .foregroundStyle(
                LinearGradient(
                    colors: [Color.accentPrimary, Color.accentPrimary.opacity(0.6)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .cornerRadius(CornerRadius.sm)
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
    ChartCard(title: "Monthly Distance", iconName: "figure.run") {
        DistanceBarsChart(data: [
            .init(month: "Jan", distance: 45.2, days: 12, pace: nil),
            .init(month: "Feb", distance: 52.8, days: 14, pace: nil),
            .init(month: "Mar", distance: 61.3, days: 18, pace: nil),
            .init(month: "Apr", distance: 48.7, days: 15, pace: nil),
            .init(month: "May", distance: 55.1, days: 16, pace: nil),
            .init(month: "Jun", distance: 67.2, days: 20, pace: nil)
        ])
    }
    .padding()
    .background(Color.surfaceGround)
}
