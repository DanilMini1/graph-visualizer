import { GraphifyGraph, GraphifyNode } from './types';

/* ═══════════════════════════════════════════════════════════════
   NLP Engine — client-side semantic search for metallurgy domain
   ═══════════════════════════════════════════════════════════════ */

// ── 1. Synonym dictionary (30+ term groups) ──

const SYNONYM_GROUPS: string[][] = [
  ['электроэкстракция', 'electrowinning', 'электровыделение', 'эв'],
  ['печь взвешенной плавки', 'пвп', 'flash smelting', 'взвешенная плавка', 'fluidized bed furnace'],
  ['выщелачивание', 'leaching', 'растворение'],
  ['кучное выщелачивание', 'heap leaching', 'кв'],
  ['обессоливание', 'desalination', 'опреснение', 'деминерализация'],
  ['католит', 'catholyte', 'катодный раствор'],
  ['штейн', 'matte', 'сульфидный расплав'],
  ['шлак', 'slag', 'силикатный расплав'],
  ['флотация', 'flotation', 'пенная флотация'],
  ['электролит', 'electrolyte', 'раствор электролита'],
  ['электролиз', 'electrolysis'],
  ['конвертирование', 'converting', 'конвертер'],
  ['обжиг', 'roasting', 'окислительный обжиг'],
  ['никель', 'ni', 'nickel'],
  ['медь', 'cu', 'copper'],
  ['золото', 'au', 'gold'],
  ['серебро', 'ag', 'silver'],
  ['мпг', 'платиновые металлы', 'pgm', 'платина', 'палладий'],
  ['сульфаты', 'so4', 'сульфат', 'sulfate', 'sulfates'],
  ['хлориды', 'cl', 'chloride', 'chlorides', 'хлорид'],
  ['автоклав', 'autoclave', 'автоклавное выщелачивание'],
  ['фильтр-пресс', 'filter press', 'фильтрация'],
  ['диафрагменная ячейка', 'diaphragm cell'],
  ['мельница', 'mill', 'шаровая мельница', 'измельчение'],
  ['флотационная машина', 'flotation machine', 'флотомашина'],
  ['концентрация', 'содержание', 'concentration'],
  ['температура', 'temperature', 'нагрев'],
  ['скорость циркуляции', 'flow rate', 'расход', 'циркуляция'],
  ['ph', 'кислотность', 'водородный показатель'],
  ['драгоценные металлы', 'драгметаллы', 'precious metals', 'благородные металлы'],
  ['шахтные воды', 'mine water', 'рудничные воды'],
  ['сточные воды', 'wastewater', 'промышленные стоки'],
  ['очистка газов', 'gas cleaning', 'газоочистка', 'скруббер'],
  ['so2', 'диоксид серы', 'сернистый газ', 'sulfur dioxide'],
  ['катод', 'cathode', 'катодный', 'катоды'],
  ['шихта', 'charge', 'шихтовые материалы'],
  ['степень извлечения', 'recovery rate', 'извлечение'],
  ['производительность', 'productivity', 'capacity', 'мощность'],
  ['гидрометаллургия', 'hydrometallurgy'],
  ['пирометаллургия', 'pyrometallurgy'],
  ['обогащение', 'mineral processing', 'beneficiation'],
  ['экология', 'environment', 'environmental', 'охрана окружающей среды'],
];

// Build lookup: word → all synonyms in its group
const synonymMap = new Map<string, Set<string>>();
for (const group of SYNONYM_GROUPS) {
  const lowerGroup = group.map(w => w.toLowerCase());
  for (const word of lowerGroup) {
    const existing = synonymMap.get(word) || new Set<string>();
    for (const syn of lowerGroup) existing.add(syn);
    synonymMap.set(word, existing);
  }
}

function getSynonyms(word: string): string[] {
  const w = word.toLowerCase();
  // exact match
  if (synonymMap.has(w)) return [...synonymMap.get(w)!];
  // partial match
  for (const [key, syns] of synonymMap) {
    if (key.includes(w) || w.includes(key)) return [...syns];
  }
  return [w];
}

// ── 2. Entity type keywords ──

const TYPE_KEYWORDS: Record<string, string[]> = {
  material: ['материал', 'вещество', 'металл', 'реагент', 'сырьё', 'продукт', 'отход'],
  process: ['процесс', 'метод', 'технология', 'способ', 'операция'],
  equipment: ['оборудование', 'установка', 'аппарат', 'машина', 'печь', 'ванна'],
  property: ['параметр', 'свойство', 'показатель', 'характеристика', 'условие'],
  experiment: ['эксперимент', 'опыт', 'испытание', 'исследование', 'тест'],
  publication: ['публикация', 'статья', 'обзор', 'патент', 'отчёт', 'диссертация'],
  expert: ['эксперт', 'автор', 'исследователь', 'специалист', 'учёный'],
  facility: ['лаборатория', 'цех', 'фабрика', 'завод', 'установка'],
};

