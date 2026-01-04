import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function PrivacyPage() {
    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-4xl font-serif font-bold text-gray-900 mb-2">Privacy Policy</h1>
                <p className="text-muted-foreground">Last updated: December 29, 2025</p>
            </div>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>1. Introduction</CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-sm max-w-none">
                        <p>
                            Japhe's Cakes & Pizzas ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>2. Information We Collect</CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-sm max-w-none">
                        <h4 className="font-semibold mt-4">Personal Information</h4>
                        <p>When you place an order, we collect:</p>
                        <ul>
                            <li>Name</li>
                            <li>Phone number</li>
                            <li>Delivery address (for delivery orders)</li>
                            <li>M-Pesa phone number (for M-Pesa payments)</li>
                        </ul>

                        <h4 className="font-semibold mt-4">Order Information</h4>
                        <ul>
                            <li>Order details (items, quantities, preferences)</li>
                            <li>Order date and time</li>
                            <li>Payment method and status</li>
                            <li>Delivery/pickup preferences</li>
                        </ul>

                        <h4 className="font-semibold mt-4">Technical Information</h4>
                        <ul>
                            <li>IP address</li>
                            <li>Browser type and version</li>
                            <li>Device information</li>
                            <li>Usage data and analytics</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>3. How We Use Your Information</CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-sm max-w-none">
                        <p>We use your information to:</p>
                        <ul>
                            <li>Process and fulfill your orders</li>
                            <li>Communicate with you about your orders</li>
                            <li>Process payments securely</li>
                            <li>Improve our services and customer experience</li>
                            <li>Send order confirmations and updates</li>
                            <li>Respond to customer service requests</li>
                            <li>Comply with legal obligations</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>4. Data Storage and Security</CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-sm max-w-none">
                        <h4 className="font-semibold mt-4">Storage</h4>
                        <p>
                            Your data is stored securely using Supabase, a trusted cloud database provider. We implement industry-standard security measures to protect your information.
                        </p>

                        <h4 className="font-semibold mt-4">Security Measures</h4>
                        <ul>
                            <li>Encrypted data transmission (HTTPS)</li>
                            <li>Secure database access controls</li>
                            <li>Regular security audits</li>
                            <li>Limited employee access to personal data</li>
                        </ul>

                        <h4 className="font-semibold mt-4">Data Retention</h4>
                        <p>
                            We retain your information for as long as necessary to provide our services and comply with legal obligations. Order history is kept for accounting and customer service purposes.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>5. Information Sharing</CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-sm max-w-none">
                        <p>We do not sell your personal information. We may share your information with:</p>

                        <h4 className="font-semibold mt-4">Service Providers</h4>
                        <ul>
                            <li><strong>Payment Processors:</strong> M-Pesa for processing payments</li>
                            <li><strong>Delivery Partners:</strong> For order fulfillment (delivery address only)</li>
                            <li><strong>Cloud Services:</strong> Supabase for data storage</li>
                        </ul>

                        <h4 className="font-semibold mt-4">Legal Requirements</h4>
                        <p>
                            We may disclose your information if required by law or to protect our rights, property, or safety.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>6. Your Rights</CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-sm max-w-none">
                        <p>You have the right to:</p>
                        <ul>
                            <li><strong>Access:</strong> Request a copy of your personal data</li>
                            <li><strong>Correction:</strong> Request correction of inaccurate data</li>
                            <li><strong>Deletion:</strong> Request deletion of your data (subject to legal requirements)</li>
                            <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
                            <li><strong>Data Portability:</strong> Request your data in a portable format</li>
                        </ul>
                        <p>
                            To exercise these rights, please contact us using the information below.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>7. Cookies and Tracking</CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-sm max-w-none">
                        <p>
                            We use cookies and similar technologies to improve your experience, analyze usage, and remember your preferences. You can control cookies through your browser settings.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>8. Third-Party Links</CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-sm max-w-none">
                        <p>
                            Our website may contain links to third-party websites. We are not responsible for the privacy practices of these websites. Please review their privacy policies.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>9. Children's Privacy</CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-sm max-w-none">
                        <p>
                            Our services are not intended for children under 18. We do not knowingly collect information from children. If you believe we have collected information from a child, please contact us immediately.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>10. Changes to This Policy</CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-sm max-w-none">
                        <p>
                            We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated "Last updated" date. Continued use of our services constitutes acceptance of the updated policy.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>11. Contact Us</CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-sm max-w-none">
                        <p>
                            If you have questions about this Privacy Policy or wish to exercise your rights, please contact us:
                        </p>
                        <ul>
                            <li><strong>Location:</strong> Thika, Kenya</li>
                            <li><strong>Phone:</strong> +254 700 000 000</li>
                            <li><strong>Email:</strong> privacy@japhes.com</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
