export const orderThemes = {
    cake: {
        id: "cake",
        colors: {
            background: "bg-[#FDFBF7]", // Warm ivory
            accent: "text-rose-600",
            border: "border-rose-200",
            primary: "bg-rose-600 hover:bg-rose-700",
            ring: "ring-rose-200",
            subtle: "bg-rose-50",
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
            background: "bg-white",
            accent: "text-orange-600",
            border: "border-orange-200",
            primary: "bg-orange-600 hover:bg-orange-700",
            ring: "ring-orange-200",
            subtle: "bg-orange-50",
        },
        fonts: {
            heading: "font-sans tracking-tight",
            body: "font-sans",
        },
        animation: {
            hover: "hover:shadow-orange-100",
        }
    }
}

export type OrderTheme = typeof orderThemes.cake
