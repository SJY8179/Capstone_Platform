package com.miniproject2_4.CapstoneProjectManagementPlatform.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.*;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class CorsConfig {
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.addAllowedOrigin("http://localhost:5173");
        cfg.addAllowedMethod("GET");
        cfg.addAllowedMethod("POST");
        cfg.addAllowedMethod("PUT");
        cfg.addAllowedMethod("DELETE");
        cfg.addAllowedMethod("OPTIONS");
        cfg.addAllowedHeader("Content-Type");
        cfg.addAllowedHeader("Authorization");
        cfg.addAllowedHeader("X-Requested-With");
        cfg.setAllowCredentials(true);
        cfg.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }
}