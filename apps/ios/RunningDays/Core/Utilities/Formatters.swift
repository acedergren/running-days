import Foundation

// MARK: - Formatters
// Utility functions matching the web app's formatting (src/lib/utils.ts)

enum Formatters {
    // MARK: - Distance

    /// Format distance in meters to km string
    /// - Parameter meters: Distance in meters
    /// - Returns: Formatted string like "5.42" or "12.3"
    static func formatDistance(_ meters: Double) -> String {
        let km = meters / 1000
        if km >= 100 {
            return String(format: "%.0f", km)
        } else if km >= 10 {
            return String(format: "%.1f", km)
        }
        return String(format: "%.2f", km)
    }

    // MARK: - Duration

    /// Format duration in seconds to time string
    /// - Parameter seconds: Duration in seconds
    /// - Returns: Formatted string like "45:32" or "1:32:15"
    static func formatDuration(_ seconds: Int) -> String {
        let hours = seconds / 3600
        let minutes = (seconds % 3600) / 60
        let secs = seconds % 60

        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, secs)
        }
        return String(format: "%d:%02d", minutes, secs)
    }

    /// Format duration in seconds to hours string
    /// - Parameter seconds: Duration in seconds
    /// - Returns: Formatted string like "4.5" hours
    static func formatDurationHours(_ seconds: Int) -> String {
        let hours = Double(seconds) / 3600
        if hours >= 10 {
            return String(format: "%.0f", hours)
        }
        return String(format: "%.1f", hours)
    }

    // MARK: - Pace

    /// Format pace from seconds per km to min:sec string
    /// - Parameter secondsPerKm: Pace in seconds per kilometer
    /// - Returns: Formatted string like "5:42"
    static func formatPace(_ secondsPerKm: Double) -> String {
        guard secondsPerKm > 0 && secondsPerKm.isFinite else { return "--:--" }

        let minutes = Int(secondsPerKm) / 60
        let seconds = Int(secondsPerKm) % 60
        return String(format: "%d:%02d", minutes, seconds)
    }

    /// Calculate pace from distance and duration
    /// - Parameters:
    ///   - distanceMeters: Distance in meters
    ///   - durationSeconds: Duration in seconds
    /// - Returns: Pace in seconds per kilometer
    static func calculatePace(distanceMeters: Double, durationSeconds: Int) -> Double? {
        guard distanceMeters > 0 else { return nil }
        let distanceKm = distanceMeters / 1000
        return Double(durationSeconds) / distanceKm
    }

    // MARK: - Ordinal

    /// Format number with ordinal suffix
    /// - Parameter number: The number to format
    /// - Returns: Formatted string like "1st", "2nd", "3rd", "4th"
    static func ordinal(_ number: Int) -> String {
        let suffix: String
        let onesDigit = number % 10
        let tensDigit = (number / 10) % 10

        if tensDigit == 1 {
            suffix = "th"
        } else {
            switch onesDigit {
            case 1: suffix = "st"
            case 2: suffix = "nd"
            case 3: suffix = "rd"
            default: suffix = "th"
            }
        }

        return "\(number)\(suffix)"
    }

    // MARK: - Date

    /// Format date to relative string
    /// - Parameter date: The date to format
    /// - Returns: Formatted string like "Today", "Yesterday", "Mon, Dec 27"
    static func formatRelativeDate(_ date: Date) -> String {
        let calendar = Calendar.current

        if calendar.isDateInToday(date) {
            return "Today"
        } else if calendar.isDateInYesterday(date) {
            return "Yesterday"
        } else {
            let formatter = DateFormatter()
            formatter.dateFormat = "EEE, MMM d"
            return formatter.string(from: date)
        }
    }

    /// Format date to short string
    /// - Parameter date: The date to format
    /// - Returns: Formatted string like "Dec 27"
    static func formatShortDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }

    // MARK: - Percentage

    /// Format percentage with optional decimal places
    /// - Parameters:
    ///   - value: The percentage value (0-100)
    ///   - decimals: Number of decimal places
    /// - Returns: Formatted string like "82%" or "82.5%"
    static func formatPercent(_ value: Double, decimals: Int = 0) -> String {
        String(format: "%.\(decimals)f%%", value)
    }
}
