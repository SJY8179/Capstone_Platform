package com.miniproject2_4.CapstoneProjectManagementPlatform.security;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DbUserDetailsService implements UserDetailsService {
    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        UserAccount ua = userRepository.findByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("No user: " + email));
        return new User(
            ua.getEmail(),
            ua.getPasswordHash() == null ? "" : ua.getPasswordHash(),
            List.of(new SimpleGrantedAuthority("ROLE_" + ua.getRole().name()))
        );
    }
}