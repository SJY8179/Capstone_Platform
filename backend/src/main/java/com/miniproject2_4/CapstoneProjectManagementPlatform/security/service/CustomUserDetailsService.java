package com.miniproject2_4.CapstoneProjectManagementPlatform.security.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.UserRepository;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class CustomUserDetailsService implements UserDetailsService {
    private final UserRepository userRepository;
    public CustomUserDetailsService(UserRepository userRepository) { this.userRepository = userRepository; }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        UserAccount ua = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("user not found"));

        List<GrantedAuthority> authorities = new ArrayList<>();
        // 기본 사용자 권한
        authorities.add(new SimpleGrantedAuthority("ROLE_USER"));
        // 도메인 Role(ADMIN/PROFESSOR/STUDENT 등) 반영
        if (ua.getRole() != null) {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + ua.getRole().name()));
        }

        return new org.springframework.security.core.userdetails.User(
                ua.getEmail(),
                ua.getPasswordHash(),
                authorities
        );
    }
}
