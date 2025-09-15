package com.miniproject2_4.CapstoneProjectManagementPlatform.repository;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Risk;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RiskRepository extends JpaRepository<Risk, Long> {
    List<Risk> findByProject_IdOrderByIdDesc(Long projectId);
}