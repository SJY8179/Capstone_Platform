package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class EmailService {

    @Value("${app.mail.from:noreply@capstone.app}")
    private String fromEmail;

    @Value("${app.base-url:http://localhost:3000}")
    private String baseUrl;

    public void sendPasswordResetEmail(String to, String token) {
        try {
            String resetUrl = baseUrl + "/reset-password?token=" + token;
            String content = String.format(
                "비밀번호 재설정을 요청하셨습니다.\n\n" +
                "아래 링크를 클릭하여 비밀번호를 재설정하세요:\n" +
                "%s\n\n" +
                "이 링크는 1시간 후에 만료됩니다.\n" +
                "만약 비밀번호 재설정을 요청하지 않으셨다면 이 이메일을 무시하세요.\n\n" +
                "캡스톤 프로젝트 관리 플랫폼",
                resetUrl
            );

            // TODO: 실제 이메일 발송 구현 (현재는 로그만 출력)
            log.info("Password reset email would be sent to: {} with content: {}", to, content);
        } catch (Exception e) {
            log.error("Failed to send password reset email to: {}", to, e);
            throw new RuntimeException("이메일 전송에 실패했습니다.");
        }
    }

    public void sendForgotIdEmail(String to, String maskedId) {
        try {
            String content = String.format(
                "요청하신 아이디 찾기 결과입니다.\n\n" +
                "귀하의 아이디: %s\n\n" +
                "보안을 위해 일부가 마스킹되어 표시됩니다.\n" +
                "로그인 시 전체 이메일 주소를 입력해주세요.\n\n" +
                "캡스톤 프로젝트 관리 플랫폼",
                maskedId
            );

            // TODO: 실제 이메일 발송 구현 (현재는 로그만 출력)
            log.info("Forgot ID email would be sent to: {} with content: {}", to, content);
        } catch (Exception e) {
            log.error("Failed to send forgot ID email to: {}", to, e);
            throw new RuntimeException("이메일 전송에 실패했습니다.");
        }
    }

    public void sendPasswordChangeNotificationEmail(String to, String userName) {
        try {
            String content = String.format(
                "%s님, 안녕하세요.\n\n" +
                "계정의 비밀번호가 성공적으로 변경되었습니다.\n\n" +
                "만약 본인이 변경하지 않았다면 즉시 관리자에게 문의하세요.\n\n" +
                "캡스톤 프로젝트 관리 플랫폼",
                userName
            );

            // TODO: 실제 이메일 발송 구현 (현재는 로그만 출력)
            log.info("Password change notification email would be sent to: {} with content: {}", to, content);
        } catch (Exception e) {
            log.error("Failed to send password change notification email to: {}", to, e);
            // 알림 이메일 실패는 비밀번호 변경 프로세스를 막지 않음
        }
    }
}