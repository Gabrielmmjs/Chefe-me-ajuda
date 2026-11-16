const express = require("express");
const cors = require("cors");
const cheerio = require("cheerio");
const path = require("path");

const app = express();
app.disable("x-powered-by");
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "images")));

const PORT = process.env.PORT || 3000;
const UA_OFF = "SOSGeladeira/1.0 (troque-por-seu-email@exemplo.com)";
const UA_NAVEGADOR = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const SITE = "https://www.tudogostoso.com.br";
const URL_BUSCA = `${SITE}/busca`;
const SELETOR_LINKS = "a[href*='/receita/']";

const cache = new Map();

/**
 * Cache em memória (10 min).
 * @param {string} chave
 * @param {Function} buscar
 */
async function comCache(chave, buscar) {
    const hit = cache.get(chave);
    if (hit && Date.now() - hit.t < 10 * 60 * 1000) return hit.v;
    const v = await buscar();
    if (cache.size >= 200) cache.delete(cache.keys().next().value);
    cache.set(chave, { v, t: Date.now() });
    return v;
}

const CAMPOS = "code,lang,product_name,product_name_pt,brands,image_small_url,nutriscore_grade,nova_group,nutriments,allergens_tags";

/**
 * Para que serve a função:
 * Padroniza valores textuais que podem vir em diferentes formatos da API Open Food Facts.
 *
 * Parâmetros:
 * @param {string|Array|Object} v - Valor a ser convertido para texto.
 *
 * O que ela executa:
 * Converte arrays em listas separadas por vírgula, extrai textos de objetos localizados ou retorna uma string vazia.
 */
const texto = (v) => {
    if (Array.isArray(v)) return v.join(", ");
    if (v && typeof v === "object") return v.pt || v.main || Object.values(v)[0] || "";
    return v || "";
};

/**
 * Para que serve a função:
 * Extrai e valida um valor numérico nutricional por 100g vindo do objeto de nutrientes.
 *
 * Parâmetros:
 * @param {Object} n - Objeto contendo as informações nutricionais do produto.
 * @param {string} chave - Nome da métrica nutricional desejada (ex: energy-kcal, proteins).
 *
 * O que ela executa:
 * Busca o valor nas chaves possíveis por 100g e retorna o número formatado ou null caso inválido.
 */
const nutr = (n, chave) => {
    const v = n?.[`${chave}_100g`] ?? n?.[chave]?.["100g"] ?? n?.[chave]?.value ?? null;
    return v === null || v === "" || isNaN(Number(v)) ? null : Number(v);
};

/**
 * Para que serve a função:
 * Normaliza o formato bruto de um produto recebido da Open Food Facts para a estrutura utilizada pelo sistema.
 *
 * Parâmetros:
 * @param {Object} p - Dados brutos do produto obtidos da API externa.
 * @param {string} q - Termo de busca original utilizado como fallback para o nome.
 *
 * O que ela executa:
 * Mapeia e retorna um objeto padronizado com nome, marca, imagem, Nutri-Score, grupo NOVA, calorias, macros e alérgenos.
 */
function normalizar(p, q) {
    const ns = String(p.nutriscore_grade || "").toLowerCase();
    return {
        nome: texto(p.product_name_pt) || texto(p.product_name) || q,
        marca: texto(p.brands),
        imagem: p.image_small_url || "",
        nutriscore: "abcde".includes(ns) && ns.length === 1 ? ns : null,
        nova: p.nova_group || null,
        kcal: nutr(p.nutriments, "energy-kcal"),
        proteina: nutr(p.nutriments, "proteins"),
        carbo: nutr(p.nutriments, "carbohydrates"),
        gordura: nutr(p.nutriments, "fat"),
        alergenos: (p.allergens_tags || []).map((t) => String(t).replace("en:", ""))
    };
}

/**
 * Para que serve a função:
 * Valida se o produto cadastrado na base de dados está em idioma português.
 *
 * Parâmetros:
 * @param {Object} p - Objeto do produto contendo a propriedade de idioma.
 *
 * O que ela executa:
 * Retorna true se o produto não tiver idioma restrito ou se iniciar com 'pt', descartando itens de outros idiomas.
 */
