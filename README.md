# Paf 🛒📍
### Sistema de Gestão de Loja & Mapeamento Visual

O **Paf** é uma solução Full-Stack para gestão de inventário que vai além das tabelas tradicionais. O seu diferencial é o **Mapeamento Visual (Visual Mapping Engine)**, permitindo aos lojistas gerir a localização exata de corredores e prateleiras num mapa interativo da loja.

Desenvolvido para modernizar a organização de espaços físicos, combinando a robustez do **Java Spring Boot** com a interatividade do **React**.

---

## 🛠️ Stack Tecnológica

O projeto segue uma arquitetura moderna de microsserviços monolíticos.

| Componente | Tecnologia | Versão | Descrição |
| :--- | :--- | :--- | :--- |
| **Backend** | ![Java](https://img.shields.io/badge/Java-17-ED8B00?style=flat&logo=openjdk&logoColor=white) | 17 | Core da aplicação e lógica de negócio. |
| **Framework** | ![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.5.6-6DB33F?style=flat&logo=spring&logoColor=white) | 3.5.6 | API RESTful, Injeção de Dependência e Segurança. |
| **Frontend** | ![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black) | 19.0 | Interface SPA reativa construída com **Vite**. |
| **Base de Dados** | ![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=flat&logo=mysql&logoColor=white) | 8.0+ | Persistência de dados relacional (Hibernate/JPA). |
| **Build** | ![Maven](https://img.shields.io/badge/Maven-3.9-C71A36?style=flat&logo=apache-maven&logoColor=white) | 3.9 | Gestão de dependências e automação. |

---

## ✨ Funcionalidades Atuais

### 🔐 Autenticação e Perfis
* **Sistema de Login/Registo:** Autenticação segura com validação de credenciais.
* **Controlo de Acesso (RBAC):**
    * **Administrador:** Gestão total de utilizadores e configurações da loja.
    * **Lojista:** Focado na gestão diária de stock e mapa.

### 🗺️ Motor de Mapeamento Visual
* **Coordenadas Reais:** As prateleiras são salvas com coordenadas `X` e `Y` (`posX`, `posY`) e dimensões (`width`, `height`), permitindo desenhar o layout real da loja.
* **Gestão de Espaços:** Criação dinâmica de Corredores e Prateleiras no mapa digital.
* **Pins de Localização:** Visualização exata de onde cada prateleira está situada no espaço físico.

### 📦 Gestão de Inventário
* **Catálogo de Produtos:** CRUD completo (Criar, Ler, Atualizar, Apagar) de itens.
* **Associação Geográfica:** Cada produto é ligado logicamente a uma Prateleira e Corredor específicos, facilitando a reposição e a busca.
* **Pesquisa Otimizada:** Busca instantânea de produtos por nome.

---
