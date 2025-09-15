package com.miniproject2_4.CapstoneProjectManagementPlatform.repository;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    @Query("""
        select f from Feedback f
        join fetch f.author a
        where f.project.id = :pid
        order by f.createdAt desc
    """)
    List<Feedback> findRecentWithAuthor(@Param("pid") Long projectId);
}
