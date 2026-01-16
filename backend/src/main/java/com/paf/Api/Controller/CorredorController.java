package com.paf.Api.Controller;

import com.paf.Api.Dto.CorredorRequest;
import com.paf.Api.Dto.CorredorResponde;
import com.paf.Domain.Mappers.CorredorMapper;
import com.paf.Domain.Models.CorredorModel;
import com.paf.Infrastructure.Entities.CorredorEntity;
import com.paf.Infrastructure.Entities.PrateleiraEntity;
import com.paf.Infrastructure.Repository.CorredorRepository;
import com.paf.Infrastructure.Repository.PrateleiraRepository;
import lombok.Setter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/corredores")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true") // Adicionado para evitar bloqueios do React
public class CorredorController {

    @Autowired
    private CorredorRepository corredorRepository;

    @Autowired
    private PrateleiraRepository prateleiraRepository;

    @Setter
    private Long currentUserId;

    // --- MUDANÇA PRINCIPAL AQUI ---
    // Agora retorna uma Lista e o 'nome' é opcional.
    // Endpoint: http://localhost:8080/corredores/CGet (Retorna todos)
    // Endpoint: http://localhost:8080/corredores/CGet?nome=Laticinios (Filtra por nome)
    @GetMapping("/CGet")
    public ResponseEntity<List<CorredorResponde>> getCorredores(@RequestParam(required = false) String nome){
        List<CorredorEntity> entities;

        if (nome == null || nome.isEmpty()) {
            // Se não houver nome, busca todos
            entities = corredorRepository.findAll();
        } else {
            // Se houver nome, busca específico (e envolve numa lista)
            Optional<CorredorEntity> opt = corredorRepository.findByNome(nome);
            if (opt.isEmpty()) {
                return ResponseEntity.ok(Collections.emptyList());
            }
            entities = List.of(opt.get());
        }

        // Converter entidades para DTOs
        List<CorredorResponde> responseList = entities.stream()
                .map(e -> CorredorResponde.fromModel(CorredorMapper.toModel(e)))
                .collect(Collectors.toList());

        return ResponseEntity.ok(responseList);
    }

    @PostMapping("/CPost")
    public ResponseEntity<CorredorResponde> CreateCorredor (@RequestBody CorredorRequest request){
        if (request == null || request.getNome() == null) return ResponseEntity.badRequest().build();

        CorredorModel model = new CorredorModel();
        model.setName(request.getNome());

        if (this.currentUserId != null) {
            model.setStoreId(this.currentUserId);
        } else if (request.getStoreId() != null) {
            model.setStoreId(request.getStoreId());
        } else {
            model.setStoreId(1L);
        }

        CorredorEntity entity = CorredorMapper.toEntity(model);
        CorredorEntity saved = corredorRepository.save(entity);
        CorredorModel savedModel = CorredorMapper.toModel(saved);

        return ResponseEntity.status(HttpStatus.CREATED).body(CorredorResponde.fromModel(savedModel));
    }

    @PutMapping("/CUpdt")
    public ResponseEntity<CorredorResponde> UpdateCorredor (@RequestBody CorredorRequest request){
        if (request == null || request.getId() == null) return ResponseEntity.badRequest().build();

        Optional<CorredorEntity> opt = corredorRepository.findById(request.getId());
        if (opt.isEmpty()) return ResponseEntity.notFound().build();

        CorredorModel model = CorredorMapper.toModel(opt.get());

        if (request.getNome() != null)
            model.setName(request.getNome());

        if (this.currentUserId != null) {
            model.setStoreId(this.currentUserId);
        }

        CorredorEntity entity = opt.get();
        CorredorMapper.updateEntityFromModel(entity, model);
        CorredorEntity saved = corredorRepository.save(entity);
        CorredorModel savedModel = CorredorMapper.toModel(saved);

        return ResponseEntity.ok(CorredorResponde.fromModel(savedModel));
    }

    @DeleteMapping("/CDel/{id}")
    public ResponseEntity<Void> DeleteCorredor (@PathVariable Long id){
        if (!corredorRepository.existsById(id)) return ResponseEntity.notFound().build();

        List<PrateleiraEntity> shelves = prateleiraRepository.findByIdCorredor(id);
        if (shelves != null && !shelves.isEmpty()) {
            prateleiraRepository.deleteAll(shelves);
        }

        corredorRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/CGetByStore/{storeId}")
    public ResponseEntity<List<CorredorResponde>> GetByStore(@PathVariable Long storeId) {
        List<CorredorEntity> list = corredorRepository.findByIdLoja(storeId);
        if (list == null || list.isEmpty()) return ResponseEntity.notFound().build(); // Ou retornar emptyList()

        List<CorredorResponde> resp = list.stream().map(c -> {
            return CorredorResponde.fromModel(CorredorMapper.toModel(c));
        }).collect(Collectors.toList());
        return ResponseEntity.ok(resp);
    }
}