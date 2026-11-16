const API = "";
const MODELOS_NORMAL = ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.8-flash"];
const MODELOS_MIRABOLANTE = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite"];

const $ = (id) => document.getElementById(id);

/**
 * Para que serve a função:
 * Escapa caracteres especiais de uma string para evitar vulnerabilidades de injeção XSS no HTML.
 *
 * Parâmetros:
 * @param {string} s - Texto a ser sanitizado.
 *
 * O que ela executa:
 * Substitui os caracteres &, <, >, " e ' pelas suas respectivas entidades HTML seguras.
 */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/**
 * Para que serve a função:
 * Converte um valor numérico para uma porcentagem inteira limitada entre 0 e 100.
 *
 * Parâmetros:
 * @param {number|string} v - Valor a ser convertido.
 *
 * O que ela executa:
 * Arredonda o número e garante que ele permaneça estritamente no intervalo [0, 100].
 */
const pct = (v) => Math.max(0, Math.min(100, Math.round(+v || 0)));

/**
 * Para que serve a função:
 * Formata um tempo em segundos para o formato de minutos e segundos (mm:ss).
 *
 * Parâmetros:
 * @param {number} s - Tempo em segundos.
 *
 * O que ela executa:
 * Calcula a divisão inteira por 60 e preenche os segundos restantes com zero à esquerda.
 */
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

const CHEFES = {
    padrao: {
        nome: "Chef Padrão", avatar: "🍳", imagem: "images/cozinheiro-padrao.png",
        personalidade: "o Chef Padrão: simpático, acolhedor e sem frescura, com alma de cozinheiro de família ('o clássico nunca falha', 'comida afetiva de domingo')",
        objetivo: "Gere a receita mais COMUM, clássica e caseira possível, com sabor tradicional de família brasileira. Use a receita de referência com máxima fidelidade e maior aproveitamento dos ingredientes do usuário. As explicações devem ser detalhadas e completas (ponto do refogado com cebola e alho, fogo correto, ponto da textura e temperos caseiros)."
    },
    pratico: {
        nome: "Chef Prático", avatar: "⚡", imagem: "images/cozinheiro-preguicoso.png",
        personalidade: "o Chef Prático: apressado, inteligente e focado em atalhos inteligentes ('bora', 'sem enrolação', 'menos louça')",
        objetivo: "Gere a receita mais FÁCIL e RÁPIDA (máximo 20 minutos), baseada na referência mais simples e que usa menos ingredientes. ATENÇÃO: Prático NÃO significa vago! Cada passo deve ser minucioso e prático: explique a panela, a intensidade da chama, a ordem exata de entrada dos ingredientes para cozinharem juntos e o sinal visual para desligar o fogo."
    },
    nutri: {
        nome: "Chef Nutri", avatar: "🥗", imagem: "images/cozinheiro-maromba.png",
        personalidade: "a Chef Nutri: didática, motivadora e atenta à saúde integrativa, explica o valor biológico dos alimentos com leveza",
        objetivo: "Gere a receita de MAIOR VALOR NUTRICIONAL possível, rica em fibras, densidade vitamínica e proteína de qualidade. VOCÊ PODE SIM OU NÃO USAR TODOS OS INGREDIENTES: sinta-se livre para deixar de fora itens ultraprocessados (NOVA 4), embutidos ou gorduras pesadas e listá-los em 'nao_usados', justificando no comentário. Ensine técnicas que preservam nutrientes (vapor, grelhado suculento sem queimar, azeite no ponto certo)."
    },
    mirabolante: {
        nome: "Chef Mirabolante", avatar: "🎩", imagem: "images/cozinheiro-maluco.png",
        personalidade: "o Chef Mirabolante: dramático, genial e perfeccionista, fala como chef executivo de bistrô contemporâneo ('minha obra-prima', 'sinfonia de texturas')",
        objetivo: `Gere a receita mais DIFÍCIL, SOFISTICADA e TECNICAMENTE DESAFIADORA possível (alta gastronomia). Siga rigorosamente o PADRÃO DE DIFICULDADE:
1. Cortes de precisão e pré-preparo técnico (brunoise, julienne, marinadas aromáticas).
2. Controle térmico apurado: selagem em alta temperatura (reação de Maillard), deglaçagem com líquido para resgatar os açúcares do fundo da panela, redução em fogo lento até ponto nappe.
3. Técnicas avançadas: emulsão aveludada (monter au beurre com manteiga gelada ou emulsão de azeite), combinação de texturas (crocante, cremoso, suculento).
4. Empratamento artístico: instruções minuciosas de apresentação visual (altura no prato, disposição geométrica, espelho de molho, finalização com raspas ou ervas frescas). De 6 a 8 passos riquíssimos em detalhes.`
    }
};

const CARNES = ["carne", "frango", "galinha", "peixe", "bacon", "presunto", "linguica", "salsicha", "atum", "sardinha", "camarao", "porco", "boi",
    "bovina", "suina", "costela", "bife", "salame", "mortadela", "peru", "tilapia", "salmao", "bacalhau", "patinho", "acem", "alcatra", "picanha", "hamburguer", "nugget"];
const LATICINIOS = ["leite", "queijo", "manteiga", "iogurte", "requeijao", "mussarela", "mucarela", "ricota", "nata", "coalhada", "catupiry", "parmesao", "cheddar", "whey"];
const NAO_ANIMAL = ["soja", "vegetal", "vegano", "vegana", "coco", "aveia", "amendoa", "amendoim", "castanha"];
const RESTRICOES = {
    gluten: {
        rotulo: "Sem glúten", tags: ["gluten"], soTag: true,
        palavras: ["trigo", "farinha", "macarrao", "miojo", "espaguete", "lasanha", "pizza", "pao", "bolacha", "biscoito", "torrada", "cevada", "centeio"],
        excecoes: ["sem", "arroz", "milho", "mandioca", "tapioca", "queijo"],
        regra: "não use trigo, farinha de trigo, pão, macarrão comum, bolacha, cevada nem centeio; troque por arroz, milho, mandioca, tapioca ou macarrão sem glúten"
    },
    lactose: {
        rotulo: "Sem lactose", tags: ["milk"], soTag: true, palavras: LATICINIOS, excecoes: ["sem", "zero", ...NAO_ANIMAL],
        regra: "não use leite, queijo, manteiga, iogurte, requeijão, creme de leite nem outros derivados; use óleo ou azeite no lugar da manteiga"
    },
    vegetariano: {
        rotulo: "Vegetariano", tags: ["fish", "crustaceans", "molluscs"], soTag: false, palavras: CARNES, excecoes: ["soja", "vegetal", "vegano", "vegana"],
        regra: "não use carne, frango, peixe, frutos do mar, bacon, presunto nem embutidos (ovos e laticínios são permitidos)"
    },
    vegano: {
        rotulo: "Vegano", tags: ["milk", "eggs", "fish", "crustaceans", "molluscs"], soTag: false,
        palavras: [...CARNES, ...LATICINIOS, "ovo", "mel", "gelatina", "maionese"], excecoes: ["soja", "vegetal", "vegano", "vegana", "coco", "aveia", "amendoa", "amendoim", "castanha"],
        regra: "não use NENHUM ingrediente de origem animal: carne, peixe, ovo, leite, queijo, manteiga, mel nem gelatina"
    },
    ovo: {
        rotulo: "Sem ovo", tags: ["eggs"], soTag: true, palavras: ["ovo", "gema", "maionese", "merengue"], excecoes: ["sem"],
        regra: "não use ovo, maionese nem outros produtos que contenham ovo"
    },
    amendoim: {
        rotulo: "Sem amendoim e castanhas", tags: ["peanuts", "nuts"], soTag: true,
        palavras: ["amendoim", "pacoca", "castanha", "noz", "nozes", "amendoa", "avela", "pistache", "caju"], excecoes: ["sem"],
        regra: "não use amendoim, castanhas, nozes, amêndoas nem pastas ou óleos feitos deles"
    }
};

