package com.jason.exception;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import java.util.Map;
@RestControllerAdvice @RequiredArgsConstructor
public class GlobalExceptionHandler {
    private static final Logger log=LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private final ApiProblems problems;
    @ExceptionHandler(BusinessException.class)
    public ProblemDetail business(BusinessException ex, HttpServletRequest request) {
        return problems.create(ex.getErrorCode(),ex.getMessage(),request);
    }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail validation(MethodArgumentNotValidException ex,HttpServletRequest request) {
        boolean roleInvalid=ex.getBindingResult().hasFieldErrors("role");
        ProblemDetail result=problems.create(roleInvalid ? ErrorCode.AUTH_ROLE_INVALID : ErrorCode.INVALID_REQUEST,"请检查表单中的错误",request);
        result.setProperty("errors",ex.getBindingResult().getFieldErrors().stream().map(error ->
            Map.of("field",error.getField(),"message",error.getDefaultMessage()==null?"字段不合法":error.getDefaultMessage(),"rejectedValue","")).toList());
        return result;
    }
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ProblemDetail malformed(HttpServletRequest request) { return problems.create(ErrorCode.MALFORMED_REQUEST,"请求格式不正确",request); }
    @ExceptionHandler({org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class,
        org.springframework.web.method.annotation.HandlerMethodValidationException.class})
    public ProblemDetail invalidParameter(HttpServletRequest request) {
        return problems.create(ErrorCode.INVALID_REQUEST,"请求参数格式或取值不合法",request);
    }
    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail forbidden(HttpServletRequest request) { return problems.create(ErrorCode.FORBIDDEN,"无权访问该资源",request); }
    @ExceptionHandler(NoResourceFoundException.class)
    public ProblemDetail missing(HttpServletRequest request) { return problems.create(ErrorCode.NOT_FOUND,"请求路径不存在",request); }
    @ExceptionHandler(DataAccessException.class)
    public ProblemDetail database(DataAccessException ex,HttpServletRequest request) {
        log.error("数据库访问失败 traceId={}",request.getAttribute("traceId"),ex);
        return problems.create(ErrorCode.DATABASE_UNAVAILABLE,"数据库暂不可用，请稍后重试",request);
    }
    @ExceptionHandler(Exception.class)
    public ProblemDetail unexpected(Exception ex,HttpServletRequest request) {
        log.error("未预期异常 traceId={}",request.getAttribute("traceId"),ex);
        return problems.create(ErrorCode.INTERNAL_ERROR,"系统内部错误，请稍后重试",request);
    }
}
