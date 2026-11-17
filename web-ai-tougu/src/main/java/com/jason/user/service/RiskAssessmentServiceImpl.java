package com.jason.user.service;
import com.jason.common.ResponseDTO;
import com.jason.exception.*;
import com.jason.user.config.RiskAssessmentProperties;
import com.jason.user.dto.*;
import com.jason.user.mapper.RiskAssessmentMapper;
import com.jason.user.model.*;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.*;
import tools.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.IntStream;

@Service @RequiredArgsConstructor
public class RiskAssessmentServiceImpl implements IRiskAssessmentService {
    private static final String PATH="POST /api/v1/risk-assessments";
    private static final ZoneId BUSINESS_ZONE=ZoneId.of("Asia/Shanghai");
    private final RiskAssessmentMapper mapper;
    private final RiskAssessmentProperties properties;
    private final RiskScoring scoring;
    private final RiskReplayCache cache;
    private final ObjectMapper json;
    private final Clock clock;
    private record Option(String text,int score) {}
    private record Question(QuestionRow row,List<Option> options) {}
    private record ScoredAnswer(long questionId,int optionIndex,int score) {}

    @Override @Transactional(readOnly=true)
    public RiskQuestionnaire active() {
        var template=mapper.active();
        requireTemplate(template);
        var questions=loadQuestions(template);
        return new RiskQuestionnaire(template.getId(),template.getVersion(),template.getTitle(),template.getQuestionCount(),
            questions.stream().map(q -> new RiskQuestionnaire.Question(q.row().getId(),q.row().getSortNo(),q.row().getTitle(),
                IntStream.range(0,q.options().size()).mapToObj(i -> new RiskQuestionnaire.Option(i,q.options().get(i).text())).toList())).toList());
    }
    @Override @Transactional
    public RiskSubmission submit(long userId,String key,RiskAssessmentRequest request,String traceId) {
        if(key==null) throw new BusinessException(ErrorCode.COMMON_MISSING_IDEMPOTENCY_KEY);
        if(!key.matches("[A-Za-z0-9_-]{16,64}")) throw new BusinessException(ErrorCode.COMMON_INVALID_IDEMPOTENCY_KEY);
        // Lock the existing user row, including before a first profile exists, to serialize reassessments.
        if(mapper.lockUser(userId)==null) throw new BusinessException(ErrorCode.AUTH_ACCOUNT_DISABLED);
        String digest=sha256(json.writeValueAsString(request));
        Instant now=clock.instant().truncatedTo(ChronoUnit.MILLIS);
        try { mapper.reserve(key,userId,PATH,digest,now.plus(7,ChronoUnit.DAYS)); }
        catch(DuplicateKeyException duplicate) { return replay(key,userId,digest); }
        var template=mapper.enabled(request.questionnaireId());
        requireTemplate(template);
        var questions=loadQuestions(template);
        var answers=new HashMap<Long,Integer>();
        for(var answer:request.answers()) {
            if(answers.put(answer.questionId(),answer.optionIndex())!=null) throw new BusinessException(ErrorCode.USER_RISK_ASSESSMENT_INCOMPLETE);
        }
        if(answers.size()!=questions.size() || !answers.keySet().equals(new HashSet<>(questions.stream().map(q -> q.row().getId()).toList())))
            throw new BusinessException(ErrorCode.USER_RISK_ASSESSMENT_INCOMPLETE);
        var scored=new ArrayList<ScoredAnswer>();
        int total=0,maximum=0;
        for(var question:questions) {
            int index=answers.get(question.row().getId());
            if(index<0 || index>=question.options().size()) throw new BusinessException(ErrorCode.USER_RISK_ANSWER_INVALID);
            int score=question.options().get(index).score();
            total+=score;
            maximum+=question.options().stream().mapToInt(Option::score).max().orElseThrow();
            scored.add(new ScoredAnswer(question.row().getId(),index,score));
        }
        var row=new AssessmentRow();
        row.setUserId(userId); row.setQuestionnaireId(template.getId()); row.setAnswers(json.writeValueAsString(scored));
        row.setTotalScore(total); row.setRiskLevel(scoring.level(total,maximum)); row.setEvaluatedAt(now);
        row.setValidUntil(now.atZone(BUSINESS_ZONE).toLocalDate().plusMonths(properties.getValidityMonths()));
        mapper.insertAssessment(row); mapper.upsertProfile(row); mapper.audit(row,traceId);
        var result=new RiskAssessmentResult(row.getId(),userId,template.getId(),total,"R"+row.getRiskLevel(),RiskScoring.label(row.getRiskLevel()),null,now,row.getValidUntil());
        var submission=new RiskSubmission(ResponseDTO.success(result),false);
        String encoded=json.writeValueAsString(submission);
        mapper.complete(key,sha256(encoded));
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { cache.put(key,encoded); }
        });
        return submission;
    }
    @Override @Transactional
    @org.springframework.scheduling.annotation.Scheduled(fixedDelay=600000,initialDelay=600000)
    public void removeExpiredKeys() { mapper.removeExpiredKeys(clock.instant()); }

    private RiskSubmission replay(String key,long userId,String digest) {
        var row=mapper.reservation(key);
        if(row==null || row.getUserId()!=userId || !PATH.equals(row.getRequestPath()) || !digest.equals(row.getRequestDigest()))
            throw new BusinessException(ErrorCode.COMMON_IDEMPOTENCY_CONFLICT);
        String encoded=cache.get(key);
        if(encoded==null || !sha256(encoded).equals(row.getResponseDigest())) throw new BusinessException(ErrorCode.COMMON_IDEMPOTENCY_CONFLICT);
        var original=json.readValue(encoded,RiskSubmission.class);
        return new RiskSubmission(original.response(),true);
    }
    private void requireTemplate(QuestionnaireRow template) {
        if(template==null) throw new BusinessException(ErrorCode.USER_RISK_QUESTIONNAIRE_NOT_FOUND);
    }
    private List<Question> loadQuestions(QuestionnaireRow template) {
        var rows=mapper.questions(template.getId());
        if(rows.isEmpty() || rows.size()!=template.getQuestionCount()) throw new BusinessException(ErrorCode.INTERNAL_ERROR,"问卷题目配置不完整，请联系管理员");
        return rows.stream().map(row -> {
            var array=json.readTree(row.getOptions());
            if(array==null || !array.isArray() || array.isEmpty()) throw new BusinessException(ErrorCode.INTERNAL_ERROR,"问卷选项配置异常");
            var options=new ArrayList<Option>();
            for(var node:array) {
                if(!node.path("text").isString() || node.path("text").asString().isBlank() || !node.path("score").isIntegralNumber() ||
                    !node.path("score").canConvertToInt() || node.path("score").asInt()<0 || node.path("score").asInt()>32767)
                    throw new BusinessException(ErrorCode.INTERNAL_ERROR,"问卷分值配置异常");
                options.add(new Option(node.path("text").asString(),node.path("score").asInt()));
            }
            return new Question(row,options);
        }).toList();
    }
    private static String sha256(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch(NoSuchAlgorithmException e) { throw new BusinessException(ErrorCode.INTERNAL_ERROR,"摘要算法不可用",e); }
    }
}
