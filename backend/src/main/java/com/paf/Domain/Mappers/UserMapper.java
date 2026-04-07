package com.paf.Domain.Mappers;

import com.paf.Api.Dto.UserRequest;
import com.paf.Api.Dto.UserResponse;
import com.paf.Domain.Models.UserModel;
import com.paf.Infrastructure.Entities.UserEntity;

public interface UserMapper {

    // DTO <-> Model (existente)
    public static UserModel toModel(UserRequest req) {
        if (req == null) return null;
        UserModel m = new UserModel();
        m.setIdUser(req.getIdUser());
        m.setNome(req.getNome());
        m.setEmail(req.getEmail());
        m.setSenha(req.getSenha());
        m.setRole(req.getRole());
        m.setStoreId(req.getStoreId());
        m.setStoreName(req.getStoreName());
        return m;
    }

    public static UserResponse toResponse(UserModel model) {
        if (model == null) return null;
        UserResponse r = new UserResponse();
        r.setIdUser(model.getIdUser());
        r.setNome(model.getNome());
        r.setEmail(model.getEmail());
        r.setSenha(model.getSenha());
        r.setRole(model.getRole());
        r.setStoreId(model.getStoreId());
        r.setStoreName(model.getStoreName());
        r.setSessionToken(model.getSessionToken());
        r.setSessionExpiresAt(model.getSessionExpiresAt());
        return r;
    }

    public static void updateModelFromRequest(UserModel model, UserRequest req) {
        if (model == null || req == null) return;
        if (req.getIdUser() != null) {
            model.setIdUser(req.getIdUser());
        }
        model.setNome(req.getNome());
        model.setEmail(req.getEmail());
        model.setSenha(req.getSenha());
        model.setRole(req.getRole());
        model.setStoreId(req.getStoreId());
        model.setStoreName(req.getStoreName());
    }

    // Model <-> Entity (novos métodos)
    public static UserEntity toEntity(UserModel model) {
        if (model == null) return null;
        UserEntity e = new UserEntity();
        if (model.getIdUser() != null) {
            e.setId(model.getIdUser());
        }
        e.setNome(model.getNome());
        e.setEmail(model.getEmail());
        e.setSenha(model.getSenha());
        e.setRole(model.getRole());
        return e;
    }

    public static UserModel toModel(UserEntity entity) {
        if (entity == null) return null;
        UserModel m = new UserModel();
        m.setIdUser(entity.getId());
        m.setNome(entity.getNome());
        m.setEmail(entity.getEmail());
        m.setSenha(entity.getSenha());
        m.setRole(entity.getRole());
        return m;
    }

    public static void updateEntityFromModel(UserEntity entity, UserModel model) {
        if (entity == null || model == null) return;
        if (model.getIdUser() != null) {
            entity.setId(model.getIdUser());
        }
        if (model.getNome() != null) {
            entity.setNome(model.getNome());
        }
        if (model.getEmail() != null) {
            entity.setEmail(model.getEmail());
        }
        if (model.getSenha() != null) {
            entity.setSenha(model.getSenha());
        }
        if (model.getRole() != null) {
            entity.setRole(model.getRole());
        }
    }
}
