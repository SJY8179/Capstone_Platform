package com.miniproject2_4.CapstoneProjectManagementPlatform.util;

import java.time.*;
import java.time.format.DateTimeParseException;

public final class DateTimes {
    private DateTimes() {}

    /** ISO8601 문자열을 유연하게 LocalDateTime으로 파싱(Z/오프셋/로컬/날짜-only 모두 허용) */
    public static LocalDateTime parseFlexible(String s) {
        if (s == null || s.isBlank()) return null;
        String v = s.trim();

        // 1) 2025-09-12T15:37:54.963Z  /  2025-09-12T15:37:54+09:00
        try { return OffsetDateTime.parse(v).toLocalDateTime(); } catch (Exception ignore) {}

        // 2) 2025-09-12T15:37:54.963Z 같은 순수 Instant
        try {
            Instant inst = Instant.parse(v);
            return LocalDateTime.ofInstant(inst, ZoneId.systemDefault());
        } catch (Exception ignore) {}

        // 3) 2025-09-12T15:37:54  (오프셋 없음)
        try { return LocalDateTime.parse(v); } catch (Exception ignore) {}

        // 4) 2025-09-12 (날짜만)
        try { return LocalDate.parse(v).atStartOfDay(); } catch (Exception ignore) {}

        throw new DateTimeParseException("Unsupported datetime format", s, 0);
    }
}