"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

interface TechItem {
  name: string;
  glowColor: string;
  icon: (colorClass: string) => React.ReactNode;
}

const techItems: TechItem[] = [
  {
    name: "Next.js",
    glowColor: "group-hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]",
    icon: (cls) => (
      <svg className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 ${cls}`} viewBox="0 0 180 180" fill="none">
        <circle cx="90" cy="90" r="86" fill="#000000" className="stroke-[#99999f] group-hover:stroke-white transition-colors duration-300" strokeWidth="8" />
        <path d="M54 48h14v84H54z" className="fill-[#99999f] group-hover:fill-white transition-colors duration-300" />
        <path d="M112 48h14v52h-14z" className="fill-[#99999f] group-hover:fill-white transition-colors duration-300" />
        <path d="M60 48l74 98c4.2-2.8 8-6 11.4-9.6L68 48H60z" fill="url(#next_diag_grad)" />
        <defs>
          <linearGradient id="next_diag_grad" x1="60" y1="48" x2="140" y2="146" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffffff" />
            <stop offset="0.6" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0.1" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  {
    name: "React",
    glowColor: "group-hover:drop-shadow-[0_0_15px_rgba(0,216,255,0.8)]",
    icon: (cls) => (
      <svg className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 ${cls}`} viewBox="-11.5 -10.23174 23 20.46348" fill="none">
        <circle cx="0" cy="0" r="2.2" className="fill-[#99999f] group-hover:fill-[#00D8FF] transition-colors duration-300" />
        <g className="stroke-[#99999f] group-hover:stroke-[#00D8FF] transition-colors duration-300" strokeWidth="1.7" fill="none">
          <ellipse rx="10.5" ry="4.2" />
          <ellipse rx="10.5" ry="4.2" transform="rotate(60)" />
          <ellipse rx="10.5" ry="4.2" transform="rotate(120)" />
        </g>
      </svg>
    ),
  },
  {
    name: "TypeScript",
    glowColor: "group-hover:drop-shadow-[0_0_15px_rgba(49,120,198,0.8)]",
    icon: (cls) => (
      <svg className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 ${cls}`} viewBox="0 0 24 24" fill="none">
        <rect
          width="24"
          height="24"
          rx="3.2"
          className="fill-[#99999f] group-hover:fill-[#3178C6] transition-colors duration-300"
        />
        <path
          d="M3.375 9.938h9.563v2.166H9.506v9.646H6.789v-9.646H3.375z"
          className="fill-[#030303] group-hover:fill-white transition-colors duration-300"
        />
        <path
          d="M18.488 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 0 1 1.306.34v2.458a3.95 3.95 0 0 0-.643-.361 5.093 5.093 0 0 0-.717-.26 5.453 5.453 0 0 0-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 0 0-.623.242c-.17.104-.3.229-.393.374a.888.888 0 0 0-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444s.423.276.696.41c.273.135.582.274.926.416.47.197.892.407 1.266.628.374.222.695.473.963.753.268.279.472.598.614.957.142.359.214.776.214 1.253 0 .657-.125 1.21-.373 1.656a3.033 3.033 0 0 1-1.012 1.085 4.38 4.38 0 0 1-1.487.596c-.566.12-1.163.18-1.79.18a9.916 9.916 0 0 1-1.84-.164 5.544 5.544 0 0 1-1.512-.493v-2.63a5.033 5.033 0 0 0 3.237 1.2c.333 0 .624-.03.872-.09.249-.06.456-.144.623-.25.166-.108.29-.234.373-.38a1.023 1.023 0 0 0-.074-1.089 2.12 2.12 0 0 0-.537-.5 5.597 5.597 0 0 0-.807-.444 27.72 27.72 0 0 0-1.007-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.614.123-1.141.369-1.582.246-.441.58-.804 1.004-1.089a4.494 4.494 0 0 1 1.47-.629 7.536 7.536 0 0 1 1.77-.201z"
          className="fill-[#030303] group-hover:fill-white transition-colors duration-300"
        />
      </svg>
    ),
  },
  {
    name: "Tailwind",
    glowColor: "group-hover:drop-shadow-[0_0_15px_rgba(0,188,242,0.8)]",
    icon: (cls) => (
      <svg className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 ${cls}`} viewBox="0 0 24 24" fill="none">
        <path
          d="M12.001 4.8c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624C13.666 10.618 15.027 12 18.001 12c3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C16.337 6.182 14.976 4.8 12.001 4.8zm-6 7.2c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624 1.177 1.194 2.538 2.576 5.512 2.576 3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C10.337 13.382 8.976 12 6.001 12z"
          className="fill-[#99999f] group-hover:fill-[#00BCF2] transition-colors duration-300"
        />
      </svg>
    ),
  },
  {
    name: "shadcn/ui",
    glowColor: "group-hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]",
    icon: (cls) => (
      <svg className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 ${cls}`} viewBox="0 0 256 256" fill="none">
        <g className="stroke-[#99999f] group-hover:stroke-white transition-colors duration-300" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32">
          <line x1="208" y1="128" x2="128" y2="208" />
          <line x1="192" y1="40" x2="40" y2="192" />
        </g>
      </svg>
    ),
  },
  {
    name: "Node.js",
    glowColor: "group-hover:drop-shadow-[0_0_15px_rgba(104,160,99,0.8)]",
    icon: (cls) => (
      <svg className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 ${cls}`} viewBox="0 0 512 576" fill="none">
        <path
          d="M256 12C248.8 12 241.8 13.9 235.6 17.5L37.8 131.7C25.4 138.9 17.8 152 17.8 166.4V394.8C17.8 409.2 25.4 422.3 37.8 429.5L235.6 543.7C241.8 547.3 248.8 549.2 256 549.2C263.2 549.2 270.2 547.3 276.4 543.7L474.2 429.5C486.6 422.3 494.2 409.2 494.2 394.8V166.4C494.2 152 486.6 138.9 474.2 131.7L276.4 17.5C270.2 13.9 263.2 12 256 12Z"
          className="fill-[#71717a] group-hover:fill-[#539E43] transition-colors duration-300"
        />
        <path
          d="M256 12L474.2 131.7C486.6 138.9 494.2 152 494.2 166.4L372 237L256 12Z"
          className="fill-[#52525b] group-hover:fill-[#3e7b32] transition-colors duration-300"
        />
        <path
          d="M256 549.2L37.8 429.5C25.4 422.3 17.8 409.2 17.8 394.8L140 324.2L256 549.2Z"
          className="fill-[#52525b] group-hover:fill-[#3e7b32] transition-colors duration-300"
        />
        <path
          d="M494.2 166.4V394.8C494.2 409.2 486.6 422.3 474.2 429.5L372 237L494.2 166.4Z"
          className="fill-[#5c5c66] group-hover:fill-[#46883c] transition-colors duration-300"
        />
        <path
          d="M17.8 394.8V166.4C17.8 152 25.4 138.9 37.8 131.7L140 324.2L17.8 394.8Z"
          className="fill-[#5c5c66] group-hover:fill-[#46883c] transition-colors duration-300"
        />
        <path
          d="M256 12L372 237L474.2 429.5L256 549.2L140 324.2L37.8 131.7L256 12Z"
          className="fill-[#8a8a93] group-hover:fill-[#68A063] transition-colors duration-300"
        />
      </svg>
    ),
  },
  {
    name: "Python",
    glowColor: "group-hover:drop-shadow-[0_0_15px_rgba(55,118,171,0.8)]",
    icon: (cls) => (
      <svg className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 ${cls}`} viewBox="0 0 110 110" fill="none">
        <path
          d="M54.5 2C30 2 31.5 12.6 31.5 12.6l.03 11H55v3.3H18.8S2 25 2 49.5c0 24.5 13.6 23.7 13.6 23.7h8.1v-11.4s-.4-13.6 13.3-13.6h23S72.8 48 72.8 35.4V12.6S74.8 2 54.5 2zm-13 7.4a4.2 4.2 0 1 1 0 8.4 4.2 4.2 0 0 1 0-8.4z"
          className="fill-[#9ca3af] group-hover:fill-[#3776AB] transition-colors duration-300"
        />
        <path
          d="M55.5 108c24.5 0 23-10.6 23-10.6l-.03-11H55v-3.3h36.2s16.8 1.9 16.8-22.6c0-24.5-13.6-23.7-13.6-23.7h-8.1v11.4s.4 13.6-13.3 13.6h-23S37.2 62 37.2 74.6v22.8s-2 10.6 18.3 10.6zm13-7.4a4.2 4.2 0 1 1 0-8.4 4.2 4.2 0 0 1 0 8.4z"
          className="fill-[#6b7280] group-hover:fill-[#FFD438] transition-colors duration-300"
        />
      </svg>
    ),
  },
  {
    name: "FastAPI",
    glowColor: "group-hover:drop-shadow-[0_0_15px_rgba(0,150,136,0.8)]",
    icon: (cls) => (
      <svg className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 ${cls}`} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm.83 4.267v5.547h3.837L9.333 19.733v-5.547H5.5L12.83 4.267z"
          className="fill-[#99999f] group-hover:fill-[#009688] transition-colors duration-300"
        />
      </svg>
    ),
  },
  {
    name: "MongoDB",
    glowColor: "group-hover:drop-shadow-[0_0_15px_rgba(19,170,82,0.8)]",
    icon: (cls) => (
      <svg className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 ${cls}`} viewBox="0 0 64 128" fill="none">
        <path
          d="M32 4C32 4 4 36 4 66C4 88 19 105 31 110V4H32Z"
          className="fill-[#9ca3af] group-hover:fill-[#13AA52] transition-colors duration-300"
        />
        <path
          d="M32 4V110C45 105 60 88 60 66C60 36 32 4 32 4Z"
          className="fill-[#6b7280] group-hover:fill-[#0F8C43] transition-colors duration-300"
        />
        <path
          d="M31 110L29.5 125C29.5 126.5 30.5 128 32 128C33.5 128 34.5 126.5 34.5 125L33 110H31Z"
          className="fill-[#a1a1aa] group-hover:fill-[#c4beaf] transition-colors duration-300"
        />
      </svg>
    ),
  },
  {
    name: "Qdrant",
    glowColor: "group-hover:drop-shadow-[0_0_15px_rgba(220,36,76,0.8)]",
    icon: (cls) => (
      <svg className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 ${cls}`} viewBox="0 0 256 296" fill="none">
        {/* Top Facets (Light Coral / Pink) */}
        <polygon points="128,0 256,73.9 212.5,99 128,50.3 43.5,99 0,73.9" className="fill-[#8a8a93] group-hover:fill-[#FE4C65] transition-colors duration-300" />
        <polygon points="128,100.5 168.9,124.2 128,147.8 87.1,124.2" className="fill-[#8a8a93] group-hover:fill-[#FE4C65] transition-colors duration-300" />

        {/* Left Facets (Medium Crimson / Magenta) */}
        <polygon points="0,73.9 43.5,99 43.5,196.6 85.8,221 85.8,271.9 43.5,247.5 0,221.7" className="fill-[#71717a] group-hover:fill-[#DC244C] transition-colors duration-300" />
        <polygon points="43.5,247.5 85.8,271.9 128,295.6 128,245.3 85.8,221 43.5,196.6" className="fill-[#71717a] group-hover:fill-[#DC244C] transition-colors duration-300" />
        <polygon points="87.1,124.2 128,147.8 128,195.1 87.1,171.4" className="fill-[#71717a] group-hover:fill-[#DC244C] transition-colors duration-300" />

        {/* Right Facets & Vertical Stem (Dark Ruby / Deep Crimson) */}
        <polygon points="256,73.9 256,270.5 212.5,295.6 212.5,99" className="fill-[#52525b] group-hover:fill-[#B01032] transition-colors duration-300" />
        <polygon points="128,147.8 168.9,124.2 168.9,171.4 128,195.1" className="fill-[#52525b] group-hover:fill-[#B01032] transition-colors duration-300" />
        <polygon points="128,245.3 168.9,221.7 168.9,272 128,295.6" className="fill-[#52525b] group-hover:fill-[#B01032] transition-colors duration-300" />
      </svg>
    ),
  },
  {
    name: "Redis",
    glowColor: "group-hover:drop-shadow-[0_0_15px_rgba(216,44,32,0.8)]",
    icon: (cls) => (
      <svg className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 ${cls}`} viewBox="0 0 100 100" fill="none">
        {/* Bottom Slab */}
        <path d="M8 73 L48 93 Q50 94 50 95 L50 98 Q50 99 48 98 L9 80 Q7 79 7 77 L7 74 Q7 72 8 73Z" className="fill-[#52525b] group-hover:fill-[#8E1B13] transition-colors duration-300" />
        <path d="M50 95 Q50 94 52 93 L92 73 Q93 72 93 74 L93 77 Q93 79 91 80 L52 98 Q50 99 50 98Z" className="fill-[#45454c] group-hover:fill-[#72150D] transition-colors duration-300" />
        <path d="M8 71 C6 70 6 68 8 67 L46 48 C49 46 51 46 54 48 L92 67 C94 68 94 70 92 71 L54 90 C51 92 49 92 46 90 Z" className="fill-[#71717a] group-hover:fill-[#A41E12] transition-colors duration-300" />

        {/* Middle Slab */}
        <path d="M8 55 L48 75 Q50 76 50 77 L50 80 Q50 81 48 80 L9 62 Q7 61 7 59 L7 56 Q7 54 8 55Z" className="fill-[#52525b] group-hover:fill-[#8E1B13] transition-colors duration-300" />
        <path d="M50 77 Q50 76 52 75 L92 55 Q93 54 93 56 L93 59 Q93 61 91 62 L52 80 Q50 81 50 80Z" className="fill-[#45454c] group-hover:fill-[#72150D] transition-colors duration-300" />
        <path d="M8 53 C6 52 6 50 8 49 L46 30 C49 28 51 28 54 30 L92 49 C94 50 94 52 92 53 L54 72 C51 74 49 74 46 72 Z" className="fill-[#71717a] group-hover:fill-[#A41E12] transition-colors duration-300" />

        {/* Top Slab */}
        <path d="M8 37 L48 57 Q50 58 50 59 L50 62 Q50 63 48 62 L9 44 Q7 43 7 41 L7 38 Q7 36 8 37Z" className="fill-[#52525b] group-hover:fill-[#8E1B13] transition-colors duration-300" />
        <path d="M50 59 Q50 58 52 57 L92 37 Q93 36 93 38 L93 41 Q93 43 91 44 L52 62 Q50 63 50 62Z" className="fill-[#45454c] group-hover:fill-[#72150D] transition-colors duration-300" />
        <path d="M8 35 C6 34 6 32 8 31 L46 12 C49 10 51 10 54 12 L92 31 C94 32 94 34 92 35 L54 54 C51 56 49 56 46 54 Z" className="fill-[#8a8a93] group-hover:fill-[#D82C20] transition-colors duration-300" />

        {/* Top Symbols */}
        {/* 1. Circle / Oval */}
        <ellipse cx="30" cy="29" rx="10" ry="5.5" transform="rotate(-15 30 29)" className="fill-[#f4f4f5] group-hover:fill-[#FFFFFF] transition-colors duration-300" />
        {/* 2. Star */}
        <path d="M50 15 L52.2 19.5 L57 20 L53.5 23.5 L54.5 28.5 L50 26 L45.5 28.5 L46.5 23.5 L43 20 L47.8 19.5 Z" transform="scale(0.9 0.65) translate(5, 7)" className="fill-[#f4f4f5] group-hover:fill-[#FFFFFF] transition-colors duration-300" />
        {/* 3. Triangle */}
        <polygon points="40,43 55,34 54,45" className="fill-[#f4f4f5] group-hover:fill-[#FFFFFF] transition-colors duration-300" />
        {/* 4. Square Cutout */}
        <polygon points="68,23 81,29 71,37 59,30" className="fill-[#3f3f46] group-hover:fill-[#7F130B] transition-colors duration-300" />
        <polygon points="59,30 71,37 71,41 59,34" className="fill-[#27272a] group-hover:fill-[#4A0A06] transition-colors duration-300" />
      </svg>
    ),
  },
  {
    name: "OpenAI",
    glowColor: "group-hover:drop-shadow-[0_0_15px_rgba(16,163,127,0.8)]",
    icon: (cls) => (
      <svg className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 ${cls}`} viewBox="0 0 24 24" fill="none">
        <path
          d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"
          className="fill-[#99999f] group-hover:fill-[#10A37F] transition-colors duration-300"
        />
      </svg>
    ),
  },
];

