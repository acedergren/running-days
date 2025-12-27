import SwiftUI

// MARK: - Auth Step
// Sign in or create account

struct AuthStep: View {
    @Binding var email: String
    @Binding var password: String
    @Binding var isCreatingAccount: Bool
    let isAuthenticating: Bool
    let onSubmit: () -> Void

    @FocusState private var focusedField: Field?

    enum Field {
        case email
        case password
    }

    var body: some View {
        VStack(spacing: Spacing.xxl) {
            Spacer()

            // Header
            VStack(spacing: Spacing.lg) {
                Text(isCreatingAccount ? "Create Account" : "Welcome Back")
                    .font(AppFont.displayMedium)
                    .foregroundStyle(Color.textPrimary)

                Text(isCreatingAccount
                     ? "Sign up to sync your progress across devices"
                     : "Sign in to access your running data")
                    .font(AppFont.bodyLarge)
                    .foregroundStyle(Color.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Spacing.lg)
            }

            // Form
            VStack(spacing: Spacing.lg) {
                // Email field
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Text("Email")
                        .font(AppFont.caption)
                        .foregroundStyle(Color.textMuted)

                    TextField("your@email.com", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                        .autocorrectionDisabled()
                        .focused($focusedField, equals: .email)
                        .font(AppFont.bodyMedium)
                        .foregroundStyle(Color.textPrimary)
                        .padding(Spacing.lg)
                        .background(
                            RoundedRectangle(cornerRadius: CornerRadius.lg)
                                .fill(Color.surfaceRaised)
                                .overlay(
                                    RoundedRectangle(cornerRadius: CornerRadius.lg)
                                        .stroke(
                                            focusedField == .email
                                                ? Color.accentPrimary
                                                : Color.borderSubtle,
                                            lineWidth: 1
                                        )
                                )
                        )
                }

                // Password field
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Text("Password")
                        .font(AppFont.caption)
                        .foregroundStyle(Color.textMuted)

                    SecureField("••••••••", text: $password)
                        .textContentType(isCreatingAccount ? .newPassword : .password)
                        .focused($focusedField, equals: .password)
                        .font(AppFont.bodyMedium)
                        .foregroundStyle(Color.textPrimary)
                        .padding(Spacing.lg)
                        .background(
                            RoundedRectangle(cornerRadius: CornerRadius.lg)
                                .fill(Color.surfaceRaised)
                                .overlay(
                                    RoundedRectangle(cornerRadius: CornerRadius.lg)
                                        .stroke(
                                            focusedField == .password
                                                ? Color.accentPrimary
                                                : Color.borderSubtle,
                                            lineWidth: 1
                                        )
                                )
                        )
                }
            }
            .padding(.horizontal, Spacing.xl)

            Spacer()

            // Actions
            VStack(spacing: Spacing.md) {
                // Submit button
                Button(action: onSubmit) {
                    HStack(spacing: Spacing.sm) {
                        if isAuthenticating {
                            ProgressView()
                                .scaleEffect(0.9)
                                .tint(.white)
                        }

                        Text(isCreatingAccount ? "Create Account" : "Sign In")
                    }
                    .font(AppFont.labelLarge)
                    .foregroundStyle(Color.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.lg)
                    .background(
                        RoundedRectangle(cornerRadius: CornerRadius.xl)
                            .fill(Color.accentPrimary)
                    )
                }
                .disabled(isAuthenticating || email.isEmpty || password.isEmpty)
                .opacity(email.isEmpty || password.isEmpty ? 0.6 : 1.0)

                // Toggle mode button
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        isCreatingAccount.toggle()
                    }
                    HapticFeedback.light.trigger()
                } label: {
                    Text(isCreatingAccount
                         ? "Already have an account? **Sign in**"
                         : "Don't have an account? **Create one**")
                        .font(AppFont.bodyMedium)
                        .foregroundStyle(Color.textSecondary)
                }
                .disabled(isAuthenticating)
            }
            .padding(.horizontal, Spacing.xl)
            .padding(.bottom, Spacing.xxl)
        }
        .onSubmit {
            switch focusedField {
            case .email:
                focusedField = .password
            case .password:
                onSubmit()
            case .none:
                break
            }
        }
    }
}

// MARK: - Preview

#Preview("Create Account") {
    AuthStep(
        email: .constant(""),
        password: .constant(""),
        isCreatingAccount: .constant(true),
        isAuthenticating: false,
        onSubmit: {}
    )
    .background(Color.surfaceGround)
}

#Preview("Sign In") {
    AuthStep(
        email: .constant("test@example.com"),
        password: .constant("password"),
        isCreatingAccount: .constant(false),
        isAuthenticating: false,
        onSubmit: {}
    )
    .background(Color.surfaceGround)
}
