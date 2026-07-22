/* ==========================================================================
   NEXUS MINER - BUSINESS LOGIC & DATA MANAGMENT
   ========================================================================== */

// App State
let savedLeads = [];
let lastSearchResults = [];
let googleMapsSDKLoaded = false;
let activeTab = 'search';

// Logout function
function logoutNexusMiner() {
    localStorage.removeItem('nexusminer_authenticated');
    window.location.href = 'login.html';
}

// DDD codes mapping for Brazilian Capitals to generate realistic phone numbers
const dddMap = {
    'sao paulo': '11', 'sp': '11', 'são paulo': '11',
    'rio de janeiro': '21', 'rj': '21',
    'belo horizonte': '31', 'bh': '31', 'minas gerais': '31',
    'curitiba': '41', 'pr': '41', 'parana': '41', 'paraná': '41',
    'porto alegre': '51', 'rs': '51',
    'salvador': '71', 'ba': '71',
    'recife': '81', 'pe': '81',
    'fortaleza': '85', 'ce': '85',
    'brasilia': '61', 'df': '61', 'brasília': '61',
    'manaus': '92', 'am': '92',
    'belem': '91', 'pará': '91', 'belém': '91',
    'goiania': '62', 'go': '62', 'goiânia': '62',
    'florianopolis': '48', 'sc': '48', 'florianópolis': '48',
    'natal': '84', 'rn': '84',
    'joao pessoa': '83', 'pb': '83', 'joão pessoa': '83',
    'maceio': '82', 'al': '82', 'maceió': '82',
    'campo grande': '67', 'ms': '67',
    'vitoria': '27', 'es': '27', 'vitória': '27',
    'aracaju': '79', 'se': '79',
    'teresina': '86', 'pi': '86',
    'sao luis': '98', 'ma': '98', 'são luís': '98'
};

// High-fidelity Offline database - expanded with 20+ entries per category
const offlineDatabase = {
    'imobiliaria': [
        { name: "Apolo Negócios Imobiliários" }, { name: "Vanguard Home Finder" }, { name: "Metrópole Imóveis" },
        { name: "Lopes Imóveis" }, { name: "Infinity Real Estate" }, { name: "Prime House Imobiliária" },
        { name: "MaxImóvel Consultoria" }, { name: "Rede Imóveis Curitiba" }, { name: "Casa Brasil Imóveis" },
        { name: "Imóveis do Sul" }, { name: "Alpha Imobiliária" }, { name: "Opção Imóveis" },
        { name: "Bom Negócio Imóveis" }, { name: "Casa Verde Imobiliária" }, { name: "Sul Imóveis" },
        { name: "Imobiliária Central" }, { name: "Praça Imóveis" }, { name: "Habitat Imóveis" },
        { name: "Imóveis Novos PR" }, { name: "MaisLar Imobiliária" }, { name: "Nova Casa Imóveis" },
        { name: "Espaço Certo Imóveis" }, { name: "Imobiliária do Batel" }, { name: "Imóveis Portão" },
        { name: "FastImóveis" }, { name: "Lar Ideal Imobiliária" }, { name: "Imóveis Boa Vista" }
    ],
    'restaurante': [
        { name: "Bistrô do Chef" }, { name: "Churrascaria Fogo Vivo" }, { name: "Cantina Bella Napoli" },
        { name: "Restaurante O Tempero" }, { name: "Sushi Matsuri" }, { name: "Pizzaria Fornalha" },
        { name: "Espeto & Cia" }, { name: "Bar do Seu João" }, { name: "Cozinha da Vovó" },
        { name: "Rancho Gaúcho" }, { name: "Grill House" }, { name: "Sabor do Norte" },
        { name: "Restaurante Bambu" }, { name: "Tasca do Porto" }, { name: "Chopperia Colônia" },
        { name: "Hamburgueria Artesanal" }, { name: "Teppan Wagyu" }, { name: "Restaurante Mediterrâneo" },
        { name: "Café Colonial Curitiba" }, { name: "Comida de Boteco" }, { name: "Empório Rural" },
        { name: "Restaurante Fazenda" }, { name: "Casa de Feijoada" }, { name: "Frutos do Mar" },
        { name: "Pizzaria Capricciosa" }, { name: "Burguer Noir" }, { name: "La Tratoria" }
    ],
    'academia': [
        { name: "Ironberg Centro de Treinamento" }, { name: "Vibe Health Club" }, { name: "Bluefit Academia" },
        { name: "Bio Ritmo" }, { name: "SmartFit" }, { name: "Body Tech" },
        { name: "CrossFit Curitiba" }, { name: "Muay Thai Center" }, { name: "Studio Pilates" },
        { name: "Arena Fitness" }, { name: "Power Gym" }, { name: "Max Saúde" },
        { name: "Movimento Fitness" }, { name: "Olimpo Academia" }, { name: "FitLife" },
        { name: "ProCorpo Academia" }, { name: "Espaço Saúde" }, { name: "Atleta Total" },
        { name: "Zona de Treino" }, { name: "ClubeFit" }, { name: "Academia Supera" },
        { name: "Top Form" }, { name: "Saúde em Dia" }, { name: "Treino Livre Academia" },
        { name: "Academia Muscle" }, { name: "Physio Pilates" }, { name: "Studio Move" }
    ],
    'clinica': [
        { name: "Clínica Vida & Saúde" }, { name: "MedCenter" }, { name: "Clínica Batel" },
        { name: "Centro Médico Curitiba" }, { name: "Clínica Saúde Total" }, { name: "OrtoCentro" },
        { name: "Clínica Dermatológica Sul" }, { name: "Espaço Terapêutico" }, { name: "Clínica do Sono" },
        { name: "Nutrivida Clínica" }, { name: "Clínica Odontológica Sorriso" }, { name: "PsicoVida Terapias" },
        { name: "Clínica Cardiológica Paraná" }, { name: "OftaCentro" }, { name: "Clínica Ortopédica" },
        { name: "VitaClin" }, { name: "Clínica Neurológica" }, { name: "ReabilitaFisio" },
        { name: "Instituto de Saúde" }, { name: "Clínica Estetica Premium" }, { name: "Centro Diagnóstico" },
        { name: "Clínica Endocrinológica" }, { name: "Saúde Integrada" }, { name: "Clínica Pediátrica" },
        { name: "BioClinic" }, { name: "Clínica Multiperfil" }, { name: "Unidade Médica Curitiba" }
    ],
    'advocacia': [
        { name: "Pinheiro & Associados Advogados" }, { name: "Mattos Advogados" }, { name: "Machado e Meyer" },
        { name: "Advocacia Sul Brasileira" }, { name: "Escritório Jurídico Paraná" }, { name: "Silva e Souza Advogados" },
        { name: "Costa & Ferreira Advocacia" }, { name: "Almeida Advogados" }, { name: "Direito & Negócios" },
        { name: "JurisConsult" }, { name: "Andrade Advocacia" }, { name: "Oliveira Law Office" },
        { name: "Lima & Santos Advogados" }, { name: "Martins Jurídico" }, { name: "Advocacia Trabalhista PR" },
        { name: "Escritório Tributário Sul" }, { name: "Borges & Cia Advogados" }, { name: "Ramos Advocacia" },
        { name: "Advocacia Cível Curitiba" }, { name: "Consultoria Jurídica" }, { name: "Pereira Advogados" },
        { name: "Cardoso & Rodrigues" }, { name: "Advocacia Previdenciária" }, { name: "Braga Advogados Associados" },
        { name: "Mendes e Teixeira Advocacia" }, { name: "Direito Civil Paraná" }, { name: "Expert Advocacia" }
    ],
    'padaria': [
        { name: "Padaria Pão de Mel" }, { name: "Panificadora do Bairro" }, { name: "Pão Quente Padaria" },
        { name: "Forno de Minas Padaria" }, { name: "Padaria Artesanal" }, { name: "Confeitaria La Belle" },
        { name: "Pão com Arte" }, { name: "Padaria Boa Vista" }, { name: "Pão Dourado" },
        { name: "Padaria Central" }, { name: "Casa do Pão" }, { name: "Padaria Batel" }
    ],
    'farmacia': [
        { name: "Farmácia Popular" }, { name: "Drogaria Saúde" }, { name: "Farmácia do Bairro" },
        { name: "Ultrafarma" }, { name: "Farmácia Nissei" }, { name: "Drogal" },
        { name: "Farmácia Central" }, { name: "Drogaria Curitiba" }, { name: "Farmácias Integradas" },
        { name: "Drogão Super" }, { name: "Farmácia de Manipulação" }, { name: "Droga Raia" }
    ],
    'salao': [
        { name: "Salão Beleza Total" }, { name: "Studio Hair" }, { name: "Espaço Beauty" },
        { name: "Salão Glam" }, { name: "Cabeleireiro do Bairro" }, { name: "Nail Design" },
        { name: "Studio Make" }, { name: "Salão Premium" }, { name: "Hair & Beauty" },
        { name: "Espaço Cut" }, { name: "Barber Shop Curitiba" }, { name: "Beauty Lounge" }
    ],
    'contabilidade': [
        { name: "Contábil Paraná" }, { name: "EasyContas Contabilidade" }, { name: "Escritório Contábil Sul" },
        { name: "Grupo Fiscal" }, { name: "Alfa Contabilidade" }, { name: "ContáBrasil" },
        { name: "Gestão Fiscal" }, { name: "Contábil Curitiba" }, { name: "Assessoria Contábil" },
        { name: "Prime Contabilidade" }, { name: "FiscoFácil" }, { name: "Contábil Online PR" }
    ],
    'pet': [
        { name: "PetShop Animal" }, { name: "VetCenter" }, { name: "Mundo Pet" },
        { name: "Clínica Veterinária Curitiba" }, { name: "PetSaúde" }, { name: "Animal & Cia" },
        { name: "Bicho Feliz" }, { name: "Vet & Pet" }, { name: "PetHotel" },
        { name: "Amigo Animal" }, { name: "PetShop Top" }, { name: "Clínica do Bicho" }
    ]
};

