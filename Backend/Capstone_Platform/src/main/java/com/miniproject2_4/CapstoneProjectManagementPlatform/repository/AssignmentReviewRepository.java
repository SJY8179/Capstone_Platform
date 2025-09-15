package com.miniproject2_4.CapstoneProjectManagementPlatform.repository;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.AssignmentReview;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AssignmentReviewRepository extends JpaRepository<AssignmentReview, Long> {

    List<AssignmentReview> findByAssignment_IdOrderByCreatedAtDesc(Long assignmentId);
}