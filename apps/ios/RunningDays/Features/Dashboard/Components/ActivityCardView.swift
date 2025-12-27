import SwiftUI

// MARK: - Activity Card View
// Displays a single run activity with date, distance, duration, and pace

struct ActivityCardView: View {
    // MARK: - Properties

    let date: Date
    let distanceMeters: Double
    let durationSeconds: Int
    let paceSecondsPerKm: Double?

    /// Whether the card is pressed (for visual feedback)
    @State private var isPressed = false

    /// Whether to show the accent bar
    @State private var showAccentBar = false

    // MARK: - Computed Properties

    private var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE, MMM d"  // "Mon, Dec 27"
        return formatter.string(from: date)
    }

    private var formattedDistance: String {
        let km = distanceMeters / 1000
        if km >= 10 {
            return String(format: "%.1f", km)
        }
        return String(format: "%.2f", km)
    }

    private var formattedDuration: String {
        let hours = durationSeconds / 3600
        let minutes = (durationSeconds % 3600) / 60
        let seconds = durationSeconds % 60

        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, seconds)
        }
        return String(format: "%d:%02d", minutes, seconds)
    }

    private var formattedPace: String {
        guard let pace = paceSecondsPerKm, pace > 0 else { return "--:--" }
        let minutes = Int(pace) / 60
        let seconds = Int(pace) % 60
        return String(format: "%d:%02d", minutes, seconds)
    }

    // MARK: - Initializer

    init(
        date: Date,
        distanceMeters: Double,
        durationSeconds: Int,
        paceSecondsPerKm: Double? = nil
    ) {
        self.date = date
        self.distanceMeters = distanceMeters
        self.durationSeconds = durationSeconds
        // Calculate pace if not provided
        if let pace = paceSecondsPerKm {
            self.paceSecondsPerKm = pace
        } else if distanceMeters > 0 {
            let distanceKm = distanceMeters / 1000
            self.paceSecondsPerKm = Double(durationSeconds) / distanceKm
        } else {
            self.paceSecondsPerKm = nil
        }
    }

    // MARK: - Body

    var body: some View {
        HStack(spacing: Spacing.lg) {
            // Left accent bar
            RoundedRectangle(cornerRadius: 2)
                .fill(Color.gradientAccent)
                .frame(width: 3)
                .frame(maxHeight: .infinity)
                .padding(.vertical, Spacing.sm)
                .opacity(showAccentBar ? 1 : 0)

            // Content
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(formattedDate)
                    .font(AppFont.bodyMedium.weight(.semibold))
                    .foregroundStyle(Color.textPrimary)

                HStack(spacing: Spacing.md) {
                    Label(formattedDistance + " km", systemImage: "figure.run")
                    Label(formattedDuration, systemImage: "clock")
                }
                .font(AppFont.caption)
                .foregroundStyle(Color.textMuted)
            }

            Spacer()

            // Pace badge
            HStack(spacing: Spacing.sm) {
                Text("\(formattedPace)/km")
                    .font(AppFont.paceBadge)
                    .foregroundStyle(Color.accentPrimary)
                    .padding(.horizontal, Spacing.md)
                    .padding(.vertical, Spacing.sm)
                    .background(
                        RoundedRectangle(cornerRadius: CornerRadius.lg)
                            .fill(Color.accentPrimary.opacity(0.12))
                            .overlay(
                                RoundedRectangle(cornerRadius: CornerRadius.lg)
                                    .stroke(Color.accentPrimary.opacity(0.2), lineWidth: 1)
                            )
                    )

                Image(systemName: "chevron.right")
                    .font(.system(size: 14))
                    .foregroundStyle(Color.textMuted)
            }
        }
        .padding(.horizontal, Spacing.lg)
        .padding(.vertical, Spacing.lg)
        .background(
            RoundedRectangle(cornerRadius: CornerRadius.xl)
                .fill(showAccentBar ? Color.surfaceOverlay : Color.surfaceRaised)
                .overlay(
                    RoundedRectangle(cornerRadius: CornerRadius.xl)
                        .stroke(
                            showAccentBar ? Color.borderDefault : Color.borderSubtle,
                            lineWidth: 1
                        )
                )
        )
        .scaleEffect(isPressed ? 0.98 : 1.0)
        .animation(AppAnimation.fast, value: isPressed)
        .animation(AppAnimation.fast, value: showAccentBar)
        .onTapGesture {
            // Trigger haptic feedback
            let generator = UIImpactFeedbackGenerator(style: .light)
            generator.impactOccurred()
        }
        .onLongPressGesture(
            minimumDuration: 0,
            pressing: { pressing in
                isPressed = pressing
                showAccentBar = pressing
            },
            perform: {}
        )
    }
}

// MARK: - Activity List

/// Vertical list of activity cards
struct ActivityList: View {
    let activities: [ActivityData]
    let maxItems: Int

    struct ActivityData: Identifiable {
        let id: String
        let date: Date
        let distanceMeters: Double
        let durationSeconds: Int
        let paceSecondsPerKm: Double?
    }

    init(activities: [ActivityData], maxItems: Int = 5) {
        self.activities = activities
        self.maxItems = maxItems
    }

    var body: some View {
        VStack(spacing: Spacing.sm) {
            ForEach(Array(activities.prefix(maxItems).enumerated()), id: \.element.id) { index, activity in
                ActivityCardView(
                    date: activity.date,
                    distanceMeters: activity.distanceMeters,
                    durationSeconds: activity.durationSeconds,
                    paceSecondsPerKm: activity.paceSecondsPerKm
                )
                .cardEntrance(index: index)
            }
        }
    }
}

// MARK: - Empty State

struct EmptyActivityView: View {
    var body: some View {
        VStack(spacing: Spacing.lg) {
            ZStack {
                Circle()
                    .fill(Color.surfaceOverlay)
                    .frame(width: 48, height: 48)

                Image(systemName: "figure.run")
                    .font(.system(size: 24))
                    .foregroundStyle(Color.textMuted)
            }

            VStack(spacing: Spacing.xs) {
                Text("No runs recorded yet")
                    .font(AppFont.bodyMedium.weight(.medium))
                    .foregroundStyle(Color.textSecondary)

                Text("Start tracking to see your activity")
                    .font(AppFont.caption)
                    .foregroundStyle(Color.textMuted)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(Spacing.xxl)
        .background(
            RoundedRectangle(cornerRadius: CornerRadius.xxl)
                .fill(Color.surfaceRaised)
                .overlay(
                    RoundedRectangle(cornerRadius: CornerRadius.xxl)
                        .stroke(Color.borderSubtle, lineWidth: 1)
                )
        )
    }
}

// MARK: - Preview

#Preview("Activity Cards") {
    ZStack {
        Color.surfaceGround.ignoresSafeArea()

        ScrollView {
            VStack(spacing: Spacing.lg) {
                ActivityCardView(
                    date: Date(),
                    distanceMeters: 5420,
                    durationSeconds: 1832
                )

                ActivityCardView(
                    date: Calendar.current.date(byAdding: .day, value: -1, to: Date())!,
                    distanceMeters: 8100,
                    durationSeconds: 2640
                )

                ActivityCardView(
                    date: Calendar.current.date(byAdding: .day, value: -3, to: Date())!,
                    distanceMeters: 10500,
                    durationSeconds: 3420
                )
            }
            .padding()
        }
    }
}

#Preview("Empty State") {
    ZStack {
        Color.surfaceGround.ignoresSafeArea()

        EmptyActivityView()
            .padding()
    }
}
