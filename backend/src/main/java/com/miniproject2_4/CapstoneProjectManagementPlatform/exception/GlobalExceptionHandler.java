package com.miniproject2_4.CapstoneProjectManagementPlatform.exception;

import jakarta.persistence.EntityNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

import java.time.format.DateTimeParseException;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(EntityNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, Object> notFound(EntityNotFoundException e) {
        log.warn("404 NOT FOUND", e);
        return Map.of("error","NOT_FOUND","message", e.getMessage());
    }

    @ExceptionHandler({ MethodArgumentTypeMismatchException.class, DateTimeParseException.class })
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, Object> badRequest(Exception e) {
        log.warn("400 BAD REQUEST", e);
        return Map.of("error","BAD_REQUEST","message", e.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, Object> illegalArg(IllegalArgumentException e) {
        log.warn("400 BAD REQUEST", e);
        return Map.of("message", e.getMessage());
    }

    @ExceptionHandler(AuthenticationException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public Map<String, Object> unauthorized(AuthenticationException e) {
        log.warn("401 UNAUTHORIZED", e);
        return Map.of("message", "인증이 필요합니다.");
    }

    @ExceptionHandler(AccessDeniedException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public Map<String, Object> forbidden(AccessDeniedException e) {
        log.warn("403 FORBIDDEN", e);
        return Map.of("message", "접근 권한이 없습니다.");
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<?> status(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode())
                .body(Map.of("message", e.getReason()));
    }

    @ExceptionHandler({ DataAccessException.class, RuntimeException.class })
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public Map<String, Object> server(Exception e) {
        log.error("500 INTERNAL SERVER ERROR", e);
        return Map.of("message", "서버 오류가 발생했습니다.");
    }
}