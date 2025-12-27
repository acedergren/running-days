import WidgetKit
import SwiftUI

// MARK: - Timeline Entry

struct RunningDaysEntry: TimelineEntry {
    let date: Date
    let daysCompleted: Int
    let targetDays: Int
    let progress: Double
    let daysAhead: Int

    static let placeholder = RunningDaysEntry(
        date: Date(),
        daysCompleted: 247,
        targetDays: 300,
        progress: 82.3,
        daysAhead: 12
    )
}

// MARK: - Timeline Provider

struct RunningDaysProvider: TimelineProvider {
    func placeholder(in context: Context) -> RunningDaysEntry {
        .placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (RunningDaysEntry) -> Void) {
        let entry = loadEntry() ?? .placeholder
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<RunningDaysEntry>) -> Void) {
        let entry = loadEntry() ?? .placeholder

        // Refresh every 30 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))

        completion(timeline)
    }

    private func loadEntry() -> RunningDaysEntry? {
        guard let data = SharedDataStore.shared.loadWidgetData() else {
            return nil
        }

        return RunningDaysEntry(
            date: Date(),
            daysCompleted: data.daysCompleted,
            targetDays: data.targetDays,
            progress: data.progress,
            daysAhead: data.daysAhead
        )
    }
}

// MARK: - Widget Entry View

struct RunningDaysWidgetEntryView: View {
    var entry: RunningDaysEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(entry: entry)
        case .systemMedium:
            MediumWidgetView(entry: entry)
        case .systemLarge:
            LargeWidgetView(entry: entry)
        default:
            SmallWidgetView(entry: entry)
        }
    }
}

// MARK: - Small Widget

struct SmallWidgetView: View {
    let entry: RunningDaysEntry