const REGRAS_SUBSTITUTOS = [
    "COMO ESCOLHER OS SUBSTITUTOS (para CADA ingrediente removido, crie um card em \"substituicoes\" com falta, use e como):",
    "1. Descubra a FUNÇÃO do ingrediente removido neste prato (base de carboidrato, proteína, gordura/umidade, ligante, textura crocante ou sabor) e recomende um substituto que cumpra a MESMA função, em proporção parecida e com textura e papel equivalentes. O prato não pode ficar pior nem mudar de natureza.",
    "2. O substituto TEM que respeitar TODAS as restrições ativas (ex.: nunca troque macarrão por pão em \"sem glúten\"; nunca troque queijo por manteiga em \"sem lactose\"; nunca troque ovo por maionese em \"sem ovo\").",
    "3. Prefira ingredientes comuns e baratos na cozinha brasileira. Indique uma opção principal e, se quiser, uma alternativa na mesma frase.",
    "4. No campo \"como\", diga a proporção e qualquer ajuste de preparo, em 1 frase (ex.: \"use a mesma quantidade; cozinha em 8 minutos\").",
    "5. Se, por causa das remoções, o prato ficou sem uma base ou sem uma proteína, o substituto deve ser justamente dessa função, e o comentario_chef deve avisar isso.",
    "Exemplos (adapte ao prato): macarrão → macarrão de arroz ou de milho, arroz ou batata; farinha de trigo → farinha de arroz, fubá ou tapioca; pão → tapioca ou pão sem glúten; leite → bebida vegetal (aveia, soja ou coco) ou água com um fio de azeite; queijo → tofu amassado temperado ou pasta de grão-de-bico; manteiga → azeite ou óleo; ovo como ligante → 1 colher de sopa de linhaça hidratada ou purê de banana ou de batata; ovo como proteína → tofu mexido ou grão-de-bico; carne ou frango → soja texturizada, lentilha, cogumelos ou grão-de-bico; amendoim e castanhas → sementes de girassol ou de abóbora."
].join("\n");

/**
 * Para que serve a função:
 * Identifica quais restrições alimentares estão marcadas pelo usuário na interface.
 *
 * Parâmetros:
 * Nenhum.
 *
 * O que ela executa:
 * Coleta os valores de todos os checkboxes de restrição selecionados e retorna uma lista de strings.
 */
const restricoesAtivas = () => [...document.querySelectorAll(".rest input:checked")].map((i) => i.value);

/**
 * Para que serve a função:
 * Decompõe um texto em uma lista de radicais de palavras normalizadas para busca.
 *
 * Parâmetros:
 * @param {string} t - Texto a ser decomposto.
 *
 * O que ela executa:
 * Remove acentos, separa por caracteres não alfanuméricos e remove desinências de plural.
 */
const palavrasDe = (t) => semAcento(t).split(/[^a-z0-9]+/).filter(Boolean).map((w) => w.replace(/s$/, ""));

/**
 * Para que serve a função:
 * Detecta conflitos entre um ingrediente informado e as restrições alimentares ativas.
 *
 * Parâmetros:
 * @param {Object} item - Objeto do ingrediente contendo nome e dados opcionais de produto.
 * @param {Array<string>} ativas - Lista de restrições alimentares ativas no momento.
 *
 * O que ela executa:
 * Analisa as tags de alérgenos da Open Food Facts ou o nome do ingrediente e retorna os conflitos encontrados.
 */
function conflitoDoItem(item, ativas) {
    const achados = [];
    const palavras = palavrasDe(`${item.nome} ${item.produto?.nome ?? ""}`);
    const alergenos = item.produto?.alergenos ?? [];
    for (const id of ativas) {
        const r = RESTRICOES[id];
        const tag = r.tags.find((t) => alergenos.includes(t));
        if (tag) { achados.push({ restricao: id, origem: "Open Food Facts" }); continue; }
        if (r.soTag && alergenos.length) continue;
        if (r.excecoes.some((e) => palavras.includes(e))) continue;
        if (r.palavras.some((p) => palavras.includes(p))) achados.push({ restricao: id, origem: "pelo nome" });
    }
    return achados;
}

/**
 * Para que serve a função:
 * Retorna todos os conflitos de restrição de todos os ingredientes da lista atual.
 *
 * Parâmetros:
 * Nenhum.
 *
 * O que ela executa:
 * Itera sobre os ingredientes, mapeia os conflitos de cada um e indica se já foram confirmados pelo usuário.
 */
function todosConflitos() {
    const ativas = restricoesAtivas();
    const lista = [];
    ingredientes.forEach((item, indice) => conflitoDoItem(item, ativas).forEach((c) =>
        lista.push({ ...c, indice, item: item.produto?.nome || item.nome, confirmado: (item.confirmados || []).includes(c.restricao) })));
    return lista;
}

/**
 * Para que serve a função:
 * Filtra apenas os conflitos de restrição que ainda estão pendentes de confirmação do usuário.
 *
 * Parâmetros:
 * Nenhum.
 *
 * O que ela executa:
 * Retorna a lista de conflitos não confirmados que bloqueiam a geração da receita.
 */
const conflitos = () => todosConflitos().filter((c) => !c.confirmado);

/**
 * Para que serve a função:
 * Retorna os itens que foram removidos pelo usuário em decorrência de restrições que continuam ativas.
 *
 * Parâmetros:
 * Nenhum.
 *
 * O que ela executa:
 * Filtra a lista de removidos e devolve seus nomes acompanhados dos rótulos das restrições para inclusão no prompt.
 */
function removidosAtivos() {
    const ativas = restricoesAtivas();
    return removidosPorRestricao
        .map((r) => ({ nome: r.nome, rotulos: r.restricoes.filter((id) => ativas.includes(id)).map((id) => RESTRICOES[id].rotulo) }))
        .filter((r) => r.rotulos.length);
}

/**
 * Para que serve a função:
 * Atualiza o estado visual e funcional do botão principal de gerar receita.
 *
 * Parâmetros:
 * Nenhum.
 *
 * O que ela executa:
 * Habilita ou desabilita o botão e altera seu texto caso existam alertas pendentes ou uma requisição em andamento.
 */
function atualizarBotao() {
    const n = conflitos().length;
    $("gerar").disabled = gerando || n > 0;
    $("gerar").textContent = n ? `Resolva ${n} alerta${n > 1 ? "s" : ""} para continuar` : "Me salva!";
}

/**
 * Para que serve a função:
 * Renderiza na tela os cards de alerta de conflito com restrições alimentares.
 *
 * Parâmetros:
 * Nenhum.
 *
 * O que ela executa:
 * Gera o HTML dos alertas com botões de ação (manter, remover ou desfazer) e atualiza o botão principal.
 */
function renderAlertas() {
    const todos = todosConflitos();
    $("alertas").innerHTML = todos.map((c) => c.confirmado
        ? `<div class="alerta-card confirmado">✔ Você confirmou: <b>${esc(c.item)}</b> com <b>${esc(RESTRICOES[c.restricao].rotulo)}</b>
        <div class="acoes"><button class="mini" data-acao="desfazer" data-i="${c.indice}" data-r="${c.restricao}">Desfazer</button></div></div>`
        : `<div class="alerta-card">⚠ <b>${esc(c.item)}</b> não combina com <b>${esc(RESTRICOES[c.restricao].rotulo)}</b> <small>(${esc(c.origem)})</small>
        <div class="acoes"><button class="mini" data-acao="remover" data-i="${c.indice}">Remover</button>
        <button class="mini" data-acao="manter" data-i="${c.indice}" data-r="${c.restricao}">Está ok, manter</button></div></div>`).join("");
    atualizarBotao();
    return todos;
}

/**
 * Para que serve a função:
 * Processa a ação tomada pelo usuário em um alerta de restrição alimentar.
 *
 * Parâmetros:
 * @param {string} acao - Ação a ser executada ('manter', 'desfazer' ou 'remover').
 * @param {number} i - Índice do ingrediente na lista.
 * @param {string} restricao - Identificador da restrição alimentar envolvida.
 *
 * O que ela executa:
 * Atualiza o estado de confirmação do item ou o remove da lista de ingredientes, re-renderizando a interface.
 */
function acaoAlerta(acao, i, restricao) {
    const item = ingredientes[i];
    if (!item) return;
    if (acao === "manter") item.confirmados = [...new Set([...(item.confirmados || []), restricao])];
    if (acao === "desfazer") item.confirmados = (item.confirmados || []).filter((r) => r !== restricao);
    if (acao === "remover") {
        const restricoes = [...new Set(todosConflitos().filter((c) => c.indice === i).map((c) => c.restricao))];
        removidosPorRestricao.push({ nome: item.produto?.nome || item.nome, restricoes });
        ingredientes.splice(i, 1);
        $("picker").innerHTML = "";
    }
    renderChips();
}

$("alertas").onclick = (e) => {
    const b = e.target.closest("button");
    if (b) acaoAlerta(b.dataset.acao, +b.dataset.i, b.dataset.r);
};

/**
 * Para que serve a função:
 * Obtém o identificador do chef selecionado no formulário.
 *
 * Parâmetros:
 * Nenhum.
 *
 * O que ela executa:
 * Consulta o radio button selecionado com name="chef" e retorna seu valor (ex: padrao, nutri, pratico, mirabolante).
 */
const chefAtual = () => document.querySelector('input[name="chef"]:checked').value;

