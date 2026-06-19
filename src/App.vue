<script setup>
import { ref } from 'vue'
import { jsPDF } from 'jspdf'

const cvContainer = ref(null)
const isDownloading = ref(false)

// ─── i18n ──────────────────────────────────────────────────
const lang = ref('en')
const toggleLang = () => { lang.value = lang.value === 'en' ? 'pt' : 'en' }
// Resolve a bilingual field { en, pt } to the active language; plain values pass through.
const t = (v) => (v && typeof v === 'object' && !Array.isArray(v) && 'en' in v) ? v[lang.value] : v

const ui = {
  navExperience: { en: 'Experience',       pt: 'Experiência' },
  navSkills:     { en: 'Skills',           pt: 'Habilidades' },
  resume:        { en: 'Resume',           pt: 'Currículo' },
  downloading:   { en: 'Downloading...',   pt: 'Baixando...' },
  skillsTitle:   { en: 'Technical Arsenal',pt: 'Arsenal Técnico' },
  writing:       { en: 'Writing',          pt: 'Publicações' },
  projects:      { en: 'Projects',         pt: 'Projetos' },
  summary:       { en: 'Summary',          pt: 'Resumo' },
  yo:            { en: 'y.o.',             pt: 'anos' },
  tech:          { en: 'Tech',             pt: 'Tecnologias' },
}

