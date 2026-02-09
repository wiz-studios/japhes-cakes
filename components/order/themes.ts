export const orderThemes = {
    cake: {
        id: "cake",
        colors: {
            background: "bg-[linear-gradient(140deg,#fcf7fb_0%,#f4eef5_60%,#f0e8f1_100%)]",
            accent: "text-[var(--brand-magenta-deep)]",
            border: "border-[rgba(141,16,84,0.18)]",
            primary: "bg-[linear-gradient(135deg,#d82f7d,#a10f58)] text-white hover:brightness-95",
            ring: "ring-[rgba(216,47,125,0.35)]",
            subtle: "bg-[rgba(216,47,125,0.08)]",
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
            primary: "bg-[linear-gradient(135deg,#3a4ed8,#1c2b8f)] text-white hover:brightness-95",
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
