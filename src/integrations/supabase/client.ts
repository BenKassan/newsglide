
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const supabaseUrl = "https://icwusduvaohosrvxlahh.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imljd3VzZHV2YW9ob3NydnhsYWhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNDg4MzcsImV4cCI6MjA2NjYyNDgzN30.v69fM_Wfa7bZ-lVCUVpd3oEL1E15bvuQdHgBtgn2dVo"

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
