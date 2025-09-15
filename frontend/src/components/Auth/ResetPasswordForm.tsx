import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { authApi } from "@/api/auth";
import { getApiError } from "@/api/http";

interface ResetPasswordFormProps {
  token: string;
  onSuccess: () => void;
}

export function ResetPasswordForm({ token, onSuccess }: ResetPasswordFormProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    if (!token) {
      setIsValidToken(false);
      setErrorMessage("유효하지 않은 토큰입니다.");
      setValidating(false);
      return;
    }

    try {
      const response = await authApi.validateResetToken(token);
      setIsValidToken(response.valid);
      if (!response.valid) {
        setErrorMessage(response.message);
      }
    } catch (error) {
      const apiError = getApiError(error);
      setIsValidToken(false);
      setErrorMessage(apiError.message);
    } finally {
      setValidating(false);
    }
  };

  const validatePassword = (password: string): string | null => {
    if (password.length < 6) {
      return "비밀번호는 최소 6자 이상이어야 합니다.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast.error("모든 필드를 입력해주세요.");
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    try {
      await authApi.confirmPasswordReset({
        token,
        newPassword
      });
      toast.success("비밀번호가 성공적으로 변경되었습니다.");
      onSuccess();
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">토큰 유효성을 확인하는 중...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isValidToken) {
    return (
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <h2 className="text-2xl font-bold text-center text-red-600">오류</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-gray-600">
            <p>{errorMessage}</p>
            <p className="mt-4 text-sm">새로운 비밀번호 재설정을 요청해주세요.</p>
          </div>
        </CardContent>
        <CardFooter className="pt-6">
          <Button
            onClick={() => window.location.href = "/"}
            variant="outline"
            className="w-full"
          >
            로그인 화면으로 이동
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader>
        <h2 className="text-2xl font-bold text-center">새 비밀번호 설정</h2>
        <p className="text-center text-gray-600">새로운 비밀번호를 입력해주세요</p>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">새 비밀번호</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="새 비밀번호를 입력하세요 (6자 이상)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">비밀번호 확인</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="비밀번호를 다시 입력하세요"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          {newPassword && (
            <div className="text-sm text-gray-600">
              <p className={`${validatePassword(newPassword) ? 'text-red-600' : 'text-green-600'}`}>
                {validatePassword(newPassword) || '✓ 비밀번호 조건을 만족합니다'}
              </p>
            </div>
          )}
          {confirmPassword && (
            <div className="text-sm text-gray-600">
              <p className={`${newPassword !== confirmPassword ? 'text-red-600' : 'text-green-600'}`}>
                {newPassword !== confirmPassword ? '✗ 비밀번호가 일치하지 않습니다' : '✓ 비밀번호가 일치합니다'}
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-6">
          <Button
            type="submit"
            className="w-full"
            disabled={loading || !newPassword || !confirmPassword}
          >
            {loading ? "처리 중..." : "비밀번호 변경"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}