const downloadPDF = async () => {
  if (isDownloading.value) return
  isDownloading.value = true

  try {
    // Real text-based PDF — selectable, copyable, ATS-friendly (single column).
    // Built from the data objects, not a screenshot, so nothing rasterizes.
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    const pageW   = pdf.internal.pageSize.getWidth()   // 210
    const pageH   = pdf.internal.pageSize.getHeight()  // 297
    const margin  = 16
    const right   = pageW - margin
    const width   = pageW - margin * 2
    let y = margin

    const ink    = [28, 25, 23]   // near-black
    const muted  = [92, 86, 80]   // gray
    const accent = [180, 83, 9]   // sahara amber
    const rule   = [222, 216, 210]

    const ptToMm = 0.3528
    const stripHtml = (s) => s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()

    // Standard PDF fonts only cover Latin-1 — map common Unicode glyphs to
    // safe equivalents so arrows/quotes don't render as garbage.
    const enc = (s) => String(s)
      .replace(/[→⟶➔➜]/g, '->')
      .replace(/[←⟵]/g, '<-')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/…/g, '...')
      .replace(/≈/g, '~')
      .replace(/•/g, '·')
      .replace(/ /g, ' ')

    const ensure = (need) => {
      if (y + need > pageH - margin) { pdf.addPage(); y = margin }
    }

    // Wrapped paragraph; returns nothing, advances y.
    const para = (text, { size = 9.5, color = muted, style = 'normal', x = margin, w = width } = {}) => {
      pdf.setFont('helvetica', style)
      pdf.setFontSize(size)
      pdf.setTextColor(color[0], color[1], color[2])
      const lineH = size * ptToMm * 1.32
      for (const line of pdf.splitTextToSize(enc(text), w)) {
        ensure(lineH)
        pdf.text(line, x, y)
        y += lineH
      }
    }

    const sectionHeading = (title) => {
      y += 3
      ensure(10)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.setTextColor(accent[0], accent[1], accent[2])
      pdf.text(enc(title.toUpperCase()), margin, y)
      y += 2
      pdf.setDrawColor(rule[0], rule[1], rule[2])
      pdf.line(margin, y, right, y)
      y += 5
    }

    // Bold left title + muted right-aligned meta on the same line.
    const titleRow = (left, meta) => {
      ensure(6)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.setTextColor(ink[0], ink[1], ink[2])
      pdf.text(enc(left), margin, y)
      if (meta) {
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(9)
        pdf.setTextColor(muted[0], muted[1], muted[2])
        pdf.text(enc(meta), right, y, { align: 'right' })
      }
      y += 4.6
    }

    const linkLine = (url) => {
      if (!url || url === '#') return
      const clean = url.replace(/^https?:\/\//, '').replace(/^mailto:/, '')
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8.5)
      pdf.setTextColor(accent[0], accent[1], accent[2])
      ensure(4)
      pdf.textWithLink(enc(clean), margin, y, { url })
      y += 4
    }

    // ── Header ──────────────────────────────────────────────
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(22)
    pdf.setTextColor(ink[0], ink[1], ink[2])
    pdf.text(enc(profile.name), margin, y + 6)
    y += 12

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(12)
    pdf.setTextColor(accent[0], accent[1], accent[2])
    pdf.text(enc(t(profile.title)), margin, y)
    y += 6

    pdf.setFontSize(9)
    pdf.setTextColor(muted[0], muted[1], muted[2])
    const contactLine = [
      profile.email.replace('mailto:', ''),
      `${t(profile.location)} · ${profile.age} ${t(ui.yo)}`,
      profile.linkedin.replace(/^https?:\/\//, ''),
      profile.github.replace(/^https?:\/\//, ''),
    ].join('  |  ')
    para(contactLine, { size: 9, color: muted })
    para(
      profile.languages.map(l => `${t(l.name)} (${t(l.level)})`).join(' · '),
      { size: 9, color: muted },
    )

    // ── Summary ─────────────────────────────────────────────
    sectionHeading(t(ui.summary))
    para(stripHtml(t(profile.bio)), { size: 10 })

    // ── Experience ──────────────────────────────────────────
    sectionHeading(t(ui.navExperience))
    for (const job of experience) {
      ensure(14)
      titleRow(t(job.role), job.period)
      para(t(job.company), { size: 10, color: accent, style: 'italic' })
      para(t(job.desc), { size: 9.5 })
      y += 2
    }

    // ── Skills ──────────────────────────────────────────────
    sectionHeading(t(ui.navSkills))
    para(skills.map(s => s.label).join('  ·  '), { size: 10 })

    // ── Projects ────────────────────────────────────────────
    sectionHeading(t(ui.projects))
    for (const p of projects) {
      ensure(16)
      titleRow(p.title, p.period)
      para(t(p.desc), { size: 9.5 })
      para(`${t(ui.tech)}: ${p.tech.join(', ')}`, { size: 8.5, style: 'italic' })
      const href = p.links?.[0]?.href
      if (href && href !== '#') linkLine(href)
      y += 2
    }

    // ── Writing ─────────────────────────────────────────────
    sectionHeading(t(ui.writing))
    for (const a of articles) {
      ensure(12)
      titleRow(t(a.title), a.date)
      para(t(a.desc), { size: 9 })
      linkLine(a.href)
      y += 2
    }

    const fileSuffix = lang.value === 'pt' ? 'Curriculo' : 'Resume'
    pdf.save(`${profile.name.replace(/\s+/g, '_')}_${fileSuffix}.pdf`)
  } catch (err) {
    console.error('PDF error:', err)
  } finally {
    isDownloading.value = false
  }
}

// ─── Replace with your own data ────────────────────────────
const profile = {
  name:     'Egor Babushkin',
  initials: 'EB',
  title:    { en: 'Rust Backend & Full-Stack Engineer', pt: 'Engenheiro Rust Backend & Full-Stack' },
  heroLine: { en: ['Rust Backend', 'Engineer'], pt: ['Engenheiro', 'Rust Backend'] },
  bio: {
    en: '<strong class="text-on-surface font-medium">7+ years</strong> building <strong class="text-on-surface font-medium">high-performance backends</strong> in Rust and Go — from SSR engines and distributed APIs to <strong class="text-on-surface font-medium">LLM-integrated platforms</strong>. Comfortable across the full stack: Axum · PostgreSQL · React · TypeScript.',
    pt: '<strong class="text-on-surface font-medium">7+ anos</strong> construindo <strong class="text-on-surface font-medium">backends de alta performance</strong> em Rust e Go — de motores SSR e APIs distribuídas a <strong class="text-on-surface font-medium">plataformas integradas com LLM</strong>. À vontade em toda a stack: Axum · PostgreSQL · React · TypeScript.',
  },
  // Drop your photo as public/photo.jpg — it will appear automatically
  photo:    '/photo.jpg',
  location: { en: 'Brazil', pt: 'Brasil' },
  age:      28,
  languages: [
    { name: { en: 'Russian',    pt: 'Russo' },     level: { en: 'Native', pt: 'Nativo' } },
    { name: { en: 'English',    pt: 'Inglês' },     level: { en: 'A2', pt: 'A2' } },
    { name: { en: 'Portuguese', pt: 'Português' },  level: { en: 'A1', pt: 'A1' } },
  ],
  email:    'mailto:babushkin.e.ge@gmail.com',
  linkedin: 'https://www.linkedin.com/in/babushkinegor/',
  telegram: 'https://t.me/babushkin_egor',
  whatsapp: 'https://wa.me/5547999477307',
  github:   'https://github.com/babasha',
  resume:   '#',
}

const experience = [
  {
    period:   '2024 — now',
    role:     { en: 'Independent Full-Stack Engineer', pt: 'Engenheiro Full-Stack Independente' },
    company:  { en: 'Self-directed projects · Brazil', pt: 'Projetos próprios · Brasil' },
    desc: {
      en: 'Building full-stack products end to end, solo — Rust/Axum backends, Preact frontends, and a custom Rust SSR engine (rusty-ssr, published on crates.io). Designed, built and deployed two marketplace platforms (uCargo, Morada), owning architecture, infrastructure and AI integrations from scratch.',
      pt: 'Construindo produtos full-stack de ponta a ponta, sozinho — backends em Rust/Axum, frontends em Preact e um motor SSR próprio em Rust (rusty-ssr, publicado no crates.io). Projetei, construí e implantei duas plataformas de marketplace (uCargo, Morada), assumindo arquitetura, infraestrutura e integrações de IA do zero.',
    },
    bgIcon:   'rocket_launch',
    featured: true,
  },
  {
    period:   '2021 — 2024',
    role:     { en: 'Full Stack Engineer', pt: 'Engenheiro Full Stack' },
    company:  'Dostavista',
    desc: {
      en: 'Owned end-to-end features on a high-volume delivery platform: Node.js REST APIs, React UI, PostgreSQL & Redis caching. Built async job pipelines on RabbitMQ and integrated Yandex Maps routing to speed up courier dispatch; ran Nginx config and deployments; polished UX with Framer Motion.',
      pt: 'Responsável por funcionalidades de ponta a ponta em uma plataforma de entregas de alto volume: APIs REST em Node.js, interface em React, cache com PostgreSQL e Redis. Construí pipelines de tarefas assíncronas no RabbitMQ e integrei o roteamento do Yandex Maps para acelerar o despacho de entregadores; configurei o Nginx e os deploys; refinei a UX com Framer Motion.',
    },
    bgIcon:   'deployed_code',
    featured: true,
  },
  {
    period:   '2018 — 2021',
    role:     { en: 'Frontend Developer', pt: 'Desenvolvedor Frontend' },
    company:  'Space App',
    desc: {
      en: 'Delivered client websites and web apps at a Saratov studio — WordPress themes, PHP integrations, hand-built HTML/CSS layouts. Drove the studio\'s shift to React, unlocking richer, more dynamic projects.',
      pt: 'Entreguei sites e aplicações web para clientes em um estúdio em Saratov — temas WordPress, integrações em PHP, layouts HTML/CSS feitos à mão. Conduzi a migração do estúdio para React, viabilizando projetos mais ricos e dinâmicos.',
    },
    bgIcon:   'code_blocks',
    featured: true,
  },
]

const skills = [
  { label: 'Rust / Axum', highlight: true },
  { label: 'Go' },
  { label: 'Node.js' },
  { label: 'React / TypeScript' },
  { label: 'PostgreSQL' },
  { label: 'Redis' },
  { label: 'RabbitMQ' },
  { label: 'LLM / AI Agents' },
  { label: 'Docker / Nginx' },
  { label: 'Protobuf' },
]

const projects = [
  {
    title:  'rusty-ssr',
    period: '2026',
    desc: {
      en: 'Rust SSR engine that pools V8 isolates per CPU core instead of Node.js processes — dropping memory from ~5 GB to ~200 MB. Three-tier cache (thread-local hot → DashMap LRU cold → V8 render) keyed on URL + data. Benchmarks at 95K RPS / 4.6ms p99 vs ~2K RPS for Next.js.',
      pt: 'Motor SSR em Rust que agrupa isolates do V8 por núcleo de CPU em vez de processos Node.js — reduzindo a memória de ~5 GB para ~200 MB. Cache de três níveis (hot thread-local → cold DashMap LRU → render V8) indexado por URL + dados. Benchmarks de 95K RPS / 4,6ms p99 contra ~2K RPS do Next.js.',
    },
    tech:   ['Rust', 'V8', 'SSR', 'Axum', 'DashMap'],
    links:  [
      { label: 'crates.io', href: 'https://crates.io/crates/rusty-ssr' },
      { label: 'GitHub',    href: 'https://github.com/babasha/Rusty-SSR' },
    ],
  },
  {
    title:  'Morada',
    period: '2024 — now',
    desc: {
      en: 'Full-stack real-estate marketplace for the Brazilian market. Preact + Vite frontend with Tauri desktop shell; Rust / Axum backend on PostgreSQL with Protobuf API. SSR powered by rusty-ssr; mimalloc cuts RSS ~20%; realtime notifications via WebSocket broker.',
      pt: 'Marketplace imobiliário full-stack para o mercado brasileiro. Frontend em Preact + Vite com shell desktop em Tauri; backend em Rust / Axum sobre PostgreSQL com API Protobuf. SSR via rusty-ssr; mimalloc reduz o RSS em ~20%; notificações em tempo real via broker WebSocket.',
    },
    tech:   ['Rust', 'Axum', 'Preact', 'Tauri', 'PostgreSQL', 'Protobuf'],
    links:  [
      { label: 'Live site', href: 'https://morada.200-234-218-78.nip.io/' },
    ],
  },
  {
    title:  'uCargo',
    period: '2024 — now',
    desc: {
      en: 'Uber-style cargo & moving marketplace built for the Brazilian market. Three panels — Client, Driver, Loader — with real-time map, booking deck, and Telegram auth. Rust / Axum + Preact + rusty-ssr stack; shared Protobuf API layer.',
      pt: 'Marketplace de fretes e mudanças no estilo Uber, feito para o mercado brasileiro. Três painéis — Cliente, Motorista, Carregador — com mapa em tempo real, painel de reservas e autenticação via Telegram. Stack Rust / Axum + Preact + rusty-ssr; camada de API Protobuf compartilhada.',
    },
    tech:   ['Rust', 'Axum', 'Preact', 'PostgreSQL', 'Telegram API'],
    links:  [
      { label: 'Live site', href: 'https://ucargo.com.br' },
    ],
  },
  {
    title:  'ecoChatServer',
    period: '2024 — 2026',
    desc: {
      en: 'Go backend for AI-driven Instagram DM automation. Director (Level-2 LLM) oversees the primary agent via directives; Hebbian graph builds associative concept memory with decay/reinforcement; PromptOptimizer auto-improves prompts and rolls back on regression. Multi-provider LLM (Claude / GPT-4 / Gemini).',
      pt: 'Backend em Go para automação de DMs do Instagram com IA. Um Director (LLM de nível 2) supervisiona o agente principal via diretrizes; um grafo Hebbiano constrói memória associativa de conceitos com decaimento/reforço; o PromptOptimizer melhora os prompts automaticamente e reverte em caso de regressão. LLM multi-provedor (Claude / GPT-4 / Gemini).',
    },
    tech:   ['Go', 'PostgreSQL', 'WebSocket', 'LLM', 'Hebbian'],
    links:  [
      { label: 'GitHub', href: 'https://github.com/babasha/ecoChatServer' },
    ],
  },
  {
    title:  'adk-go_openai',
    period: '2025 — now',
    desc: {
      en: 'Fork of Google ADK for Go with an OpenAI-compatible adapter. Multi-turn tool calling, SSE streaming, exponential backoff — swap between GPT-4, local Qwen via vLLM, Mistral or Gemma with zero code changes. 146 tests, 74.8% coverage.',
      pt: 'Fork do Google ADK para Go com um adaptador compatível com OpenAI. Tool calling multi-turno, streaming SSE, backoff exponencial — alterne entre GPT-4, Qwen local via vLLM, Mistral ou Gemma sem mudar uma linha de código. 146 testes, 74,8% de cobertura.',
    },
    tech:   ['Go', 'LLM', 'OpenAI API', 'SSE', 'Docker', 'vLLM'],
    links:  [
      { label: 'GitHub', href: 'https://github.com/babasha/adk-go_openai' },
    ],
  },
  {
    title:  'enddel',
    period: '2024 — now',
    desc: {
      en: 'Delivery & logistics management platform with Android app via Capacitor. React 18 + TS: vendor analytics, cluster management, stock monitoring, order/refund flows. Real-time courier tracking via Socket.io + Leaflet; i18n; Node.js + Prisma backend.',
      pt: 'Plataforma de gestão de entregas e logística com app Android via Capacitor. React 18 + TS: analytics de vendedores, gestão de clusters, monitoramento de estoque, fluxos de pedido/reembolso. Rastreamento de entregadores em tempo real via Socket.io + Leaflet; i18n; backend em Node.js + Prisma.',
    },
    tech:   ['React', 'TypeScript', 'Node.js', 'Prisma', 'Socket.io', 'Capacitor'],
    links:  [
      { label: 'private', href: '#' },
    ],
  },
]

const articles = [
  {
    title: { en: 'SSR on Rust: 95K RPS on Apple M4', pt: 'SSR em Rust: 95K RPS no Apple M4' },
    date:  '2025',
    desc: {
      en: 'Architecture of rusty-ssr: V8 isolate pooling, thread pinning to CPU cores, two-tier DashMap cache. Drops infra costs dramatically vs Node.js SSR.',
      pt: 'Arquitetura do rusty-ssr: pooling de isolates do V8, fixação de threads aos núcleos da CPU, cache DashMap de dois níveis. Reduz drasticamente os custos de infraestrutura frente ao SSR em Node.js.',
    },
    tags:  ['Rust', 'V8', 'SSR', 'Performance'],
    href:  'https://habr.com/ru/articles/975340/',
  },
  {
    title: { en: 'IoT Startup Solo in Brazil, on Rust', pt: 'Startup de IoT sozinho no Brasil, em Rust' },
    date:  '2025',
    desc: {
      en: 'Full stack from ESP32-C3 firmware (Embassy) to mobile app and AI customer support. Mesh via ESP-NOW, ECDH auth, 5-month battery per node.',
      pt: 'Full stack do firmware do ESP32-C3 (Embassy) ao app mobile e suporte ao cliente com IA. Mesh via ESP-NOW, autenticação ECDH, 5 meses de bateria por nó.',
    },
    tags:  ['Rust', 'ESP32', 'IoT', 'AI'],
    href:  'https://habr.com/ru/articles/1010342/',
  },
  {
    title: { en: 'Vulkan Renderer for S.T.A.L.K.E.R. OGSR', pt: 'Renderizador Vulkan para S.T.A.L.K.E.R. OGSR' },
    date:  '2025',
    desc: {
      en: 'GPU-driven vegetation, compute-shader frustum culling, persistent ring allocator to eliminate CPU–GPU stalls. Modern foundation for X-Ray modding.',
      pt: 'Vegetação processada na GPU, frustum culling em compute shader, alocador em anel persistente para eliminar travas CPU–GPU. Base moderna para modding da X-Ray.',
    },
    tags:  ['C++', 'Vulkan', 'Graphics'],
    href:  'https://habr.com/ru/articles/1044264/',
  },
  {
    title: { en: 'Virtual Shadow Maps for S.T.A.L.K.E.R.', pt: 'Virtual Shadow Maps para S.T.A.L.K.E.R.' },
    date:  '2026',
    desc: {
      en: 'Granular 128×128 page invalidation across 6 mip levels — smooth moving sun at +0.5ms instead of +6ms with naive cascades.',
      pt: 'Invalidação granular de páginas 128×128 em 6 níveis de mip — sol em movimento suave a +0,5ms em vez de +6ms com cascatas ingênuas.',
    },
    tags:  ['Vulkan', 'HLSL', 'Shadow Maps'],
    href:  'https://habr.com/ru/articles/1049338/',
  },
]

const featuredExp = experience.filter(e => e.featured)
const previousExp = experience.filter(e => !e.featured)
</script>

<template>
  <div ref="cvContainer" id="cv-root" class="bg-background text-on-background font-body h-screen w-full overflow-hidden flex flex-col selection:bg-primary-container selection:text-on-primary-container">

    <!-- Header -->
    <header class="flex items-center justify-between px-8 py-5 border-b border-outline-variant/60 shrink-0 bg-surface-bright z-10">
      <div class="flex items-center gap-3">
        <div class="size-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-headline text-lg italic">
          {{ profile.initials }}
        </div>
        <h1 class="font-headline text-xl text-on-surface tracking-tight font-medium">
          {{ profile.name }}
        </h1>
      </div>

      <nav class="flex items-center gap-8">
        <a href="#experience" class="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">{{ t(ui.navExperience) }}</a>
        <a href="#skills"     class="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">{{ t(ui.navSkills) }}</a>

        <!-- Language toggle -->
        <button
           @click="toggleLang"
           class="flex items-center gap-1.5 text-sm font-bold text-on-surface-variant hover:text-primary transition-colors"
           :title="lang === 'en' ? 'Mudar para Português' : 'Switch to English'">
          <span class="material-symbols-outlined text-[18px]">translate</span>
          <span :class="lang === 'en' ? 'text-primary' : ''">EN</span>
          <span class="text-outline-variant">/</span>
          <span :class="lang === 'pt' ? 'text-primary' : ''">PT</span>
        </button>

        <button
           @click="downloadPDF"
           :disabled="isDownloading"
           class="px-5 py-2 rounded-lg bg-primary text-on-primary text-sm font-bold tracking-wide hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2">
          <span class="material-symbols-outlined text-[18px]" :class="{ 'animate-spin': isDownloading }">
            {{ isDownloading ? 'sync' : 'download' }}
          </span>
          {{ isDownloading ? t(ui.downloading) : t(ui.resume) }}
        </button>
      </nav>
    </header>

    <!-- Bento Grid -->
    <main class="flex-1 min-h-0 p-8 flex gap-8 overflow-hidden">

      <!-- Left column: portrait + bio (sticky) -->
      <div class="w-1/3 flex flex-col gap-6 h-full">

        <!-- Portrait card -->
        <div class="flex-1 bg-surface-container-lowest rounded-xl border border-outline-variant/60 sahara-shadow overflow-hidden flex flex-col relative group">
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent z-10"></div>
          <!-- Photo: drop your image as public/photo.jpg -->
          <div
            class="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105 bg-surface-container-high"
            :style="{ backgroundImage: `url('${profile.photo}')` }"
          ></div>
          <!-- Fallback initials shown behind the photo -->
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span class="font-headline text-8xl text-outline-variant/40 select-none">{{ profile.initials }}</span>
          </div>
          <div class="mt-auto p-8 relative z-20">
            <h2 class="font-headline text-5xl text-white font-medium leading-tight tracking-tight">
              {{ t(profile.heroLine)[0] }}<br/>
              <span class="italic text-primary-fixed">{{ t(profile.heroLine)[1] }}</span>
            </h2>
          </div>
        </div>

        <!-- Bio card -->
        <div class="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/60 sahara-shadow shrink-0">
          <p class="text-on-surface-variant text-base leading-relaxed" v-html="t(profile.bio)"></p>

          <!-- Personal info -->
          <div class="mt-4 flex flex-col gap-1.5">
            <div class="flex items-center gap-2 text-sm text-on-surface-variant">
              <span class="material-symbols-outlined text-[16px] text-primary">location_on</span>
              {{ t(profile.location) }} · {{ profile.age }} {{ t(ui.yo) }}
            </div>
            <div class="flex items-center gap-2 text-sm text-on-surface-variant">
              <span class="material-symbols-outlined text-[16px] text-primary">translate</span>
              <span v-for="(lng, i) in profile.languages" :key="i">
                {{ t(lng.name) }}
                <span class="text-xs text-on-surface-variant/60">{{ t(lng.level) }}</span>
                <span v-if="i < profile.languages.length - 1" class="mx-1 text-outline-variant">·</span>
              </span>
            </div>
          </div>

          <!-- Social links -->
          <div class="mt-4 flex flex-col gap-2">
            <div class="flex gap-2">
              <a :href="profile.email"
                 class="size-9 rounded-full border border-outline-variant/60 flex items-center justify-center text-on-surface-variant hover:border-primary hover:text-primary transition-all"
                 title="Email">
                <span class="material-symbols-outlined text-[18px]">mail</span>
              </a>
              <a :href="profile.linkedin" target="_blank" rel="noopener"
                 class="size-9 rounded-full border border-outline-variant/60 flex items-center justify-center text-on-surface-variant hover:border-primary hover:text-primary transition-all"
                 title="LinkedIn">
                <svg viewBox="0 0 16 16" class="size-[15px]" fill="currentColor">
                  <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854zm4.943 12.248V6.169H2.542v7.225zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248S2.4 3.226 2.4 3.934c0 .694.521 1.248 1.327 1.248zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016l.016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225z"/>
                </svg>
              </a>
              <a :href="profile.telegram" target="_blank" rel="noopener"
                 class="size-9 rounded-full border border-outline-variant/60 flex items-center justify-center text-on-surface-variant hover:border-primary hover:text-primary transition-all"
                 title="Telegram">
                <svg viewBox="0 0 16 16" class="size-[15px]" fill="currentColor">
                  <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M8.287 5.906q-1.168.486-4.666 2.01-.567.225-.595.442c-.03.243.275.339.69.47l.175.055c.408.133.958.288 1.243.294q.39.01.868-.32 3.269-2.206 3.374-2.23c.05-.012.12-.026.166.016s.042.12.037.141c-.03.129-1.227 1.241-1.846 1.817-.193.18-.33.307-.358.336a8 8 0 0 1-.188.186c-.38.366-.664.64.015 1.088.327.216.589.393.85.571.284.194.568.387.936.629q.14.092.27.187c.331.236.63.448.997.414.214-.02.435-.22.547-.82.265-1.417.786-4.486.906-5.751a1.4 1.4 0 0 0-.013-.315.34.34 0 0 0-.114-.217.53.53 0 0 0-.31-.093c-.3.005-.763.166-2.984 1.09"/>
                </svg>
              </a>
              <a :href="profile.whatsapp" target="_blank" rel="noopener"
                 class="size-9 rounded-full border border-outline-variant/60 flex items-center justify-center text-on-surface-variant hover:border-primary hover:text-primary transition-all"
                 title="WhatsApp">
                <svg viewBox="0 0 16 16" class="size-[15px]" fill="currentColor">
                  <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
                </svg>
              </a>
            </div>
            <!-- GitHub CTA -->
            <a :href="profile.github" target="_blank" rel="noopener"
               class="flex items-center justify-between gap-2 w-full px-4 py-2.5 rounded-lg bg-on-surface text-surface font-bold text-sm hover:opacity-85 active:scale-[.98] transition-all group">
              <div class="flex items-center gap-2">
                <svg viewBox="0 0 16 16" class="size-4 shrink-0" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"/>
                </svg>
                github.com/babasha
              </div>
              <span class="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">arrow_outward</span>
            </a>
          </div>
        </div>

      </div>

      <!-- Right column: scrollable -->
      <div class="w-2/3 flex flex-col gap-6 h-full overflow-y-auto pr-1" id="experience">

        <!-- Experience grid -->
        <div class="grid grid-cols-2 gap-6 shrink-0">
          <div
            v-for="item in featuredExp"
            :key="item.period"
            class="bg-surface-container-lowest rounded-xl p-8 border border-outline-variant/60 sahara-shadow flex flex-col relative overflow-hidden group"
          >
            <div class="absolute top-0 right-0 p-6 opacity-10 transform translate-x-4 -translate-y-4 transition-transform group-hover:scale-110 pointer-events-none">
              <span class="material-symbols-outlined text-[120px]">{{ item.bgIcon }}</span>
            </div>
            <div class="flex items-center gap-3 mb-6">
              <div class="size-10 rounded bg-surface-container flex items-center justify-center text-primary">
                <span class="material-symbols-outlined filled">work</span>
              </div>
              <div class="text-sm font-medium text-tertiary tracking-widest uppercase">{{ item.period }}</div>
            </div>
            <h3 class="font-headline text-3xl text-on-surface mb-2">{{ t(item.role) }}</h3>
            <h4 class="text-on-surface-variant font-medium text-lg mb-4">{{ t(item.company) }}</h4>
            <p class="text-on-surface-variant text-sm leading-relaxed mt-auto max-w-[85%]">{{ t(item.desc) }}</p>
          </div>
        </div>

        <!-- Skills -->
        <div class="bg-surface-container-lowest rounded-xl p-8 border border-outline-variant/60 sahara-shadow shrink-0" id="skills">
          <div class="flex items-center justify-between mb-5">
            <h3 class="font-headline text-2xl text-on-surface">{{ t(ui.skillsTitle) }}</h3>
            <span class="material-symbols-outlined text-primary">memory</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="skill in skills"
              :key="skill.label"
              :class="skill.highlight
                ? 'px-3 py-1.5 rounded-md bg-primary-fixed text-on-primary-fixed text-sm font-bold border border-primary-fixed-dim/40'
                : 'px-3 py-1.5 rounded-md bg-surface-container text-on-surface text-sm font-medium border border-outline-variant/40'"
            >{{ skill.label }}</span>
          </div>
        </div>

        <!-- Writing -->
        <div class="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/60 sahara-shadow shrink-0">
          <div class="flex items-center gap-3 mb-4">
            <span class="material-symbols-outlined text-primary text-[20px]">edit_note</span>
            <h3 class="font-headline text-2xl text-on-surface">{{ t(ui.writing) }}</h3>
            <span class="ml-auto text-xs font-medium text-on-surface-variant/50 tracking-widest uppercase">Habr</span>
          </div>
          <div class="flex flex-col gap-1">
            <a v-for="art in articles" :key="art.href"
               :href="art.href" target="_blank" rel="noopener"
               class="group flex items-start gap-3 p-3 rounded-lg hover:bg-surface-container transition-colors">
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-on-surface text-sm font-medium group-hover:text-primary transition-colors">{{ t(art.title) }}</span>
                  <span class="material-symbols-outlined text-[13px] text-outline-variant group-hover:text-primary transition-colors shrink-0">arrow_outward</span>
                </div>
                <p class="text-on-surface-variant text-xs mt-0.5 leading-relaxed">{{ t(art.desc) }}</p>
                <div class="flex gap-1 mt-1.5 flex-wrap">
                  <span v-for="tag in art.tags" :key="tag"
                    class="text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant/70 border border-outline-variant/30">{{ tag }}</span>
                </div>
              </div>
            </a>
          </div>
        </div>

        <!-- Pet Projects -->
        <div class="shrink-0">
          <div class="flex items-center gap-3 mb-4 px-1">
            <h3 class="font-headline text-2xl text-on-surface">{{ t(ui.projects) }}</h3>
            <span class="text-sm font-medium text-on-surface-variant tracking-widest uppercase">2024 — now</span>
          </div>
          <div class="grid grid-cols-2 gap-6">
            <a
              v-for="p in projects"
              :key="p.title"
              :href="p.links[0].href"
              target="_blank"
              rel="noopener"
              class="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/60 sahara-shadow flex flex-col gap-4 group hover:border-primary transition-colors"
            >
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-xs font-medium text-tertiary tracking-widest uppercase mb-1">{{ p.period }}</p>
                  <h4 class="font-headline text-xl text-on-surface group-hover:text-primary transition-colors">{{ p.title }}</h4>
                </div>
                <span class="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors text-[20px] mt-1">arrow_outward</span>
              </div>
              <p class="text-on-surface-variant text-sm leading-relaxed">{{ t(p.desc) }}</p>
              <div class="flex flex-wrap gap-2 mt-auto">
                <span v-for="tch in p.tech" :key="tch"
                  class="px-2 py-0.5 rounded text-xs font-mono text-on-surface-variant border border-outline-variant/40 bg-surface-container">
                  {{ tch }}
                </span>
              </div>
              <div class="flex gap-3 pt-1 border-t border-outline-variant/40">
                <a v-for="l in p.links" :key="l.label" :href="l.href"
                   target="_blank" rel="noopener"
                   @click.stop
                   class="text-xs font-medium text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1">
                  <span class="material-symbols-outlined text-[14px]">arrow_outward</span>
                  {{ l.label }}
                </a>
              </div>
            </a>
          </div>
        </div>

      </div>
    </main>
  </div>
</template>
