package com.paf.Domain.Services;

import com.paf.Domain.Mappers.UserMapper;
import com.paf.Domain.Models.UserModel;
import com.paf.Infrastructure.Entities.UserEntity;
import com.paf.Infrastructure.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Optional;
import java.util.List;
import java.util.ArrayList;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    public String CreateUser(UserModel userModel) {

        if (userModel == null) {
            return "Invalid user";
        }

        if (userModel.getSenha() != null){
            userModel.setSenha(hashPass(userModel.getSenha()));
        }

        // usa o mapper para criar a entity a partir do model
        UserEntity userEntity = UserMapper.toEntity(userModel);

        // persist
        UserEntity saved = userRepository.save(userEntity);

        // mapear de volta o id gerado para o model
        userModel.setIdUser(saved.getId());

        return "User created with id: " + saved.getId();
    }

    public UserModel GetByName(String nome) {
        Optional<UserEntity> opt = userRepository.findByNome(nome);
        if (opt.isEmpty()) return null;
        // usa o mapper para converter entity -> model
        return UserMapper.toModel(opt.get());
    }

    public boolean DeleteUser(Long id) {
        if (!userRepository.existsById(id)) return false;
        userRepository.deleteById(id);
        return true;
    }

    public UserModel UpdateUser(UserModel userModel) {
        if (userModel == null || userModel.getIdUser() == null) return null;
        Optional<UserEntity> opt = userRepository.findById(userModel.getIdUser());
        if (opt.isEmpty()) return null;
        UserEntity entity = opt.get();

        if (userModel.getSenha() != null && !userModel.getSenha().isEmpty()) {
            userModel.setSenha(hashPass(userModel.getSenha()));
        }

        // usa o mapper para aplicar as alterações no entity sem perder o id
        UserMapper.updateEntityFromModel(entity, userModel);

        UserEntity saved = userRepository.save(entity);
        return UserMapper.toModel(saved);
    }

    public Iterable<UserModel> GetAllUsers() {
        List<UserEntity> entities = userRepository.findAll();
        List<UserModel> result = new ArrayList<>();
        if (entities != null) {
            for (UserEntity e : entities) {
                result.add(UserMapper.toModel(e));
            }
        }
        return result;
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
}