const MIN_MIRABOLANTE = 5;
let mirabolanteLiberado = false;

/**
 * Para que serve a função:
 * Atualiza a disponibilidade e o bloqueio do Chef Mirabolante na interface gráfica.
 *
 * Parâmetros:
 * Nenhum.
 *
 * O que ela executa:
 * Habilita o card quando há 5 ou mais ingredientes ou exibe quantos ingredientes faltam para o desbloqueio.
 */
function atualizarChefes() {
    const faltam = MIN_MIRABOLANTE - ingredientes.length;
    const liberado = faltam <= 0;
    const radio = document.querySelector('input[value="mirabolante"]');
    radio.disabled = !liberado;
    $("faltaMirabolante").textContent = liberado ? "Desbloqueado!" : `🔒 faltam ${faltam} ingrediente${faltam > 1 ? "s" : ""}`;
    if (liberado && !mirabolanteLiberado) {
        const card = $("cardMirabolante");
        card.classList.add("liberou");
        setTimeout(() => card.classList.remove("liberou"), 800);
        status("🎩 Chef Mirabolante desbloqueado!");
    }
    if (!liberado && radio.checked) document.querySelector('input[value="padrao"]').checked = true;
    mirabolanteLiberado = liberado;
}

let ingredientes = [];
let removidosPorRestricao = [];
let gerando = false;
let idxChave = 0;

/**
 * Para que serve a função:
 * Exibe mensagens informativas ou de erro para o usuário na barra de status.
 *
 * Parâmetros:
 * @param {string} texto - Mensagem a ser exibida.
 * @param {boolean} [erro=false] - Define se a mensagem deve ser estilizada como erro.
 *
 * O que ela executa:
 * Altera o texto e a classe CSS do container de status no DOM.
 */
function status(texto, erro = false) {
    $("status").textContent = texto;
    $("status").className = erro ? "erro" : "";
}

/**
 * Para que serve a função:
 * Recupera as chaves da API do Gemini armazenadas no navegador.
 *
 * Parâmetros:
 * Nenhum.
 *
 * O que ela executa:
 * Lê a string salva no localStorage, separa por quebras de linha e retorna um array de chaves válidas.
 */
const getChaves = () => (localStorage.getItem("chaves") || "").split("\n").map((s) => s.trim()).filter(Boolean);

$("chaves").value = localStorage.getItem("chaves") || "";
$("salvarChaves").onclick = () => {
    const unicas = [...new Set($("chaves").value.split("\n").map((s) => s.trim()).filter(Boolean))];
    $("chaves").value = unicas.join("\n");
    localStorage.setItem("chaves", $("chaves").value);
    idxChave = 0;
    status(`${unicas.length} chave(s) salva(s) neste navegador.`);
};
if (!getChaves().length) $("config").open = true;

/**
 * Para que serve a função:
 * Executa uma única tentativa de chamada à API do Gemini usando um modelo e uma chave específicos.
 *
 * Parâmetros:
 * @param {string} modelo - Nome do modelo do Gemini a ser consultado.
 * @param {string} chave - Chave de autenticação da API.
 * @param {string} prompt - Instruções textuais completas para geração da receita.
 * @param {string} nivel - Nível de pensamento (thinking) configurado.
 * @param {number} limiteMs - Tempo limite em milissegundos para a requisição.
 *
 * O que ela executa:
 * Envia uma requisição HTTP POST para a API do Gemini, trata a resposta em JSON e valida a estrutura retornada.
 */
async function tentarGemini(modelo, chave, prompt, nivel, limiteMs) {
    const usaPensamento = Boolean(nivel) && !modelo.includes("lite");
    const montar = (comPensamento) => {
        const config = { responseMimeType: "application/json" };
        if (comPensamento) config.thinkingConfig = { thinkingLevel: nivel };
        return JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: config });
    };
    const chamar = (corpo) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": chave },
        body: corpo,
        signal: AbortSignal.timeout(limiteMs)
    });
    let resp = await chamar(montar(usaPensamento));
    if (resp.status === 400 && usaPensamento) resp = await chamar(montar(false));
    if (!resp.ok) {
        const corpo = await resp.json().catch(() => ({}));
        return { ok: false, status: resp.status, motivo: corpo.error?.message || "sem detalhes" };
    }
    const data = await resp.json();
    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const dados = JSON.parse(texto.replace(/```json|```/g, "").trim());
    if (!dados || typeof dados !== "object" || !dados.nome_prato) throw new Error("JSON sem os campos esperados");
    console.log("Tokens usados:", data.usageMetadata);
    return { ok: true, dados };
}

/**
 * Para que serve a função:
 * Orquestra chamadas ao Gemini aplicando rodízio automático de chaves e fallback sequencial entre modelos.
 *
 * Parâmetros:
 * @param {string} prompt - Instruções completas para a geração da receita.
 * @param {string} chefId - Identificador do chef selecionado para definir a lista de modelos prioritários.
 *
 * O que ela executa:
 * Itera pelos modelos e chaves cadastradas até obter uma resposta válida, atualizando o índice do rodízio.
 */
async function chamarGemini(prompt, chefId) {
    const chaves = getChaves();
    const modelos = chefId === "mirabolante" ? MODELOS_MIRABOLANTE : MODELOS_NORMAL;
    const nivel = chefId === "mirabolante" ? "medium" : "low";
    const limite = chefId === "mirabolante" ? 90000 : 60000;
    const fim = Date.now() + 200000;
    for (const modelo of modelos) {
        for (let t = 0; t < chaves.length; t++) {
            if (Date.now() > fim) break;
            const i = (idxChave + t) % chaves.length;
            try {
                const r = await tentarGemini(modelo, chaves[i], prompt, nivel, limite);
                if (r.ok) {
                    idxChave = (i + 1) % chaves.length;
                    console.log(`Gemini OK: ${modelo}, chave ${i + 1}`);
                    return r.dados;
                }
                console.warn(`Gemini ${modelo}, chave ${i + 1}: HTTP ${r.status} - ${r.motivo}`);
                if (r.status === 404 || r.status === 503) break;
            } catch (e) {
                const lento = e.name === "TimeoutError";
                console.warn(`Gemini ${modelo}, chave ${i + 1}: ${lento ? "demorou demais" : e.message}`);
                if (lento) break;
            }
        }
    }
    throw new Error("GEMINI_INDISPONIVEL");
}

/**
 * Para que serve a função:
 * Atualiza visualmente a lista de etiquetas (chips) de ingredientes adicionados pelo usuário.
 *
 * Parâmetros:
 * Nenhum.
 *
 * O que ela executa:
 * Renderiza os chips no DOM com seus botões de detalhamento e remoção, atualizando o status dos chefs.
 */
function renderChips() {
    const todos = renderAlertas();
    const pendentes = new Set(todos.filter((c) => !c.confirmado).map((c) => c.indice));
    const confirmados = new Set(todos.filter((c) => c.confirmado).map((c) => c.indice));
    $("chips").innerHTML = ingredientes.map((ing, i) => `
    <span class="chip ${ing.produto ? "prod" : ""} ${pendentes.has(i) ? "alerta" : confirmados.has(i) ? "confirmado" : ""}">${esc(ing.produto ? ing.produto.nome : ing.nome)}
      <button data-det="${i}" title="Escolher produto exato">🔍</button><button data-rem="${i}" title="Remover">✕</button></span>`).join("");
    atualizarChefes();
}

/**
 * Para que serve a função:
 * Adiciona um novo ingrediente à lista a partir do texto digitado no campo de entrada.
 *
 * Parâmetros:
 * Nenhum.
 *
 * O que ela executa:
 * Valida o texto, impede duplicatas, respeita o limite de 12 ingredientes e insere o item na lista.
 */
function adicionar() {
    const v = $("novo").value.trim();
    if (!v) return;
    if (ingredientes.some((i) => semAcento(i.nome) === semAcento(v))) { $("novo").value = ""; return; }
    if (ingredientes.length >= 12) return status("Máximo de 12 ingredientes.", true);
    removidosPorRestricao = removidosPorRestricao.filter((r) => semAcento(r.nome) !== semAcento(v));
    ingredientes.push({ nome: v, produto: null });
    $("novo").value = "";
    renderChips();
}

$("add").onclick = adicionar;
$("novo").onkeydown = (e) => { if (e.key === "Enter") adicionar(); };
$("chips").onclick = (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.rem) { ingredientes.splice(+b.dataset.rem, 1); $("picker").innerHTML = ""; renderChips(); }
    if (b.dataset.det) detalhar(+b.dataset.det);
};

