package com.paf.Domain.Services;

import com.paf.Domain.Mappers.PrateleiraMapper;
import com.paf.Domain.Models.PrateleirasModel;
import com.paf.Infrastructure.Entities.PrateleiraEntity;
import com.paf.Infrastructure.Repository.PrateleiraRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class PrateleiraService {
    private final PrateleiraRepository repository;

    @Autowired
    public PrateleiraService(PrateleiraRepository repository) {
        this.repository = repository;
    }

    public PrateleirasModel createPrateleira(PrateleirasModel model) {
        if (model == null) return null;

        PrateleiraEntity entity = PrateleiraMapper.toEntity(model);
        PrateleiraEntity saved = repository.save(entity);

        // Retorna o modelo completo com o ID novo
        return PrateleiraMapper.toModel(saved);
    }


    public List<PrateleirasModel> getAll() {
        List<PrateleiraEntity> entities = repository.findAll();
        if (entities.isEmpty()) return Collections.emptyList();

        return entities.stream()
                .map(PrateleiraMapper::toModel)
                .collect(Collectors.toList());
    }

    /**
     * MUDANÇA 3: Método getByName()
     * Motivo: O Controller chama isto quando o React faz uma pesquisa (?nome=X).
     */
    public List<PrateleirasModel> getByName(String name) {
        if (name == null) return Collections.emptyList();

        // Opção A: Se o teu Repository tiver findByNomeContaining, usa-o (Melhor Performance).
        // Opção B: Filtrar aqui no Java (Seguro se não quiseres mexer no Repository agora):
        return repository.findAll().stream()
                .filter(e -> e.getNome() != null && e.getNome().toLowerCase().contains(name.toLowerCase()))
                .map(PrateleiraMapper::toModel)
                .collect(Collectors.toList());
    }

    // --- MÉTODOS ANTIGOS MANTIDOS ---

    public PrateleirasModel getById(Long id) {
        Optional<PrateleiraEntity> opt = repository.findById(id);
        return opt.map(PrateleiraMapper::toModel).orElse(null);
    }

    public boolean deletePrateleira(Long id) {
        if (!repository.existsById(id)) return false;
        repository.deleteById(id);
        return true;
    }

    public PrateleirasModel updatePrateleira(PrateleirasModel model) {
        if (model == null || model.getId() == null) return null;
        Optional<PrateleiraEntity> opt = repository.findById(model.getId());
        if (opt.isEmpty()) return null;

        PrateleiraEntity entity = opt.get();
        PrateleiraMapper.updateEntityFromModel(entity, model);
        PrateleiraEntity saved = repository.save(entity);
        return PrateleiraMapper.toModel(saved);
    }

    public List<PrateleirasModel> getByCorredor(Long corredorId) {
        if (corredorId == null) return Collections.emptyList();
        // Nota: Idealmente deves ter findByIdCorredor no Repository, mas isto funciona:
        return repository.findAll().stream()
                .filter(e -> corredorId.equals(e.getIdCorredor()))
                .map(PrateleiraMapper::toModel)
                .collect(Collectors.toList());
    }

    public PrateleirasModel ensureCorredorId(PrateleirasModel prateleira, Long corredorId) {
        if (prateleira != null) {
            prateleira.setCorredorId(corredorId);
        }
        return prateleira;
    }
}