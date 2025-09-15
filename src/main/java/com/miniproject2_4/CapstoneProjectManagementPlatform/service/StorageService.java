package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;

import java.util.Map;

public interface StorageService {

    record PresignedUpload(
            String uploadUrl,
            Map<String, String> headers,
            String objectUrl,
            int expiresIn,
            String key
    ) {}

    /**
     * 프로젝트 파일 업로드용 URL(프리사인 또는 동등한 형태)을 발급한다.
     */
    PresignedUpload initPresignedUpload(Long projectId,
                                        UserAccount user,
                                        String filename,
                                        String contentType,
                                        long size);
}