/**
 * Para que serve a função:
 * Consulta a API de produtos para permitir ao usuário escolher a marca/versão exata de um ingrediente.
 *
 * Parâmetros:
 * @param {number} i - Índice do ingrediente na lista.
 *
 * O que ela executa:
 * Faz requisição ao endpoint /api/produto e renderiza um seletor com as opções encontradas no Open Food Facts.
 */
async function detalhar(i) {
    const picker = $("picker");
    picker.textContent = "Buscando produtos...";
    try {
        const resp = await fetch(`${API}/api/produto?q=${encodeURIComponent(ingredientes[i].nome)}`);
        const r = await resp.json();
        if (!resp.ok) throw new Error(r.detalhe || r.erro || `HTTP ${resp.status}`);
        const lista = r.produtos || [];
        if (!lista.length) {
            picker.textContent = "Nenhum produto em português encontrado para esse termo. Sem problema: o item segue como genérico.";
            return;
        }
        picker.innerHTML = `<p>Qual é o seu "${esc(ingredientes[i].nome)}"?</p>` +
            lista.map((p, k) => `<button class="opcao" data-i="${i}" data-k="${k}">
        <img src="${esc(p.imagem)}" alt=""><b>${esc(p.nome)}</b>
        <small>${esc(p.marca)} | Nutri-Score ${esc((p.nutriscore || "?").toUpperCase())}</small></button>`).join("") +
            `<button class="opcao" data-i="${i}" data-k="-1"><span></span><b>Usar genérico</b></button>`;
        picker.onclick = (e) => {
            const o = e.target.closest(".opcao");
            if (!o) return;
            ingredientes[+o.dataset.i].produto = +o.dataset.k >= 0 ? lista[+o.dataset.k] : null;
            ingredientes[+o.dataset.i].confirmados = [];
            picker.innerHTML = "";
            renderChips();
        };
    } catch (e) {
        picker.textContent = `Não consegui consultar a Open Food Facts (${e.message}). O item segue como genérico. Confira se o servidor está rodando (npm start) e se você abriu http://localhost:3000.`;
    }
}

/**
 * Para que serve a função:
 * Monta o prompt completo estruturado unificando dados das APIs e escolhas do usuário para envio ao Gemini.
 *
 * Parâmetros:
 * @param {Array<Object>} receitas - Lista de receitas raspadas obtidas da API interna.
 * @param {string} [extra=""] - Instruções complementares em caso de re-tentativa.
 *
 * O que ela executa:
 * Retorna uma string com o contexto nutricional, restrições, referência de receita e regras estritas de formatação JSON.
 */
function montarPrompt(receitas, extra = "") {
    const chefId = chefAtual();
    const chef = CHEFES[chefId] || CHEFES.padrao;
    const ref = escolherReferencia(receitas, chefId);
    const linhasConf = ref ? ref.linhasConflitantes : [];
    const ativas = restricoesAtivas();
    const lista = conflitos();
    const indicesProibidos = new Set(lista.map((c) => c.indice));
    const aUsar = ingredientes.filter((_, i) => !indicesProibidos.has(i)).map((i) => i.nome);
    const confirmadosTxt = todosConflitos().filter((c) => c.confirmado).map((c) => `${c.item} (${RESTRICOES[c.restricao].rotulo})`);
    const removidos = removidosAtivos();
    const blocoRestricoes = ativas.length ? `
RESTRIÇÕES ALIMENTARES (OBRIGATÓRIO respeitar: é questão de saúde; vale também para água, óleo e temperos que você acrescentar):
${ativas.map((id) => `- ${RESTRICOES[id].rotulo}: ${RESTRICOES[id].regra}`).join("\n")}
${confirmadosTxt.length ? `O USUÁRIO CONFIRMOU que pode usar estes ingredientes, mesmo parecendo conflitar: ${confirmadosTxt.join(", ")}. Use-os normalmente, sem avisos e sem substituí-los.` : ""}
${removidos.length ? `O usuário REMOVEU estes ingredientes por causa das restrições (NÃO os use no prato): ${removidos.map((r) => `${r.nome} (${r.rotulos.join(", ")})`).join("; ")}.` : ""}
${removidos.length || linhasConf.length ? REGRAS_SUBSTITUTOS : ""}
` : "";
    const ings = ingredientes.map((i) => i.produto
        ? {
            nome: i.produto.nome, tipo: "produto", marca: i.produto.marca, nutriscore: i.produto.nutriscore, nova: i.produto.nova,
            por_100g: { kcal: i.produto.kcal, proteina: i.produto.proteina, carbo: i.produto.carbo, gordura: i.produto.gordura },
            alergenos: i.produto.alergenos
        }
        : i.dadosAuto
            ? {
                nome: i.nome, tipo: "generico", dados_aproximados_open_food_facts: {
                    produto: i.dadosAuto.nome, marca: i.dadosAuto.marca, nutriscore: i.dadosAuto.nutriscore, nova: i.dadosAuto.nova,
                    por_100g: { kcal: i.dadosAuto.kcal, proteina: i.dadosAuto.proteina, carbo: i.dadosAuto.carbo, gordura: i.dadosAuto.gordura },
                    observacao: "primeiro resultado da busca; o usuário não escolheu o produto, trate como aproximação"
                }
            }
            : { nome: i.nome, tipo: "generico" });
    const nivel = ref ? ref.nivel : "criada";
    const usarTodos = chefId !== "nutri" && (nivel === "criada" || nivel === "inspirada");
    const resumo = (x) => ({ titulo: x.titulo, tempo: x.tempo, porcoes: x.porcoes, ingredientes: (x.ingredientes || []).slice(0, 20), passos: (x.passos || []).slice(0, 18) });
    const contexto = receitas.filter((x) => !ref || x !== ref.receita).slice(0, 3).map((x) => ({ titulo: x.titulo, ingredientes: (x.ingredientes || []).slice(0, 8) }));
    const MODOS = {
        fiel: "MODO FIEL: siga ESTA receita à risca: mantenha a essência, ingredientes, ordem e técnicas; adapte só o estritamente necessário aos ingredientes do usuário. Reescreva os passos com SUAS palavras de forma detalhada e rica. Preencha 'ainda_precisa' com o que faltar.",
        adaptada: "MODO ADAPTADO: use esta receita como base técnica e adapte-a aos ingredientes do usuário. Reescreva os passos com explicações minuciosas e completas.",
        inspirada: "MODO INSPIRAÇÃO: esta receita é referência técnica e de tempero. O prato é SEU: aplique as técnicas e a personalidade do seu chef."
    };
    const blocoReceita = ref
        ? `RECEITA DE REFERÊNCIA SELECIONADA PELO PERFIL DO CHEF (${ref.motivoSelecao}; título: "${ref.receita.titulo}"):\n${JSON.stringify(resumo(ref.receita))}\n${MODOS[nivel]}${linhasConf.length ? `\nATENÇÃO: estas linhas da receita VIOLAM as restrições do usuário e precisam ser substituídas por equivalentes: ${linhasConf.join("; ")}.` : ""}${contexto.length ? `\nOutras receitas raspadas disponíveis: ${JSON.stringify(contexto)}` : ""}`
        : `NENHUMA receita encontrada combina bem com o perfil: crie o prato do zero (usou_referencia deve ser false).${contexto.length ? `\nReceitas encontradas (só contexto, não copie): ${JSON.stringify(contexto)}` : ""}`;
    return `Você é ${chef.personalidade}. Responda SEMPRE em português do Brasil e SOMENTE com JSON válido.

OBJETIVO DA RECEITA (${chef.nome}): ${chef.objetivo}

ESCOLHAS DO USUÁRIO:
- Refeição: ${$("refeicao").value} (adapte o prato a essa refeição: café da manhã = leve, com ovos, pão, frutas ou algo doce; lanche = rápido e fácil de comer; almoço e jantar = prato principal completo)
- Restrições alimentares: ${ativas.length ? ativas.map((id) => RESTRICOES[id].rotulo).join(", ") : "nenhuma"}
${blocoRestricoes}

INGREDIENTES DO USUÁRIO (tipo "produto" vem da Open Food Facts: use exatamente estes números; tipo "generico": estime a nutrição e marque estimativa=true):
${JSON.stringify(ings)}

${blocoReceita}

DIRETRIZES OBRIGATÓRIAS DE DETALHAMENTO CULINÁRIO (NUNCA GERE PASSOS VAGOS OU CURTOS DEMAIS):
1. O usuário precisa de uma receita verdadeiramente completa, confiável e didática. NADA de passos em apenas uma frase rasa.
2. Cada item em "passos" DEVE ter:
   - "titulo": nome claro e objetivo da etapa.
   - "descricao": explicação detalhada de 2 a 4 frases completas (ou 3 a 5 frases no Chef Mirabolante), respondendo:
     * O que entra agora e em que estado/corte (picado, fatiado, em cubos, batido)?
     * Qual o fogo (baixo, médio ou alto) e utensílio (frigideira antiaderente, panela funda, assadeira)?
     * Qual o ponto sensorial exato (sinais de cor, textura cremosa/crocante, cheiro aromático) para o usuário saber exatamente quando avançar?
     * Qual a dica técnica de ouro para não queimar, empelotar ou ressecar?
   - "tempo_seg": duração recomendada em segundos para o timer na tela (ex: 180 para 3 min).
3. No campo "ingredientes_usados": liste cada ingrediente COM a sua medida ou quantidade culinária sugerida para esta receita (ex: "3 ovos batidos com uma pitada de sal", "1 xícara de arroz cozido", "100g de queijo ralado", "1 colher de sopa de azeite").
4. No Chef Nutri: você PODE SIM OU NÃO usar todos os ingredientes do usuário; sinta-se à vontade para descartar itens ultraprocessados em "nao_usados" e justificar com base na saúde.
5. No Chef Mirabolante: aplique o PADRÃO DE ALTA DIFICULDADE (corte preciso, reação de Maillard em alta temperatura, redução de molho, emulsão, combinação de texturas e empratamento artístico).
6. No Chef Prático: seja rápido e eficiente com pouca louça, mas com instruções de fogo e ponto precisas e completas.

FORMATO EXATO DO JSON:
{"nome_prato":"", "esforco":0-100, "nivel_vergonha":0-100, "dificuldade":0-100, "tempo_total_min":minutos, "calorias_kcal":kcal da refeição inteira, "nutriscore":"A|B|C|D|E", "estimativa":true|false,
 "macros":{"proteina":gramas,"carbo":gramas,"gordura":gramas},
 "ingredientes_usados":["nome de cada ingrediente COM a sua medida ou quantidade culinária sugerida"],
 "passos":[{"titulo":"","descricao":"2 a 4 frases ricas, detalhadas e com ponto sensorial","tempo_seg":0}],
 "substituicoes":[{"falta":"","use":"","como":"proporção e ajuste de preparo, 1 frase"}],
 "comentario_chef":"", "selo":"frase curta de aprovação/reprovação", "usou_referencia":true|false, "motivo_veto":"só se você vetou a receita de referência", "ainda_precisa":["ingredientes que a receita pede e o usuário não tem, exceto água, sal e óleo"], "nao_usados":["nomes, ou lista vazia"]}

LEMBRETE FINAL: ${usarTodos ? `o prato deve conter TODOS estes ingredientes do usuário: ${aUsar.join(", ")}.` : "siga a proposta nutricional e técnica do chef (pode ou não usar todos se houver itens inadequados)."}${ativas.length ? " Respeite SEMPRE as restrições alimentares." : ""}${extra}`;
}

