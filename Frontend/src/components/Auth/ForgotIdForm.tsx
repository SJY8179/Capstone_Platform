import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { authApi } from "@/api/auth";
import { getApiError } from "@/api/http";

interface ForgotIdFormProps {
  onBack: () => void;
}

export function ForgotIdForm({ onBack }: ForgotIdFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("이메일을 입력해주세요.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("올바른 이메일 형식을 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.forgotId({ email: email.trim() });
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
          <h2 className="text-2xl font-bold text-center">아이디 찾기 완료</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-gray-600">
            <p>요청이 처리되었습니다.</p>
            <p>가입된 이메일인 경우 아이디 정보가 발송됩니다.</p>
            <p className="mt-4 text-sm">이메일을 확인해주세요.</p>
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
        <h2 className="text-2xl font-bold text-center">아이디 찾기</h2>
        <p className="text-center text-gray-600">가입시 사용한 이메일을 입력해주세요</p>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              placeholder="이메일을 입력하세요"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            {loading ? "처리 중..." : "아이디 찾기"}
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