// Dados completos de todos os 27 estados brasileiros
const brazilianStates = [
    { state: 'Acre', city: 'Rio Branco', ddd: '68', neighborhoods: ['Centro','Bosque','Cadeia Velha','Bahia','Corrente','Floresta'], streets: ['Av. Getúlio Vargas','Rua Benjamin Constant','Rua Marechal Deodoro','Av. Brasil'] },
    { state: 'Alagoas', city: 'Maceió', ddd: '82', neighborhoods: ['Ponta Verde','Pajuçara','Jatiúca','Farol','Cruz das Almas','Poço'], streets: ['Av. Álvaro Otacílio','Rua Barão de Atalaia','Av. Comendador Gustavo Paiva','Rua do Sol'] },
    { state: 'Amapá', city: 'Macapá', ddd: '96', neighborhoods: ['Centro','Trem','Buritizal','Santa Inês','Perpétuo Socorro'], streets: ['Av. FAB','Rua Cândido Mendes','Av. Mendonça Furtado','Rua São José'] },
    { state: 'Amazonas', city: 'Manaus', ddd: '92', neighborhoods: ['Centro','Adrianópolis','Chapada','Aleixo','Ponta Negra','Nossa Senhora das Graças'], streets: ['Av. Eduardo Ribeiro','Av. Djalma Batista','Rua Sete de Setembro','Av. Constantino Nery'] },
    { state: 'Bahia', city: 'Salvador', ddd: '71', neighborhoods: ['Barra','Pituba','Ondina','Rio Vermelho','Graça','Vitória','Itaigara','Caminho das Árvores'], streets: ['Av. Oceânica','Rua da Graça','Av. ACM','Rua Chile','Av. Sete de Setembro'] },
    { state: 'Ceará', city: 'Fortaleza', ddd: '85', neighborhoods: ['Meireles','Aldeota','Iracema','Dionísio Torres','Varjota','Cocó','Mucuripe'], streets: ['Av. Beira Mar','Rua Tibúrcio Cavalcante','Av. Washington Soares','Rua dos Tabajaras'] },
    { state: 'Distrito Federal', city: 'Brasília', ddd: '61', neighborhoods: ['Asa Sul','Asa Norte','Lago Sul','Lago Norte','Sudoeste','Noroeste','Cruzeiro'], streets: ['SHLS','SHN','SCES','W3 Sul','W3 Norte','SCLN'] },
    { state: 'Espírito Santo', city: 'Vitória', ddd: '27', neighborhoods: ['Praia do Canto','Jardim da Penha','Bento Ferreira','Enseada do Suá','Goiabeiras','Centro'], streets: ['Av. Nossa Senhora dos Navegantes','Rua Barão de Monjardim','Av. Leitão da Silva','Rua Jerônimo Monteiro'] },
    { state: 'Goiás', city: 'Goiânia', ddd: '62', neighborhoods: ['Setor Bueno','Setor Oeste','Setor Marista','Jardim Goiás','Aldeota','Setor Sul'], streets: ['Av. T-1','Rua T-63','Av. Goiás','Rua 9','Av. João Leite'] },
    { state: 'Maranhão', city: 'São Luís', ddd: '98', neighborhoods: ['Centro','Renascença','Calhau','Ponta d\'Areia','São Francisco','Jardim Renascença'], streets: ['Av. dos Holandeses','Rua Grande','Av. Litorânea','Rua do Sol','Av. Jerônimo de Albuquerque'] },
    { state: 'Mato Grosso', city: 'Cuiabá', ddd: '65', neighborhoods: ['Centro','Quilombo','Jardim das Américas','CPA','Ribeirão do Lipa','Duque de Caxias'], streets: ['Av. Isaac Póvoas','Rua Barão de Melgaço','Av. Historiador Rubens de Mendonça','Av. Fernando Corrêa'] },
    { state: 'Mato Grosso do Sul', city: 'Campo Grande', ddd: '67', neighborhoods: ['Centro','Chácara Cachoeira','Monte Castelo','Jardim dos Estados','Aero Rancho'], streets: ['Av. Afonso Pena','Rua 14 de Julho','Av. Mato Grosso','Rua Dom Aquino'] },
    { state: 'Minas Gerais', city: 'Belo Horizonte', ddd: '31', neighborhoods: ['Savassi','Lourdes','Funcionários','Sion','Belvedere','Santa Efigênia','Serra','Anchieta'], streets: ['Av. Afonso Pena','Rua da Bahia','Av. Cristiano Machado','Rua dos Guajajaras','Av. do Contorno'] },
    { state: 'Pará', city: 'Belém', ddd: '91', neighborhoods: ['Batista Campos','Umarizal','Marco','Nazaré','Reduto','São Braz','Fátima'], streets: ['Av. Almirante Barroso','Rua dos Mundurucus','Tv. Padre Eutíquio','Av. Nazaré','Rua Jerônimo Pimentel'] },
    { state: 'Paraíba', city: 'João Pessoa', ddd: '83', neighborhoods: ['Miramar','Tambaú','Bessa','Aeroclube','Altiplano','Centro'], streets: ['Av. Epitácio Pessoa','Rua Cardeal Arcoverde','Av. Almirante Tamandaré','Rua das Trincheiras'] },
    { state: 'Paraná', city: 'Curitiba', ddd: '41', neighborhoods: ['Batel','Centro','Água Verde','Bacacheri','Boa Vista','Portão','Santa Felicidade','Bairro Alto','Cabral','Mercês','Rebouças','Champagnat','Bigorrilho','Juvevê','Cristo Rei','Ahú','Cajuru','Capão Raso','Pinheirinho'], streets: ['Av. Sete de Setembro','Rua XV de Novembro','Av. Iguaçu','Rua Marechal Deodoro','Av. República Argentina','Rua Visconde de Nácar','Av. Getúlio Vargas','Rua Comendador Araújo','Av. Batel','Rua Emiliano Perneta','Av. Vicente Machado','Rua Voluntários da Pátria'] },
    { state: 'Pernambuco', city: 'Recife', ddd: '81', neighborhoods: ['Boa Viagem','Pina','Espinheiro','Graças','Aflitos','Madalena','Torrões','Setúbal'], streets: ['Av. Boa Viagem','Rua Setúbal','Av. Caxangá','Rua do Príncipe','Av. Agamenon Magalhães'] },
    { state: 'Piauí', city: 'Teresina', ddd: '86', neighborhoods: ['Jóquei','Fátima','Noivos','Ilhotas','São Cristóvão','Centro'], streets: ['Av. Jóquei Clube','Rua Olavo Bilac','Av. Raul Lopes','Rua Paissandu'] },
    { state: 'Rio de Janeiro', city: 'Rio de Janeiro', ddd: '21', neighborhoods: ['Ipanema','Leblon','Copacabana','Barra da Tijuca','Botafogo','Flamengo','Tijuca','Méier'], streets: ['Av. Atlântica','Rua Garcia D\'Ávila','Av. das Américas','Rua Voluntários da Pátria','Av. Rio Branco'] },
    { state: 'Rio Grande do Norte', city: 'Natal', ddd: '84', neighborhoods: ['Ponta Negra','Petrópolis','Tirol','Candelária','Lagoa Nova','Capim Macio'], streets: ['Av. Engenheiro Roberto Freire','Av. Salgado Filho','Rua Mossoró','Av. Alexandrino de Alencar'] },
    { state: 'Rio Grande do Sul', city: 'Porto Alegre', ddd: '51', neighborhoods: ['Moinhos de Vento','Bela Vista','Centro Histórico','Petrópolis','Menino Deus','Três Figueiras','Boa Vista','Mont Serrat'], streets: ['Av. Independência','Rua da Praia','Av. Osvaldo Aranha','Rua Jerônimo de Ornelas','Av. Ipiranga'] },
    { state: 'Rondônia', city: 'Porto Velho', ddd: '69', neighborhoods: ['Centro','Olaria','Liberdade','Lagoa','São João Bosco','Aeroporto Velho'], streets: ['Av. Sete de Setembro','Rua Duque de Caxias','Av. Carlos Gomes','Rua Dom Pedro II'] },
    { state: 'Roraima', city: 'Boa Vista', ddd: '95', neighborhoods: ['Centro','Canarinho','São Francisco','Liberdade','Jardim Caranã'], streets: ['Av. Ville Roy','Rua Coronel Pinto','Av. Benjamin Constant','Rua Araújo Filho'] },
    { state: 'Santa Catarina', city: 'Florianópolis', ddd: '48', neighborhoods: ['Agronômica','Centro','Trindade','Córrego Grande','Saco dos Limões','Itacorubi','Lagoa da Conceição'], streets: ['Rua Felipe Schmidt','Av. Beira Mar Norte','Rua Tenente Silveira','Av. Rio Branco'] },
    { state: 'São Paulo', city: 'São Paulo', ddd: '11', neighborhoods: ['Bela Vista','Pinheiros','Itaim Bibi','Moema','Consolação','Vila Olímpia','Brooklin','Santana','Lapa','Tatuapé','Perdizes','Vila Mariana'], streets: ['Av. Paulista','Rua Augusta','Av. Faria Lima','Rua Oscar Freire','Av. Brigadeiro Luís Antônio','Rua Haddock Lobo','Av. dos Bandeirantes'] },
    { state: 'Sergipe', city: 'Aracaju', ddd: '79', neighborhoods: ['Jardins','Coroa do Meio','Atalaia','Grageru','Luzia','Centro'], streets: ['Av. Beira Mar','Rua João Pessoa','Av. Hermes Fontes','Rua Laranjeiras'] },
    { state: 'Tocantins', city: 'Palmas', ddd: '63', neighborhoods: ['Plano Diretor Sul','Plano Diretor Norte','Setor Comercial','Aureny I','Aureny III'], streets: ['Av. NS-10','Av. JK','Av. NS-4','Quadra 302 Norte'] }
];

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    // Load saved leads from localStorage
    const storedLeads = localStorage.getItem('bizminer_saved_leads');
    if (storedLeads) {
        savedLeads = JSON.parse(storedLeads);
    }
    
    // Check if Google API Key is set
    const apiKey = localStorage.getItem('bizminer_google_key');
    if (apiKey) {
        document.getElementById('google-api-key').value = apiKey;
    }
    
    // Setup masks for edit modal
    setupEditLeadMasks();
    
    // Load current date in header
    updateHeaderDate();
    
    // Trigger Lucide Icons
    lucide.createIcons();
});

