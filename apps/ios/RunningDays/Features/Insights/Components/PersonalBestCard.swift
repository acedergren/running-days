import SwiftUI

// MARK: - Personal Best Card
// Displays personal records (distance, pace)

struct PersonalBestCard: View {
    enum RecordType {
        case longestRun
        case fastestPace

        var title: String {
            switch self {
            case .longestRun: return "Longest Run"
            case .fastestPace: return "Fastest Pace"
            }
        }

        var iconName: String {
            switch self {
            case .longestRun: return "map.fill"
            case .fastestPace: return "bolt.fill"
            }
        }

        var accentColor: Color {
            switch self {
            case .longestRun: return .statusWarning
            case .fastestPace: return .accentPrimary
            }
        }

        var unit: String {
            switch self {
            case .longestRun: return "km"
            case .fastestPace: return "/km"
            }
        }
    }

    let value: String
    let date: String?
    let recordType: RecordType

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            // Header with medal icon
            HStack(spacing: Spacing.sm) {
                ZStack {
                    Circle()
                        .fill(recordType.accentColor.opacity(0.15))
                        .frame(width: 32, height: 32)

                    Image(systemName: recordType.iconName)
                        .font(.system(size: 14))
                        .foregroundStyle(recordType.accentColor)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(recordType.title.uppercased())
                        .font(AppFont.caption)
                        .foregroundStyle(Color.textMuted)
                        .tracking(0.5)

                    if let date = date {
                        Text(date)
                            .font(AppFont.captionSmall)
                            .foregroundStyle(Color.textMuted.opacity(0.7))
                    }
                }
            }

            Spacer()

            // Value
            HStack(alignment: .firstTextBaseline, spacing: Spacing.xs) {
                Text(value)
                    .font(AppFont.displayLarge)
                    .foregroundStyle(Color.textPrimary)

                Text(recordType.unit)
                    .font(AppFont.bodyMedium)
                    .foregroundStyle(Color.textSecondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .frame(height: 120)
        .padding(Spacing.lg)
        .background(
            RoundedRectangle(cornerRadius: CornerRadius.xl)
                .fill(Color.surfaceRaised)
                .overlay(
                    RoundedRectangle(cornerRadius: CornerRadius.xl)
                        .stroke(
                            LinearGradient(
                                colors: [
                                    recordType.accentColor.opacity(0.4),
                                    recordType.accentColor.opacity(0.1)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 1
                        )
                )
        )
    }
}

// MARK: - Stats Summary Card

struct StatsSummaryCard: View {
    let totalDistance: Double  // km
    let totalDays: Int
    let avgDistance: Double    // km per run

    var body: some View {
        VStack(spacing: Spacing.lg) {
            // Header
            HStack {
                Image(systemName: "chart.bar.doc.horizontal")
                    .font(.system(size: 14))
                    .foregroundStyle(Color.textMuted)

                Text("All Time Stats".uppercased())
                    .font(AppFont.caption)
                    .foregroundStyle(Color.textMuted)
                    .tracking(0.5)

                Spacer()
            }

            // Stats grid
            HStack(spacing: Spacing.xl) {
                StatItem(
                    value: String(format: "%.0f", totalDistance),
                    unit: "km",
                    label: "Total"
                )

                Divider()
                    .frame(height: 40)
                    .background(Color.borderSubtle)

                StatItem(
                    value: "\(totalDays)",
                    unit: "days",
                    label: "Running"
                )

                Divider()
                    .frame(height: 40)
                    .background(Color.borderSubtle)

                StatItem(
                    value: String(format: "%.1f", avgDistance),
                    unit: "km",
                    label: "Avg/Run"
                )
            }
        }
        .padding(Spacing.lg)
        .background(
            RoundedRectangle(cornerRadius: CornerRadius.xl)
                .fill(Color.surfaceRaised)
                .overlay(
                    RoundedRectangle(cornerRadius: CornerRadius.xl)
                        .stroke(Color.borderSubtle, lineWidth: 1)
                )
        )
    }
}

private struct StatItem: View {
    let value: String
    let unit: String
    let label: String

    var body: some View {
        VStack(spacing: Spacing.xs) {
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text(value)
                    .font(AppFont.displayMedium)
                    .foregroundStyle(Color.textPrimary)

                Text(unit)
                    .font(AppFont.captionSmall)
                    .foregroundStyle(Color.textSecondary)
            }

            Text(label)
                .font(AppFont.captionSmall)
                .foregroundStyle(Color.textMuted)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Previews

#Preview("Longest Run") {
    PersonalBestCard(
        value: "15.2",
        date: "Dec 15, 2024",
        recordType: .longestRun
    )
    .padding()
    .background(Color.surfaceGround)
}

#Preview("Fastest Pace") {
    PersonalBestCard(
        value: "4:52",
        date: "Nov 28, 2024",
        recordType: .fastestPace
    )
    .padding()
    .background(Color.surfaceGround)
}

#Preview("Stats Summary") {
    StatsSummaryCard(
        totalDistance: 856.4,
        totalDays: 187,
        avgDistance: 4.58
    )
    .padding()
    .background(Color.surfaceGround)
}
