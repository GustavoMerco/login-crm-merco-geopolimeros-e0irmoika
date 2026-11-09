# Estilo Mercogeo — "Laje nivelada": design system

> Uma laje de concreto recém-nivelada sob luz de galpão: superfícies claras e planas, a estrutura em petróleo profundo e um laranja de injeção só onde há algo a fazer.

A Merco Geopolímeros injeta polímeros para nivelar pisos, estabilizar solos e reforçar estruturas sem demolir. O sistema herda essa ideia: **nada é demolido para mostrar informação** — a tela é plana, organizada em camadas finas, e cada número de engenharia é exato e legível. O petróleo (`#17677A`, da logo) dá a estrutura: a navegação, os títulos de seção, as etapas do funil. O laranja (`#F97316`, o triângulo da logo) é a "injeção": aparece só no que pede ação — o botão principal, o prazo que vence, o marcador da aba ativa. O resto é concreto: cinzas levemente esfriados, fios finos e muito respiro.

Público: engenheiros, comercial técnico e diretoria de uma empresa de engenharia que atende Ambev, Heineken, Cargill, Vale e Infraero. O sistema precisa parecer **ferramenta de engenharia séria**, não app de consumo: denso quando precisa, nunca enfeitado.

Inspirações (sem relação com as marcas): a precisão de fios finos e um único acento por tela do estilo Linear; a calma do fundo claro e das pílulas do estilo Wise; o papel quente com cartões brancos do Notion. Referência de componentes de painel: grade bento, números que contam respeitando "reduzir movimento" e formato brasileiro (Profitize — Componentes Dashboard).

Siga este arquivo em todas as telas do sistema. Ele vale mais que o gosto de quem implementa: em caso de dúvida, volte a ele. Os tokens estão em `src/main.css` (variáveis `--mg-*`).

## Fundos

| Fundo | Cor | Texto | Texto suave | Acento | Onde |
|---|---|---|---|---|---|
| Concreto | `#F3F6F6` | `#0E1E22` | `#546368` | `#C2410C` | O fundo de todas as páginas de trabalho |
| Laje | `#FFFFFF` | `#0E1E22` | `#546368` | `#C2410C` | Cartões, colunas do funil, tabelas, formulários |
| Névoa petróleo | `#EEF7F9` | `#0B3540` | `#3E5A61` | `#17677A` | Destaques leves, linha selecionada, faixa de contexto do card |
| Petróleo profundo | `#0B3540` | `#FFFFFF` | `#A9D3DD` | `#FB923C` | A barra lateral e o topo da tela de login |

### Tema escuro — "Galpão à noite"

O mesmo sistema com a luz apagada: o concreto vira um petróleo quase preto, as lajes sobem um degrau mais claras, e o petróleo claro da logo (`#4FB3C9`) passa a ser a cor de links e estrutura. O laranja da ação continua `#C2410C` (texto branco 5,1:1) e ganha contorno luminoso no foco.

| Fundo | Cor | Texto | Texto suave | Acento | Onde |
|---|---|---|---|---|---|
| Concreto noturno | `#0A1417` | `#E6EEF0` | `#93A6AB` | `#F97316` | O fundo de todas as páginas |
| Laje noturna | `#101D21` | `#E6EEF0` | `#93A6AB` | `#F97316` | Cartões, colunas, tabelas, formulários |
| Degrau | `#15262B` | `#E6EEF0` | `#93A6AB` | `#4FB3C9` | Hover, linha selecionada, painéis internos |
| Névoa petróleo | `#12313A` | `#E6EEF0` | `#A9C1C7` | `#4FB3C9` | Destaques leves e faixa de contexto |
| Petróleo noite | `#071A1F` | `#FFFFFF` | `#A9D3DD` | `#FB923C` | A barra lateral |

Fios: `#22363C` (normal) e `#2E464D` (campos). Estados no escuro: em dia `#86EFAC` sobre `#0F2A1A`; atenção `#FCD34D` sobre `#2B2107`; crítico `#FCA5A5` sobre `#2E1212`; neutro `#A9C1C7` sobre `#18292E`.

