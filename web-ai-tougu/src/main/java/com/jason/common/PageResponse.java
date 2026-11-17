package com.jason.common;

import java.util.List;

/**
 * 手动 SQL 分页响应（CLAUDE.md：LIMIT + OFFSET，不依赖 PageHelper/Spring Data Page）。
 * totalPages 在构造时由 totalElements 与 size 计算，size<=0 时按 1 页兜底。
 */
public record PageResponse<T>(List<T> content, long totalElements, int page, int size, int totalPages) {

    public PageResponse(List<T> content, long totalElements, int page, int size) {
        this(content, totalElements, page, size, computeTotalPages(totalElements, size));
    }

    private static int computeTotalPages(long totalElements, int size) {
        if (size <= 0) {
            return 0;
        }
        return (int) Math.ceil((double) totalElements / size);
    }
}
