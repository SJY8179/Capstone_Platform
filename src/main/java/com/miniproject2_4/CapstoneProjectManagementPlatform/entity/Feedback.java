package com.miniproject2_4.CapstoneProjectManagementPlatform.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "feedback")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Feedback extends BaseEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private UserAccount author;

    @Lob
    @Column(name = "content", nullable = false)
    private String content;
}
