import Foundation

// MARK: - API Client
// Async/await HTTP client for the Running Days API

actor APIClient {
    // MARK: - Singleton

    static let shared = APIClient()

    // MARK: - Properties

    private let baseURL: URL
    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    // MARK: - Initialization

    private init() {
        // Configure base URL
        // SECURITY: Always use HTTPS, even for local development
        // For local dev, use a reverse proxy with TLS or configure ATS exceptions
        #if DEBUG
        // Use HTTPS even in debug - configure local proxy or use ngrok for testing
        self.baseURL = URL(string: "https://localhost:3000/api/v1")!
        #else
        self.baseURL = URL(string: "https://api.running-days.com/api/v1")!
        #endif

        // Configure URL session
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: config)

        // Configure JSON decoder
        self.decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        // Configure JSON encoder
        self.encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.keyEncodingStrategy = .convertToSnakeCase
    }

    // MARK: - Request Building

    private func buildRequest(
        path: String,
        method: HTTPMethod = .get,
        body: Data? = nil,
        requiresAuth: Bool = true
    ) async throws -> URLRequest {
        let url = baseURL.appendingPathComponent(path)
        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        // Add auth token if required
        if requiresAuth, let token = await AuthService.shared.getValidAccessToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        request.httpBody = body
        return request
    }

    // MARK: - Request Execution

    /// Execute a GET request
    func get<T: Decodable>(_ path: String, requiresAuth: Bool = true) async throws -> T {
        let request = try await buildRequest(path: path, requiresAuth: requiresAuth)
        return try await execute(request)
    }

    /// Execute a POST request
    func post<T: Encodable, R: Decodable>(
        _ path: String,
        body: T,
        requiresAuth: Bool = true
    ) async throws -> R {
        let bodyData = try encoder.encode(body)
        let request = try await buildRequest(
            path: path,
            method: .post,
            body: bodyData,
            requiresAuth: requiresAuth
        )
        return try await execute(request)
    }

    /// Execute a POST request without response body
    func post<T: Encodable>(_ path: String, body: T, requiresAuth: Bool = true) async throws {
        let bodyData = try encoder.encode(body)
        let request = try await buildRequest(
            path: path,
            method: .post,
            body: bodyData,
            requiresAuth: requiresAuth
        )
        let _ = try await executeRaw(request)
    }

    /// Execute a PUT request
    func put<T: Encodable, R: Decodable>(
        _ path: String,
        body: T,
        requiresAuth: Bool = true
    ) async throws -> R {
        let bodyData = try encoder.encode(body)
        let request = try await buildRequest(
            path: path,
            method: .put,
            body: bodyData,
            requiresAuth: requiresAuth
        )
        return try await execute(request)
    }

    /// Execute a DELETE request
    func delete(_ path: String, requiresAuth: Bool = true) async throws {
        let request = try await buildRequest(path: path, method: .delete, requiresAuth: requiresAuth)
        let _ = try await executeRaw(request)
    }

    // MARK: - Private Execution

    private func execute<T: Decodable>(_ request: URLRequest) async throws -> T {
        let data = try await executeRaw(request)
        return try decoder.decode(T.self, from: data)
    }

    private func executeRaw(_ request: URLRequest) async throws -> Data {
        let (data, response) = try await session.data(for: request)
        try validateResponse(response, data: data)
        return data
    }

    private func validateResponse(_ response: URLResponse, data: Data) throws {
        guard let httpResponse = response as? HTTPURLResponse else {
            throw NetworkError.invalidResponse
        }

        switch httpResponse.statusCode {
        case 200...299:
            return

        case 401:
            // Try to refresh token
            throw NetworkError.unauthorized

        case 403:
            throw NetworkError.forbidden

        case 404:
            throw NetworkError.notFound

        case 422:
            // Validation error - try to parse error message
            if let errorResponse = try? decoder.decode(APIErrorResponse.self, from: data) {
                throw NetworkError.validationError(errorResponse.message)
            }
            throw NetworkError.validationError("Validation failed")

        case 500...599:
            throw NetworkError.serverError(httpResponse.statusCode)

        default:
            throw NetworkError.unknown(httpResponse.statusCode)
        }
    }
}

// MARK: - HTTP Methods

enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case delete = "DELETE"
    case patch = "PATCH"
}

// MARK: - Network Errors

enum NetworkError: LocalizedError {
    case invalidResponse
    case unauthorized
    case forbidden
    case notFound
    case validationError(String)
    case serverError(Int)
    case unknown(Int)
    case noConnection

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response from server"
        case .unauthorized:
            return "Please sign in to continue"
        case .forbidden:
            return "You don't have permission to access this resource"
        case .notFound:
            return "The requested resource was not found"
        case .validationError(let message):
            return message
        case .serverError(let code):
            return "Server error (\(code)). Please try again later"
        case .unknown(let code):
            return "An error occurred (\(code))"
        case .noConnection:
            return "No internet connection"
        }
    }
}

// MARK: - API Error Response

struct APIErrorResponse: Decodable {
    let success: Bool
    let message: String
    let errors: [String: [String]]?
}

// MARK: - Stats Service

extension APIClient {
    /// Fetch dashboard data
    func fetchDashboard() async throws -> DashboardResponse {
        try await get("stats/dashboard")
    }

    /// Fetch insights data
    func fetchInsights() async throws -> InsightsResponse {
        try await get("stats/insights")
    }

    /// Upload workouts from HealthKit
    func uploadWorkouts(_ workouts: [ProcessedWorkout]) async throws {
        struct UploadRequest: Encodable {
            let workouts: [ProcessedWorkout]
        }

        try await post("webhook/batch", body: UploadRequest(workouts: workouts))
    }
}

// MARK: - Goals Service

extension APIClient {
    /// Fetch goals
    func fetchGoals() async throws -> [Goal] {
        try await get("goals")
    }

    /// Fetch goal progress for a year
    func fetchGoalProgress(year: Int) async throws -> GoalProgressResponse {
        try await get("goals/\(year)/progress")
    }

    /// Update goal target
    func updateGoal(year: Int, targetDays: Int) async throws -> Goal {
        struct UpdateRequest: Encodable {
            let targetDays: Int
        }

        return try await put("goals/\(year)", body: UpdateRequest(targetDays: targetDays))
    }
}