O tema segue o sistema operacional por padrão e pode ser fixado pelo usuário (Claro / Escuro / Sistema) no topo da tela; a escolha fica salva no navegador.

## Tokens (`src/main.css`, classes `mg-*` no Tailwind)

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `canvas` | `#F3F6F6` | `#0A1417` | fundo da página |
| `surface` | `#FFFFFF` | `#101D21` | cartões e formulários |
| `surface-2` | `#F7F9FA` | `#15262B` | hover, faixas, cabeçalho de tabela |
| `ink` | `#0E1E22` | `#E6EEF0` | texto principal |
| `muted` | `#546368` | `#93A6AB` | texto de apoio |
| `line` / `line-strong` | `#DCE4E6` / `#C6D1D4` | `#22363C` / `#2E464D` | fios e campos |
| `brand` | `#17677A` | `#4FB3C9` | links, abas, ícones, etapa atual |
| `brand-strong` | `#0B3540` | `#7FCCDC` | títulos de destaque, hover de link |
| `brand-fill` | `#17677A` | `#17677A` | fundo cheio com texto branco |
| `brand-soft` / `brand-soft-2` | `#EEF7F9` / `#D6EDF2` | `#12313A` / `#17414C` | destaques leves |
| `action` / `action-hover` | `#C2410C` / `#9A3412` | `#C2410C` / `#9A3412` | botão principal |
| `accent` | `#F97316` | `#FB923C` | marcadores não textuais |
| `sidebar` | `#0B3540` | `#071A1F` | barra lateral |
| `ok`, `warn`, `crit`, `neutral` (+ `-bg`, `-line`) | ver estados | ver estados | pílulas e alertas |

## Acentos e detalhes

- **Petróleo** `#17677A`: a cor da marca — links, abas, ícones ativos, etapa atual do funil, botão secundário (contorno). Contraste 6,5:1 com branco.
- **Petróleo escuro** `#135866` / `#0B3540`: hover e texto forte sobre névoa.
- **Petróleo claro** `#4FB3C9`: ícones e marcadores sobre o petróleo profundo; nunca como texto sobre branco.
- **Laranja injeção** `#C2410C`: o fundo do **único** botão principal de cada tela (texto branco, 5,1:1). Hover `#9A3412`.
- **Laranja da marca** `#F97316`: só em marcadores não textuais — o triângulo da logo, o traço da aba ativa, o ponto de "vence hoje". Nunca como fundo de texto branco (não passa em contraste).
- **Fio** `#DCE4E6`: as bordas de 1 px que separam tudo, no lugar da sombra. Fio forte `#C6D1D4` em campos.
- **Estados** (sempre com rótulo em texto, nunca só cor):
  - Em dia / concluído: texto `#166534` sobre `#DCFCE7`
  - Atenção / vence em breve: texto `#92400E` sobre `#FEF3C7`
  - Crítico / vencido / bloqueado: texto `#991B1B` sobre `#FEE2E2`
  - Neutro / sem prazo: texto `#3E5A61` sobre `#EDF2F3`

## Tipografia

Fontes (Google Fonts): Manrope, IBM Plex Mono.

Manrope é geométrica e técnica sem ser fria — combina com engenharia e já é a fonte do sistema. IBM Plex Mono foi desenhada para engenharia (IBM) e carrega **todo número com unidade, código, prazo e data**: `10,25 m²`, `0,20 kg/m²`, `COMP-GEO-01 v3`, `vence 12/11`.

| Uso | Fonte | Peso | Tamanho |
|---|---|---|---|
| Título da página | Manrope | 700 | 24 px, letras −0,01em |
| Título de seção / coluna | Manrope | 700 | 15 px |
| Rótulo pequeno (sobrelinha) | Manrope | 700 | 11 px, caixa alta, +0,06em |
| Corpo | Manrope | 500 | 14 px |
| Apoio / legenda | Manrope | 500 | 12–13 px |
| Número grande (KPI) | IBM Plex Mono | 600 | 28–32 px |
| Número, unidade, código, data | IBM Plex Mono | 500 | 12–13 px |

Números sempre no formato brasileiro (`1.234,56`, `3,4 dias`, `12/11/2026`) e com unidade ao lado, separada por espaço fino.

