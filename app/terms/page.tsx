import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TermsPage() {
    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-4xl font-serif font-bold text-gray-900 mb-2">Terms of Service</h1>
                <p className="text-muted-foreground">Last updated: December 29, 2025</p>
            </div>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>1. Acceptance of Terms</CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-sm max-w-none">
                        <p>
                            By accessing and using the Japhe's Cakes & Pizzas website and services, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>2. Services</CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-sm max-w-none">
                        <p>
                            Japhe's Cakes & Pizzas provides online ordering services for cakes and pizzas with delivery and pickup options in Thika, Kenya and surrounding areas.
                        </p>
                        <ul>
                            <li>Orders are subject to availability</li>
                            <li>Delivery is available to specified zones only</li>
                            <li>Minimum order values may apply for certain areas</li>
                            <li>We reserve the right to refuse service at our discretion</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>3. Orders and Payment</CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-sm max-w-none">
                        <h4 className="font-semibold mt-4">Order Confirmation</h4>
                        <p>
                            All orders are subject to acceptance. We will confirm your order via the order tracking system. We reserve the right to cancel any order for any reason.
                        </p>

                        <h4 className="font-semibold mt-4">Payment Methods</h4>
                        <p>We accept the following payment methods:</p>
                        <ul>
                            <li><strong>M-Pesa:</strong> Payment must be completed before order preparation for delivery orders</li>
                            <li><strong>Cash:</strong> Payment on delivery or pickup</li>
                        </ul>

                        <h4 className="font-semibold mt-4">Pricing</h4>
                        <p>
                            All prices are in Kenyan Shillings (KES) and include applicable taxes. Delivery fees are additional and vary by zone. Prices are subject to change without notice.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>4. Delivery and Pickup</CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-sm max-w-none">
                        <h4 className="font-semibold mt-4">Delivery</h4>
                        <ul>
                            <li>Delivery times are estimates and not guaranteed</li>
                            <li>You must be available to receive the order at the specified address</li>
                            <li>We are not responsible for delays due to incorrect addresses or unavailability</li>
                            <li>Delivery fees are non-refundable</li>
                        </ul>

                        <h4 className="font-semibold mt-4">Pickup</h4>
                        <ul>
                            <li>Pickup orders must be collected from our Thika branch</li>
                            <li>Please bring your order confirmation</li>
                            <li>Uncollected orders may be cancelled after 2 hours</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>5. Cancellations and Refunds</CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-sm max-w-none">
                        <h4 className="font-semibold mt-4">Cancellation Policy</h4>
                        <p>
                            Orders can be cancelled within 30 minutes of placement. After this time, cancellations are subject to approval and may incur charges.
                        </p>

                        <h4 className="font-semibold mt-4">Refunds</h4>
                        <p>
                            Refunds are issued at our discretion for:
                        </p>
                        <ul>
                            <li>Cancelled orders (within allowed timeframe)</li>
                            <li>Quality issues reported within 1 hour of delivery/pickup</li>
                            <li>Non-delivery of confirmed orders</li>
                        </ul>
                        <p>
                            Refunds are processed within 5-7 business days via the original payment method.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>6. Product Quality</CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-sm max-w-none">
                        <p>
                            We strive to provide high-quality products. If you are not satisfied with your order, please contact us immediately. Claims must be made within 1 hour of delivery/pickup with photographic evidence.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>7. Allergies and Dietary Requirements</CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-sm max-w-none">
                        <p>
                            While we make every effort to accommodate dietary requirements, we cannot guarantee that our products are free from allergens. Please inform us of any allergies when ordering.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>8. Intellectual Property</CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-sm max-w-none">
                        <p>
                            All content on this website, including text, graphics, logos, and images, is the property of Japhe's Cakes & Pizzas and protected by copyright laws.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>9. Limitation of Liability</CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-sm max-w-none">
                        <p>
                            Japhe's Cakes & Pizzas shall not be liable for any indirect, incidental, or consequential damages arising from the use of our services or products.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>10. Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-sm max-w-none">
                        <p>
                            For questions about these Terms of Service, please contact us:
                        </p>
                        <ul>
                            <li><strong>Location:</strong> Thika, Kenya</li>
                            <li><strong>Phone:</strong> +254 700 000 000</li>
                            <li><strong>Email:</strong> info@japhes.com</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
