// java
package com.paf.Infrastructure.Repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import com.paf.Infrastructure.Entities.PrateleiraEntity;

public interface PrateleiraRepository extends JpaRepository<PrateleiraEntity, Long> {
    // usa o nome do campo exatamente como na entidade (ex.: idCorredor)
    List<PrateleiraEntity> findByIdCorredor(Long idCorredor);
}