    var body: some View {
        ZStack {
            // Background
            Color.surfaceBase

            VStack(spacing: 8) {
                // Mini progress ring
                ZStack {
                    Circle()
                        .stroke(Color.neutral800.opacity(0.4), lineWidth: 8)

                    Circle()
                        .trim(from: 0, to: entry.progress / 100)
                        .stroke(
                            Color.accentPrimary,
                            style: StrokeStyle(lineWidth: 8, lineCap: .round)
                        )
                        .rotationEffect(.degrees(-90))
                        .shadow(color: Color.accentPrimary.opacity(0.5), radius: 4)

                    VStack(spacing: 0) {
                        Text("\(entry.daysCompleted)")
                            .font(.system(size: 24, weight: .bold, design: .rounded))
                            .foregroundStyle(Color.textPrimary)
                            .monospacedDigit()

                        Text("days")
                            .font(.system(size: 10))
                            .foregroundStyle(Color.textMuted)
                    }
                }
                .frame(width: 80, height: 80)

                // Status
                HStack(spacing: 4) {
                    Image(systemName: entry.daysAhead >= 0 ? "arrow.up" : "arrow.down")
                        .font(.system(size: 10, weight: .bold))

                    Text("\(abs(entry.daysAhead)) \(entry.daysAhead >= 0 ? "ahead" : "behind")")
                        .font(.system(size: 11, weight: .medium))
                }
                .foregroundStyle(entry.daysAhead >= 0 ? Color.success : Color.warning)
            }
            .padding()
        }
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

// MARK: - Medium Widget

struct MediumWidgetView: View {
    let entry: RunningDaysEntry

    var remaining: Int {
        max(entry.targetDays - entry.daysCompleted, 0)
    }

    var body: some View {
        ZStack {
            Color.surfaceBase

            HStack(spacing: 20) {
                // Progress ring
                ZStack {
                    Circle()
                        .stroke(Color.neutral800.opacity(0.4), lineWidth: 10)

                    Circle()
                        .trim(from: 0, to: entry.progress / 100)
                        .stroke(
                            AngularGradient(
                                colors: [Color.accentPrimary, Color(red: 0.88, green: 0.35, blue: 0.18)],
                                center: .center
                            ),
                            style: StrokeStyle(lineWidth: 10, lineCap: .round)
                        )
                        .rotationEffect(.degrees(-90))
                        .shadow(color: Color.accentPrimary.opacity(0.5), radius: 5)

                    VStack(spacing: 2) {
                        Text("\(entry.daysCompleted)")
                            .font(.system(size: 32, weight: .bold, design: .rounded))
                            .foregroundStyle(Color.textPrimary)
                            .monospacedDigit()

                        Text("of \(entry.targetDays)")
                            .font(.system(size: 12))
                            .foregroundStyle(Color.textMuted)
                    }
                }
                .frame(width: 100, height: 100)

                // Stats column
                VStack(alignment: .leading, spacing: 12) {
                    Text("Running Days")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Color.textPrimary)

                    VStack(alignment: .leading, spacing: 8) {
                        WidgetStatRow(
                            label: "Progress",
                            value: "\(Int(entry.progress))%"
                        )

                        WidgetStatRow(
                            label: entry.daysAhead >= 0 ? "Days Ahead" : "Days Behind",
                            value: "\(abs(entry.daysAhead))",
                            valueColor: entry.daysAhead >= 0 ? .success : .warning
                        )

                        WidgetStatRow(
                            label: "Remaining",
                            value: "\(remaining)"
                        )
                    }
                }

                Spacer()
            }
            .padding()
        }
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

// MARK: - Large Widget

struct LargeWidgetView: View {
    let entry: RunningDaysEntry

    var remaining: Int {
        max(entry.targetDays - entry.daysCompleted, 0)
    }

    var body: some View {
        ZStack {
            Color.surfaceBase

            VStack(spacing: 16) {
                // Header
                HStack {
                    Text("Running Days")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(Color.textPrimary)

                    Spacer()

                    Text("\(Calendar.current.component(.year, from: Date()))")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(Color.textMuted)
                }

                // Large progress ring
                ZStack {
                    Circle()
                        .stroke(Color.neutral800.opacity(0.4), lineWidth: 14)

                    Circle()
                        .trim(from: 0, to: entry.progress / 100)
                        .stroke(
                            AngularGradient(
                                colors: [
                                    Color(red: 1.0, green: 0.55, blue: 0.35),
                                    Color.accentPrimary,
                                    Color(red: 0.88, green: 0.35, blue: 0.18)
                                ],
                                center: .center
                            ),
                            style: StrokeStyle(lineWidth: 14, lineCap: .round)
                        )
                        .rotationEffect(.degrees(-90))
                        .shadow(color: Color.accentPrimary.opacity(0.5), radius: 8)

                    VStack(spacing: 4) {
                        Text("\(entry.daysCompleted)")
                            .font(.system(size: 48, weight: .bold, design: .rounded))
                            .foregroundStyle(Color.textPrimary)
                            .monospacedDigit()

                        Text("of \(entry.targetDays) days")
                            .font(.system(size: 14))
                            .foregroundStyle(Color.textMuted)
                    }
                }
                .frame(width: 160, height: 160)

                // Status pill
                HStack(spacing: 6) {
                    Image(systemName: entry.daysAhead >= 0 ? "arrow.up" : "arrow.down")
                        .font(.system(size: 12, weight: .bold))

                    Text("\(abs(entry.daysAhead)) days \(entry.daysAhead >= 0 ? "ahead" : "behind") pace")
                        .font(.system(size: 13, weight: .semibold))
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .foregroundStyle(entry.daysAhead >= 0 ? Color.success : Color.warning)
                .background(
                    Capsule()
                        .fill(entry.daysAhead >= 0 ? Color.successMuted : Color.warningMuted)
                )

                // Stats row
                HStack(spacing: 16) {
                    WidgetStatBox(label: "Progress", value: "\(Int(entry.progress))%")
                    WidgetStatBox(label: "Remaining", value: "\(remaining)")
                    WidgetStatBox(
                        label: entry.daysAhead >= 0 ? "Ahead" : "Behind",
                        value: "\(abs(entry.daysAhead))",
                        valueColor: entry.daysAhead >= 0 ? .success : .warning
                    )
                }
            }
            .padding()
        }
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

// MARK: - Widget Stat Components

struct WidgetStatRow: View {
    let label: String
    let value: String
    var valueColor: Color = .textPrimary

    var body: some View {
        HStack {
            Text(label)
                .font(.system(size: 11))
                .foregroundStyle(Color.textMuted)

            Spacer()

            Text(value)
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .foregroundStyle(valueColor)
                .monospacedDigit()
        }
    }
}

struct WidgetStatBox: View {
    let label: String
    let value: String
    var valueColor: Color = .textPrimary

    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 20, weight: .bold, design: .rounded))
                .foregroundStyle(valueColor)
                .monospacedDigit()

            Text(label)
                .font(.system(size: 11))
                .foregroundStyle(Color.textMuted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.surfaceRaised)
        )
    }
}

// MARK: - Widget Configuration

@main
struct RunningDaysWidgets: WidgetBundle {
    var body: some Widget {
        RunningDaysProgressWidget()
    }
}

struct RunningDaysProgressWidget: Widget {
    let kind: String = "RunningDaysProgress"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: RunningDaysProvider()) { entry in
            RunningDaysWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Progress Ring")
        .description("Track your running days goal progress.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// MARK: - Preview

#Preview("Small", as: .systemSmall) {
    RunningDaysProgressWidget()
} timeline: {
    RunningDaysEntry.placeholder
}

#Preview("Medium", as: .systemMedium) {
    RunningDaysProgressWidget()
} timeline: {
    RunningDaysEntry.placeholder
}

#Preview("Large", as: .systemLarge) {
    RunningDaysProgressWidget()
} timeline: {
    RunningDaysEntry.placeholder
}
