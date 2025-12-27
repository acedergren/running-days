import Foundation
import Observation

// MARK: - Auth Service
// Handles authentication, token management, and session state

@Observable
final class AuthService {
    // MARK: - Singleton

    static let shared = AuthService()

    // MARK: - Properties

    private let keychain = KeychainManager.shared

    /// Current user (nil if not authenticated)
    private(set) var currentUser: User?

    /// Whether the user is authenticated
    var isAuthenticated: Bool {
        currentUser != nil && hasValidToken
    }

    /// Whether we have a valid (non-expired) access token
    private var hasValidToken: Bool {
        guard let expiry = keychain.readDate(key: .tokenExpiry) else { return false }
        return expiry > Date()
    }

    // MARK: - Initialization

    private init() {
        // Try to restore session on init
        Task {
            await restoreSession()
        }
    }

    // MARK: - Authentication

    /// Log in with email and password
    @MainActor
    func login(email: String, password: String) async throws {
        struct LoginRequest: Encodable {
            let email: String
            let password: String
        }

        struct LoginResponse: Decodable {
            let success: Bool
            let user: User
            let accessToken: String
            let refreshToken: String
            let expiresIn: Int  // seconds until expiry
        }

        // Note: The actual API uses httpOnly cookies, but for mobile we'll assume
        // a mobile-specific endpoint that returns tokens in the response body
        let response: LoginResponse = try await APIClient.shared.post(
            "auth/login",
            body: LoginRequest(email: email, password: password),
            requiresAuth: false
        )

        // Store tokens in keychain
        keychain.save(key: .accessToken, value: response.accessToken)
        keychain.save(key: .refreshToken, value: response.refreshToken)

        let expiry = Date().addingTimeInterval(TimeInterval(response.expiresIn))
        keychain.save(key: .tokenExpiry, date: expiry)
        keychain.save(key: .userId, value: response.user.id)

        currentUser = response.user
    }

    /// Register a new account
    @MainActor
    func register(email: String, password: String) async throws {
        struct RegisterRequest: Encodable {
            let email: String
            let password: String
        }

        struct RegisterResponse: Decodable {
            let success: Bool
            let user: User
            let accessToken: String
            let refreshToken: String
            let expiresIn: Int
        }

        let response: RegisterResponse = try await APIClient.shared.post(
            "auth/register",
            body: RegisterRequest(email: email, password: password),
            requiresAuth: false
        )

        // Store tokens
        keychain.save(key: .accessToken, value: response.accessToken)
        keychain.save(key: .refreshToken, value: response.refreshToken)

        let expiry = Date().addingTimeInterval(TimeInterval(response.expiresIn))
        keychain.save(key: .tokenExpiry, date: expiry)
        keychain.save(key: .userId, value: response.user.id)

        currentUser = response.user
    }

    /// Log out and clear session
    @MainActor
    func logout() async {
        // Try to revoke session on server (ignore errors)
        do {
            try await APIClient.shared.post("auth/logout", body: EmptyBody())
        } catch {
            // Ignore errors - we'll clear local state anyway
        }

        // Clear local state
        keychain.clearAll()
        currentUser = nil
    }

    // MARK: - Token Management

    /// Get a valid access token, refreshing if necessary
    func getValidAccessToken() async -> String? {
        guard let token = keychain.read(key: .accessToken) else { return nil }

        // Check if token is expired
        if let expiry = keychain.readDate(key: .tokenExpiry), expiry < Date() {
            // Try to refresh
            do {
                return try await refreshToken()
            } catch {
                return nil
            }
        }

        return token
    }

    /// Refresh the access token using the refresh token
    private func refreshToken() async throws -> String {
        guard let refreshToken = keychain.read(key: .refreshToken) else {
            throw AuthError.noRefreshToken
        }

        struct RefreshRequest: Encodable {
            let refreshToken: String
        }

        struct RefreshResponse: Decodable {
            let accessToken: String
            let refreshToken: String
            let expiresIn: Int
        }

        let response: RefreshResponse = try await APIClient.shared.post(
            "auth/refresh",
            body: RefreshRequest(refreshToken: refreshToken),
            requiresAuth: false
        )

        // Store new tokens
        keychain.save(key: .accessToken, value: response.accessToken)
        keychain.save(key: .refreshToken, value: response.refreshToken)

        let expiry = Date().addingTimeInterval(TimeInterval(response.expiresIn))
        keychain.save(key: .tokenExpiry, date: expiry)

        return response.accessToken
    }

    // MARK: - Session Restoration

    /// Try to restore session from stored tokens
    @MainActor
    private func restoreSession() async {
        guard hasValidToken else {
            // Try refresh if we have a refresh token
            if keychain.read(key: .refreshToken) != nil {
                do {
                    _ = try await refreshToken()
                } catch {
                    // Refresh failed - clear everything
                    keychain.clearAll()
                    return
                }
            } else {
                return
            }
        }

        // Fetch current user
        do {
            currentUser = try await fetchCurrentUser()
        } catch {
            // Token might be invalid
            keychain.clearAll()
        }
    }

    /// Fetch the current user from the API
    private func fetchCurrentUser() async throws -> User {
        struct MeResponse: Decodable {
            let user: User
        }

        let response: MeResponse = try await APIClient.shared.get("auth/me")
        return response.user
    }
}

// MARK: - Auth Errors

enum AuthError: LocalizedError {
    case noRefreshToken
    case refreshFailed
    case invalidCredentials
    case registrationFailed

    var errorDescription: String? {
        switch self {
        case .noRefreshToken:
            return "No refresh token available"
        case .refreshFailed:
            return "Failed to refresh session"
        case .invalidCredentials:
            return "Invalid email or password"
        case .registrationFailed:
            return "Registration failed"
        }
    }
}

// MARK: - Helper Types

private struct EmptyBody: Encodable {}
