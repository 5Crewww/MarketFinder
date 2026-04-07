package com.paf.Domain.Services;

import com.paf.Domain.Mappers.UserMapper;
import com.paf.Domain.Models.UserModel;
import com.paf.Infrastructure.Entities.StoreEntity;
import com.paf.Infrastructure.Entities.StoreUserMembershipEntity;
import com.paf.Infrastructure.Entities.UserEntity;
import com.paf.Infrastructure.Repository.StoreRepository;
import com.paf.Infrastructure.Repository.StoreUserMembershipRepository;
import com.paf.Infrastructure.Repository.UserRepository;
import com.paf.Util.InputSanitizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.List;
import java.util.ArrayList;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final StoreUserMembershipRepository membershipRepository;

    @Autowired
    public UserService(
            UserRepository userRepository,
            StoreRepository storeRepository,
            StoreUserMembershipRepository membershipRepository
    ) {
        this.userRepository = userRepository;
        this.storeRepository = storeRepository;
        this.membershipRepository = membershipRepository;
    }

    @Transactional
    public UserModel CreateUser(UserModel userModel) {

        if (userModel == null) {
            return null;
        }

        sanitizeUserModel(userModel);
        validateRole(userModel.getRole());

        if (userModel.getEmail() != null && userRepository.existsByEmailIgnoreCase(userModel.getEmail())) {
            throw new IllegalArgumentException("Email já registado.");
        }

        if (userModel.getNome() != null && userRepository.existsByNomeIgnoreCase(userModel.getNome())) {
            throw new IllegalArgumentException("Nome de utilizador já existe.");
        }

        if (userModel.getSenha() != null){
            userModel.setSenha(hashPass(userModel.getSenha()));
        }
        UserEntity userEntity = UserMapper.toEntity(userModel);

        UserEntity saved = userRepository.save(userEntity);

        if ("lojista".equalsIgnoreCase(saved.getRole())) {
            linkUserToStore(saved, userModel, true);
        }

        return enrichWithStore(saved);
    }

    public UserModel GetByName(String nome) {
        String normalizedName = InputSanitizer.sanitizeText(nome, 120);
        if (normalizedName == null) {
            return null;
        }
        Optional<UserEntity> opt = userRepository.findByNomeIgnoreCase(normalizedName);
        if (opt.isEmpty()) return null;
        return enrichWithStore(opt.get());
    }

    public UserModel getByLoginIdentifier(String identifier) {
        String normalizedIdentifier = normalizeLoginIdentifier(identifier);
        if (normalizedIdentifier == null) {
            return null;
        }

        Optional<UserEntity> opt = userRepository.findByNomeIgnoreCaseOrEmailIgnoreCase(
                normalizedIdentifier,
                normalizedIdentifier
        );
        if (opt.isEmpty()) {
            return null;
        }
        return enrichWithStore(opt.get());
    }

    public UserEntity requireUserEntity(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Utilizador não encontrado."));
    }

    public boolean hasAdminUsers() {
        return userRepository.existsByRoleIgnoreCase("admin");
    }

    public boolean DeleteUser(Long id) {
        if (!userRepository.existsById(id)) return false;
        userRepository.deleteById(id);
        return true;
    }

    @Transactional
    public UserModel UpdateUser(UserModel userModel) {
        if (userModel == null || userModel.getIdUser() == null) return null;
        Optional<UserEntity> opt = userRepository.findById(userModel.getIdUser());
        if (opt.isEmpty()) return null;
        UserEntity entity = opt.get();

        sanitizeUserModel(userModel);
        validateRole(userModel.getRole());

        if (userModel.getSenha() != null && !userModel.getSenha().isEmpty()) {
            userModel.setSenha(hashPass(userModel.getSenha()));
        }

        UserMapper.updateEntityFromModel(entity, userModel);

        UserEntity saved = userRepository.save(entity);
        if ("lojista".equalsIgnoreCase(saved.getRole())) {
            linkUserToStore(saved, userModel, false);
        }

        return enrichWithStore(saved);
    }

    public Iterable<UserModel> GetAllUsers() {
        List<UserEntity> entities = userRepository.findAll();
        List<UserModel> result = new ArrayList<>();
        for (UserEntity entity : entities) {
            result.add(enrichWithStore(entity));
        }
        return result;
    }

    private UserModel enrichWithStore(UserEntity entity) {
        UserModel model = UserMapper.toModel(entity);
        List<StoreUserMembershipEntity> memberships = membershipRepository.findByUserIdOrderByIdAsc(entity.getId());
        if (!memberships.isEmpty()) {
            StoreEntity store = memberships.get(0).getStore();
            model.setStoreId(store.getId());
            model.setStoreName(store.getName());
            return model;
        }

        List<StoreEntity> ownedStores = storeRepository.findByOwnerIdOrderByIdAsc(entity.getId());
        if (!ownedStores.isEmpty()) {
            model.setStoreId(ownedStores.get(0).getId());
            model.setStoreName(ownedStores.get(0).getName());
        }
        return model;
    }

    private String resolveStoreName(UserModel userModel) {
        if (userModel.getStoreName() != null && !userModel.getStoreName().isBlank()) {
            return userModel.getStoreName().trim();
        }
        return "Loja " + userModel.getNome();
    }

    private void sanitizeUserModel(UserModel userModel) {
        userModel.setNome(InputSanitizer.sanitizeText(userModel.getNome(), 120));
        userModel.setEmail(InputSanitizer.sanitizeEmail(userModel.getEmail()));
        userModel.setRole(InputSanitizer.sanitizeText(userModel.getRole(), 40));
        userModel.setStoreName(InputSanitizer.sanitizeText(userModel.getStoreName(), 160));
    }

    private void validateRole(String role) {
        if (role == null || role.isBlank()) {
            return;
        }
        String normalizedRole = role.toLowerCase(Locale.ROOT);
        if (!normalizedRole.equals("admin") && !normalizedRole.equals("lojista") && !normalizedRole.equals("user")) {
            throw new IllegalArgumentException("Role inválida.");
        }
    }

    private void linkUserToStore(UserEntity user, UserModel userModel, boolean creatingUser) {
        StoreEntity store;

        if (userModel.getStoreId() != null) {
            store = storeRepository.findById(userModel.getStoreId())
                    .orElseThrow(() -> new IllegalArgumentException("Loja não encontrada."));
        } else {
            List<StoreUserMembershipEntity> memberships = membershipRepository.findByUserIdOrderByIdAsc(user.getId());
            if (!memberships.isEmpty()) {
                store = memberships.get(0).getStore();
            } else {
                store = new StoreEntity();
                store.setName(resolveStoreName(userModel));
                store.setOwner(user);
                store = storeRepository.save(store);
            }
        }

        if (store.getName() == null || creatingUser || (userModel.getStoreName() != null && !userModel.getStoreName().isBlank())) {
            store.setName(resolveStoreName(userModel));
            if (store.getOwner() == null) {
                store.setOwner(user);
            }
            storeRepository.save(store);
        }

        StoreEntity finalStore = store;
        membershipRepository.findByStoreIdAndUserId(store.getId(), user.getId()).orElseGet(() -> {
            StoreUserMembershipEntity membership = new StoreUserMembershipEntity();
            membership.setStore(finalStore);
            membership.setUser(user);
            membership.setMembershipRole(finalStore.getOwner() != null && finalStore.getOwner().getId().equals(user.getId()) ? "OWNER" : "MANAGER");
            return membershipRepository.save(membership);
        });
    }

    public String hashPass (String senha) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] encodedhash = digest.digest(senha.getBytes(StandardCharsets.UTF_8));

            StringBuilder hexString = new StringBuilder();
            for (byte b : encodedhash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public boolean matchesPassword(String plainPassword, String storedHash) {
        if (plainPassword == null || storedHash == null || storedHash.isBlank()) {
            return false;
        }

        if (matchesSha256(plainPassword, storedHash)) {
            return true;
        }

        String trimmedPassword = plainPassword.trim();
        return !trimmedPassword.equals(plainPassword) && matchesSha256(trimmedPassword, storedHash);
    }

    private boolean matchesSha256(String plainPassword, String storedHash) {
        byte[] computedHashBytes = hashPass(plainPassword).getBytes(StandardCharsets.UTF_8);
        byte[] storedHashBytes = storedHash.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(computedHashBytes, storedHashBytes);
    }

    private String normalizeLoginIdentifier(String value) {
        if (value == null) {
            return null;
        }

        String trimmedValue = value.trim();
        if (trimmedValue.isBlank()) {
            return null;
        }

        if (trimmedValue.contains("@")) {
            return InputSanitizer.sanitizeEmail(trimmedValue);
        }

        return InputSanitizer.sanitizeText(trimmedValue, 120);
    }
}
