package com.miniproject2_4.CapstoneProjectManagementPlatform.entity;

import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
public class UserAccountTest {
    
    @Autowired
    private TestEntityManager entityManager;
    
    @Autowired
    private UserRepository userRepository;
    
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Test
    public void testPasswordHashSaveAndRetrieve() {
        // Given: BCrypt로 해시된 60자 비밀번호 생성
        String rawPassword = "testPassword123!";
        String hashedPassword = passwordEncoder.encode(rawPassword);
        assertThat(hashedPassword).hasSize(60); // BCrypt는 항상 60자
        
        UserAccount user = UserAccount.builder()
            .name("테스트사용자")
            .email("test@example.com")
            .role(Role.STUDENT)
            .passwordHash(hashedPassword)
            .build();
        
        // When: DB에 저장 후 다시 조회
        UserAccount savedUser = entityManager.persistAndFlush(user);
        UserAccount foundUser = userRepository.findById(savedUser.getId()).orElseThrow();
        
        // Then: 동일한 해시값이 저장/조회되는지 확인
        assertThat(foundUser.getPasswordHash()).isEqualTo(hashedPassword);
        assertThat(foundUser.getPasswordHash()).hasSize(60);
        
        // BCrypt 검증도 동작하는지 확인
        assertThat(passwordEncoder.matches(rawPassword, foundUser.getPasswordHash())).isTrue();
        assertThat(passwordEncoder.matches("wrongPassword", foundUser.getPasswordHash())).isFalse();
    }
}