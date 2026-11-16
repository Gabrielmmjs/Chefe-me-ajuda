# 🍳 Chefe te ajuda

> **Diga o que você tem e a gente faz uma receita incrível para você!**  
> Uma aplicação web inteligente que combate o desperdício de alimentos combinando dados nutricionais reais, raspagem de receitas da web e inteligência artificial generativa.

---

## 📖 Sobre o Projeto

Quantas vezes você abriu a geladeira, viu alguns ingredientes avulsos e pensou: *"Não tem nada para comer"*? 

O **Chefe te ajuda** foi desenvolvido para resolver exatamente esse dilema. O usuário informa os ingredientes disponíveis e eventuais restrições alimentares (como intolerância à lactose ou dieta vegetariana). A aplicação então cruza essas informações com **três fontes de dados simultâneas**:

1. **Open Food Facts API:** identifica produtos reais, calorias, macronutrientes, selo Nutri-Score e alérgenos declarados.
2. **Web Scraping no TudoGostoso (API REST própria):** busca e extrai receitas reais da internet para servir de base gastronômica sólida.
3. **Google Gemini AI (LLM):** atua como o chef de cozinha, unindo os ingredientes do usuário com a receita raspada e gerando um modo de preparo passo a passo altamente detalhado, com proporções e tempos de cocção.

---

## 🏛️ Arquitetura da Solução

A aplicação foi desenhada com uma separação clara entre **Frontend** e **Backend**:

```
 ┌────────────────────────────────────────────────────────┐
 │                   NAVEGADOR (Cliente)                  │
 │  - Interface HTML5 / CSS3 (Design temático culinário)  │
 │  - app.js (Orquestrador, pontuação de chefs e UI)      │
 └──────────────┬─────────────────────────┬───────────────┘
                │                         │
     (1) Requisições REST          (3) Prompt Estruturado
                │                         │
                ▼                         ▼
 ┌──────────────────────────────┐  ┌──────────────────────┐
 │      BACKEND (Node.js)       │  │   Google Gemini API  │
 │  - server.js (Express)       │  │   - Modelos Flash    │
 │  - Cheerio + Axios (Scraper) │  │   - Rodízio de Chaves│
 │  - Cache em Memória (10 min) │  │   - Saída JSON Schema│
 └──────────────┬───────────────┘  └──────────────────────┘
                │
     (2) Busca Nutricional
                │
                ▼
 ┌──────────────────────────────┐
 │    Open Food Facts API       │
 │    (Dados abertos globais)   │
 └──────────────────────────────┘
```

### Por que essa separação?
- **Restrição de CORS e Proteção de Scraping:** Navegadores bloqueiam requisições diretas a outros sites por segurança (CORS). O `server.js` atua como nosso servidor intermediário, realizando a raspagem com cabeçalhos adequados e expondo uma API REST limpa e rápida.
- **Cache Inteligente:** O backend armazena buscas recentes por 10 minutos em memória, poupando requisições repetidas e tornando as respostas instantâneas.

---

## 👨‍🍳 Os 4 Chefs Virtuais

Cada usuário cozinha de um jeito. Por isso, a aplicação conta com 4 personalidades culinárias exclusivas, que filtram e escolhem referências reais de maneira diferente:

| Chef | Mascote | Perfil e Comportamento |
| :--- | :---: | :--- |
| **Chef Padrão** | `cozinheiro-padrao.png` | O cozinheiro clássico de família. Escolhe a receita mais popular e tradicional que maximize o uso dos ingredientes digitados. |
| **Chef Prático** | `cozinheiro-preguicoso.png` | Para quem quer comer rápido e sujar pouca louça. Prioriza receitas curtas, de poucos passos e com o menor número possível de ingredientes extras. |
| **Chef Nutri** | `cozinheiro-maromba.png` | Focado em saúde e hipertrofia. Analisa os dados nutricionais da Open Food Facts, prioriza proteínas e fibras, descartando ultraprocessados e frituras pesadas. |
| **Chef Mirabolante** | `cozinheiro-maluco.png` | **🔒 Desbloqueável com 5 ou mais ingredientes.** O cientista maluco da alta gastronomia. Prioriza técnicas avançadas (reduções, marinadas, emulsões, sous-vide) criando pratos autorais impressionantes. |

---

## 🔌 Documentação da API REST (Backend)

O backend em Node.js (`server.js`) expõe dois endpoints RESTful principais:

### 1. `GET /api/produto`
Consulta a base do **Open Food Facts** para autocompletar produtos ou associar um ingrediente digitado a um item industrializado real.

- **Parâmetros de Consulta (Query Params):**
  - `q` *(string, obrigatório)*: Nome ou código de barras do produto (ex: `iogurte natural`, `7891000100103`).
- **Exemplo de Resposta (JSON):**
  ```json
  {
    "itens": [
      {
        "id": "7891000100103",
        "nome": "Iogurte Natural Integral",
        "marca": "Nestlé",
        "imagem": "https://images.openfoodfacts.org/.../front_pt.jpg",
        "nutriscore": "a",
        "nova": 1,
        "calorias_100g": 61,
        "macros_100g": { "proteina": 4.1, "carbo": 4.7, "gordura": 3.0 },
        "alergenos": ["en:milk"]
      }
    ]
  }
  ```

