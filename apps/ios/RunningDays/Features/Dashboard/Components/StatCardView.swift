import SwiftUI

// MARK: - Stat Card View
// Displays a single statistic with label, value, unit, optional icon and trend

struct StatCardView: View {
    // MARK: - Properties

    /// Stat label (e.g., "Distance", "Time")
    let label: String

    /// Stat value (e.g., "42.5")
    let value: String

    /// Optional unit (e.g., "km", "min")
    let unit: String?

    /// Optional SF Symbol icon name
    let iconName: String?

    /// Optional trend data
    let trend: Trend?

    /// Whether to show accent styling
    let isAccent: Bool

    // MARK: - Trend Model

    struct Trend {
        let value: Double
        let isPositive: Bool

        var formattedValue: String {
            "\(Int(abs(value)))%"
        }
    }

    // MARK: - State

    @State private var isHovered = false

    // MARK: - Initializer

    init(
        label: String,
        value: String,
        unit: String? = nil,
        iconName: String? = nil,
        trend: Trend? = nil,
        isAccent: Bool = false
    ) {
        self.label = label
        self.value = value
        self.unit = unit
        self.iconName = iconName
        self.trend = trend
        self.isAccent = isAccent
    }

    // MARK: - Body

    var body: some View {
        ZStack {
            // Accent gradient overlay
            if isAccent {
                RoundedRectangle(cornerRadius: CornerRadius.xl)
                    .fill(
                        LinearGradient(
                            colors: [Color.accentPrimary.opacity(0.1), Color.clear],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
            }

            VStack(alignment: .leading, spacing: Spacing.md) {
                // Label row with icon
                labelRow

                // Value with unit
                valueRow

                // Trend indicator
                if let trend {
                    trendRow(trend)
                }
            }
            .padding(Spacing.lg)
        }
        .background(
            RoundedRectangle(cornerRadius: CornerRadius.xl)
                .fill(Color.surfaceRaised)
                .overlay(
                    RoundedRectangle(cornerRadius: CornerRadius.xl)
                        .stroke(
                            isAccent
                                ? Color.accentPrimary.opacity(0.3)
                                : Color.borderSubtle,
                            lineWidth: 1
                        )
                )
        )
    }

    // MARK: - Subviews

    private var labelRow: some View {
        HStack {
            Text(label.uppercased())
                .font(AppFont.statLabel)
                .foregroundStyle(Color.textMuted)
                .tracking(0.5)

            Spacer()

            if let iconName {
                Image(systemName: iconName)
                    .font(.system(size: 14))
                    .foregroundStyle(isHovered ? Color.accentPrimary : Color.textMuted)
                    .animation(AppAnimation.fast, value: isHovered)
            }
        }
    }

    private var valueRow: some View {
        HStack(alignment: .lastTextBaseline, spacing: 2) {
            Text(value)
                .font(AppFont.statValue)
                .foregroundStyle(isAccent ? Color.accentPrimary : Color.textPrimary)
                .tabularNumbers()

            if let unit {
                Text(unit)
                    .font(AppFont.statUnit)
                    .foregroundStyle(Color.textMuted)
            }
        }
    }

    private func trendRow(_ trend: Trend) -> some View {
        HStack(spacing: Spacing.xs) {
            HStack(spacing: 2) {
                Image(systemName: trend.isPositive ? "arrow.up" : "arrow.down")
                    .font(.system(size: 10, weight: .bold))

                Text(trend.formattedValue)
                    .font(AppFont.caption.weight(.semibold))
            }
            .foregroundStyle(trend.isPositive ? Color.success : Color.accentPrimary)

            Text("vs last week")
                .font(AppFont.caption)
                .foregroundStyle(Color.textMuted)
        }
    }
}

// MARK: - Convenience Initializers

extension StatCardView {
    /// Create a stat card with numeric value
    init(
        label: String,
        value: Double,
        decimals: Int = 1,
        unit: String? = nil,
        iconName: String? = nil,
        trend: Trend? = nil,
        isAccent: Bool = false
    ) {
        self.init(
            label: label,
            value: String(format: "%.\(decimals)f", value),
            unit: unit,
            iconName: iconName,
            trend: trend,
            isAccent: isAccent
        )
    }

    /// Create a stat card with integer value
    init(
        label: String,
        value: Int,
        unit: String? = nil,
        iconName: String? = nil,
        trend: Trend? = nil,
        isAccent: Bool = false
    ) {
        self.init(
            label: label,
            value: String(value),
            unit: unit,
            iconName: iconName,
            trend: trend,
            isAccent: isAccent
        )
    }
}

// MARK: - Stats Grid

/// 2x2 grid layout for stat cards
struct StatsGrid<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        LazyVGrid(
            columns: [
                GridItem(.flexible(), spacing: Spacing.md),
                GridItem(.flexible(), spacing: Spacing.md)
            ],
            spacing: Spacing.md
        ) {
            content
        }
    }
}

// MARK: - Preview

#Preview("Stat Cards") {
    ZStack {
        Color.surfaceGround.ignoresSafeArea()

        VStack(spacing: Spacing.lg) {
            StatsGrid {
                StatCardView(
                    label: "Distance",
                    value: 425.2,
                    unit: "km",
                    iconName: "figure.run",
                    trend: .init(value: 12, isPositive: true)
                )

                StatCardView(
                    label: "Time",
                    value: "42:15",
                    unit: "hours",
                    iconName: "clock"
                )

                StatCardView(
                    label: "Avg Pace",
                    value: "5:42",
                    unit: "/km",
                    iconName: "speedometer",
                    isAccent: true
                )

                StatCardView(
                    label: "Days Left",
                    value: 118,
                    iconName: "calendar",
                    trend: .init(value: 5, isPositive: false)
                )
            }
            .padding()
        }
    }
}
