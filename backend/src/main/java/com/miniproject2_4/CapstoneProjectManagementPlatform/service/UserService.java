package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Role;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service @RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public List<UserAccount> findAll() { return userRepository.findAll(); }

    public UserAccount get(Long id) {
        return userRepository.findById(id).orElseThrow(() -> new java.util.NoSuchElementException("User not found: " + id));
    }

    @Transactional
    public UserAccount create(UserAccount user) { 
        if (user.getPasswordHash() != null) {
            user.setPasswordHash(passwordEncoder.encode(user.getPasswordHash()));
        }
        return userRepository.save(user); 
    }
    
    @Transactional
    public UserAccount createWithPassword(String name, String email, Role role, String rawPassword) {
        UserAccount user = UserAccount.builder()
            .name(name)
            .email(email)
            .role(role)
            .passwordHash(passwordEncoder.encode(rawPassword))
            .build();
        return userRepository.save(user);
    }
    
    public boolean checkPassword(UserAccount user, String rawPassword) {
        return user.getPasswordHash() != null && passwordEncoder.matches(rawPassword, user.getPasswordHash());
    }

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
