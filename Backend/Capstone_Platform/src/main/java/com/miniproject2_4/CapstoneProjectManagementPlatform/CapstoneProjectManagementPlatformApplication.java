// src/main/java/com/miniproject2_4/CapstoneProjectManagementPlatform/CapstoneProjectManagementPlatformApplication.java
package com.miniproject2_4.CapstoneProjectManagementPlatform;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@EnableJpaAuditing
@SpringBootApplication
public class CapstoneProjectManagementPlatformApplication {
    public static void main(String[] args) {
        SpringApplication.run(CapstoneProjectManagementPlatformApplication.class, args);
    }
}
