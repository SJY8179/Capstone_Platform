create table user_account (
                              id bigint primary key auto_increment,
                              name varchar(50) not null,
                              email varchar(120) not null unique,
                              role varchar(20) not null,
                              created_at datetime not null,
                              updated_at datetime not null
);

create table team (
                      id bigint primary key auto_increment,
                      name varchar(80) not null,
                      created_at datetime not null,
                      updated_at datetime not null
);

create table team_member (
                             team_id bigint not null,
                             user_id bigint not null,
                             role_in_team varchar(20),
                             primary key(team_id, user_id),
                             foreign key(team_id) references team(id),
                             foreign key(user_id) references user_account(id)
);

create table project (
                         id bigint primary key auto_increment,
                         team_id bigint not null,
                         title varchar(120) not null,
                         status varchar(20) not null default 'ACTIVE',
                         github_repo varchar(200),
                         repo_owner varchar(120),
                         created_at datetime not null,
                         updated_at datetime not null,
                         foreign key(team_id) references team(id)
);

create table assignment (
                            id bigint primary key auto_increment,
                            project_id bigint not null,
                            title varchar(120) not null,
                            due_date datetime not null,
                            status varchar(20) not null default 'ONGOING',
                            created_at datetime not null,
                            updated_at datetime not null,
                            foreign key(project_id) references project(id)
);

create table event (
                       id bigint primary key auto_increment,
                       project_id bigint not null,
                       title varchar(120) not null,
                       start_at datetime not null,
                       end_at datetime null,
                       location varchar(120),
                       type varchar(20) not null,
                       foreign key(project_id) references project(id)
);

create table feedback (
                          id bigint primary key auto_increment,
                          project_id bigint not null,
                          author_id bigint not null,
                          content text not null,
                          created_at datetime not null,
                          updated_at datetime not null,
                          foreign key(project_id) references project(id),
                          foreign key(author_id) references user_account(id)
);
