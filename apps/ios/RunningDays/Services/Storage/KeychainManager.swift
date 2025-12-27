import Foundation
import Security

// MARK: - Keychain Manager
// Secure storage for tokens and sensitive data

final class KeychainManager {
    // MARK: - Singleton

    static let shared = KeychainManager()

    // MARK: - Properties

    private let service = "com.runningdays.app"

    // MARK: - Keys

    enum Key: String {
        case accessToken
        case refreshToken
        case tokenExpiry
        case userId
    }

    // MARK: - Initialization

    private init() {}

    // MARK: - Public Methods

    /// Save a string value to the keychain
    func save(key: Key, value: String) {
        guard let data = value.data(using: .utf8) else { return }
        save(key: key.rawValue, data: data)
    }

    /// Read a string value from the keychain
    func read(key: Key) -> String? {
        guard let data = read(key: key.rawValue) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    /// Delete a value from the keychain
    func delete(key: Key) {
        delete(key: key.rawValue)
    }

    /// Save a Date to the keychain
    func save(key: Key, date: Date) {
        save(key: key, value: String(date.timeIntervalSince1970))
    }

    /// Read a Date from the keychain
    func readDate(key: Key) -> Date? {
        guard let string = read(key: key),
              let interval = Double(string) else { return nil }
        return Date(timeIntervalSince1970: interval)
    }

    /// Clear all stored values
    func clearAll() {
        for key in [Key.accessToken, .refreshToken, .tokenExpiry, .userId] {
            delete(key: key)
        }
    }

    // MARK: - Private Methods

    private func save(key: String, data: Data) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            // SECURITY: Accessible after first unlock, even when device is locked (for background sync)
            // This device only - prevents iCloud Keychain sync of sensitive tokens
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
            // Prevent iCloud sync of tokens
            kSecAttrSynchronizable as String: kCFBooleanFalse as Any
        ]

        // Delete existing item first
        let deleteQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(deleteQuery as CFDictionary)

        // Add new item
        let status = SecItemAdd(query as CFDictionary, nil)

        #if DEBUG
        if status != errSecSuccess {
            // Only log in debug builds, avoid exposing key names in production
            print("Keychain save failed: \(status)")
        }
        #endif
    }

    private func read(key: String) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess else { return nil }
        return result as? Data
    }

    private func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]

        SecItemDelete(query as CFDictionary)
    }
}
