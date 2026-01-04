
/**
 * ==========================================
 * ADMIN PAYMENT OVERRIDE POLICY (Strict)
 * ==========================================
 * 
 * 1. AUTHORITY
 *    - Only Admins with 'SUPER_ADMIN' or 'MANAGER' role can override payment status.
 *    - Kitchen staff / Normal admins CANNOT override M-Pesa payments manually.
 * 
 * 2. PROCESS
 *    - Must use the specific `markOrderAsPaid` server action.
 *    - A reason/note is highly recommended (future implementation).
 * 
 * 3. AUDIT
 *    - Overrides must be logged with:
 *      - Admin ID
 *      - Timestamp
 *      - Original Status
 *      - Reason (e.g., "Cash received on site", "M-Pesa manual confirm")
 * 
 * 4. SYSTEM STATE
 *    - Overriding to 'paid' immediately UNLOCKS the kitchen workflow.
 *    - It effectively bypasses the STK Push automation.
 * 
 * ==========================================
 */
