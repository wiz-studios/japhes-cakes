const { createClient } = require('@supabase/supabase-js')
// require('dotenv').config({ path: '.env.local' })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: Required environment variables NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are missing.')
    process.exit(1)
}

if (!process.env.DELIVERY_EMAIL || !process.env.DELIVERY_PASSWORD) {
    console.error('Error: DELIVERY_EMAIL and DELIVERY_PASSWORD must be set in .env.local')
    process.exit(1)
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
)

async function createDeliveryUser() {
    const email = process.env.DELIVERY_EMAIL
    const password = process.env.DELIVERY_PASSWORD

    console.log(`Creating delivery user: ${email}`)

    // 1. Create User with 'delivery' role metadata
    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
            role: 'delivery',
            full_name: 'Delivery Staff'
        }
    })

    if (error) {
        console.error('Error creating user:', error.message)
        return
    }

    console.log('Delivery User created successfully:', data.user.id)
    console.log('Role set to: delivery')
}

createDeliveryUser()
