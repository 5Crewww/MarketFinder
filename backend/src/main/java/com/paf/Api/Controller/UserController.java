package com.paf.Api.Controller;

import com.paf.Api.Dto.ApiErrorResponse;
import com.paf.Api.Dto.LoginRequest;
import com.paf.Api.Dto.PasswordResetConfirmRequest;
import com.paf.Api.Dto.PasswordResetRequest;
import com.paf.Api.Dto.UserRequest;
import com.paf.Api.Dto.UserResponse;
import com.paf.Config.TooManyRequestsException;
import com.paf.Domain.Mappers.UserMapper;
import com.paf.Domain.Models.UserModel;
import com.paf.Domain.Services.LoginRateLimiter;
import com.paf.Domain.Services.SessionService;
import com.paf.Domain.Services.StoreAccessService;
import com.paf.Domain.Services.UserService;
import com.paf.Infrastructure.Entities.UserSessionEntity;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import static org.springframework.http.ResponseEntity.*;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService userService;
    private final SessionService sessionService;
    private final StoreAccessService storeAccessService;
    private final LoginRateLimiter loginRateLimiter;

    @Autowired
    public UserController(
            UserService userService,
            SessionService sessionService,
            StoreAccessService storeAccessService,
            LoginRateLimiter loginRateLimiter
    ) {
        this.userService = userService;
        this.sessionService = sessionService;
        this.storeAccessService = storeAccessService;
        this.loginRateLimiter = loginRateLimiter;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        String identifier = request.getNome();

        // 1. Verificar bloqueio antes de qualquer processamento
        if (loginRateLimiter.isBlocked(identifier)) {
            long seconds = loginRateLimiter.secondsUntilUnblocked(identifier);
            long minutes = (seconds / 60) + 1;
            throw new TooManyRequestsException(
                    "Demasiadas tentativas falhadas. Tente novamente em " + minutes + " minuto(s)."
            );
        }

        UserModel user = userService.getByLoginIdentifier(identifier);

        if (user == null) {
            loginRateLimiter.recordFailure(identifier);
            return unauthorized("Utilizador ou email nao encontrado.");
        }

        if (!userService.matchesPassword(request.getSenha(), user.getSenha())) {
            loginRateLimiter.recordFailure(identifier);
            return unauthorized("Senha incorreta.");
        }

        // 2. Login bem-sucedido — limpar o contador de falhas
        loginRateLimiter.clearOnSuccess(identifier);

        UserSessionEntity session = sessionService.createSession(userService.requireUserEntity(user.getIdUser()));
        user.setSessionToken(session.getSessionToken());
        user.setSessionExpiresAt(session.getExpiresAt().toString());
        return ok(UserMapper.toResponse(user));
    }

    @GetMapping("/by-name")
    public ResponseEntity<UserResponse> getbyName(@RequestParam String nome) {
        UserModel user = userService.GetByName(nome);
        if (user == null) {
            return notFound().build();
        }
        return ok(UserMapper.toResponse(user));
    }

    @PostMapping
    public ResponseEntity<UserResponse> createUser(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @RequestBody UserRequest userRequest
    ) {
        UserModel model = UserMapper.toModel(userRequest);

        if (userRequest.getRole() == null || userRequest.getRole().isEmpty()) {
            model.setRole("user");
        } else if (!"user".equalsIgnoreCase(userRequest.getRole())) {
            if (userService.hasAdminUsers()) {
                requireAdminSession(authorizationHeader);
            }
        }

        UserModel created = userService.CreateUser(model);
        return status(HttpStatus.CREATED).body(UserMapper.toResponse(created));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @PathVariable Long id
    ) {
        requireAdminSession(authorizationHeader);
        boolean ok = userService.DeleteUser(id);
        if (!ok) {
            return notFound().build();
        }
        return noContent().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> updateUser(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @PathVariable Long id,
            @RequestBody UserRequest userRequest
    ) {
        if (userRequest.getRole() != null && !"user".equalsIgnoreCase(userRequest.getRole())) {
            requireAdminSession(authorizationHeader);
        }

        UserModel model = UserMapper.toModel(userRequest);
        model.setIdUser(id);

        UserModel updated = userService.UpdateUser(model);
        if (updated == null) {
            return notFound().build();
        }

        return ok(UserMapper.toResponse(updated));
    }

    @GetMapping
    public ResponseEntity<Iterable<UserModel>> getAllUsers(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader
    ) {
        requireAdminSession(authorizationHeader);
        Iterable<UserModel> users = userService.GetAllUsers();
        return ok(users);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader) {
        sessionService.invalidate(authorizationHeader);
        return noContent().build();
    }

    @PostMapping("/password-reset/request")
    public ResponseEntity<Void> requestPasswordReset(@Valid @RequestBody PasswordResetRequest request) {
        userService.requestPasswordReset(request.getEmail());
        return noContent().build();
    }

    @PostMapping("/password-reset/confirm")
    public ResponseEntity<Void> confirmPasswordReset(@Valid @RequestBody PasswordResetConfirmRequest request) {
        userService.resetPassword(request.getToken(), request.getNovaSenha());
        return noContent().build();
    }

    private void requireAdminSession(String sessionToken) {
        if (!"admin".equalsIgnoreCase(storeAccessService.requireSession(sessionToken).getUser().getRole())) {
            throw new SecurityException("Apenas administradores podem executar esta operação.");
        }
    }

    private ResponseEntity<ApiErrorResponse> unauthorized(String message) {
        ApiErrorResponse response = new ApiErrorResponse();
        response.setMessage(message);
        return status(HttpStatus.UNAUTHORIZED).body(response);
    }
}
