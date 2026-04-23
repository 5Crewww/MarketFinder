package com.paf.Config;

import com.paf.Api.Dto.ApiErrorResponse;
import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.List;

import static org.springframework.http.ResponseEntity.badRequest;
import static org.springframework.http.ResponseEntity.status;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(MethodArgumentNotValidException exception) {
        ApiErrorResponse response = new ApiErrorResponse();
        response.setMessage("Pedido inválido.");
        response.setDetails(exception.getBindingResult().getFieldErrors().stream()
                .map(this::toFieldMessage)
                .toList());
        return badRequest().body(response);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleConstraint(ConstraintViolationException exception) {
        ApiErrorResponse response = new ApiErrorResponse();
        response.setMessage("Pedido inválido.");
        response.setDetails(exception.getConstraintViolations().stream()
                .map(violation -> violation.getPropertyPath() + ": " + violation.getMessage())
                .toList());
        return badRequest().body(response);
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<ApiErrorResponse> handleOptimisticLock(OptimisticLockingFailureException exception) {
        ApiErrorResponse response = new ApiErrorResponse();
        response.setMessage("Os dados foram alterados por outro utilizador. Atualize o painel e tente novamente.");
        response.setDetails(List.of(exception.getMessage()));
        return status(HttpStatus.CONFLICT).body(response);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleDataIntegrity(DataIntegrityViolationException exception) {
        ApiErrorResponse response = new ApiErrorResponse();
        response.setMessage("Nao foi possivel guardar o registo devido a uma restricao de integridade no banco de dados.");
        String details = exception.getMostSpecificCause().getMessage();
        if (details != null && !details.isBlank()) {
            response.setDetails(List.of(details));
        }
        return status(HttpStatus.CONFLICT).body(response);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiErrorResponse> handleIllegalArgument(IllegalArgumentException exception) {
        ApiErrorResponse response = new ApiErrorResponse();
        response.setMessage(exception.getMessage());
        return badRequest().body(response);
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<ApiErrorResponse> handleSecurity(SecurityException exception) {
        ApiErrorResponse response = new ApiErrorResponse();
        response.setMessage(exception.getMessage());
        return status(HttpStatus.UNAUTHORIZED).body(response);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiErrorResponse> handleMaxUploadSize(MaxUploadSizeExceededException exception) {
        ApiErrorResponse response = new ApiErrorResponse();
        response.setMessage("Ficheiro demasiado grande. O tamanho maximo permitido e 5MB.");
        return status(HttpStatus.PAYLOAD_TOO_LARGE).body(response);
    }

    @ExceptionHandler(TooManyRequestsException.class)
    public ResponseEntity<ApiErrorResponse> handleTooManyRequests(TooManyRequestsException exception) {
        ApiErrorResponse response = new ApiErrorResponse();
        response.setMessage(exception.getMessage());
        return status(HttpStatus.TOO_MANY_REQUESTS).body(response);
    }

    private String toFieldMessage(FieldError error) {
        return error.getField() + ": " + error.getDefaultMessage();
    }
}
