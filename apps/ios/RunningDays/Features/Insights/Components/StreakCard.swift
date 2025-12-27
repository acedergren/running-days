import SwiftUI

// MARK: - Streak Card
// Displays current or longest streak with visual flair

struct StreakCard: View {
    enum Variant {
        case current
        case longest

        var title: String {
            switch self {
            case .current: return "Current Streak"
            case .longest: return "Longest Streak"
            }
        }

        var iconName: String {
            switch self {
            case .current: return "flame.fill"
            case .longest: return "trophy.fill"
            }
        }

        var accentColor: Color {
            switch self {
            case .current: return .accentPrimary
            case .longest: return .statusWarning
            }
        }
    }

    let days: Int
    let variant: Variant

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            // Header
            HStack(spacing: Spacing.sm) {
                Image(systemName: variant.iconName)
                    .font(.system(size: 14))
                    .foregroundStyle(variant.accentColor)

                Text(variant.title.uppercased())
                    .font(AppFont.caption)
                    .foregroundStyle(Color.textMuted)
                    .tracking(0.5)
            }

            // Value
            HStack(alignment: .firstTextBaseline, spacing: Spacing.xs) {
                Text("\(days)")
                    .font(AppFont.heroNumber)
                    .foregroundStyle(Color.textPrimary)

                Text("days")
                    .font(AppFont.bodyMedium)
                    .foregroundStyle(Color.textSecondary)
            }

            // Streak indicator dots
            StreakDots(count: min(days, 7), color: variant.accentColor)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Spacing.lg)
        .background(
            RoundedRectangle(cornerRadius: CornerRadius.xl)
                .fill(Color.surfaceRaised)
                .overlay(
                    RoundedRectangle(cornerRadius: CornerRadius.xl)
                        .stroke(variant.accentColor.opacity(0.3), lineWidth: 1)
                )
        )
    }
}

// MARK: - Streak Dots

private struct StreakDots: View {
    let count: Int
    let color: Color

    var body: some View {
        HStack(spacing: Spacing.xs) {
            ForEach(0..<7, id: \.self) { index in
                Circle()
                    .fill(index < count ? color : Color.borderSubtle)
                    .frame(width: 8, height: 8)
            }
        }
    }
}

// MARK: - Weekly Comparison Card

struct WeeklyComparisonCard: View {
    let thisWeek: Int
    let lastWeek: Int

    private var comparison: String {
        let diff = thisWeek - lastWeek
        if diff > 0 {
            return "+\(diff) from last week"
        } else if diff < 0 {
            return "\(diff) from last week"
        } else {
            return "Same as last week"
        }
    }

    private var comparisonColor: Color {
        let diff = thisWeek - lastWeek
        if diff > 0 { return .statusSuccess }
        if diff < 0 { return .statusError }
        return .textMuted
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            // Header
            HStack(spacing: Spacing.sm) {
                Image(systemName: "calendar.badge.clock")
                    .font(.system(size: 14))
                    .foregroundStyle(Color.accentSecondary)

                Text("This Week".uppercased())
                    .font(AppFont.caption)
                    .foregroundStyle(Color.textMuted)
                    .tracking(0.5)
            }

            // Value
            HStack(alignment: .firstTextBaseline, spacing: Spacing.xs) {
                Text("\(thisWeek)")
                    .font(AppFont.heroNumber)
                    .foregroundStyle(Color.textPrimary)

                Text("days")
                    .font(AppFont.bodyMedium)
                    .foregroundStyle(Color.textSecondary)
            }

            // Comparison
            Text(comparison)
                .font(AppFont.caption)
                .foregroundStyle(comparisonColor)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
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

// MARK: - Previews

#Preview("Current Streak") {
    StreakCard(days: 5, variant: .current)
        .padding()
        .background(Color.surfaceGround)
}

#Preview("Longest Streak") {
    StreakCard(days: 12, variant: .longest)
        .padding()
        .background(Color.surfaceGround)
}

#Preview("Weekly Comparison") {
    WeeklyComparisonCard(thisWeek: 4, lastWeek: 3)
        .padding()
        .background(Color.surfaceGround)
}
