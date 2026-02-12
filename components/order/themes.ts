export const orderThemes = {
    cake: {
        id: "cake",
        colors: {
            background: "bg-[linear-gradient(138deg,#fae9ff_0%,#f1dbff_30%,#e4cfff_58%,#cfd4ff_78%,#bfd3ff_100%)]",
            accent: "text-[#6d177f]",
            border: "border-[rgba(109,23,127,0.28)]",
            primary: "bg-[#6d177f] text-white hover:bg-[#5b136a]",
            ring: "ring-[rgba(109,23,127,0.42)]",
            subtle: "bg-[rgba(93,88,216,0.16)]",
        },
        fonts: {
            heading: "font-serif",
            body: "font-sans",
        },
        animation: {
            hover: "hover:shadow-rose-100",
        }
    },
    pizza: {
        id: "pizza",
        colors: {
            background: "bg-[linear-gradient(140deg,#f3f6ff_0%,#f0f1fb_60%,#eceff7_100%)]",
            accent: "text-[var(--brand-blue-deep)]",
            border: "border-[rgba(46,70,175,0.2)]",
            primary: "bg-[var(--brand-blue-deep)] text-white hover:brightness-95",
            ring: "ring-[rgba(58,78,216,0.35)]",
            subtle: "bg-[rgba(58,78,216,0.08)]",
        },
        fonts: {
            heading: "font-serif",
            body: "font-sans",
        },
        animation: {
            hover: "hover:shadow-orange-100",
        }
    }
}

export type OrderTheme = typeof orderThemes.cake
