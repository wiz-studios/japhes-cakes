export default function StatusLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="container mx-auto px-4 py-8 max-w-lg">
            {children}
        </div>
    )
}
