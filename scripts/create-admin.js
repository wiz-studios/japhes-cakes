const { createClient } = require('@supabase/supabase-js')

// Load environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('Error: Required environment variables are missing.')
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function createAdmin() {
    console.log(`Creating ADMIN user: ${ADMIN_EMAIL}`)

    const { data, error } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { role: 'admin' }
    })

    if (error) {
        if (error.status === 422 || error.message.includes("already registered")) {
            console.log("User already exists. Updating role metadata...")
            const { data: users } = await supabase.auth.admin.listUsers()
            const existing = users.users.find(u => u.email === ADMIN_EMAIL)

            if (existing) {
                await supabase.auth.admin.updateUserById(existing.id, {
                    user_metadata: { role: 'admin' }
                })
                console.log("Admin role checked/updated.")
            }
        } else {
            console.error('Error creating user:', error)
        }
    } else {
        console.log('User created successfully:', data.user)
    }
}

createAdmin()
