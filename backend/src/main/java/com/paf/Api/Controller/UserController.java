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