const ehPortugues = (p) => !p.lang || String(p.lang).toLowerCase().startsWith("pt");

/**
 * Para que serve a função:
 * Realiza a busca de produtos na API moderna Search-a-licious da Open Food Facts restrita ao Brasil.
 *
 * Parâmetros:
 * @param {string} q - Termo de busca digitado pelo usuário.
 *
 * O que ela executa:
 * Envia requisições HTTP para a API de busca, filtra os itens em português e retorna uma lista de produtos normalizados ou null em caso de falha.
 */
async function buscarSearchALicious(q) {
    const termo = q.replace(/[^\p{L}\p{N}\s-]/gu, " ").trim();
    if (!termo) return [];
    const pedir = async (consulta) => {
        const url = new URL("https://search.openfoodfacts.org/search");
        url.search = new URLSearchParams({ q: consulta, page_size: "10", langs: "pt", fields: CAMPOS }).toString();
        const res = await fetch(url, {
            headers: { "User-Agent": UA_OFF },
            signal: AbortSignal.timeout(15000)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return { data };
    };
    const consultas = [
        `${termo} countries_tags:"en:brazil" lang:"pt"`,
        `${termo} countries_tags:"en:brazil"`
    ];
    let funcionou = false;
    for (const consulta of consultas) {
        try {
            const { data } = await pedir(consulta);
            funcionou = true;
            const lista = (data.hits || []).filter(ehPortugues).slice(0, 5).map((p) => normalizar(p, q));
            if (lista.length) return lista;
        } catch (e) {
            console.error("Search-a-licious:", e.message);
        }
    }
    return funcionou ? [] : null;
}

/**
 * Para que serve a função:
 * Executa a busca de produtos no endpoint legado da Open Food Facts Brasil como plano de contingência.
 *
 * Parâmetros:
 * @param {string} q - Termo de pesquisa do produto.
 *
 * O que ela executa:
 * Consulta a rota CGI tradicional da Open Food Facts e devolve a lista de produtos normalizados em português.
 */
async function buscarLegado(q) {
    try {
        const url = new URL("https://br.openfoodfacts.org/cgi/search.pl");
        url.search = new URLSearchParams({ search_terms: q, search_simple: "1", action: "process", json: "1", page_size: "10", sort_by: "unique_scans_n", fields: CAMPOS }).toString();
        const res = await fetch(url, {
            headers: { "User-Agent": UA_OFF },
            signal: AbortSignal.timeout(20000)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return (data.products || []).filter(ehPortugues).slice(0, 5).map((p) => normalizar(p, q));
    } catch (e) {
        console.error("Busca antiga (br):", e.message);
        throw new Error("Open Food Facts indisponível agora (busca nova e antiga falharam)");
    }
}

app.get("/api/produto", async (req, res) => {
    const q = (req.query.q || "").trim().toLowerCase();
    if (!q) return res.status(400).json({ erro: "Informe o parâmetro q" });
    try {
        const produtos = await comCache("off:" + q, async () => {
            const lista = await buscarSearchALicious(q);
            if (lista) return lista;
            return buscarLegado(q);
        });
        res.json({ produtos });
    } catch (e) {
        res.status(502).json({ erro: "Falha ao consultar a Open Food Facts", detalhe: e.message });
    }
});

/**
 * Para que serve a função:
 * Realiza o web scraping de uma página de receita extraindo dados estruturados schema.org/Recipe.
 *
 * Parâmetros:
 * @param {string} html - Código HTML bruto da página raspada.
 * @param {string} url - Endereço URL da receita.
 *
 * O que ela executa:
 * Utiliza o Cheerio para encontrar e interpretar scripts JSON-LD de receita, retornando título, tempo, rendimento, ingredientes e instruções.
 */
function extrairReceita(html, url) {
    const $ = cheerio.load(html);
    let receita = null;
    $('script[type="application/ld+json"]').each((_, el) => {
        if (receita) return;
        try {
            const json = JSON.parse($(el).contents().text());
            const candidatos = [].concat(json, json["@graph"] || []);
            receita = candidatos.find((x) => x && [].concat(x["@type"]).includes("Recipe")) || null;
        } catch {}
    });
    if (!receita) return null;
    const passos = [].concat(receita.recipeInstructions || [])
        .map((p) => (typeof p === "string" ? p : p.text || p.name || ""))
        .filter(Boolean);
    return {
        titulo: receita.name || "Receita",
        url,
        tempo: receita.totalTime || receita.cookTime || "",
        porcoes: receita.recipeYield || "",
        ingredientes: receita.recipeIngredient || [],
        passos: passos.slice(0, 20)
    };
}

/**
 * Para que serve a função:
 * Normaliza uma string de texto removendo acentos e caracteres especiais para comparação.
 *
 * Parâmetros:
 * @param {string} t - Texto a ser processado.
 *
 * O que ela executa:
 * Converte o texto para minúsculas e remove marcas diacríticas via normalização Unicode NFD.
 */
const semAcento = (t) => String(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/**
 * Para que serve a função:
 * Calcula a quantidade de ingredientes do usuário presentes no título ou ingredientes de uma receita raspada.
 *
 * Parâmetros:
 * @param {Object} receita - Objeto da receita contendo título e lista de ingredientes.
 * @param {Array<string>} ings - Lista de ingredientes fornecidos pelo usuário.
 *
 * O que ela executa:
 * Compara radicais dos termos desconsiderando acentos e plurais, retornando a contagem de correspondências encontradas.
 */
function cobertura(receita, ings) {
    const texto = semAcento(receita.titulo + " " + receita.ingredientes.join(" "));
    return ings.filter((i) => {
        const raiz = semAcento(i).split(" ")[0].replace(/s$/, "");
        return raiz.length > 2 && texto.includes(raiz);
    }).length;
}

app.get("/api/receitas", async (req, res) => {
    const ings = (req.query.ingredientes || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 5);
    if (!ings.length) return res.status(400).json({ erro: "Informe ingredientes" });
    const headers = { "User-Agent": UA_NAVEGADOR, "Accept-Language": "pt-BR,pt;q=0.9" };
    try {
        const receitas = await Promise.race([comCache("rec:" + ings.join("|"), async () => {
            const todosLinks = [];
            const termos = [...new Set([ings.join(" "), ...ings.slice(0, 3)])];
            for (const termo of termos) {
                try {
                    const url = new URL(URL_BUSCA);
                    url.search = new URLSearchParams({ q: termo }).toString();
                    const resBusca = await fetch(url, { headers, signal: AbortSignal.timeout(6000) });
                    if (!resBusca.ok) throw new Error(`HTTP ${resBusca.status}`);
                    const html = await resBusca.text();
                    const $ = cheerio.load(html);
                    const links = $(SELETOR_LINKS).map((_, a) => $(a).attr("href")).get()
                        .map((h) => (h.startsWith("http") ? h : SITE + h));
                    for (const l of links) {
                        if (!todosLinks.includes(l) && todosLinks.length < 8) todosLinks.push(l);
                    }
                    if (todosLinks.length >= 6) break;
                } catch (e) {
                    console.error(`Scraping "${termo}":`, e.message);
                }
            }
            if (!todosLinks.length) return [];
            console.log(`Scraping: buscando detalhes de ${todosLinks.length} receita(s)`);
            const pags = await Promise.allSettled(
                todosLinks.map((u) => fetch(u, { headers, signal: AbortSignal.timeout(6000) })
                    .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
                    .then((html) => extrairReceita(html, u)))
            );
            const ok = pags.map((p) => p.value).filter(Boolean);
            return ok.map((r) => ({ ...r, cobertura: cobertura(r, ings) }));
        }), new Promise((_, rej) => setTimeout(() => rej(new Error("tempo esgotado (15s)")), 15000))]);
        res.json({ receitas });
    } catch (e) {
        console.error("Scraping falhou:", e.message);
        res.json({ receitas: [], aviso: "Scraping indisponível: " + e.message });
    }
});

app.listen(PORT, () => console.log(`SOS Geladeira rodando em http://localhost:${PORT}`));