// Duplicate items 4 times to ensure seamless continuous looping
const duplicatedItems = [...techItems, ...techItems, ...techItems, ...techItems];

export function TechMarquee() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="relative z-10 w-full overflow-hidden mt-auto pt-10 pb-6 border-t border-white/5">
      <div
        className="flex overflow-hidden relative w-full"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Generous edge gradient fade overlays */}
        <div className="absolute left-0 top-0 bottom-0 w-28 sm:w-48 md:w-64 bg-gradient-to-r from-[#030303] via-[#030303]/90 to-transparent z-20 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-28 sm:w-48 md:w-64 bg-gradient-to-l from-[#030303] via-[#030303]/90 to-transparent z-20 pointer-events-none" />

        {/* Infinite rolling strip */}
        <motion.div
          className="flex gap-8 sm:gap-11 md:gap-14 shrink-0 items-center py-3"
          animate={{ x: ["0%", "-25%"] }}
          transition={{
            repeat: Infinity,
            ease: "linear",
            duration: isHovered ? 90 : 50,
          }}
        >
          {duplicatedItems.map((item, idx) => (
            <div
              key={`${item.name}-${idx}`}
              className={`group flex items-center gap-3 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl transition-all duration-300 cursor-pointer select-none ${item.glowColor}`}
            >
              <div className="shrink-0 transition-transform duration-300 group-hover:scale-110">
                {item.icon("")}
              </div>
              <span className="font-semibold text-base sm:text-lg md:text-xl tracking-tight font-sans whitespace-nowrap text-[#99999f] transition-colors duration-300 group-hover:text-white">
                {item.name}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
