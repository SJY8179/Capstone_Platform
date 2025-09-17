package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.UserDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/users") // context-path=/api → /api/users
public class UserController {

    private final UserService userService;

    /**
     * 사용자 목록/검색
     * - /api/users
     * - /api/users?q=검색어&size=100
     */
    @GetMapping
    public ResponseEntity<List<UserDto>> list(
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "size", required = false) Integer size
    ) {
        List<UserAccount> rows = (q == null || q.isBlank())
                ? userService.findTop(size)
                : userService.searchTop(q, size);

        List<UserDto> dto = rows.stream()
                .map(u -> new UserDto(u.getId(), u.getName(), u.getEmail()))
                .toList();

        return ResponseEntity.ok(dto);
    }
}
