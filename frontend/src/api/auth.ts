import { http } from "./http";

export interface ForgotIdRequest {
  email: string;
}

export interface PasswordResetRequest {
  emailOrUsername: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface SuccessResponse {
  message: string;
}

export interface TokenValidationResponse {
  valid: boolean;
  message: string;
}

export const authApi = {
  // 아이디 찾기
  forgotId: (data: ForgotIdRequest): Promise<SuccessResponse> =>
    http.post("/auth/forgot-id", data).then(res => res.data),

  // 비밀번호 재설정 요청
  requestPasswordReset: (data: PasswordResetRequest): Promise<SuccessResponse> =>
    http.post("/auth/password-reset/request", data).then(res => res.data),

  // 토큰 유효성 확인
  validateResetToken: (token: string): Promise<TokenValidationResponse> =>
    http.get("/auth/password-reset/validate", { params: { token } }).then(res => res.data),

  // 비밀번호 재설정 완료
  confirmPasswordReset: (data: PasswordResetConfirm): Promise<void> =>
    http.post("/auth/password-reset/confirm", data).then(() => undefined),
};