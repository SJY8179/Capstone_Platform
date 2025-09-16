import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ResetPasswordForm } from "./ResetPasswordForm";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const handleSuccess = () => {
    navigate("/", {
      replace: true,
      state: { message: "비밀번호가 성공적으로 변경되었습니다. 다시 로그인해주세요." }
    });
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">캡스톤 프로젝트 관리</h1>
            <p className="text-gray-600">프로젝트를 체계적으로 관리하고 협업하세요</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <h2 className="text-xl font-bold text-red-600 mb-4">오류</h2>
            <p className="text-gray-600 mb-4">유효하지 않은 재설정 링크입니다.</p>
            <button
              onClick={() => navigate("/")}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              로그인 화면으로 이동
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">캡스톤 프로젝트 관리</h1>
          <p className="text-gray-600">프로젝트를 체계적으로 관리하고 협업하세요</p>
        </div>
        <ResetPasswordForm token={token} onSuccess={handleSuccess} />
      </div>
    </div>
  );
}