const NS = { A: "#038141", B: "#85bb2f", C: "#fecb02", D: "#ee8100", E: "#e63e11" };
const corPct = (v) => (v < 34 ? "#2a9d8f" : v < 67 ? "#e9a820" : "#e4572e");

/**
 * Para que serve a função:
 * Cria o elemento visual de medidor circular (gauge) em SVG.
 *
 * Parâmetros:
 * @param {number} valor - Valor percentual a ser exibido.
 * @param {string} rotulo - Nome ou descrição do indicador.
 * @param {string} [dica] - Texto explicativo opcional exibido em um tooltip informativo ao passar o mouse.
 *
 * O que ela executa:
 * Retorna uma string de HTML contendo o SVG do medidor com cálculos de perímetro e cores dinâmicas, incluindo ícone informativo se fornecido.
 */
function gauge(valor, rotulo, dica) {
    const v = pct(valor), r = 42, c = 2 * Math.PI * r;
    const dicaHtml = dica ? ` <span class="info-tip" tabindex="0">i<span class="tip-conteudo">${esc(dica)}</span></span>` : "";
    return `<div class="w gauge"><svg viewBox="0 0 100 100">
    <circle class="trilho" cx="50" cy="50" r="${r}"/>
    <circle class="barra" cx="50" cy="50" r="${r}" stroke="${corPct(v)}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - v / 100)}" transform="rotate(-90 50 50)"/>
    <text x="50" y="57" text-anchor="middle">${v}%</text></svg><span>${rotulo}${dicaHtml}</span></div>`;
}

/**
 * Para que serve a função:
 * Cria o componente gráfico de semáforo nutricional do Nutri-Score.
 *
 * Parâmetros:
 * @param {string} letra - Letra da classificação do Nutri-Score (A, B, C, D ou E).
 *
 * O que ela executa:
 * Gera o HTML exibindo os 5 blocos de cores com destaque ampliado na nota correspondente.
 */
function semaforo(letra) {
    const l = String(letra || "").toUpperCase().charAt(0);
    return `<div class="w"><div class="ns">${Object.entries(NS).map(([k, c]) => `<i style="background:${c}" class="${k === l ? "on" : ""}">${k}</i>`).join("")}</div><span>Nutri-Score</span></div>`;
}

/**
 * Para que serve a função:
 * Renderiza as barras proporcionais de macronutrientes da receita.
 *
 * Parâmetros:
 * @param {Object} m - Objeto contendo os gramas de proteína, carboidrato e gordura.
 *
 * O que ela executa:
 * Calcula a barra de maior proporção e devolve o HTML com as três barras preenchidas e legendadas.
 */
function macros(m = {}) {
    const itens = [["Proteína", m.proteina, "#2a9d8f"], ["Carboidrato", m.carbo, "#e9a820"], ["Gordura", m.gordura, "#e4572e"]];
    const max = Math.max(...itens.map((x) => +x[1] || 0), 1);
    return `<div class="w macros largo">${itens.map(([n, v, cor]) =>
        `<div class="mb"><span>${n}</span><div><b style="width:${((+v || 0) / max) * 100}%;background:${cor}"></b></div><em>${Math.round(+v || 0)}g</em></div>`).join("")}<span>Macros da refeição</span></div>`;
}

/**
 * Para que serve a função:
 * Renderiza o widget com a métrica mais relevante de acordo com o chef escolhido.
 *
 * Parâmetros:
 * @param {Object} r - Dados da receita gerada pelo Gemini.
 * @param {string} chef - Identificador do chef selecionado.
 *
 * O que ela executa:
 * Seleciona o ícone e a métrica de destaque (tempo para Prático, calorias para Nutri, dificuldade para Padrão/Mirabolante).
 */
function destaque(r, chef) {
    const mapa = {
        padrao: ["👨‍🍳", `${pct(r.dificuldade)}%`, "Nível de dificuldade"],
        pratico: ["⏱", `${Math.round(+r.tempo_total_min || 0)} min`, "Tempo total"],
        nutri: ["🔥", `${Math.round(+r.calorias_kcal || 0)} kcal`, "Calorias da refeição"],
        mirabolante: ["🎩", `${pct(r.dificuldade)}%`, "Nível de dificuldade"]
    };
    const [icone, valor, rotulo] = mapa[chef];
    return `<div class="w largo destaque"><b>${icone} ${valor}</b><span>${rotulo}</span></div>`;
}

/**
 * Para que serve a função:
 * Gera o selo de origem da receita informando se é clássica, adaptada, inspirada ou criada.
 *
 * Parâmetros:
 * @param {Object} ref - Objeto da receita de referência selecionada.
 * @param {string} nivel - Grau de aderência à referência ('fiel', 'adaptada', 'inspirada', 'criada').
 * @param {Object} r - Resposta do Gemini.
 *
 * O que ela executa:
 * Retorna o bloco HTML do selo contendo link para o site raspado e o motivo da escolha daquele chef.
 */
function montarSelo(ref, nivel, r) {
    const link = !ref ? "" : /^https?:\/\//.test(ref.receita.url)
        ? `<a href="${esc(ref.receita.url)}" target="_blank" rel="noopener">${esc(ref.receita.titulo)}</a>` : esc(ref.receita.titulo);
    const veto = r.usou_referencia === false && r.motivo_veto ? `<small>O chef não usou a receita encontrada: ${esc(r.motivo_veto)}</small>` : "";
    const textos = { fiel: `📖 Receita clássica de ${link}`, adaptada: `🔧 Adaptada de ${link}`, inspirada: `💡 Inspirada em ${link}`, criada: "🧪 Criada pelo chef, confira antes de fazer" };
    return `<div class="selo-origem ${nivel}"><b>${textos[nivel]}</b>${nivel === "criada" && veto ? veto : ""}</div>`;
}

