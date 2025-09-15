# Capstone_Platform

SK Shieldus 미니프로젝트(2) 캡스톤 프로젝트 관리 플랫폼 개발 팀프로젝트

# Capstone Project Management Platform

## Monorepo Structure

- Backend: /backend (Spring Boot, JDK 17)

- Frontend: /frontend (Vite/React)
- 
## Prerequisites

- Java 17 (JDK 17)

- Node.js (권장: LTS 버전) / npm

- MariaDB (프로젝트에서 사용 중인 버전 이상)

## Local setup

1) MariaDB 생성/권한: db/seed.sql 참고

2) backend/src/main/resources/application-local.properties 생성

3) Backend:

./mvnw spring-boot:run -Dspring-boot.run.profiles=local

4) Frontend:

npm ci        # 재현성을 위한 권장 설치(없다면 npm i)
npm run dev   # default: http://localhost:5173

## Running the code

- Backend: ./mvnw spring-boot:run -Dspring-boot.run.profiles=local

- Frontend:
  - 개발: npm run dev
  - 빌드: npm run build 
  - 빌드 미리보기: npm run preview


## Dependency & node_modules 정책

- node_modules는 Git에 커밋하지 않습니다. 용량이 크고, OS/아키텍처별 바이너리가 섞여 머지 충돌과 빌드 불안정이 생깁니다.
- 대신 package.json + lock 파일만 커밋합니다.
  - npm: package-lock.json 
  - yarn: yarn.lock 
  - pnpm: pnpm-lock.yaml → 팀 전원이 동일 버전으로 재현 가능.
- 설치는 **npm ci**.

## 의존성 업데이트 방법
npm i <패키지명>@<버전>
- 변경된 package.json + package-lock.json 커밋/푸시
git add package.json package-lock.json
git commit -m "deps: bump <패키지명> to <버전>"

## 인증 및 비밀번호 관리 기능

### 아이디 찾기 및 비밀번호 재설정

플랫폼에서 제공하는 인증 관련 기능들:

#### 아이디 찾기
- **기능**: 가입한 이메일 주소를 통해 마스킹된 아이디 정보를 이메일로 발송
- **경로**: 로그인 화면 > "아이디 찾기" 링크
- **보안**: 계정 존재 여부와 관계없이 동일한 응답 제공

#### 비밀번호 재설정
- **기능**: 이메일을 통한 안전한 비밀번호 재설정
- **경로**: 로그인 화면 > "비밀번호 재설정" 링크
- **프로세스**:
  1. 이메일 입력 및 재설정 요청
  2. 이메일로 재설정 링크 발송 (1시간 유효)
  3. 링크 클릭 후 새 비밀번호 설정
  4. 비밀번호 변경 완료 및 알림 이메일 발송

#### API 엔드포인트

```
POST /api/auth/forgot-id
- 아이디 찾기 요청
- Body: { "email": "user@example.com" }

POST /api/auth/password-reset/request
- 비밀번호 재설정 요청
- Body: { "emailOrUsername": "user@example.com" }

GET /api/auth/password-reset/validate?token=<TOKEN>
- 재설정 토큰 유효성 확인

POST /api/auth/password-reset/confirm
- 비밀번호 재설정 완료
- Body: { "token": "<TOKEN>", "newPassword": "newPass123" }
```

#### 보안 기능
- **Rate Limiting**: 사용자당 시간당 3회, IP당 시간당 10회 제한
- **토큰 보안**: 단발성 토큰, 1시간 만료, 해시 저장
- **계정 보호**: 비밀번호 변경 시 모든 세션 무효화
- **정보 보호**: 계정 존재 여부 노출 방지

#### 환경 변수 설정 (선택사항)
```properties
# application.properties
app.mail.from=noreply@yourcompany.com
app.base-url=https://yourapp.com
```

**참고**: 현재 이메일 발송 기능은 로그 출력으로 구현되어 있습니다. 실제 운영 환경에서는 SMTP 설정을 통한 실제 이메일 발송 구현이 필요합니다.