// ── 3. Types ──

export interface ParsedQuery {
  materials: string[];
  processes: string[];
  equipment: string[];
  properties: string[];
  geography: 'russia' | 'foreign' | 'all';
  yearRange: { from?: number; to?: number };
  numericConstraints: Array<{ property: string; operator: string; value: number; unit: string }>;
  entityTypes: string[];
  keywords: string[];
  originalQuery: string;
}

export interface SemanticSearchResult {
  results: Array<{
    node: GraphifyNode;
    score: number;
    matchReasons: string[];
    relatedNodes: Array<{ node: GraphifyNode; relation: string; edgeType: string }>;
  }>;
  parsedQuery: ParsedQuery;
  totalFound: number;
  suggestedFilters: { nodeTypes: string[]; communities: number[] };
}

// ── 4. Natural language query parser ──

export function parseNaturalQuery(query: string): ParsedQuery {
  const q = query.toLowerCase().trim();
  const words = q.split(/[\s,;.!?]+/).filter(w => w.length > 1);

  // Detect geography
  let geography: 'russia' | 'foreign' | 'all' = 'all';
  if (/отечествен|российск|россия|в\s*россии|рф/.test(q)) geography = 'russia';
  else if (/зарубеж|мировой|мировая|мировую|международн|иностран|foreign|international/.test(q)) geography = 'foreign';

  // Detect year range
  const yearRange: { from?: number; to?: number } = {};
  const lastYearsMatch = q.match(/(?:за\s*)?последни[еих]\s*(\d+)\s*(?:лет|год)/);
  if (lastYearsMatch) {
    yearRange.from = new Date().getFullYear() - parseInt(lastYearsMatch[1]);
  }
  const yearRangeMatch = q.match(/(?:с|от|from)\s*(\d{4})\s*(?:по|до|to)\s*(\d{4})/);
  if (yearRangeMatch) {
    yearRange.from = parseInt(yearRangeMatch[1]);
    yearRange.to = parseInt(yearRangeMatch[2]);
  }
  const sinceMatch = q.match(/(?:с|от|после|since)\s*(\d{4})\s*(?:год|г\.?)?/);
  if (sinceMatch && !yearRangeMatch) {
    yearRange.from = parseInt(sinceMatch[1]);
  }

  // Detect numeric constraints
  const numericConstraints: ParsedQuery['numericConstraints'] = [];
  const numPatterns = [
    /(?:(?:концентрация|содержание)\s+)?(\S+)\s*([<>≤≥]=?|не\s*более|не\s*менее|до|от)\s*([\d.,]+)\s*(мг\/л|мг\/дм³|°[cс]|%|м\/с|т\/сут|атм)?/gi,
  ];
  for (const pat of numPatterns) {
    let m;
    while ((m = pat.exec(q)) !== null) {
      let op = m[2].replace('не более', '<=').replace('не менее', '>=').replace('до', '<=').replace('от', '>=');
      if (!['<', '>', '<=', '>=', '='].includes(op)) op = '<=';
      numericConstraints.push({
        property: m[1],
        operator: op,
        value: parseFloat(m[3].replace(',', '.')),
        unit: m[4] || '',
      });
    }
  }

  // Detect entity types
  const entityTypes: string[] = [];
  for (const [type, keywords] of Object.entries(TYPE_KEYWORDS)) {
    if (keywords.some(kw => q.includes(kw))) entityTypes.push(type);
  }
  // Also infer from query structure
  if (/покажите все эксперимент|все опыты|все испытания/.test(q)) entityTypes.push('experiment');
  if (/публикаци|стат[ьеёи]|обзор|литератур/.test(q)) entityTypes.push('publication');
  if (/эксперт|специалист|кто\s+(?:занимается|работает)/.test(q)) entityTypes.push('expert');

  // Match words against synonym groups to categorize
  const materials: string[] = [];
  const processes: string[] = [];
  const equipmentList: string[] = [];
  const properties: string[] = [];
  const keywords: string[] = [];

  // Check multi-word phrases first
  const phrases = [q]; // full query
  for (let i = 0; i < words.length; i++) {
    for (let j = i + 1; j <= Math.min(i + 4, words.length); j++) {
      phrases.push(words.slice(i, j).join(' '));
    }
  }
  phrases.push(...words);

  const matched = new Set<string>();
  for (const phrase of phrases) {
    if (phrase.length < 2) continue;
    const syns = getSynonyms(phrase);
    if (syns.length > 1 || synonymMap.has(phrase)) {
      if (!matched.has(phrase)) {
        matched.add(phrase);
        keywords.push(phrase);
      }
    }
  }

  // Also add individual meaningful words
  for (const w of words) {
    if (w.length > 2 && !['какие', 'какая', 'какой', 'каких', 'какую', 'метод', 'методы', 'покажите', 'найти', 'показать', 'подходят', 'описаны', 'существуют', 'применяются', 'используются', 'является', 'считается', 'оптимальной', 'оптимальный', 'каковы', 'если', 'для', 'при', 'что', 'все', 'между', 'воды', 'вода', 'водой'].includes(w)) {
      if (!matched.has(w)) {
        keywords.push(w);
      }
    }
  }

  return {
    materials,
    processes,
    equipment: equipmentList,
    properties,
    geography,
    yearRange,
    numericConstraints,
    entityTypes: [...new Set(entityTypes)],
    keywords: [...new Set(keywords)],
    originalQuery: query,
  };
}

