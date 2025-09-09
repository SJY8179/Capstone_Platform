package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
    @NotBlank(message = "Name is required")
    String name,
    
    @Email(message = "Invalid email format")
    @NotBlank(message = "Email is required")
    String email,
    
    @Size(min = 4, max = 100, message = "Password must be between 4 and 100 characters")
    @NotBlank(message = "Password is required")
    String password
) {}