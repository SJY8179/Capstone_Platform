import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { User, UserRole } from "@/types/user";
import { http } from "@/api/http";

interface LoginFormProps {
  onLogin: (user: User) => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [signupData, setSignupData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "" as UserRole | "",
  });
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) {
      toast.error("모든 필드를 입력해주세요.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await http.post("/auth/login", loginData);
      if (!data?.accessToken) throw new Error("토큰이 응답에 없습니다.");
      localStorage.setItem("accessToken", data.accessToken);
      if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);

      const meRes = await http.get("/auth/me");
      const me = meRes.data as any;

      onLogin({
        id: String(me.id),
        name: me.name,
        email: me.email,
        role: (me.role ?? "student") as UserRole,
        avatarUrl: me.avatarUrl ?? null,
      });
      toast.success("로그인되었습니다.");
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "로그인에 실패했습니다.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupData.name || !signupData.email || !signupData.password || !signupData.confirmPassword || !signupData.role) {
      toast.error("모든 필드를 입력해주세요.");
      return;
    }
    if (signupData.password !== signupData.confirmPassword) {
      toast.error("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (signupData.password.length < 6) {
      toast.error("비밀번호는 6자 이상이어야 합니다.");
      return;
    }

    setLoading(true);
    try {
      // role 전달 (student | professor | admin)
      await http.post("/auth/register", {
        name: signupData.name,
        email: signupData.email,
        password: signupData.password,
        role: signupData.role,
      });
      toast.success("회원가입이 완료되었습니다.");

      const { data } = await http.post("/auth/login", {
        email: signupData.email,
        password: signupData.password,
      });
      localStorage.setItem("accessToken", data.accessToken);
      if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);

      const meRes = await http.get("/auth/me");
      const me = meRes.data as any;

      onLogin({
        id: String(me.id),
        name: me.name,
        email: me.email,
        role: (me.role ?? "student") as UserRole,
        avatarUrl: me.avatarUrl ?? null,
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "회원가입에 실패했습니다.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">캡스톤 프로젝트 관리</h1>
          <p className="text-gray-600">프로젝트를 체계적으로 관리하고 협업하세요</p>
        </div>

        <Card className="shadow-lg">
          <Tabs defaultValue="login" className="w-full">
            <CardHeader>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">로그인</TabsTrigger>
                <TabsTrigger value="signup">회원가입</TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value="login">
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">이메일</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="이메일을 입력하세요"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">비밀번호</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="비밀번호를 입력하세요"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "처리 중..." : "로그인"}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">이름</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="이름을 입력하세요"
                      value={signupData.name}
                      onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">이메일</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="이메일을 입력하세요"
                      value={signupData.email}
                      onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">역할</Label>
                    <Select onValueChange={(value) => setSignupData({ ...signupData, role: value as UserRole })}>
                      <SelectTrigger>
                        <SelectValue placeholder="역할을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">학생</SelectItem>
                        <SelectItem value="professor">교수</SelectItem>
                        <SelectItem value="admin">관리자</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">비밀번호</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="비밀번호를 입력하세요 (6자 이상)"
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">비밀번호 확인</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="비밀번호를 다시 입력하세요"
                      value={signupData.confirmPassword}
                      onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "처리 중..." : "회원가입"}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
