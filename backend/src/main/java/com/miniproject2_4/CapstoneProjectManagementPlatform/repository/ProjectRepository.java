package com.miniproject2_4.CapstoneProjectManagementPlatform.repository;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ProjectRepository extends JpaRepository<Project, Long> {

    @Query("""
        select p from Project p
        join fetch p.team t
    """)
    List<Project> findAllWithTeam();

    Optional<Project> findFirstByTeam_Id(Long teamId);

    Optional<Project> findByTeam_Id(Long teamId);
}