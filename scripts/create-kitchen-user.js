const { createClient } = require('@supabase/supabase-js')

// Load environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const KITCHEN_EMAIL = process.env.KITCHEN_EMAIL
const KITCHEN_PASSWORD = process.env.KITCHEN_PASSWORD

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !KITCHEN_EMAIL || !KITCHEN_PASSWORD) {
    console.error('Error: Required environment variables are missing.')
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, KITCHEN_EMAIL, KITCHEN_PASSWORD')
    console.log('Usage example:');
    console.log('  KITCHEN_EMAIL="kitchen@japhes.com" KITCHEN_PASSWORD="securepassword" ... node scripts/create-kitchen-user.js');
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function createKitchenUser() {
    console.log(`Creating KITCHEN user: ${KITCHEN_EMAIL}`)

    const { data, error } = await supabase.auth.admin.createUser({
        email: KITCHEN_EMAIL,
        password: KITCHEN_PASSWORD,
        email_confirm: true,
        user_metadata: { role: 'kitchen' } // Restricted Role
    })

    if (error) {
        if (error.status === 422 || error.message.includes("already registered")) {
            console.log("Kitchen user already exists. Updating role metadata...")

            const { data: users } = await supabase.auth.admin.listUsers()
            // Note: listUsers is paginated, but for small internal Apps this is unlikely to miss unless thousands of users.
            const existing = users.users.find(u => u.email === KITCHEN_EMAIL)

            if (existing) {
                const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
                    user_metadata: { role: 'kitchen' }
                })
                if (updateError) {
                    console.error("Failed to update role:", updateError.message)
                } else {
                    console.log("Updated existing kitchen user role metadata successfully.")
                }
            } else {
                console.warn("User reported existing but could not be found in list (check pagination).")
            }
        } else {
            console.error('Error creating kitchen user:', error)
        }
    } else {
        console.log('Kitchen user created successfully:', data.user)
    }
}

createKitchenUser()
