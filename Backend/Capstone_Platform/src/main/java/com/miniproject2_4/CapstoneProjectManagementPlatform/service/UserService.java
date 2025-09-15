package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Role;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;

    public List<UserAccount> findAll() { return userRepository.findAll(); }

    public UserAccount get(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new java.util.NoSuchElementException("User not found: " + id));
    }

    /** 상위 N명 목록 (기본 100, 최대 500) */
    public List<UserAccount> findTop(Integer size) {
        int limit = clamp(size);
        return userRepository.findAll(PageRequest.of(0, limit)).getContent();
    }

    /** 이름/이메일 검색 (기본 100, 최대 500) */
    public List<UserAccount> searchTop(String q, Integer size) {
        int limit = clamp(size);
        return userRepository
                .findByNameContainingIgnoreCaseOrEmailContainingIgnoreCase(q, q)
                .stream()
                .limit(limit)
                .toList();
    }

    private int clamp(Integer size) {
        int s = (size == null) ? 100 : size;
        if (s < 1) s = 1;
        if (s > 500) s = 500;
        return s;
    }

    @Transactional
    public UserAccount create(UserAccount user) { return userRepository.save(user); }

    @Transactional
    public UserAccount update(Long id, String name, Role role) {
        UserAccount u = get(id);
        if (name != null) u.setName(name);
        if (role != null) u.setRole(role);
        return u;
    }

    @Transactional
    public void delete(Long id) { userRepository.deleteById(id); }
}
