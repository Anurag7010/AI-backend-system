'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import {
  FileText, Search, Brain, Zap, Database, MessageSquare, Cpu, Globe,
  BookOpen, Archive, Filter, Layers, Code, Server, Eye, LinkIcon,
  Flame, Sparkle, ArrowUpRight,
} from 'lucide-react'
import { SpotlightCard, CountUp } from '@/components/ui/motion'
import { EASE_ENTRANCE, DURATION } from '@/lib/motion'

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4'

const MARQUEE_ROW_1 = [FileText, Search, Brain, Zap, Database, MessageSquare, Cpu, Globe]
const MARQUEE_ROW_2 = [BookOpen, Archive, Filter, Layers, Code, Server, Eye, LinkIcon]

const TIMELINE = [
  { label: 'RAG Pipeline', items: ['Document Ingestion', 'Vector Search'] },
  { label: 'ReAct Agent', items: ['Multi-step Reasoning', 'Tool Dispatch'] },
  { label: 'Memory Store', items: ['User Facts', 'Conversation Context'] },
]

function StaggeredCard({ children, index, className }: { children: React.ReactNode; index: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{
        duration: DURATION.base,
        ease: EASE_ENTRANCE,
        delay: index * 0.1,
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function FeaturesBento() {
  return (
    <div className="min-h-screen bg-[#252323] px-4 sm:px-6 md:px-10 lg:px-14 py-6 sm:py-8 md:py-10">
      {/* Header row */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[28px] sm:text-3xl md:text-4xl lg:text-[44px] text-[#F5F1ED] font-medium tracking-tight">
            Your Intelligence. Fully Forged.
          </h1>
          <p className="text-[#70798C] text-sm md:text-[15px] leading-[1.6] max-w-3xl mt-3">
            PrometheonAI — a RAG-powered intelligence engine that ingests documents, reasons across
            them, and delivers answers with the precision of divine foresight. Built for organizations
            who believe knowledge is power.
          </p>
        </div>
        <Link
          href="/chat"
          className="liquid-glass rounded-full px-6 py-2.5 text-[#F5F1ED] text-sm font-medium hover:bg-[#F5F1ED]/10 transition-colors shrink-0 inline-flex items-center gap-2"
        >
          Enter the Forge
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {/* Col 1 — System Background Card */}
        <StaggeredCard index={0} className="lg:row-span-2">
          <div className="rounded-2xl bg-[#252323] noise-overlay relative overflow-hidden h-full min-h-[400px]">
            <video
              src={VIDEO_URL}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
            <div className="relative z-10 p-5 md:p-6 flex flex-col h-full">
              {/* Top label */}
              <div className="flex items-center justify-center gap-2 mb-auto">
                <Flame className="w-4 h-4 text-[#F5F1ED]/70" />
                <span className="uppercase tracking-[0.22em] text-[11px] text-[#F5F1ED]/70">
                  Prometheus Protocol
                </span>
                <Flame className="w-4 h-4 text-[#F5F1ED]/70" />
              </div>

              {/* System timeline */}
              <div className="mt-auto space-y-3">
                {TIMELINE.map((row, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-[#F5F1ED] font-medium whitespace-nowrap">{row.label}</span>
                    <Sparkle className="h-3 w-3 text-[#A99985] shrink-0" />
                    {row.items.map((item, j) => (
                      <span key={j} className="text-[#70798C] whitespace-nowrap">
                        {item}{j < row.items.length - 1 ? ' · ' : ''}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </StaggeredCard>

        {/* Col 2 Top — Testimonial card */}
        <StaggeredCard index={1}>
          <SpotlightCard className="rounded-2xl bg-[#A99985]/10 p-5 md:p-6 noise-overlay liquid-glass h-full">
            <div className="flex items-center gap-2 mb-4">
              <Sparkle className="w-3 h-3 text-[#A99985]" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#A99985]">Architect Voice</span>
              <Sparkle className="w-3 h-3 text-[#A99985]" />
            </div>
            <p className="text-[#F5F1ED]/80 text-sm leading-relaxed mb-4">
              &ldquo;PrometheonAI transformed how our legal team processes discovery. Documents that took
              days to review now surface answers in seconds. The mythological framing is not just
              aesthetic — it feels genuinely powerful.&rdquo;
            </p>
            <p className="text-[#A99985] text-xs">
              <strong className="text-[#F5F1ED]">Dr. Aisha Nkosi</strong> — Chief Legal Officer, Meridian Group
            </p>
          </SpotlightCard>
        </StaggeredCard>

        {/* Col 2 Bottom — Stats card */}
        <StaggeredCard index={2}>
          <div className="rounded-2xl bg-black p-6 md:p-8 relative overflow-hidden h-full flex flex-col items-center justify-center text-center min-h-[200px]">
            <div
              className="absolute inset-0 opacity-20"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(218,210,188,0.3) 0%, transparent 70%)',
              }}
            />
            <div className="relative z-10">
              <CountUp
                to={34000}
                suffix="+"
                className="text-5xl sm:text-6xl md:text-7xl lg:text-[88px] font-light tracking-tight text-[#F5F1ED]"
              />
              <p className="text-[#70798C] text-sm mt-3">Documents ingested</p>
            </div>
          </div>
        </StaggeredCard>

        {/* Col 3 Top — Capabilities card */}
        <StaggeredCard index={3}>
          <div className="rounded-2xl bg-black relative overflow-hidden min-h-[260px]">
            <video
              src={VIDEO_URL}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/90" />
            <div className="relative z-10 p-5 md:p-6 flex flex-col h-full">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#F5F1ED]/60 mb-auto">
                Forge Capabilities
              </p>

              {/* Marquee rows */}
              <div className="space-y-3 mt-6">
                <div
                  className="overflow-hidden"
                  style={{
                    maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
                  }}
                >
                  <div className="flex gap-3 animate-marquee-left" style={{ width: 'max-content' }}>
                    {[...MARQUEE_ROW_1, ...MARQUEE_ROW_1].map((Icon, i) => (
                      <div key={i} className="liquid-glass rounded-xl h-14 w-14 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-[#F5F1ED]/60" />
                      </div>
                    ))}
                  </div>
                </div>
                <div
                  className="overflow-hidden"
                  style={{
                    maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
                  }}
                >
                  <div className="flex gap-3 animate-marquee-right" style={{ width: 'max-content' }}>
                    {[...MARQUEE_ROW_2, ...MARQUEE_ROW_2].map((Icon, i) => (
                      <div key={i} className="liquid-glass rounded-xl h-14 w-14 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-[#F5F1ED]/60" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </StaggeredCard>

        {/* Col 3 Bottom — Contact/CTA */}
        <StaggeredCard index={4}>
          <SpotlightCard className="rounded-2xl bg-[#A99985]/10 p-5 md:p-6 noise-overlay liquid-glass h-full relative">
            <div className="absolute top-4 right-4">
              <Link
                href="/chat"
                className="rounded-full h-9 w-9 flex items-center justify-center bg-[#F5F1ED]/10 hover:bg-[#F5F1ED]/20 transition-colors"
              >
                <ArrowUpRight className="w-4 h-4 text-[#F5F1ED]" />
              </Link>
            </div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#A99985]">Start Using</span>
            <h3 className="text-[#F5F1ED] text-xl font-medium mt-3 mb-2">Enter the Forge</h3>
            <p className="text-[#70798C] text-sm mb-4">Start asking questions and explore the full power of PrometheonAI.</p>
            <div className="flex flex-col gap-2">
              <Link
                href="/chat"
                className="bg-[#F5F1ED] text-[#252323] rounded-full px-5 py-2 text-sm font-medium text-center hover:shadow-[0_0_20px_rgba(218,210,188,0.3)] transition-all"
              >
                Enter the Forge
              </Link>
              <Link
                href="/"
                className="text-[#A99985] text-sm text-center hover:text-[#F5F1ED] transition-colors"
              >
                Read the Manifesto
              </Link>
            </div>
          </SpotlightCard>
        </StaggeredCard>
      </div>
    </div>
  )
}