### 2. `GET /api/receitas`
Busca e extrai receitas reais do portal **TudoGostoso** usando web scraping com Cheerio.

- **Parâmetros de Consulta (Query Params):**
  - `ingredientes` *(string separada por vírgulas, obrigatório)*: Lista de até 5 ingredientes (ex: `ovo,tomate,queijo`).
- **Exemplo de Resposta (JSON):**
  ```json
  {
    "receitas": [
      {
        "titulo": "Omelete Rápido de Forno",
        "url": "https://www.tudogostoso.com.br/receita/12345-omelete-rapido.html",
        "tempo": "25 min",
        "porcoes": "4 porções",
        "ingredientes": ["3 ovos", "1 tomate picado", "100g de mussarela"],
        "passos": ["Bata os ovos vigorosamente...", "Incorpore o queijo e o tomate..."],
        "cobertura": 3
      }
    ]
  }
  ```

---

## 🤖 Integração com IA (Google Gemini)

A inteligência artificial não recebe apenas uma pergunta solta; ela recebe um **prompt de engenharia estruturada** com dados de 3 origens:
1. **O que o usuário tem:** lista de ingredientes com medidas e estados (fresco, cozido, etc.).
2. **Informações nutricionais comprovadas:** calorias e alérgenos extraídos da Open Food Facts.
3. **Receita de referência raspada:** a estrutura técnica (tempo de fogo, química do prato) da receita do TudoGostoso mais compatível com o chef escolhido.

### Resiliência e Tolerância a Falhas:
- **Rodízio de Múltiplas Chaves:** O usuário pode colar uma ou mais chaves do Google AI Studio. Se uma chave atingir o limite de requisições por minuto (`HTTP 429 Quota Exceeded`), o app troca instantaneamente para a próxima chave sem travar a experiência do usuário.
- **Fallback Automático de Modelos:** O sistema tenta requisições sequencialmente em modelos rápidos e eficientes:
  `gemini-3.5-flash` ➔ `gemini-3.5-flash-lite` ➔ `gemini-3.8-flash`.

---

## 📊 Componentes Visuais e Não Textuais (UI)

Para ir muito além de um bloco simples de texto, a interface conta com elementos gráficos dinâmicos:

- **Medidores Circulares (SVG Gauges):**
  - **Esforço Culinário:** porcentagem calculada da complexidade da receita.
  - **Nível de Vergonha:** medidor bem-humorado que avalia o quanto o prato é uma "larica de madrugada" improvisada. Acompanha ícone informativo explicativo (`i`).
- **Semáforo do Nutri-Score:** componente visual de 5 cores (A a E) indicando a qualidade nutricional global.
- **Barras Proporcionais de Macronutrientes:** distribuição visual de Carboidratos, Proteínas e Gorduras totais.
- **Timers Interativos de Cozimento:** cada passo que exige tempo (ex: *"Deixe ferver por 10 minutos"*) gera um botão `⏱ Iniciar Timer`. Ao ser clicado, inicia uma contagem regressiva em tempo real com **feedback tátil** (`navigator.vibrate`) ao término.
- **Cards de Recomendações Externas:** grid de cartões temáticos com links diretos para receitas originais consultadas na web.
- **Tooltips Informativos Flutuantes (`i`):** pequenos ícones interativos acessíveis por toque ou mouse para explicar detalhes técnicos sem poluir a interface.

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) instalado (versão 18 ou superior).
- Uma chave gratuita da API do Gemini, obtida em [Google AI Studio](https://aistudio.google.com/apikey).

### Passo a Passo

1. **Clone ou baixe o repositório:**
   ```bash
   cd Projeto-GabrielMoraes
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o servidor:**
   ```bash
   npm start
   ```

4. **Acesse no seu navegador:**
   Abra o endereço: [http://localhost:3000](http://localhost:3000)

5. **Configure sua chave do Gemini:**
   - Na página inicial, abra a aba **"Configurações: chaves do Gemini"**.
   - Cole sua chave de API e clique em **Salvar**.
   - Pronto! Agora é só listar o que tem na geladeira e cozinhar!

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** HTML5 semântico, CSS3 moderno (Custom Properties, Grid, Flexbox, animações por keyframe), JavaScript Vanilla (ES6+ assíncrono).
- **Backend:** Node.js, Express, Axios (cliente HTTP com suporte a AbortController e timeout), Cheerio (parser e seletor rápido de HTML para Web Scraping), CORS.
- **Serviços & APIs:** Google Gemini API (Interactions / REST), Open Food Facts World Database, Portal TudoGostoso (dados abertos e receitas públicas em schema JSON-LD).

---

## 👨‍💻 Autor

Desenvolvido por **Gabriel Moraes**  
Trabalho Prático da disciplina de **Web Services**  
*Instituto Federal de Educação, Ciência e Tecnologia do Sudeste de Minas Gerais (IF Sudeste MG)*
