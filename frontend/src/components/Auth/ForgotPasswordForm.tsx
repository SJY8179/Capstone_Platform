import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { authApi } from "@/api/auth";
import { getApiError } from "@/api/http";

interface ForgotPasswordFormProps {
  onBack: () => void;
}

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailOrUsername.trim()) {
      toast.error("이메일 또는 사용자명을 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.requestPasswordReset({
        emailOrUsername: emailOrUsername.trim()
      });
      toast.success(response.message);
      setSubmitted(true);
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <h2 className="text-2xl font-bold text-center">비밀번호 재설정 요청 완료</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-gray-600">
            <p>요청이 처리되었습니다.</p>
            <p>가입된 계정인 경우 비밀번호 재설정 링크가 발송됩니다.</p>
            <p className="mt-4 text-sm">이메일을 확인하여 재설정 링크를 클릭해주세요.</p>
            <p className="text-sm text-orange-600 mt-2">
              링크는 1시간 후에 만료됩니다.
            </p>
          </div>
        </CardContent>
        <CardFooter className="pt-6">
          <Button
            onClick={onBack}
            variant="outline"
            className="w-full"
          >
            로그인 화면으로 돌아가기
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader>
        <h2 className="text-2xl font-bold text-center">비밀번호 재설정</h2>
        <p className="text-center text-gray-600">이메일 주소를 입력해주세요</p>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emailOrUsername">이메일</Label>
            <Input
              id="emailOrUsername"
              type="email"
              placeholder="이메일을 입력하세요"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              disabled={loading}
            />
          </div>
        </CardContent>
        <CardFooter className="pt-6 flex flex-col space-y-2">
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? "처리 중..." : "재설정 링크 발송"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onBack}
            disabled={loading}
          >
            로그인 화면으로 돌아가기
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}