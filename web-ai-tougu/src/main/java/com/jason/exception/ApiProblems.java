package com.jason.exception;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ProblemDetail;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
@Component
public class ApiProblems {
    private final ObjectMapper json;
    public ApiProblems(ObjectMapper json) { this.json=json; }
    public ProblemDetail create(ErrorCode error, String detail, HttpServletRequest request) {
        ProblemDetail problem=ProblemDetail.forStatusAndDetail(error.getStatus(), detail);
        String kind=switch(error.getStatus().value()) {
            case 400 -> "validation-error"; case 401 -> "authentication-error"; case 403 -> "authorization-error";
            case 404 -> "not-found"; case 409 -> "state-conflict"; case 422 -> "business-rule-violation";
            case 429 -> "rate-limited"; default -> "internal-error";
        };
        problem.setType(URI.create("https://api.fundpilot.local/problems/" + kind));
        problem.setTitle(switch(error.getStatus().value()) {
            case 400 -> "请求参数错误"; case 401 -> "身份认证失败"; case 403 -> "访问被拒绝";
            case 404 -> "资源不存在"; case 409 -> "状态冲突"; case 422 -> "业务校验未通过"; case 429 -> "请求过于频繁"; default -> "服务暂不可用";
        });
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("code", error.getCode());
        problem.setProperty("traceId", request.getAttribute("traceId"));
        problem.setProperty("timestamp", Instant.now());
        problem.setProperty("errors", List.of());
        return problem;
    }
    public void write(HttpServletRequest request, HttpServletResponse response, ErrorCode error) throws IOException {
        ProblemDetail problem=create(error, error.getDefaultMessage(), request);
        response.setStatus(error.getStatus().value());
        response.setContentType("application/problem+json");
        response.setCharacterEncoding("UTF-8");
        var body=new LinkedHashMap<String,Object>();
        body.put("type", problem.getType()); body.put("title",problem.getTitle()); body.put("status",problem.getStatus());
        body.put("detail",problem.getDetail()); body.put("instance",problem.getInstance()); body.putAll(problem.getProperties());
        json.writeValue(response.getOutputStream(),body);
    }
}
