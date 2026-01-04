import dynamic from "next/dynamic"
const HomeHero = dynamic(() => import("@/components/HomeHero"))

export default function HomePage() {
  return <HomeHero />
}
