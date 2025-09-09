// src/main/java/com/miniproject2_4/CapstoneProjectManagementPlatform/controller/PingController.java
package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PingController {
    @GetMapping("/ping")
    public String ping() { return "ok"; }
}
