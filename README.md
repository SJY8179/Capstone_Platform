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

📦 Dependency & node_modules 정책

- node_modules는 Git에 커밋하지 않습니다. 용량이 크고, OS/아키텍처별 바이너리가 섞여 머지 충돌과 빌드 불안정이 생깁니다.
- 대신 package.json + lock 파일만 커밋합니다.
  - npm: package-lock.json 
  - yarn: yarn.lock 
  - pnpm: pnpm-lock.yaml → 팀 전원이 동일 버전으로 재현 가능.
- 설치는 **npm ci**.

# 의존성 업데이트 방법
npm i <패키지명>@<버전>
- 변경된 package.json + package-lock.json 커밋/푸시
git add package.json package-lock.json
git commit -m "deps: bump <패키지명> to <버전>"