package com.paf.Api.Controller;

import com.paf.Api.Dto.ApiErrorResponse;
import com.paf.Api.Dto.LoginRequest;
import com.paf.Api.Dto.UserRequest;
import com.paf.Api.Dto.UserResponse;
import com.paf.Domain.Mappers.UserMapper;
import com.paf.Domain.Models.UserModel;
import com.paf.Domain.Services.SessionService;
import com.paf.Domain.Services.StoreAccessService;
import com.paf.Domain.Services.UserService;
import com.paf.Infrastructure.Entities.UserSessionEntity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService userService;
    private final SessionService sessionService;
    private final StoreAccessService storeAccessService;

    @Autowired
    public UserController(UserService userService, SessionService sessionService, StoreAccessService storeAccessService) {
        this.userService = userService;
        this.sessionService = sessionService;
        this.storeAccessService = storeAccessService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        UserModel user = userService.getByLoginIdentifier(request.getNome());

        if (user == null) {
            return unauthorized("Utilizador ou email não encontrado.");
        }

        if (!userService.matchesPassword(request.getSenha(), user.getSenha())) {
            return unauthorized("Senha incorreta.");
        }

        UserSessionEntity session = sessionService.createSession(userService.requireUserEntity(user.getIdUser()));
        user.setSessionToken(session.getSessionToken());
        user.setSessionExpiresAt(session.getExpiresAt().toString());
        return ResponseEntity.ok(UserMapper.toResponse(user));
    }

    @GetMapping("/by-name")
    public ResponseEntity<UserResponse> getbyName(@RequestParam String nome) {
        UserModel user = userService.GetByName(nome);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(UserMapper.toResponse(user));
    }

    @PostMapping
    public ResponseEntity<UserResponse> createUser(
            @RequestHeader(name = "X-Session-Token", required = false) String sessionToken,
            @RequestBody UserRequest userRequest
    ) {
        UserModel model = UserMapper.toModel(userRequest);

        if (userRequest.getRole() == null || userRequest.getRole().isEmpty()) {
            model.setRole("user");
        } else if (!"user".equalsIgnoreCase(userRequest.getRole())) {
            if (userService.hasAdminUsers()) {
                requireAdminSession(sessionToken);
            }
        }

        UserModel created = userService.CreateUser(model);
        return ResponseEntity.status(HttpStatus.CREATED).body(UserMapper.toResponse(created));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(
            @RequestHeader(name = "X-Session-Token", required = false) String sessionToken,
            @PathVariable Long id
    ) {
        requireAdminSession(sessionToken);
        boolean ok = userService.DeleteUser(id);
        if (!ok) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> updateUser(
            @RequestHeader(name = "X-Session-Token", required = false) String sessionToken,
            @PathVariable Long id,
            @RequestBody UserRequest userRequest
    ) {
        if (userRequest.getRole() != null && !"user".equalsIgnoreCase(userRequest.getRole())) {
            requireAdminSession(sessionToken);
        }

        UserModel model = UserMapper.toModel(userRequest);
        model.setIdUser(id);

        UserModel updated = userService.UpdateUser(model);
        if (updated == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(UserMapper.toResponse(updated));
    }

    @GetMapping
    public ResponseEntity<Iterable<UserModel>> getAllUsers(
            @RequestHeader(name = "X-Session-Token", required = false) String sessionToken
    ) {
        requireAdminSession(sessionToken);
        Iterable<UserModel> users = userService.GetAllUsers();
        return ResponseEntity.ok(users);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader(name = "X-Session-Token", required = false) String sessionToken) {
        sessionService.invalidate(sessionToken);
        return ResponseEntity.noContent().build();
    }

    private void requireAdminSession(String sessionToken) {
        if (!"admin".equalsIgnoreCase(storeAccessService.requireSession(sessionToken).getUser().getRole())) {
            throw new SecurityException("Apenas administradores podem executar esta operação.");
        }
    }

    private ResponseEntity<ApiErrorResponse> unauthorized(String message) {
        ApiErrorResponse response = new ApiErrorResponse();
        response.setMessage(message);
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
    }
}