## Componentes

- **Botão principal**: fundo `#C2410C`, texto branco, cantos de 8 px, altura 40 px. Um por tela.
- **Botão secundário**: fundo branco, texto `#17677A`, contorno 1 px `#17677A`, mesmo canto.
- **Botão discreto**: sem fundo, texto `#3E5A61`; hover com fundo `#EEF7F9`.
- **Campo**: fundo branco, fio `#C6D1D4`, cantos de 8 px; foco com anel petróleo de 3 px a 25%; rótulo acima em Manrope 600 13 px; erro em texto `#991B1B` logo abaixo, dizendo o que fazer.
- **Cartão (Laje)**: fundo branco, fio `#DCE4E6`, cantos de 12 px, padding 16–20 px, sem sombra; no hover, a borda vai a `#A9C7CE` e aparece sombra mínima.
- **Pílula de estado**: cantos de 999 px, 11–12 px, peso 700, ponto colorido de 6 px antes do texto.
- **Card do funil**: cliente em 14 px 700; família e local em 12 px; prazo em pílula mono; faixa lateral de 3 px na cor do estado do prazo.
- **Abas do card da oportunidade**: texto 14 px 600; aba ativa com traço inferior laranja `#F97316` de 2 px e texto `#0E1E22`.
- **Régua da jornada (stepper)**: etapas em linha; feita = petróleo cheio, atual = anel laranja, futura = fio; etapa ainda não construída = tracejado com a fase ("Fase 3").
- **Barra lateral**: Petróleo profundo, logo no topo, grupos com sobrelinha `#A9D3DD`, item ativo com fundo `rgba(255,255,255,0.08)` e traço laranja à esquerda.
- **KPI (bento)**: cartão Laje, sobrelinha, número em Plex Mono 600 e uma frase do que significa; nunca número sem contexto.
- **Estado vazio**: ícone de traço fino petróleo, uma frase do porquê e **o próximo passo** como botão.

## Faça

- Organize toda tela em torno da **oportunidade** (o objeto de trabalho), não do módulo técnico.
- Um botão laranja por tela; as outras ações em secundário ou discreto.
- Fios de 1 px separando as camadas; sombra só no hover e em diálogos.
- Números, unidades, códigos e datas em Plex Mono, sempre com a unidade.
- Prazo sempre visível em quem tem prazo, com estado em texto ("Vence em 2 dias").
- Etapas não construídas aparecem honestas: tracejadas, com a fase em que chegam.
- Linguagem de negócio em português: "Faltam dados do cliente", nunca `blocked` ou um ID.
- Respiro: 24 px entre seções, 16 px dentro dos cartões, 8 px entre itens de lista.

## Evite

- Nada de verde-esmeralda: a marca é petróleo + laranja.
- Nada de laranja como fundo de texto branco em `#F97316` (contraste 2,8:1): use `#C2410C`.
- Nada de gradiente em botões, cartões ou textos; o único gradiente permitido é o da logo.
- Nada de IDs, JSON, nomes de coleção, "recibo", "snapshot" ou "gate" na tela do usuário comum — isso mora em **Evidências e controles**.
- Nada de menu com mais de 7 itens por grupo; função administrativa não entra no menu do dia a dia.
- Nada de negrito em parágrafo inteiro; destaque uma palavra.
- Nada de cor sozinha comunicando estado: sempre com texto.

## Movimento

- Transições curtas e secas: 150–200 ms, `cubic-bezier(0.2, 0, 0, 1)`, sem quicar.
- Cards do funil entram com fade e subida de 4 px, escalonados em 20 ms.
- KPIs contam até o valor em 600 ms na primeira carga.
- Com "reduzir movimento" no sistema, nada anima: tudo aparece pronto.

## Acessibilidade

- Contraste mínimo 4,5:1 em texto (verificado nos pares acima).
- Alvos de toque com 44 px de altura mínima.
- Foco visível em tudo: anel de 2 px branco + 2 px petróleo.
- Estrutura semântica: um `h1` por página, regiões com `aria-label`, tabelas com `caption`.