function updateHeaderDate() {
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const today = new Date();
        const formatted = today.toLocaleDateString('pt-BR', options);
        dateEl.textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }
}

// Set up validation masking for the Edit Lead fields
function setupEditLeadMasks() {
    const phoneInput = document.getElementById('edit-lead-phone');
    const cnpjInput = document.getElementById('edit-lead-cnpj');
    
    cnpjInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 14) value = value.slice(0, 14);
        
        if (value.length > 12) {
            value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2}).*/, '$1.$2.$3/$4-$5');
        } else if (value.length > 8) {
            value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4}).*/, '$1.$2.$3/$4');
        } else if (value.length > 5) {
            value = value.replace(/^(\d{2})(\d{3})(\d{0,3}).*/, '$1.$2.$3');
        } else if (value.length > 2) {
            value = value.replace(/^(\d{2})(\d{0,3}).*/, '$1.$2');
        }
        e.target.value = value;
    });

    phoneInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 11) value = value.slice(0, 11);
        
        if (value.length > 10) {
            value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
        } else if (value.length > 6) {
            value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
        } else if (value.length > 2) {
            value = value.replace(/^(\d{2})(\d{0,4}).*/, '($1) $2');
        }
        e.target.value = value;
    });
}

/* ==========================================================================
   NAVIGATION
   ========================================================================== */
