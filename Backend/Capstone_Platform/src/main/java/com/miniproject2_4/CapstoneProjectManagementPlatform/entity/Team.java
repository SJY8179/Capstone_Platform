package com.miniproject2_4.CapstoneProjectManagementPlatform.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "team")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Team extends BaseEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", length = 80, nullable = false)
    private String name;

    @Column(name = "description", length = 200)
    private String description;

    @OneToMany(mappedBy = "team", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Project> projects = new ArrayList<>();
}