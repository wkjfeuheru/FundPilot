package com.jason.user.mapper;
import com.jason.user.model.*;
import org.apache.ibatis.annotations.*;
import java.time.Instant;
import java.util.List;
@Mapper public interface RiskAssessmentMapper {
    @Delete("DELETE FROM idempotency_key WHERE request_path='POST /api/v1/risk-assessments' AND expires_at <= #{now} LIMIT 1000")
    void removeExpiredKeys(Instant now);
    QuestionnaireRow active();
    QuestionnaireRow enabled(long id);
    List<QuestionRow> questions(long id);
    Long lockUser(long id);
    void insertAssessment(AssessmentRow row);
    void upsertProfile(AssessmentRow row);
    void audit(@Param("row") AssessmentRow row,@Param("traceId") String traceId);
    void reserve(@Param("key") String key,@Param("userId") long userId,@Param("path") String path,@Param("digest") String digest,@Param("expires") Instant expires);
    IdempotencyRow reservation(String key);
    void complete(@Param("key") String key,@Param("digest") String digest);
}