// ── 5. Semantic search ──

export function semanticSearch(query: string, graph: GraphifyGraph): SemanticSearchResult {
  const parsed = parseNaturalQuery(query);
  const q = query.toLowerCase();

  const scored: SemanticSearchResult['results'] = [];

  for (const node of graph.nodes) {
    let score = 0;
    const reasons: string[] = [];
    const label = node.label.toLowerCase();
    const nodeType = (node.type || '').toLowerCase();
    const meta = (node as any).metadata || {};

    // A) Direct label match
    if (label === q) {
      score += 120;
      reasons.push('Точное совпадение названия');
    } else if (label.includes(q) || q.includes(label)) {
      score += 80;
      reasons.push('Совпадение по названию');
    }

    // B) Keyword matching with synonyms
    for (const kw of parsed.keywords) {
      const syns = getSynonyms(kw);
      for (const syn of syns) {
        if (label.includes(syn)) {
          score += 60;
          reasons.push(`Совпадение: "${syn}"`);
          break;
        }
        // Check metadata too
        const metaStr = JSON.stringify(meta).toLowerCase();
        if (metaStr.includes(syn)) {
          score += 40;
          reasons.push(`Найдено в метаданных: "${syn}"`);
          break;
        }
      }
      // Also match the original keyword directly
      if (label.includes(kw)) {
        score += 50;
        if (!reasons.some(r => r.includes(kw))) reasons.push(`Ключевое слово: "${kw}"`);
      }
    }

    // C) Entity type match
    if (parsed.entityTypes.length > 0 && parsed.entityTypes.includes(nodeType)) {
      score += 30;
      reasons.push(`Тип: ${nodeType}`);
    }

    // D) Geography filter
    if (parsed.geography !== 'all' && meta.geography) {
      const geo = (meta.geography as string).toLowerCase();
      if (parsed.geography === 'russia' && (geo.includes('росси') || geo.includes('отечествен'))) {
        score += 25;
        reasons.push('География: Россия');
      } else if (parsed.geography === 'foreign' && (geo.includes('зарубеж') || geo.includes('мировая') || geo.includes('international'))) {
        score += 25;
        reasons.push('География: зарубежная');
      }
    }

    // E) Year range filter
    if (parsed.yearRange.from && meta.year) {
      const year = meta.year as number;
      if (year >= parsed.yearRange.from && (!parsed.yearRange.to || year <= parsed.yearRange.to)) {
        score += 20;
        reasons.push(`Год: ${year}`);
      }
    }
    if (parsed.yearRange.from && meta.date) {
      const dateYear = parseInt((meta.date as string).substring(0, 4));
      if (!isNaN(dateYear) && dateYear >= parsed.yearRange.from) {
        score += 20;
        reasons.push(`Дата: ${meta.date}`);
      }
    }

    // F) Numeric constraint match
    for (const nc of parsed.numericConstraints) {
      if (meta.value_range) {
        score += 15;
        reasons.push(`Числовой параметр: ${meta.value_range}`);
      }
    }

    // G) Centrality bonus
    if (node.degree_centrality) {
      score += node.degree_centrality * 5;
    }

    if (score > 0) {
      // Find related nodes
      const related: SemanticSearchResult['results'][0]['relatedNodes'] = [];
      for (const edge of graph.edges) {
        if (edge.source === node.id || edge.target === node.id) {
          const otherId = edge.source === node.id ? edge.target : edge.source;
          const otherNode = graph.nodes.find(n => n.id === otherId);
          if (otherNode && related.length < 5) {
            related.push({
              node: otherNode,
              relation: edge.source === node.id ? 'исходящая' : 'входящая',
              edgeType: edge.type || 'связь',
            });
          }
        }
      }

      scored.push({
        node,
        score: Math.round(score),
        matchReasons: [...new Set(reasons)],
        relatedNodes: related,
      });
    }
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Compute suggested filters
  const nodeTypesSet = new Set<string>();
  const communitiesSet = new Set<number>();
  for (const r of scored.slice(0, 20)) {
    if (r.node.type) nodeTypesSet.add(r.node.type);
    if (r.node.community !== undefined) communitiesSet.add(r.node.community);
  }

  return {
    results: scored,
    parsedQuery: parsed,
    totalFound: scored.length,
    suggestedFilters: {
      nodeTypes: [...nodeTypesSet],
      communities: [...communitiesSet],
    },
  };
}
