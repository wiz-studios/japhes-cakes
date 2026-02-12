export const orderThemes = {
    cake: {
        id: "cake",
        colors: {
            background: "bg-[linear-gradient(138deg,#fff4fc_0%,#f8e9ff_30%,#efe0ff_58%,#e3ddff_78%,#d6e2ff_100%)]",
            accent: "text-[#7a1f86]",
            border: "border-[rgba(122,31,134,0.2)]",
            primary: "bg-[#7a1f86] text-white hover:bg-[#6a1a75]",
            ring: "ring-[rgba(122,31,134,0.34)]",
            subtle: "bg-[rgba(93,88,216,0.1)]",
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