/**
 * Para que serve a função:
 * Renderiza todo o resultado da receita gerada na interface gráfica do usuário.
 *
 * Parâmetros:
 * @param {Object} r - Estrutura de dados da receita devolvida pelo Gemini.
 * @param {Array<Object>} receitas - Lista de receitas raspadas pela API interna.
 *
 * O que ela executa:
 * Constrói o HTML com o mascote, balão de fala, widgets nutricionais, card de ingredientes, passos e substitutos.
 */
function renderizar(r, receitas) {
    const chefId = chefAtual();
    const ref = escolherReferencia(receitas, chefId);
    const nivel = !ref || r.usou_referencia === false ? "criada" : ref.nivel;
    const nomePrato = nivel === "fiel" ? ref.receita.titulo : r.nome_prato;
    const seloOrigem = montarSelo(ref, nivel, r);
    const precisa = filtrarPrecisa(r.ainda_precisa).map(esc).join(", ");
    const outrasReceitas = (receitas || []).filter((x) => /^https?:\/\//.test(x.url));
    const blocoRecomendacoes = outrasReceitas.length ? `
    <div class="bloco-recomendacoes">
      <h3>🍽️ VEJA TAMBÉM OUTRAS RECOMENDAÇÕES DO CHEFE</h3>
      <div class="grade-recomendacoes">
        ${outrasReceitas.map((rec) => `
          <a href="${esc(rec.url)}" target="_blank" rel="noopener" class="card-recomendacao">
            <span class="card-rec-icone" aria-hidden="true">🍳</span>
            <div class="card-rec-info">
              <strong class="card-rec-titulo">${esc(rec.titulo)}</strong>
              <span class="card-rec-link">Ver no TudoGostoso ↗</span>
            </div>
          </a>`).join("")}
      </div>
    </div>` : "";
    const usadosLista = (r.ingredientes_usados || []).map(esc);
    const fora = (r.nao_usados || []).map(esc).join(", ");
    const chefInfo = CHEFES[chefId] || CHEFES.padrao;
    $("resultado").hidden = false;
    $("resultado").innerHTML = `
    <div class="topo"><h2>${esc(nomePrato)}</h2><span class="selo">${esc(r.selo)}</span></div>
    ${seloOrigem}
    <div class="fala">
      <div class="avatar avatar-chef">
        <img src="${chefInfo.imagem}" alt="${chefInfo.nome}" class="boneco-chef">
      </div>
      <div class="balao">
        <span class="balao-nome">${chefInfo.avatar} ${chefInfo.nome}</span>
        <p class="balao-texto">${esc(r.comentario_chef)}</p>
      </div>
    </div>
    <div class="widgets">
      ${gauge(r.esforco, "Esforço")}
      ${gauge(r.nivel_vergonha, "Nível de vergonha", "Mede o quanto essa receita é uma gambiarra culinária ou larica que você só comeria escondido de madrugada!")}
      ${semaforo(r.nutriscore)}
      <div class="w"><b>${contarUsados(r)} de ${ingredientes.length}</b><span>Seus ingredientes no prato</span></div>
      ${destaque(r, chefId)}
      ${macros(r.macros)}
    </div>
    ${usadosLista.length ? `
    <div class="bloco-ingredientes">
      <h3>📋 Ingredientes & Proporções</h3>
      <ul class="ingredientes-lista">
        ${usadosLista.map((item) => `<li><span class="check-ing">✓</span> <span>${item}</span></li>`).join("")}
      </ul>
      ${fora ? `<p class="fontes fora-ing"><b>Ficou de fora pelo chef:</b> ${fora}</p>` : ""}
    </div>` : ""}
    ${precisa ? `<p class="fontes"><b>Você ainda precisa de:</b> ${precisa}</p>` : ""}
    ${restricoesAtivas().length ? `<p class="fontes"><b>Restrições consideradas:</b> ${restricoesAtivas().map((id) => esc(RESTRICOES[id].rotulo)).join(", ")}. Orientação geral: confira sempre o rótulo dos produtos; em caso de alergia, consulte um profissional de saúde.</p>` : ""}
    ${r.estimativa ? '<p class="fontes">Alguns valores nutricionais são estimativas.</p>' : ""}
    <h2>Modo de Preparo Passo a Passo</h2>
    <ol class="passos">${(r.passos || []).map((p) => `<li><div><b>${esc(p.titulo)}</b><p>${esc(p.descricao)}</p></div>
      ${+p.tempo_seg > 0 ? `<button class="timer" data-seg="${+p.tempo_seg}">⏱ ${fmt(+p.tempo_seg)}</button>` : ""}</li>`).join("")}</ol>
    ${(r.substituicoes || []).length ? `<h2>Tá faltando? Dá pra trocar</h2><div class="subs">${r.substituicoes.map((s) =>
        `<div class="sub-card"><b>${esc(s.falta)}</b> → ${esc(s.use)}${s.como ? `<br><small>${esc(s.como)}</small>` : ""}</div>`).join("")}</div>` : ""}
    ${blocoRecomendacoes}`;
}

$("resultado").onclick = (e) => {
    const b = e.target.closest(".timer");
    if (!b || b.dataset.rodando) return;
    b.dataset.rodando = "1";
    let s = +b.dataset.seg;
    const id = setInterval(() => {
        s--;
        b.textContent = s > 0 ? `⏱ ${fmt(s)}` : "Pronto!";
        if (s <= 0) { clearInterval(id); if (navigator.vibrate) navigator.vibrate(300); }
    }, 1000);
};

/**
 * Para que serve a função:
 * Remove acentuação gráfica de uma string para permitir comparações lexicais sem distinção de diacríticos.
 *
 * Parâmetros:
 * @param {string} t - Texto de entrada.
 *
 * O que ela executa:
 * Normaliza a string com NFD e remove a faixa de caracteres Unicode correspondente a acentos.
 */
const semAcento = (t) => String(t ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/**
 * Para que serve a função:
 * Confere se o Gemini esqueceu de usar algum ingrediente do usuário que não tenha sido vetado ou excluído.
 *
 * Parâmetros:
 * @param {Object} r - Resposta do Gemini contendo os ingredientes e passos da receita.
 *
 * O que ela executa:
 * Cruza os ingredientes da despensa com o texto do prato e devolve os nomes daqueles que foram esquecidos.
 */
function ingredientesEsquecidos(r) {
    const feito = semAcento(JSON.stringify([r.nome_prato, r.passos, r.ingredientes_usados]));
    const fora = semAcento((r.nao_usados || []).join(" "));
    const proibidos = new Set(conflitos().map((c) => c.indice));
    return ingredientes.filter((_, i) => !proibidos.has(i)).map((i) => i.nome).filter((nome) => {
        const raiz = semAcento(nome).split(" ")[0].replace(/s$/, "");
        return raiz.length > 2 && !feito.includes(raiz) && !fora.includes(raiz);
    });
}

/**
 * Para que serve a função:
 * Calcula localmente quantos ingredientes do usuário estão presentes em uma receita raspada.
 *
 * Parâmetros:
 * @param {Object} receita - Objeto da receita raspada com título e lista de ingredientes.
 *
 * O que ela executa:
 * Conta quantas raízes dos ingredientes do usuário aparecem no texto da receita.
 */
function coberturaLocal(receita) {
    const texto = semAcento(`${receita.titulo} ${(receita.ingredientes || []).join(" ")}`);
    return ingredientes.filter((i) => {
        const raiz = semAcento(i.nome).split(" ")[0].replace(/s$/, "");
        return raiz.length > 2 && texto.includes(raiz);
    }).length;
}

const PALAVRAS_SAUDAVEIS = ["salada", "legume", "verdura", "grelhad", "assad", "vapor", "integral", "sopa", "caldo", "azeite", "fruta", "grao", "lentilha", "ovo", "frango", "peixe", "atum", "cenoura", "brocolis", "tomate", "espinafre", "abobora", "abobrinha", "aveia", "chia", "linhaca"];
const PALAVRAS_POUCO_SAUDAVEIS = ["frit", "empanad", "bacon", "calabresa", "salsicha", "maionese", "leite condensado", "creme de leite", "acucar", "calda", "margarina", "salgadinho", "nugget", "fondue", "doce"];
const PALAVRAS_DIFICULDADE = ["reduz", "emuls", "gratin", "marin", "crosta", "flamb", "empan", "camada", "forno", "molho", "caldo", "rechei", "glace", "carameliz", "brunoise", "julienne", "risoto", "sufl", "confit", "carpaccio", "veloute", "banho-maria", "tartar", "escalfar"];

/**
 * Para que serve a função:
 * Calcula a pontuação nutricional de uma receita raspada para seleção pelo Chef Nutri.
 *
 * Parâmetros:
 * @param {Object} receita - Objeto contendo título, ingredientes e passos da receita.
 *
 * O que ela executa:
 * Incrementa pontos para alimentos saudáveis e penaliza frituras e ultraprocessados, retornando um escore numérico.
 */
function calcScoreNutri(receita) {
    const texto = semAcento(`${receita.titulo} ${(receita.ingredientes || []).join(" ")} ${(receita.passos || []).join(" ")}`);
    let score = 0;
    for (const s of PALAVRAS_SAUDAVEIS) { if (texto.includes(s)) score += 3; }
    for (const r of PALAVRAS_POUCO_SAUDAVEIS) { if (texto.includes(r)) score -= 4; }
    return score;
}

/**
 * Para que serve a função:
 * Avalia o nível de praticidade e facilidade de uma receita para seleção pelo Chef Prático.
 *
 * Parâmetros:
 * @param {Object} receita - Objeto contendo os dados da receita.
 *
 * O que ela executa:
 * Prioriza receitas com menor quantidade de ingredientes e passos, retornando uma pontuação de agilidade.
 */
function calcScorePratico(receita) {
    const totalIngs = (receita.ingredientes || []).length || 5;
    const totalPassos = (receita.passos || []).length || 4;
    let score = 100 - (totalIngs * 5) - (totalPassos * 6);
    const texto = semAcento(`${receita.titulo} ${(receita.passos || []).join(" ")}`);
    if (/rapido|facil|minuto|frigideira|panela so|one pot/i.test(texto)) score += 20;
    if (/forno|demorad|horas|esperar/i.test(texto)) score -= 15;
    return score;
}

/**
 * Para que serve a função:
 * Avalia o grau de dificuldade e sofisticação culinária para seleção pelo Chef Mirabolante.
 *
 * Parâmetros:
 * @param {Object} receita - Objeto com título, ingredientes e etapas da receita.
 *
 * O que ela executa:
 * Bonifica receitas com maior quantidade de passos e técnicas gastronômicas refinadas.
 */
function calcScoreMirabolante(receita) {
    const totalIngs = (receita.ingredientes || []).length || 5;
    const totalPassos = (receita.passos || []).length || 4;
    const texto = semAcento(`${receita.titulo} ${(receita.ingredientes || []).join(" ")} ${(receita.passos || []).join(" ")}`);
    let score = (totalPassos * 8) + (totalIngs * 3);
    for (const t of PALAVRAS_DIFICULDADE) { if (texto.includes(t)) score += 7; }
    return score;
}

/**
 * Para que serve a função:
 * Seleciona a receita raspada de referência mais adequada ao perfil específico do chef ativo.
 *
 * Parâmetros:
 * @param {Array<Object>} receitas - Lista de receitas raspadas da web.
 * @param {string} chefId - Identificador do chef escolhido pelo usuário.
 *
 * O que ela executa:
 * Aplica os critérios específicos (cobertura para Padrão, nutrição para Nutri, facilidade para Prático, complexidade para Mirabolante) e retorna a receita ideal com seu nível e motivo.
 */
function escolherReferencia(receitas, chefId) {
    const total = ingredientes.length;
    if (!receitas.length || !total) return null;
    const ativas = restricoesAtivas();

    const avaliadas = receitas.map((receita) => {
        const cob = coberturaLocal(receita);
        return {
            receita,
            total,
            cobertura: cob,
            scoreNutri: calcScoreNutri(receita),
            scorePratico: calcScorePratico(receita),
            scoreMirabolante: calcScoreMirabolante(receita),
            linhasConflitantes: (receita.ingredientes || []).map(String).filter((linha) => conflitoDoItem({ nome: linha, produto: null }, ativas).length)
        };
    });

    let escolhida = null;
    let motivoSelecao = "";

    if (chefId === "padrao") {
        avaliadas.sort((x, y) => y.cobertura - x.cobertura || x.linhasConflitantes.length - y.linhasConflitantes.length);
        escolhida = avaliadas[0];
        motivoSelecao = `maior cobertura clássica (${escolhida.cobertura} de ${total} ingredientes)`;
    } else if (chefId === "nutri") {
        const comIngs = avaliadas.filter((a) => a.cobertura >= 1);
        const lista = comIngs.length ? comIngs : avaliadas;
        lista.sort((x, y) => y.scoreNutri - x.scoreNutri || y.cobertura - x.cobertura);
        escolhida = lista[0];
        motivoSelecao = "maior valor nutricional e equilíbrio saudável";
    } else if (chefId === "pratico") {
        const comIngs = avaliadas.filter((a) => a.cobertura >= 1);
        const lista = comIngs.length ? comIngs : avaliadas;
        lista.sort((x, y) => y.scorePratico - x.scorePratico || y.cobertura - x.cobertura);
        escolhida = lista[0];
        motivoSelecao = `preparo rápido com menos ingredientes (${(escolhida.receita.ingredientes || []).length} itens no site)`;
    } else if (chefId === "mirabolante") {
        const comIngs = avaliadas.filter((a) => a.cobertura >= 1);
        const lista = comIngs.length ? comIngs : avaliadas;
        lista.sort((x, y) => y.scoreMirabolante - x.scoreMirabolante || y.cobertura - x.cobertura);
        escolhida = lista[0];
        motivoSelecao = `alta complexidade gastronômica e técnica (${(escolhida.receita.passos || []).length} etapas)`;
    }

    if (!escolhida) return null;

    const razao = total > 0 ? escolhida.cobertura / total : 0;
    let nivel = "inspirada";
    if (chefId === "padrao") {
        nivel = razao >= 0.7 && !escolhida.linhasConflitantes.length ? "fiel" : (razao >= 0.35 ? "adaptada" : "inspirada");
    } else if (chefId === "pratico") {
        nivel = razao >= 0.4 ? "adaptada" : "inspirada";
    } else if (chefId === "nutri") {
        nivel = razao >= 0.5 ? "adaptada" : "inspirada";
    } else {
        nivel = "inspirada";
    }

    return { ...escolhida, nivel, motivoSelecao };
}

/**
 * Para que serve a função:
 * Filtra a lista de ingredientes adicionais necessários para a receita, removendo itens que o usuário já possui ou condimentos básicos.
 *
 * Parâmetros:
 * @param {Array<string>} lista - Lista de ingredientes extras solicitados pela receita.
 *
 * O que ela executa:
 * Retorna os itens excluindo água, sal, óleo e os ingredientes já cadastrados na despensa.
 */
function filtrarPrecisa(lista) {
    const meus = ingredientes.map((i) => semAcento(i.nome).split(" ")[0].replace(/s$/, "")).filter((x) => x.length > 2);
    return (lista || []).map(String).filter((item) => {
        const t = semAcento(item);
        return !/^(agua|sal|oleo|azeite)\b/.test(t) && !meus.some((raiz) => t.includes(raiz));
    });
}

/**
 * Para que serve a função:
 * Conta quantos dos ingredientes originais do usuário foram efetivamente aproveitados na receita gerada.
 *
 * Parâmetros:
 * @param {Object} r - Resposta do Gemini contendo ingredientes_usados.
 *
 * O que ela executa:
 * Compara as raízes das palavras dos ingredientes da despensa com o texto dos itens utilizados e devolve a contagem.
 */
function contarUsados(r) {
    const usados = semAcento((r.ingredientes_usados || []).join(" "));
    return ingredientes.filter((i) => usados.includes(semAcento(i.nome).split(" ")[0].replace(/s$/, ""))).length;
}

/**
 * Para que serve a função:
 * Garante a presença de dados da API pública Open Food Facts para ao menos dois ingredientes da lista.
 *
 * Parâmetros:
 * Nenhum.
 *
 * O que ela executa:
 * Caso o usuário não tenha selecionado um produto exato, busca e anexa dados automáticos aos itens genéricos.
 */
async function garantirDadosDaAPI() {
    if (ingredientes.some((i) => i.produto)) return;
    await Promise.allSettled(ingredientes.filter((i) => !i.dadosAuto).slice(0, 2).map(async (item) => {
        const r = await (await fetch(`${API}/api/produto?q=${encodeURIComponent(item.nome)}`, { signal: AbortSignal.timeout(8000) })).json();
        if (r.produtos?.length) item.dadosAuto = r.produtos[0];
    }));
}

/**
 * Para que serve a função:
 * Consulta a API própria de web scraping para obter receitas reais relacionadas aos ingredientes do usuário.
 *
 * Parâmetros:
 * Nenhum.
 *
 * O que ela executa:
 * Envia uma requisição ao endpoint /api/receitas e retorna a lista de receitas raspadas ou um array vazio em caso de falha.
 */
async function buscarReceitas() {
    try {
        const q = encodeURIComponent(ingredientes.map((i) => i.nome).join(","));
        const r = await (await fetch(`${API}/api/receitas?ingredientes=${q}`, { signal: AbortSignal.timeout(20000) })).json();
        if (r.aviso) console.warn(r.aviso);
        return r.receitas || [];
    } catch (e) {
        console.warn("API de receitas indisponível:", e.message);
        return [];
    }
}

/**
 * Para que serve a função:
 * Identifica se a receita gerada pelo Gemini utilizou algum ingrediente expressamente proibido pelas restrições ativas.
 *
 * Parâmetros:
 * @param {Object} r - Resposta do Gemini com a lista de ingredientes utilizados.
 *
 * O que ela executa:
 * Devolve uma lista com os nomes dos itens proibidos que foram indevidamente incluídos no prato.
 */
function usouProibidos(r) {
    const usados = semAcento((r.ingredientes_usados || []).join(" "));
    const nomes = [...conflitos().map((c) => ingredientes[c.indice].nome), ...removidosAtivos().map((x) => x.nome)];
    return [...new Set(nomes)].filter((nome) => {
        const raiz = semAcento(nome).split(" ")[0].replace(/s$/, "");
        return raiz.length > 2 && usados.includes(raiz);
    });
}

/**
 * Para que serve a função:
 * Verifica se os ingredientes substitutos sugeridos pelo chef violam as restrições alimentares ativas.
 *
 * Parâmetros:
 * @param {Object} r - Receita contendo a lista de substituições.
 *
 * O que ela executa:
 * Retorna os itens de substituição que entram em conflito com as restrições selecionadas.
 */
function substitutosRuins(r) {
    const ativas = restricoesAtivas();
    return (r.substituicoes || []).map((s) => s.use).filter((u) => u && conflitoDoItem({ nome: String(u), produto: null }, ativas).length);
}

const DICAS = [
    "Sabia? O Nutri-Score vai de A (mais saudável) a E (menos saudável) e vem direto de uma consulta Open Food Facts.",
    "Um prato feito com carinho e amor sai muito mais gostoso!",
    "Ovo é coringa na cozinha: vira omelete, mexido, cozido e ainda dá liga em bolinhos e massas.",
    "Arroz com feijão é uma dupla clássica: juntos, um complementa os aminoácidos do outro.",
    "Experimente o tempero antes de servir. Sal é fácil de colocar e impossível de tirar.",
    "Os nossos chefe se inspira em receitas reais, nada é inventado, e sim adaptado para você!.",
    "Guarde um pouco da água do cozimento do macarrão: o amido dela ajuda o molho a grudar na massa.",
    "Faltou algum ingrediente? Olhe o cartão \"Tá faltando? Dá pra trocar\" no resultado: o chef sugere substituições.",
    "O Chef Mirabolante só aparece com 5 ingredientes. Quanto mais ingredientes, mais criatividade!",
    "Se uma chave de API atinge o limite, o app troca sozinho para a próxima do rodízio.",
    "Depois de mexer com carne crua ou ovos, lave bem as mãos e os utensílios antes de pegar em outros alimentos.",
    "Cebola e alho dourados no começo dão sabor a quase tudo. Só cuide para o alho não queimar e amargar.",
    "Arroz que sobrou? Guarde na geladeira logo depois de esfriar e, no dia seguinte, vire bolinho ou arroz de forno.",
    "Os números nutricionais que você vê são por 100 g do produto, direto da base aberta Open Food Facts.",
    "No passo a passo, os cronômetros são clicáveis: é só tocar e esperar o aviso de que acabou."
];
let dicasUsadas = [], timerDica = null;

/**
 * Para que serve a função:
 * Seleciona aleatoriamente uma dica de culinária para exibição na tela de carregamento sem repetições imediatas.
 *
 * Parâmetros:
 * Nenhum.
 *
 * O que ela executa:
 * Escolhe uma dica da lista que ainda não tenha sido exibida no ciclo atual e a retorna.
 */
function proximaDica() {
    if (dicasUsadas.length >= DICAS.length) dicasUsadas = [];
    const restantes = DICAS.filter((d) => !dicasUsadas.includes(d));
    const d = restantes[Math.floor(Math.random() * restantes.length)];
    dicasUsadas.push(d);
    return d;
}

/**
 * Para que serve a função:
 * Abre a tela modal de carregamento e inicia o ciclo periódico de dicas do chef.
 *
 * Parâmetros:
 * Nenhum.
 *
 * O que ela executa:
 * Remove o atributo hidden da tela de carregamento, bloqueia o scroll do body e agenda a troca de dicas a cada 7 segundos.
 */
function abrirCarregando() {
    const caixa = $("dica");
    const trocarDica = () => { caixa.classList.remove("entra"); void caixa.offsetWidth; caixa.textContent = proximaDica(); caixa.classList.add("entra"); };
    trocarDica();
    timerDica = setInterval(trocarDica, 7000);
    $("carregando").hidden = false;
    document.body.style.overflow = "hidden";
}

/**
 * Para que serve a função:
 * Fecha a tela modal de carregamento e encerra o temporizador de troca de dicas.
 *
 * Parâmetros:
 * Nenhum.
 *
 * O que ela executa:
 * Oculta o modal de carregamento, restaura o scroll do documento e limpa o intervalo do timer.
 */
function fecharCarregando() {
    clearInterval(timerDica);
    $("carregando").hidden = true;
    document.body.style.overflow = "";
}

/**
 * Para que serve a função:
 * Atualiza o texto da etapa atual do processo exibido na tela de carregamento.
 *
 * Parâmetros:
 * @param {string} texto - Descrição da etapa em execução.
 *
 * O que ela executa:
 * Define o textContent do elemento de etapa no DOM.
 */
const etapa = (texto) => { $("etapa").textContent = texto; };

$("gerar").onclick = async () => {
    if (!ingredientes.length) return status("Adicione pelo menos um ingrediente.", true);
    if (!getChaves().length) { $("config").open = true; return status("Cadastre ao menos uma chave do Gemini em Configurações.", true); }
    if (conflitos().length) return status("Resolva os alertas das restrições antes de continuar.", true);
    gerando = true;
    atualizarBotao();
    $("resultado").hidden = true;
    status("");
    const inicio = Date.now();
    const chef = chefAtual();
    abrirCarregando();
    etapa("Buscando receitas e dados nutricionais...");
    const [rec] = await Promise.allSettled([buscarReceitas(), garantirDadosDaAPI()]);
    const receitas = rec.status === "fulfilled" ? rec.value : [];
    try {
        etapa(receitas.length ? "O chef está lendo as receitas..." : "O chef está improvisando...");
        const ref = escolherReferencia(receitas, chef);
        const nivelDe = (x) => (!ref || x.usou_referencia === false ? "criada" : ref.nivel);
        let resultado = await chamarGemini(montarPrompt(receitas), chef);
        const faltou = ["criada", "inspirada"].includes(nivelDe(resultado)) ? ingredientesEsquecidos(resultado) : [];
        const violou = usouProibidos(resultado);
        const ruins = substitutosRuins(resultado);
        if (faltou.length || violou.length || ruins.length) {
            console.warn("Problemas na receita:", { faltou, violou, ruins });
            etapa("Ajustando a receita...");
            try {
                resultado = await chamarGemini(montarPrompt(receitas,
                    `${faltou.length ? ` ATENÇÃO: você IGNOROU: ${faltou.join(", ")}. Inclua obrigatoriamente esses ingredientes.` : ""}${violou.length ? ` ATENÇÃO: você USOU ingredientes que violam as restrições: ${violou.join(", ")}. REMOVA-OS e substitua.` : ""}${ruins.length ? ` ATENÇÃO: estes substitutos violam as restrições: ${ruins.join(", ")}. Troque por outros que respeitem TODAS as restrições e cumpram a mesma função no prato.` : ""} NÃO repita o prato anterior (${resultado.nome_prato}).`), chef);
            } catch (e) {
                console.warn("Não deu para refazer; mantendo a primeira receita.", e.message);
            }
        }
        renderizar(resultado, receitas);
        status(`Receita pronta em ${Math.round((Date.now() - inicio) / 1000)}s.`);
    } catch (e) {
        console.error("Falha ao gerar a receita:", e);
        status("O chef está sobrecarregado agora. Tente novamente em instantes.", true);
    } finally {
        fecharCarregando();
        gerando = false;
        atualizarBotao();
        if (!$("resultado").hidden) $("resultado").scrollIntoView({ behavior: "smooth" });
    }
};

document.querySelectorAll(".rest input").forEach((el) => { el.onchange = renderChips; });
atualizarChefes();
atualizarBotao();
