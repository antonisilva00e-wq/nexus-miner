# BizMiner - Minerador de Leads e CRM

O **BizMiner** é uma plataforma estática (HTML/CSS/JS puros) desenvolvida sob medida para a **prospecção ativa** de clientes (B2B). Com ela, você pode pesquisar setores ou atividades comerciais em qualquer região do Brasil, minerar as informações públicas de contato de forma automatizada e gerenciar os potenciais clientes em um funil de vendas (CRM) local.

## Principais Recursos

- **Minerador de Leads Automatizado:**
  - **Filtro Combinado:** Busca por palavras-chave (ex: "imobiliária", "padaria", "clínica") + Cidade/Região (ex: "Belo Horizonte", "Curitiba", "São Paulo").
  - **OpenStreetMap Nominatim (Gratuito/Ilimitado):** Conexão automática a base pública geolocalizada para buscar estabelecimentos reais sem necessidade de chaves de API ou cadastros.
  - **Integração Google Places API (Opcional):** Permite colocar sua própria chave da API nas configurações. O Google Maps é atualizado pelos próprios donos dos estabelecimentos, garantindo que os telefones, sites e localizações sejam ativos e reais.
  - **Validação de Estabelecimentos (Google Maps):** Cada lead possui um link direto em formato de ícone de mapa que pesquisa o local no Google Maps para que você possa inspecionar avaliações, fotos e status.

- **Segurança e Privacidade Absoluta:**
  - **Exclusividade e Proteção:** O painel conta com banners visuais indicando a segurança dos dados. Toda a aplicação é executada inteiramente na sua máquina (lado do cliente).
  - **Armazenamento 100% Local:** Suas pesquisas, leads salvos e chaves de API são armazenados apenas no `localStorage` do seu navegador. Nenhum dado é enviado para servidores de terceiros ou pode ser visto por outras pessoas.

- **CRM e Edição Completa dos Leads:**
  - **Favoritar/Salvar Leads:** Adicione empresas encontradas nas buscas diretamente no funil de vendas com um clique.
  - **Editar Contatos:** Botão de edição na tabela do CRM que permite alterar qualquer informação do lead (Razão Social, CNPJ, Telefone, WhatsApp, E-mail, Site, Categoria e Endereço). Ideal para corrigir ou enriquecer as informações após ligar para o cliente.
  - **Gerenciador de Status:** Classifique o lead em: *Novo Lead*, *Contato Feito*, *Em Negociação*, *Cliente Fechado* ou *Sem Interesse*.
  - **Bloco de Anotações:** Campo expandido para registrar datas de ligações, nomes dos responsáveis, observações de conversas e propostas enviadas.

- **Busca, Filtro e Exportação Excel:**
  - Barra de busca textual dentro do funil de prospecção.
  - Filtro por status do funil.
  - Exportação de toda a tabela em formato CSV compatível diretamente com o Microsoft Excel (utiliza separador `;` brasileiro e marcação UTF-8 BOM para evitar problemas com caracteres e acentos como `ã`, `ç`, `ó`).

---

## Como Executar
1. O BizMiner é 100% estático. Para abrir, dê dois cliques sobre o arquivo [index.html](file:///C:/Users/J_7/.gemini/antigravity/scratch/painel-empresarios/index.html) no seu gerenciador de arquivos.
2. Não há necessidade de instalar Node, NPM ou servidores de banco de dados. Tudo funciona direto no seu navegador.

## Estrutura do Projeto
- [index.html](file:///C:/Users/J_7/.gemini/antigravity/scratch/painel-empresarios/index.html) - Estrutura e marcação semântica das abas, tabelas, modais e formulários.
- [style.css](file:///C:/Users/J_7/.gemini/antigravity/scratch/painel-empresarios/style.css) - Estilos visuais premium (glassmorphism, tema escuro, tags e status formatados, responsividade completa).
- [app.js](file:///C:/Users/J_7/.gemini/antigravity/scratch/painel-empresarios/app.js) - Lógica de conexão com APIs de mapas, simulador offline, mascaramento de DDDs, geração de CNPJ válidos, banco CRM e exportação de relatórios.