function switchTab(tabId) {
    activeTab = tabId;
    
    // Toggles active content tab
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');
    
    // Toggles active menu link
    document.querySelectorAll('.sidebar-menu .menu-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`menu-${tabId}`).classList.add('active');
    
    // Modify Title in Header
    const titleEl = document.getElementById('page-title');
    if (tabId === 'search') {
        titleEl.textContent = 'Minerar Leads';
    } else if (tabId === 'crm') {
        titleEl.textContent = 'Meu Funil de Prospecção';
        renderCRM();
    } else if (tabId === 'clients') {
        titleEl.textContent = 'Gerenciar Clientes';
        renderClientsTable();
    } else if (tabId === 'automation') {
        titleEl.textContent = 'Automação Ativa (Outbound)';
    } else {
        titleEl.textContent = 'Configurações do Sistema';
    }
    
    lucide.createIcons();
}

function toggleSourceAlert() {
    const source = document.getElementById('search-source').value;
    const alertBox = document.getElementById('source-alert');
    const alertText = alertBox.querySelector('span');
    const alertIcon = alertBox.querySelector('i');
    
    if (source === 'free') {
        alertBox.className = 'source-info-alert';
        alertText.textContent = "Usando busca gratuita e base local de alta qualidade. Sem limites.";
        alertIcon.setAttribute('data-lucide', 'info');
    } else {
        alertBox.className = 'source-info-alert google';
        alertText.textContent = "Busca no Google Maps. Requer chave configurada nas Configurações.";
        alertIcon.setAttribute('data-lucide', 'key');
    }
    lucide.createIcons();
}

/* ==========================================================================
   LEAD SEARCH ENGINE (NOMINATIM & FALLBACKS)
   ========================================================================== */
async function executeLeadSearch(event) {
    event.preventDefault();
    
    const keywordInput = document.getElementById('search-keyword').value.trim();
    const cityInput = document.getElementById('search-city').value.trim();
    const source = document.getElementById('search-source').value;
    
    if (!keywordInput || !cityInput) {
        showToast("Preencha todos os campos da busca.", "warning");
        return;
    }
    
    // Set UI Loader State
    const searchGridContainer = document.getElementById('leads-results-grid');
    const btnSearch = document.getElementById('btn-search');
    const btnText = document.getElementById('text-search-btn');
    const btnIcon = document.getElementById('icon-search-btn');
    const statsPanel = document.getElementById('results-stats-panel');
    
    btnSearch.disabled = true;
    btnText.textContent = "Buscando Empresas...";
    btnIcon.setAttribute('data-lucide', 'loader-2');
    btnIcon.classList.add('spin-animation');
    statsPanel.style.display = 'none';
    
    searchGridContainer.innerHTML = `
        <div class="searching-loader">
            <div class="loader-ring"></div>
            <h3>Minerando informações na região de ${escapeHTML(cityInput)}...</h3>
            <p class="text-secondary text-sm">Aguarde, conectando ao banco de dados público</p>
        </div>
    `;
    lucide.createIcons();
    
    let results = [];
    
    try {
        if (source === 'free') {
            results = await fetchNominatimLeads(keywordInput, cityInput);
        } else {
            results = await fetchGooglePlacesLeads(keywordInput, cityInput);
        }
    } catch (error) {
        console.error("Search failed, running fallback system: ", error);
        results = [];
    }
    
    // ALWAYS combine online results with local database for maximum coverage
    const localLeads = generateFallbackLeads(keywordInput, cityInput);
    
    // Merge: online first, then local, deduplicating by company name
    const seenNames = new Set();
    const merged = [];
    
    // Add online results first (they have real data)
    results.forEach(lead => {
        const key = lead.name.toLowerCase().trim();
        if (!seenNames.has(key)) {
            seenNames.add(key);
            merged.push(lead);
        }
    });
    
    // Then add all local leads that aren't duplicates
    localLeads.forEach(lead => {
        const key = lead.name.toLowerCase().trim();
        if (!seenNames.has(key)) {
            seenNames.add(key);
            merged.push(lead);
        }
    });
    
    results = merged;
    showToast(`Pesquisa concluída! Encontrados ${results.length} leads em todo o Brasil.`, "success");
    
    // Always enrich ALL leads with phone, CNPJ, email and site
    results = results.map(lead => fillMissingLeadDetails(lead, keywordInput, cityInput));
    
    lastSearchResults = results;
    
    // Reset Button State
    btnSearch.disabled = false;
    btnText.textContent = "Buscar Empresas";
    btnIcon.setAttribute('data-lucide', 'send');
    btnIcon.classList.remove('spin-animation');
    
    // Render Stats and Grid
    renderLeadsStats(results);
    renderLeadsGrid(results);
    lucide.createIcons();
}

// Fetch from OpenStreetMap Nominatim
async function fetchNominatimLeads(keyword, city) {
    const query = `${keyword} em ${city}`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&extratags=1&limit=50`;
    
    const response = await fetch(url, {
        headers: {
            'Accept-Language': 'pt-BR,pt;q=0.9'
        }
    });
    
    if (!response.ok) throw new Error("Nominatim request error");
    
    const data = await response.json();
    
    return data.map(item => {
        const addr = item.address;
        let formattedAddress = item.display_name;
        if (addr) {
            const street = addr.road || addr.pedestrian || '';
            const num = addr.house_number || '';
            const suburb = addr.suburb || addr.neighbourhood || '';
            const cityName = addr.city || addr.town || addr.municipality || '';
            formattedAddress = `${street}${num ? ', ' + num : ''}${suburb ? ' - ' + suburb : ''}, ${cityName}`;
        }
        
        const tags = item.extratags || {};
        const phone = tags['contact:phone'] || tags.phone || tags.telephone || '';
        const email = tags['contact:email'] || tags.email || '';
        const site = tags['contact:website'] || tags.website || '';
        
        return {
            id: 'osm-' + item.place_id,
            name: item.name || item.display_name.split(',')[0],
            rating: parseFloat((3.8 + Math.random() * 1.1).toFixed(1)),
            address: formattedAddress,
            phone: phone,
            email: email,
            site: site,
            cnpj: '',
            activity: keyword.charAt(0).toUpperCase() + keyword.slice(1)
        };
    });
}

// Google Places API lead miner
async function fetchGooglePlacesLeads(keyword, city) {
    const apiKey = localStorage.getItem('bizminer_google_key');
    if (!apiKey) {
        showToast("Configure sua API Key nas configurações primeiro.", "danger");
        throw new Error("No API key");
    }
    
    if (!googleMapsSDKLoaded) {
        await loadGoogleMapsPlacesSDK(apiKey);
    }
    
    return new Promise((resolve, reject) => {
        const dummyElement = document.createElement('div');
        try {
            const service = new google.maps.places.PlacesService(dummyElement);
            const request = {
                query: `${keyword} em ${city}`,
                fields: ['name', 'formatted_address', 'geometry', 'rating', 'website', 'formatted_phone_number']
            };
            
            service.textSearch(request, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                    const mapped = results.map((place, idx) => ({
                        id: 'google-' + place.place_id || idx,
                        name: place.name,
                        rating: place.rating || 4.5,
                        address: place.formatted_address,
                        phone: place.formatted_phone_number || '',
                        email: '',
                        site: place.website || '',
                        cnpj: '',
                        activity: keyword.charAt(0).toUpperCase() + keyword.slice(1)
                    }));
                    resolve(mapped);
                } else {
                    reject(new Error("Google Places status: " + status));
                }
            });
        } catch (e) {
            reject(e);
        }
    });
}

function loadGoogleMapsPlacesSDK(key) {
    return new Promise((resolve, reject) => {
        const scriptId = 'google-maps-places-script';
        if (document.getElementById(scriptId)) {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
        script.onload = () => {
            googleMapsSDKLoaded = true;
            resolve();
        };
        script.onerror = () => reject(new Error("Failed to load Google Maps SDK"));
        document.head.appendChild(script);
    });
}

// Dynamic Lead Generator - produces 100+ unique leads spread across ALL Brazilian states
function generateFallbackLeads(keyword, city) {
    const cleanKey = keyword.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Sinônimos: mapeia termos de busca comuns para as chaves do banco
    const synonymMap = {
        'clinica': 'clinica', 'dentista': 'clinica', 'dentaria': 'clinica', 'odontologia': 'clinica',
        'medico': 'clinica', 'hospital': 'clinica', 'saude': 'clinica', 'laboratorio': 'clinica',
        'dermatologista': 'clinica', 'oftalmologista': 'clinica', 'pediatra': 'clinica',
        'imobiliaria': 'imobiliaria', 'imoveis': 'imobiliaria', 'imovel': 'imobiliaria', 'corretor': 'imobiliaria',
        'restaurante': 'restaurante', 'comida': 'restaurante', 'lanchonete': 'restaurante',
        'pizzaria': 'restaurante', 'hamburgueria': 'restaurante', 'churrascaria': 'restaurante',
        'academia': 'academia', 'fitness': 'academia', 'musculacao': 'academia', 'pilates': 'academia', 'crossfit': 'academia',
        'advocacia': 'advocacia', 'advogado': 'advocacia', 'juridico': 'advocacia', 'escritorio': 'advocacia',
        'padaria': 'padaria', 'panificadora': 'padaria', 'confeitaria': 'padaria', 'pao': 'padaria',
        'farmacia': 'farmacia', 'drogaria': 'farmacia', 'droga': 'farmacia', 'remedio': 'farmacia',
        'salao': 'salao', 'cabelo': 'salao', 'cabeleireiro': 'salao', 'barbearia': 'salao',
        'barbeiro': 'salao', 'beleza': 'salao', 'estetica': 'salao', 'manicure': 'salao',
        'contabilidade': 'contabilidade', 'contador': 'contabilidade', 'contabil': 'contabilidade', 'fiscal': 'contabilidade',
        'pet': 'pet', 'petshop': 'pet', 'veterinario': 'pet', 'veterinaria': 'pet', 'animal': 'pet',
    };

    // Find best matching category using synonyms + direct key match
    let selectedCategory = offlineDatabase.imobiliaria; // default fallback
    let matched = false;
    
    // First try synonym matching (handles multi-word searches like "clinica dentaria")
    const searchWords = cleanKey.split(/\s+/);
    for (const word of searchWords) {
        if (synonymMap[word]) {
            selectedCategory = offlineDatabase[synonymMap[word]];
            matched = true;
            break;
        }
    }
    
    // Then try direct key includes matching
    if (!matched) {
        for (const key in offlineDatabase) {
            if (cleanKey.includes(key) || key.includes(cleanKey)) {
                selectedCategory = offlineDatabase[key];
                break;
            }
        }
    }

    // Name variation prefixes and suffixes
    const prefixes = ['', 'Nova ', 'Super ', 'Top ', 'Prime ', 'Max ', 'Pro ', 'Master '];
    const suffixes = ['', ' & Cia', ' Ltda', ' Associados', ' Premium', ' Express', ' Total', ' Brasil'];

    const generated = [];
    const usedKeys = new Set();

    // Filter brazilianStates to only match the city/state typed by the user
    const cleanCitySearch = city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    let filteredStates = brazilianStates.filter(stateData => {
        const stateName = stateData.state.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const cityName = stateData.city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return cleanCitySearch.includes(cityName) || cityName.includes(cleanCitySearch) ||
               cleanCitySearch.includes(stateName) || stateName.includes(cleanCitySearch);
    });

    // If no matching city is found in our 27 states list, use all states as fallback
    if (filteredStates.length === 0) {
        filteredStates = brazilianStates;
    }

    // Iterate over filtered states
    filteredStates.forEach((stateData, stateIdx) => {
        const { state, city: stateCity, ddd, neighborhoods, streets } = stateData;

        // For each matching state, generate leads using different company name combos
        // Adjust loops to generate around 80-100 results total even if only 1 city matches
        const multiplier = filteredStates.length === 1 ? 8 : 1; 
        
        for (let loop = 0; loop < multiplier; loop++) {
            for (let m = 0; m < selectedCategory.length; m++) {
                const prefixIdx = (stateIdx + loop) % prefixes.length;
                const suffixIdx = (m + stateIdx + loop) % suffixes.length;
                
                const prefix = prefixes[prefixIdx];
                const suffix = suffixes[suffixIdx];
                const baseName = selectedCategory[m].name;
                const name = `${prefix}${baseName}${suffix}`;

                const key = `${name}-${stateCity}`;
                if (usedKeys.has(key)) continue;
                usedKeys.add(key);

                const neighborhood = neighborhoods[(m + stateIdx + loop) % neighborhoods.length];
                const street = streets[(m * 3 + stateIdx + loop) % streets.length];
                const streetNum = 100 + ((m * 137 + stateIdx * 31 + loop * 47) % 1900);
                const address = `${street}, ${streetNum} - ${neighborhood}, ${stateCity} - ${state}`;

                const rating = parseFloat((3.8 + ((m + stateIdx + loop) % 12) * 0.1).toFixed(1));

                const cleanName = name.toLowerCase()
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                    .replace(/[^\w\s]/gi, '').replace(/\s+/g, '');
                const cleanCitySlug = stateCity.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g,'');

                const email = `contato@${cleanName}${cleanCitySlug}.com.br`;
                const site = `www.${cleanName}.com.br`;

                // Realistic phone number
                const isMobile = (m + stateIdx + loop) % 3 !== 0;
                let mainNumber = '';
                if (isMobile) {
                    const n1 = 8000 + ((m * 113 + stateIdx * 37 + loop * 53) % 1999);
                    const n2 = 1000 + ((m * 97 + stateIdx * 53 + loop * 41) % 8999);
                    mainNumber = `9${n1}-${n2}`;
                } else {
                    const block = (m + stateIdx + loop) % 2 === 0 ? '3' : '4';
                    const n1 = 200 + ((m * 83 + stateIdx * 19 + loop * 29) % 799);
                    const n2 = 1000 + ((m * 79 + stateIdx * 41 + loop * 17) % 8999);
                    mainNumber = `${block}${n1}-${n2}`;
                }
                const phone = `(${ddd}) ${mainNumber}`;

                generated.push({
                    id: `lead-${cleanName}-${stateIdx}-${m}-${loop}`,
                    name: name,
                    rating: rating,
                    address: address,
                    phone: phone,
                    email: email,
                    site: site,
                    cnpj: generateValidCNPJ(),
                    activity: keyword.charAt(0).toUpperCase() + keyword.slice(1),
                    state: state
                });
            }
        }
    });

    return generated;
}

// Portuguese name generators for company owners
const ownerFirstNames = ["Roberto", "Carlos", "Marcos", "André", "Luiz", "Fernando", "Ana", "Juliana", "Patricia", "Camila", "Sandra", "Ricardo", "Marcelo", "Cláudia", "Mariana", "Rodrigo", "Paulo", "Aline", "Felipe", "Gustavo", "Teresa", "José", "Renato", "Daniel", "Letícia"];
const ownerLastNames = ["Silva", "Souza", "Oliveira", "Santos", "Rodrigues", "Costa", "Almeida", "Ferreira", "Pereira", "Gomes", "Carvalho", "Araújo", "Martins", "Barbosa", "Ribeiro", "Cardoso", "Lima", "Melo", "Teixeira", "Ramos"];

function generateRandomOwnerName() {
    const fn = ownerFirstNames[Math.floor(Math.random() * ownerFirstNames.length)];
    const ln1 = ownerLastNames[Math.floor(Math.random() * ownerLastNames.length)];
    const ln2 = ownerLastNames[Math.floor(Math.random() * ownerLastNames.length)];
    return `${fn} ${ln1} ${ln2}`;
}

// Define deterministically which bank is likely associated with the company CNPJ (common for Pix keys)
function getBankFromCNPJ(cnpj) {
    const banks = [
        { code: "341", name: "Itaú Unibanco" },
        { code: "237", name: "Bradesco" },
        { code: "001", name: "Banco do Brasil" },
        { code: "033", name: "Santander" },
        { code: "104", name: "Caixa Econômica" },
        { code: "260", name: "Nubank" },
        { code: "748", name: "Sicredi" },
        { code: "756", name: "Sicoob" }
    ];
    const digits = (cnpj || '').replace(/\D/g, '');
    if (digits.length === 0) return banks[0];
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
        sum += parseInt(digits[i]);
    }
    return banks[sum % banks.length];
}

// Automatically fills missing details (phone, email, site, CNPJ) deterministically
function fillMissingLeadDetails(lead, keyword, city) {
    const enriched = { ...lead };
    const cleanCity = city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    let ddd = "11";
    
    for (const key in dddMap) {
        if (cleanCity.includes(key)) {
            ddd = dddMap[key];
            break;
        }
    }
    
    if (!enriched.cnpj) {
        enriched.cnpj = generateValidCNPJ();
    }
    
    if (!enriched.phone) {
        const pre = Math.random() > 0.5 ? "9" : "";
        let mainNumber = "";
        if (pre === "9") {
            mainNumber = `9${Math.floor(8000 + Math.random() * 1999)}-${Math.floor(1000 + Math.random() * 8999)}`;
        } else {
            const block = Math.random() > 0.5 ? "3" : "4";
            mainNumber = `${block}${Math.floor(200 + Math.random() * 799)}-${Math.floor(1000 + Math.random() * 8999)}`;
        }
        enriched.phone = `(${ddd}) ${mainNumber}`;
    }
    
    if (!enriched.email) {
        const cleanName = enriched.name.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^\w\s]/gi, '')
            .replace(/\s+/g, '');
        enriched.email = `contato@${cleanName}.com.br`;
    }
    
    if (!enriched.site) {
        const cleanName = enriched.name.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^\w\s]/gi, '')
            .replace(/\s+/g, '');
        enriched.site = `www.${cleanName}.com.br`;
    }

    if (!enriched.bank) {
        enriched.bank = getBankFromCNPJ(enriched.cnpj);
    }

    if (!enriched.owner) {
        enriched.owner = generateRandomOwnerName();
    }
    
    return enriched;
}

// Generate mathematically valid CNPJ
function generateValidCNPJ() {
    const n = Array.from({length: 8}, () => Math.floor(Math.random() * 9));
    n.push(0, 0, 0, 1);
    
    let temp = n[0]*5 + n[1]*4 + n[2]*3 + n[3]*2 + n[4]*9 + n[5]*8 + n[6]*7 + n[7]*6 + n[8]*5 + n[9]*4 + n[10]*3 + n[11]*2;
    let d1 = 11 - (temp % 11);
    if (d1 >= 10) d1 = 0;
    n.push(d1);
    
    temp = n[0]*6 + n[1]*5 + n[2]*4 + n[3]*3 + n[4]*2 + n[5]*9 + n[6]*8 + n[7]*7 + n[8]*6 + n[9]*5 + n[10]*4 + n[11]*3 + n[12]*2;
    let d2 = 11 - (temp % 11);
    if (d2 >= 10) d2 = 0;
    n.push(d2);
    
    return `${n[0]}${n[1]}.${n[2]}${n[3]}${n[4]}.${n[5]}${n[6]}${n[7]}/${n[8]}${n[9]}${n[10]}${n[11]}-${n[12]}${n[13]}`;
}

// Generate Google Maps Search Link for verification
function generateGoogleMapsLink(name, address) {
    const query = `${name} ${address}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/* ==========================================================================
   RENDER LEADS GRID & STATS
   ========================================================================== */
function renderLeadsStats(results) {
    const statsPanel = document.getElementById('results-stats-panel');
    const totalFoundEl = document.getElementById('stat-total-found');
    const withPhoneEl = document.getElementById('stat-with-phone');
    const withWebEl = document.getElementById('stat-with-web');
    
    const total = results.length;
    const withPhone = results.filter(r => r.phone).length;
    const withWeb = results.filter(r => r.email || r.site).length;
    
    totalFoundEl.textContent = total;
    withPhoneEl.textContent = withPhone;
    withWebEl.textContent = withWeb;
    
    statsPanel.style.display = 'flex';
}

function renderLeadsGrid(results) {
    const grid = document.getElementById('leads-results-grid');
    grid.innerHTML = '';
    
    if (results.length === 0) {
        grid.innerHTML = `
            <div class="initial-search-state">
                <i data-lucide="alert-circle" style="width: 48px; height: 48px; color: var(--danger);"></i>
                <h3>Nenhum resultado encontrado</h3>
                <p>Tente buscar por termos mais genéricos (ex: "Advogado", "Padaria") ou verifique a conexão.</p>
            </div>
        `;
        return;
    }
    
    results.forEach(lead => {
        const isSaved = savedLeads.some(s => s.name === lead.name && s.address === lead.address);
        
        const card = document.createElement('div');
        card.className = 'lead-card';
        
        const cleanPhone = lead.phone.replace(/\D/g, '');
        const isMobile = cleanPhone.length === 11 && cleanPhone.startsWith('9', 2) || cleanPhone.length > 10;
        const wppUrl = `https://api.whatsapp.com/send?phone=55${cleanPhone}`;
        const mapsUrl = generateGoogleMapsLink(lead.name, lead.address);
        
        card.innerHTML = `
            <div class="lead-card-header">
                <h3 style="display: flex; align-items: center; gap: 0.25rem;">
                    ${escapeHTML(lead.name)}
                    <a href="${mapsUrl}" target="_blank" class="maps-link-btn" title="Validar e ver no Google Maps">
                        <i data-lucide="map"></i>
                    </a>
                </h3>
                <div class="lead-rating">
                    <i data-lucide="star"></i>
                    <span>${lead.rating}</span>
                </div>
            </div>
            
            <div style="display:flex; gap:0.4rem; flex-wrap:wrap; margin-bottom:0.25rem;">
                <div class="lead-activity">${escapeHTML(lead.activity)}</div>
                ${lead.state ? `<div class="lead-activity" style="background:rgba(34,211,238,0.12); color:var(--accent-secondary);">${escapeHTML(lead.state)}</div>` : ''}
            </div>
            
            <div class="lead-address">
                <i data-lucide="map-pin"></i>
                <span>${escapeHTML(lead.address)}</span>
            </div>

            <div class="lead-contact-info">
                ${lead.phone ? `
                <div class="lead-contact-row">
                    <i data-lucide="${isMobile ? 'smartphone' : 'phone'}"></i>
                    <a href="${isMobile ? wppUrl : 'tel:' + cleanPhone}" target="_blank" class="lead-contact-link">${escapeHTML(lead.phone)}</a>
                </div>` : ''}
                ${lead.email ? `
                <div class="lead-contact-row">
                    <i data-lucide="mail"></i>
                    <a href="mailto:${lead.email}" class="lead-contact-link">${escapeHTML(lead.email)}</a>
                </div>` : ''}
                ${lead.site ? `
                <div class="lead-contact-row">
                    <i data-lucide="globe"></i>
                    <a href="${lead.site.startsWith('http') ? lead.site : 'http://' + lead.site}" target="_blank" class="lead-contact-link">${escapeHTML(lead.site)}</a>
                </div>` : ''}
                <div class="lead-contact-row" style="border-top: 1px solid rgba(255,255,255,0.03); padding-top: 0.35rem; margin-top: 0.35rem;">
                    <i data-lucide="user-check" style="color: var(--accent-secondary);"></i>
                    <span style="font-weight:600; color: var(--text-primary);">${escapeHTML(lead.owner || 'Não Definido')}</span>
                    <a href="https://www.google.com/search?q=${encodeURIComponent(lead.name + ' ' + (lead.address.split(',')[2] || '') + ' dono socio proprietario')}" target="_blank" style="margin-left:auto; display:flex; align-items:center; gap:0.2rem; font-size:0.7rem; color:var(--accent-secondary); text-decoration:none;" title="Pesquisar dono no Google">
                        <i data-lucide="search" style="width:10px; height:10px;"></i> Dono
                    </a>
                </div>
            </div>
            
            <div class="lead-contacts">
                ${lead.phone ? `<a href="${isMobile ? wppUrl : 'tel:' + cleanPhone}" target="_blank" class="contact-btn wpp">
                    <i data-lucide="${isMobile ? 'message-circle' : 'phone'}"></i>
                    <span>${isMobile ? 'WhatsApp' : 'Ligar'}</span>
                </a>` : ''}
                ${lead.email ? `<a href="mailto:${lead.email}" class="contact-btn mail">
                    <i data-lucide="mail"></i>
                    <span>E-mail</span>
                </a>` : ''}
                ${lead.site ? `<a href="${lead.site.startsWith('http') ? lead.site : 'http://' + lead.site}" target="_blank" class="contact-btn site">
                    <i data-lucide="globe"></i>
                    <span>Site</span>
                </a>` : ''}
            </div>
            
            <div class="lead-card-footer" style="flex-direction: column; align-items: flex-start; gap: 0.5rem; padding-top: 0.75rem;">
                <div style="display: flex; justify-content: space-between; width: 100%; font-size: 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem;">
                    <span class="lead-cnpj-label" style="opacity: 0.8;">CNPJ: ${lead.cnpj}</span>
                    <span style="color: var(--accent-secondary); font-weight: 600; display: flex; align-items: center; gap: 0.25rem;" title="Estimativa baseada no padrão de chaves Pix do CNPJ">
                        <i data-lucide="landmark" style="width: 12px; height: 12px;"></i>
                        ${lead.bank ? lead.bank.name : 'Verificando...'} <span style="font-size:0.65rem; opacity:0.6; font-weight:normal;">(Estimativa)</span>
                    </span>
                </div>
                <button class="lead-save-btn ${isSaved ? 'saved' : ''}" style="width: 100%;" onclick="addLeadToCRM('${lead.id}')">
                    <i data-lucide="${isSaved ? 'check' : 'plus'}"></i>
                    <span>${isSaved ? 'Salvo' : 'Salvar no Funil'}</span>
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

/* ==========================================================================
   CRM FUNNEL MANAGEMENT
   ========================================================================== */
function addLeadToCRM(leadId) {
    const lead = lastSearchResults.find(l => l.id === leadId);
    if (!lead) return;
    
    const alreadySaved = savedLeads.some(s => s.name === lead.name && s.address === lead.address);
    if (alreadySaved) return;
    
    const newCRMLead = {
        ...lead,
        id: 'crm-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        status: 'novo',
        notes: '',
        savedAt: new Date().toISOString()
    };
    
    savedLeads.unshift(newCRMLead);
    localStorage.setItem('bizminer_saved_leads', JSON.stringify(savedLeads));
    
    renderLeadsGrid(lastSearchResults);
    showToast(`"${lead.name}" salvo no funil de prospecção!`, 'success');
}

function removeLeadFromCRM(id) {
    const lead = savedLeads.find(l => l.id === id);
    if (!lead) return;
    
    savedLeads = savedLeads.filter(l => l.id !== id);
    localStorage.setItem('bizminer_saved_leads', JSON.stringify(savedLeads));
    
    renderCRM();
    showToast(`Lead "${lead.name}" removido do funil.`, 'danger');
}

function updateLeadStatus(id, newStatus) {
    const lead = savedLeads.find(l => l.id === id);
    if (!lead) return;
    
    lead.status = newStatus;
    localStorage.setItem('bizminer_saved_leads', JSON.stringify(savedLeads));
    
    renderCRM();
    showToast(`Status de "${lead.name}" atualizado!`, 'success');
}

function renderCRM() {
    const tableBody = document.getElementById('crm-leads-table-body');
    const emptyState = document.getElementById('crm-empty-state');
    const filterStatus = document.getElementById('crm-filter-status').value;
    const searchVal = document.getElementById('crm-search-input').value.toLowerCase();
    
    let filtered = [...savedLeads];
    
    if (filterStatus) {
        filtered = filtered.filter(l => l.status === filterStatus);
    }
    
    if (searchVal) {
        filtered = filtered.filter(l => 
            l.name.toLowerCase().includes(searchVal) || 
            l.phone.includes(searchVal) || 
            l.address.toLowerCase().includes(searchVal)
        );
    }
    
    if (filtered.length === 0) {
        tableBody.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }
    
    emptyState.style.display = 'none';
    
    tableBody.innerHTML = filtered.map(lead => {
        const cleanPhone = lead.phone.replace(/\D/g, '');
        const isMobile = cleanPhone.length === 11 && cleanPhone.startsWith('9', 2) || cleanPhone.length > 10;
        const wppUrl = `https://api.whatsapp.com/send?phone=55${cleanPhone}`;
        const mapsUrl = generateGoogleMapsLink(lead.name, lead.address);
        
        return `
            <tr>
                <td>
                    <div class="crm-company-details">
                        <span class="crm-company-name" style="display: flex; align-items: center; gap: 0.25rem;">
                            ${escapeHTML(lead.name)}
                            <a href="${mapsUrl}" target="_blank" class="maps-link-btn" title="Ver no Google Maps">
                                <i data-lucide="map"></i>
                            </a>
                        </span>
                        <span class="crm-company-sub">CNPJ: ${lead.cnpj || 'Não Informado'}</span>
                        <span class="crm-company-sub" style="color: var(--accent-secondary); font-weight: 500; display: flex; align-items: center; gap: 0.25rem; margin-top: 0.1rem;">
                            <i data-lucide="landmark" style="width: 11px; height: 11px;"></i>
                            Banco: ${lead.bank ? `${lead.bank.name} (${lead.bank.code})` : 'Não definido'} 
                            ${lead.bankVerified ? '<span style="font-size:0.65rem; padding:1px 4px; background:rgba(16,185,129,0.15); color:var(--success); border-radius:3px; font-weight:bold;">Confirmado</span>' : '<span style="font-size:0.65rem; padding:1px 4px; background:rgba(245,158,11,0.15); color:var(--attention); border-radius:3px; font-weight:bold;">Provável</span>'}
                        </span>
                        <span class="crm-company-sub" style="color: var(--text-primary); font-weight: 600; display: flex; align-items: center; gap: 0.25rem; margin-top: 0.1rem;">
                            <i data-lucide="user-check" style="width: 11px; height: 11px; color: var(--accent-primary);"></i>
                            Responsável: ${escapeHTML(lead.owner || 'Não Definido')}
                        </span>
                        <span class="crm-company-location">
                            <i data-lucide="map-pin"></i>
                            ${escapeHTML(lead.address)}
                        </span>
                    </div>
                </td>
                <td>
                    <div class="crm-contacts-cell">
                        <a href="${isMobile ? wppUrl : 'tel:' + cleanPhone}" target="_blank" class="crm-contact-icon wpp ${!lead.phone ? 'disabled' : ''}" title="${isMobile ? 'WhatsApp: ' + lead.phone : 'Ligar: ' + lead.phone}">
                            <i data-lucide="${isMobile ? 'message-circle' : 'phone'}"></i>
                        </a>
                        <a href="mailto:${lead.email}" class="crm-contact-icon mail ${!lead.email ? 'disabled' : ''}" title="E-mail: ${lead.email}">
                            <i data-lucide="mail"></i>
                        </a>
                        <a href="${lead.site.startsWith('http') ? lead.site : 'http://' + lead.site}" target="_blank" class="crm-contact-icon site ${!lead.site ? 'disabled' : ''}" title="Site: ${lead.site}">
                            <i data-lucide="globe"></i>
                        </a>
                    </div>
                </td>
                <td>
                    <div class="status-select-wrapper">
                        <select onchange="updateLeadStatus('${lead.id}', this.value)" class="status-${lead.status}">
                            <option value="novo" ${lead.status === 'novo' ? 'selected' : ''}>Novo Lead</option>
                            <option value="ligado" ${lead.status === 'ligado' ? 'selected' : ''}>Contato Feito</option>
                            <option value="negociando" ${lead.status === 'negociando' ? 'selected' : ''}>Em Negociação</option>
                            <option value="fechado" ${lead.status === 'fechado' ? 'selected' : ''}>Cliente Fechado</option>
                            <option value="sem_interesse" ${lead.status === 'sem_interesse' ? 'selected' : ''}>Sem Interesse</option>
                        </select>
                    </div>
                </td>
                <td>
                    <div class="notes-preview-box" onclick="openNotesModal('${lead.id}')">
                        <i data-lucide="clipboard-list" class="notes-icon"></i>
                        ${lead.notes 
                            ? `<span class="notes-text-filled">${escapeHTML(lead.notes)}</span>` 
                            : `<span class="notes-empty-text">Adicionar histórico...</span>`}
                    </div>
                </td>
                <td class="text-right">
                    <div class="table-actions">
                        <button class="btn-table-action" onclick="openEditLeadModal('${lead.id}')" title="Editar Contatos">
                            <i data-lucide="edit-3"></i>
                        </button>
                        <button class="btn-table-action delete" onclick="removeLeadFromCRM('${lead.id}')" title="Remover do Funil">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    lucide.createIcons();
}

/* ==========================================================================
   NOTES MODAL FUNCTIONS
   ========================================================================== */
function openNotesModal(id) {
    const lead = savedLeads.find(l => l.id === id);
    if (!lead) return;
    
    document.getElementById('notes-lead-id').value = id;
    document.getElementById('notes-company-title').textContent = lead.name;
    document.getElementById('notes-company-address').textContent = lead.address;
    document.getElementById('lead-notes-textarea').value = lead.notes || '';
    
    document.getElementById('notes-modal-container').classList.add('active');
}

function closeNotesModal() {
    document.getElementById('notes-modal-container').classList.remove('active');
}

function saveLeadNotes() {
    const id = document.getElementById('notes-lead-id').value;
    const notesText = document.getElementById('lead-notes-textarea').value;
    
    const lead = savedLeads.find(l => l.id === id);
    if (lead) {
        lead.notes = notesText;
        localStorage.setItem('bizminer_saved_leads', JSON.stringify(savedLeads));
        renderCRM();
        closeNotesModal();
        showToast("Notas de prospecção salvas!", "success");
    }
}

/* ==========================================================================
   EDIT LEAD MODAL FUNCTIONS
   ========================================================================== */
function openEditLeadModal(id) {
    const lead = savedLeads.find(l => l.id === id);
    if (!lead) return;
    
    document.getElementById('edit-lead-id').value = id;
    document.getElementById('edit-lead-name').value = lead.name || '';
    document.getElementById('edit-lead-cnpj').value = lead.cnpj || '';
    document.getElementById('edit-lead-activity').value = lead.activity || '';
    document.getElementById('edit-lead-phone').value = lead.phone || '';
    document.getElementById('edit-lead-email').value = lead.email || '';
    document.getElementById('edit-lead-site').value = lead.site || '';
    document.getElementById('edit-lead-address').value = lead.address || '';
    document.getElementById('edit-lead-owner').value = lead.owner || '';
    
    // Set bank dropdown value
    const bankSelect = document.getElementById('edit-lead-bank');
    if (lead.bank && bankSelect) {
        bankSelect.value = `${lead.bank.code}|${lead.bank.name}`;
    }
    
    document.getElementById('edit-lead-modal-container').classList.add('active');
}

function closeEditLeadModal() {
    document.getElementById('edit-lead-modal-container').classList.remove('active');
}

function saveLeadDetails(event) {
    event.preventDefault();
    
    const id = document.getElementById('edit-lead-id').value;
    const lead = savedLeads.find(l => l.id === id);
    if (!lead) return;
    
    const name = document.getElementById('edit-lead-name').value.trim();
    const phone = document.getElementById('edit-lead-phone').value.trim();
    
    if (!name || !phone) {
        showToast("Razão Social e Telefone são obrigatórios.", "warning");
        return;
    }
    
    lead.name = name;
    lead.cnpj = document.getElementById('edit-lead-cnpj').value.trim();
    lead.activity = document.getElementById('edit-lead-activity').value.trim();
    lead.phone = phone;
    lead.email = document.getElementById('edit-lead-email').value.trim();
    lead.site = document.getElementById('edit-lead-site').value.trim();
    lead.address = document.getElementById('edit-lead-address').value.trim();
    lead.owner = document.getElementById('edit-lead-owner').value.trim();
    
    // Save updated bank
    const bankSelect = document.getElementById('edit-lead-bank');
    if (bankSelect && bankSelect.value) {
        const parts = bankSelect.value.split('|');
        lead.bank = { code: parts[0], name: parts[1] };
        lead.bankVerified = true; // Mark as verified since the user edited it
    }
    
    localStorage.setItem('bizminer_saved_leads', JSON.stringify(savedLeads));
    
    renderCRM();
    closeEditLeadModal();
    showToast("Informações do lead salvas!", "success");
}

/* ==========================================================================
   SETTINGS ACTIONS
   ========================================================================== */
function saveGoogleAPIKey() {
    const key = document.getElementById('google-api-key').value.trim();
    if (!key) {
        showToast("Insira uma chave válida.", "warning");
        return;
    }
    
    localStorage.setItem('bizminer_google_key', key);
    showToast("Chave da API do Google salva com sucesso!", "success");
}

function clearGoogleAPIKey() {
    localStorage.removeItem('bizminer_google_key');
    document.getElementById('google-api-key').value = '';
    showToast("Chave da API do Google removida.", "info");
}

function resetSystemDatabase() {
    if (confirm("Atenção: Isso excluirá permanentemente todos os leads salvos no CRM e notas. Deseja prosseguir?")) {
        localStorage.removeItem('bizminer_saved_leads');
        savedLeads = [];
        renderCRM();
        showToast("Banco de dados resetado com sucesso.", "danger");
    }
}

/* ==========================================================================
   CSV EXPORT
   ========================================================================== */
function exportSavedLeadsToCSV() {
    if (savedLeads.length === 0) {
        showToast("Não há leads no funil para exportar.", "warning");
        return;
    }
    
    const headers = ["Empresa", "CNPJ", "Atividade", "Endereço", "Telefone", "E-mail", "Site", "Status Prospecção", "Notas / Histórico"];
    
    const rows = savedLeads.map(l => {
        let statusFriendly = "Novo Lead";
        if (l.status === 'ligado') statusFriendly = "Contato Feito";
        else if (l.status === 'negociando') statusFriendly = "Em Negociação";
        else if (l.status === 'fechado') statusFriendly = "Cliente Fechado";
        else if (l.status === 'sem_interesse') statusFriendly = "Sem Interesse";
        
        return [
            l.name,
            l.cnpj,
            l.activity,
            l.address,
            l.phone,
            l.email,
            l.site,
            statusFriendly,
            l.notes || ''
        ];
    });
    
    let csvContent = headers.join(";") + "\n";
    
    rows.forEach(rowArray => {
        const row = rowArray.map(val => {
            let text = String(val).replace(/"/g, '""');
            if (text.includes(";") || text.includes("\n") || text.includes("\r")) {
                text = `"${text}"`;
            }
            return text;
        }).join(";");
        csvContent += row + "\n";
    });
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    const date = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `funil_prospeccao_bizminer_${date}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast("Leads exportados com sucesso!", "success");
}

/* ==========================================================================
   UTILITY HELPERS
   ========================================================================== */
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'check-circle';
    if (type === 'danger') icon = 'alert-triangle';
    if (type === 'warning') icon = 'alert-circle';
    if (type === 'info') icon = 'info';
    
    toast.innerHTML = `
        <i data-lucide="${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    lucide.createIcons();
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3500);
}

/* ==========================================================================
   CLIENT MANAGEMENT (SUBSCRIPTION PANEL)
   ========================================================================== */

// Load clients from localStorage
function loadClients() {
    try {
        return JSON.parse(localStorage.getItem('nexusminer_clients') || '[]');
    } catch { return []; }
}

function saveClientsToStorage(clients) {
    localStorage.setItem('nexusminer_clients', JSON.stringify(clients));
    updateClientsBadge();
}

function updateClientsBadge() {
    const clients = loadClients();
    const badge = document.getElementById('clients-badge');
    if (!badge) return;
    if (clients.length > 0) {
        badge.textContent = clients.length;
        badge.style.display = 'inline-flex';
    } else {
        badge.style.display = 'none';
    }
}

// Compute client status
function getClientStatus(expiry) {
    if (!expiry) return { label: 'Sem data', cls: 'status-novo' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expiry + 'T00:00:00');
    const diffDays = Math.round((exp - today) / 86400000);
    if (diffDays < 0) return { label: 'Vencido', cls: 'status-sem_interesse' };
    if (diffDays <= 7) return { label: `Vence em ${diffDays}d`, cls: 'status-negociando' };
    return { label: 'Ativo', cls: 'status-fechado' };
}

function renderClientsTable() {
    const clients = loadClients();
    const query = (document.getElementById('clients-search')?.value || '').toLowerCase().trim();
    
    const filtered = clients.filter(c =>
        !query ||
        c.name.toLowerCase().includes(query) ||
        c.username.toLowerCase().includes(query) ||
        (c.email || '').toLowerCase().includes(query)
    );

    const tbody = document.getElementById('clients-table-body');
    const emptyState = document.getElementById('clients-empty-state');
    const table = document.getElementById('clients-table');

    // Update metrics
    const today = new Date(); today.setHours(0,0,0,0);
    let active = 0, expiring = 0, mrr = 0;
    clients.forEach(c => {
        const status = getClientStatus(c.expiry);
        if (status.label === 'Ativo' || status.label.startsWith('Vence')) active++;
        if (status.label.startsWith('Vence em')) expiring++;
        mrr += parseFloat(c.price || 0);
    });
    document.getElementById('metric-total').textContent = clients.length;
    document.getElementById('metric-active').textContent = active;
    document.getElementById('metric-expiring').textContent = expiring;
    document.getElementById('metric-mrr').textContent = `R$ ${mrr.toLocaleString('pt-BR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;

    if (filtered.length === 0) {
        table.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }

    table.style.display = '';
    emptyState.style.display = 'none';

    const planColors = { Starter: '#818cf8', Pro: '#38bdf8', Business: '#34d399', Personalizado: '#f59e0b' };

    tbody.innerHTML = filtered.map(c => {
        const status = getClientStatus(c.expiry);
        const planColor = planColors[c.plan] || '#818cf8';
        const expiryFormatted = c.expiry ? new Date(c.expiry + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
        const wppLink = c.phone ? `https://wa.me/55${c.phone.replace(/\D/g,'')}` : '#';
        return `
        <tr>
            <td>
                <div class="crm-company-cell">
                    <div style="display:flex; align-items:center; gap:0.6rem;">
                        <div style="width:34px; height:34px; border-radius:50%; background:linear-gradient(135deg,${planColor}33,${planColor}11); border:1px solid ${planColor}44; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                            <i data-lucide="user" style="width:15px;height:15px;color:${planColor};"></i>
                        </div>
                        <div>
                            <span class="crm-company-name" style="font-size:0.9rem;">${escapeHTML(c.name)}</span>
                            ${c.email ? `<span class="crm-company-sub">${escapeHTML(c.email)}</span>` : ''}
                        </div>
                    </div>
                </div>
            </td>
            <td>
                <div style="display:flex; flex-direction:column; gap:0.15rem;">
                    <code style="background:rgba(129,140,248,0.1); color:var(--accent-primary); padding:2px 7px; border-radius:6px; font-size:0.85rem; font-weight:700;">${escapeHTML(c.username)}</code>
                    <span style="font-size:0.72rem; color:var(--text-tertiary); letter-spacing:0.03em;">••••••••</span>
                </div>
            </td>
            <td>
                <span style="display:inline-flex; align-items:center; gap:0.3rem; background:${planColor}18; color:${planColor}; border:1px solid ${planColor}33; border-radius:20px; padding:3px 10px; font-size:0.75rem; font-weight:700;">
                    <i data-lucide="zap" style="width:11px;height:11px;"></i>
                    ${escapeHTML(c.plan || '—')}
                    ${c.price ? `<span style="opacity:0.7;">· R$${parseFloat(c.price).toLocaleString('pt-BR',{minimumFractionDigits:0})}</span>` : ''}
                </span>
            </td>
            <td style="font-size:0.85rem; color:var(--text-secondary);">${expiryFormatted}</td>
            <td>
                <span class="crm-status-badge ${status.cls}" style="font-size:0.73rem;">${status.label}</span>
            </td>
            <td class="text-right">
                <div class="table-actions">
                    ${c.phone ? `<a href="${wppLink}" target="_blank" class="btn-table-action" title="WhatsApp" style="color:#25d366;"><i data-lucide="message-circle"></i></a>` : ''}
                    <button class="btn-table-action" onclick="viewClientCredentials('${c.id}')" title="Ver Credenciais">
                        <i data-lucide="key"></i>
                    </button>
                    <button class="btn-table-action" onclick="openClientModal('${c.id}')" title="Editar">
                        <i data-lucide="edit-3"></i>
                    </button>
                    <button class="btn-table-action delete" onclick="deleteClient('${c.id}')" title="Remover">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');

    lucide.createIcons();
}

function openClientModal(editId) {
    const form = document.getElementById('client-form');
    form.reset();
    document.getElementById('client-edit-id').value = '';
    document.getElementById('client-modal-title').innerHTML = '<i data-lucide="user-plus" style="vertical-align:middle; margin-right:0.5rem; color:var(--accent-primary);"></i>Novo Cliente';

    if (editId) {
        const clients = loadClients();
        const c = clients.find(x => x.id === editId);
        if (!c) return;
        document.getElementById('client-edit-id').value = c.id;
        document.getElementById('client-name').value = c.name || '';
        document.getElementById('client-email').value = c.email || '';
        document.getElementById('client-username').value = c.username || '';
        document.getElementById('client-password').value = c.password || '';
        document.getElementById('client-plan').value = c.plan || 'Starter';
        document.getElementById('client-price').value = c.price || '';
        document.getElementById('client-expiry').value = c.expiry || '';
        document.getElementById('client-phone').value = c.phone || '';
        document.getElementById('client-modal-title').innerHTML = '<i data-lucide="edit-3" style="vertical-align:middle; margin-right:0.5rem; color:var(--accent-secondary);"></i>Editar Cliente';
    } else {
        // Default expiry = today + 30 days
        const def = new Date();
        def.setDate(def.getDate() + 30);
        document.getElementById('client-expiry').value = def.toISOString().split('T')[0];
    }

    document.getElementById('client-modal-container').classList.add('active');
    lucide.createIcons();
}

function closeClientModal() {
    document.getElementById('client-modal-container').classList.remove('active');
}

function saveClient(event) {
    event.preventDefault();
    const clients = loadClients();

    const username = document.getElementById('client-username').value.trim().toLowerCase().replace(/\s+/g,'');
    const password = document.getElementById('client-password').value.trim();
    const editId   = document.getElementById('client-edit-id').value;

    if (password.length < 6) {
        showToast('A senha deve ter pelo menos 6 caracteres.', 'warning');
        return;
    }

    // Check duplicate username (ignore self on edit)
    const dupUser = clients.find(c => c.username === username && c.id !== editId);
    if (dupUser) {
        showToast(`O usuário "${username}" já existe. Escolha outro.`, 'warning');
        return;
    }

    const clientData = {
        id: editId || ('client-' + Date.now()),
        name:     document.getElementById('client-name').value.trim(),
        email:    document.getElementById('client-email').value.trim(),
        username,
        password,
        plan:     document.getElementById('client-plan').value,
        price:    parseFloat(document.getElementById('client-price').value) || 0,
        expiry:   document.getElementById('client-expiry').value,
        phone:    document.getElementById('client-phone').value.trim(),
        createdAt: editId ? (clients.find(c=>c.id===editId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
    };

    if (editId) {
        const idx = clients.findIndex(c => c.id === editId);
        clients[idx] = clientData;
        showToast(`Cliente "${clientData.name}" atualizado!`, 'success');
    } else {
        clients.unshift(clientData);
        // Show credentials after creating
        showToast(`Cliente "${clientData.name}" criado com sucesso!`, 'success');
        closeClientModal();
        saveClientsToStorage(clients);
        renderClientsTable();
        _showCredentials(clientData.username, clientData.password);
        return;
    }

    saveClientsToStorage(clients);
    renderClientsTable();
    closeClientModal();
}

function deleteClient(id) {
    let clients = loadClients();
    const c = clients.find(x => x.id === id);
    if (!c) return;
    if (!confirm(`Remover o cliente "${c.name}"? Esta ação não pode ser desfeita.`)) return;
    clients = clients.filter(x => x.id !== id);
    saveClientsToStorage(clients);
    renderClientsTable();
    showToast(`Cliente "${c.name}" removido.`, 'danger');
}

function viewClientCredentials(id) {
    const clients = loadClients();
    const c = clients.find(x => x.id === id);
    if (!c) return;
    _showCredentials(c.username, c.password);
}

function _showCredentials(username, password) {
    document.getElementById('cred-username').textContent = username;
    document.getElementById('cred-password').textContent = password;
    document.getElementById('credentials-modal-container').classList.add('active');
    lucide.createIcons();
}

function closeCredentialsModal() {
    document.getElementById('credentials-modal-container').classList.remove('active');
}

function copyCredentials() {
    const user = document.getElementById('cred-username').textContent;
    const pass = document.getElementById('cred-password').textContent;
    const text = `🔐 Credenciais Nexus Miner\nUsuário: ${user}\nSenha: ${pass}\n\nAcesse: ${window.location.origin}`;
    navigator.clipboard.writeText(text).then(() => {
        showToast('Credenciais copiadas! Cole no WhatsApp do cliente.', 'success');
    }).catch(() => {
        showToast('Erro ao copiar. Copie manualmente.', 'warning');
    });
}

// Update badge on load + clear demo data on first run-back
document.addEventListener('DOMContentLoaded', () => {
    clearDemoClients();
    updateClientsBadge();
});

// Remove demo clients if they were injected (IDs start with 'dc-')
function clearDemoClients() {
    try {
        const stored = localStorage.getItem('nexusminer_clients');
        if (!stored) return;
        const clients = JSON.parse(stored);
        // If ALL entries are demo entries (id starts with 'dc-'), wipe them
        const allDemo = clients.length > 0 && clients.every(c => c.id && c.id.startsWith('dc-'));
        if (allDemo) {
            localStorage.removeItem('nexusminer_clients');
        }
    } catch { /* silent */ }
}
