package com.paf.Api.Controller;

import com.paf.Api.Dto.UserRequest;
import com.paf.Api.Dto.UserResponse;
import com.paf.Domain.Models.UserModel;
import com.paf.Domain.Services.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
// 1. Mudei para "/User" (Maiúsculo) para bater certo com o teu api.js
@RequestMapping("/User")
// 2. ADICIONADO: Permite conexão do React
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class UserController {

    @Autowired
    private UserService userService;

    @PostMapping("/Login")
    public ResponseEntity<?> login(@RequestBody UserRequest request) {
        System.out.println(">>> Tentativa de Login: " + request.getNome());

        // 1. Busca na BD
        UserModel user = userService.GetByName(request.getNome());

        // 2. Valida se existe
        if (user == null) {
            System.out.println("❌ User não encontrado.");
            return ResponseEntity.status(401).body("Utilizador não encontrado");
        }

        // 3. Valida a senha (comparação simples)
        if (!user.getSenha().equals(request.getSenha())) {
            System.out.println("❌ Senha errada. Esperada: " + user.getSenha() + " | Recebida: " + request.getSenha());
            return ResponseEntity.status(401).body("Senha incorreta");
        }

        // 4. Sucesso
        System.out.println("✅ Login Sucesso!");
        UserResponse response = new UserResponse();
        response.setIdUser(user.getIdUser());
        response.setNome(user.getNome());
        response.setEmail(user.getEmail());

        return ResponseEntity.ok(response);
    }

    // --- MÉTODOS ANTIGOS (Mantidos) ---

    @GetMapping("/UserGet")
    public ResponseEntity<UserResponse> GetbyName(@RequestParam String nome) {
        UserModel m = userService.GetByName(nome);
        if (m == null) return ResponseEntity.notFound().build();
        UserResponse r = new UserResponse();
        r.setIdUser(m.getIdUser());
        r.setNome(m.getNome());
        r.setEmail(m.getEmail());
        r.setSenha(m.getSenha());
        return ResponseEntity.ok(r);
    }

    @PostMapping("/UserPost")
    public ResponseEntity<UserResponse> CreateUser(@RequestBody UserRequest userRequest) {
        UserModel model = new UserModel();
        model.setNome(userRequest.getNome());
        model.setEmail(userRequest.getEmail());
        model.setSenha(userRequest.getSenha());

        String result = userService.CreateUser(model);

        UserResponse response = new UserResponse();
        response.setIdUser(model.getIdUser()); // Nota: O teu modelo usa setIdUser, mantive assim
        response.setNome(model.getNome());
        response.setEmail(model.getEmail());
        response.setSenha(model.getSenha());

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @DeleteMapping("/UserDelete") // Ajustei para bater certo com o padrão comum, ou podes manter UserDel/{id} se o frontend usar assim
    public ResponseEntity<Void> DeleteUser(@RequestParam Long id) {
        boolean ok = userService.DeleteUser(id);
        if (!ok) return ResponseEntity.notFound().build();
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/UserUpdt")
    public ResponseEntity<UserResponse> UpdateUser(@RequestBody UserRequest userRequest) {
        UserModel model = new UserModel();
        model.setIdUser(userRequest.getIdUser());
        model.setNome(userRequest.getNome());
        model.setEmail(userRequest.getEmail());
        model.setSenha(userRequest.getSenha());

        UserModel updated = userService.UpdateUser(model);
        if (updated == null) return ResponseEntity.notFound().build();

        UserResponse r = new UserResponse();
        r.setIdUser(updated.getIdUser());
        r.setNome(updated.getNome());
        r.setEmail(updated.getEmail());
        r.setSenha(updated.getSenha());

        return ResponseEntity.ok(r);
    }

    @GetMapping("/GetAllUsers")
    public ResponseEntity<Iterable<UserModel>> GetAllUsers() {
        Iterable<UserModel> users = userService.GetAllUsers();
        return ResponseEntity.ok(users);
    }
}