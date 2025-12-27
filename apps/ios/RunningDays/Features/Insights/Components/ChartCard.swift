import SwiftUI

// MARK: - Chart Card
// Reusable container for chart sections

struct ChartCard<Content: View>: View {
    let title: String
    let iconName: String
    let content: Content

    init(
        title: String,
        iconName: String,
        @ViewBuilder content: () -> Content
    ) {
        self.title = title
        self.iconName = iconName
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.lg) {
            // Header
            HStack(spacing: Spacing.sm) {
                Image(systemName: iconName)
                    .font(.system(size: 14))
                    .foregroundStyle(Color.textMuted)

                Text(title.uppercased())
                    .font(AppFont.sectionHeader)
                    .foregroundStyle(Color.textMuted)
                    .tracking(0.5)
            }

            // Chart content
            content
                .frame(height: 200)
        }
        .padding(Spacing.lg)
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

// MARK: - Empty Chart State

struct EmptyChartView: View {
    let message: String

    init(_ message: String = "Not enough data yet") {
        self.message = message
    }

    var body: some View {
        VStack {
            Spacer()
            Text(message)
                .font(AppFont.bodyMedium)
                .foregroundStyle(Color.textMuted)
            Spacer()
        }
        .frame(maxWidth: .infinity)
    }
}
