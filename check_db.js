import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf-8')
const supabaseUrl = env.match(/VITE_SUPABASE_URL=(.*)/)[1]
const supabaseKey = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1]

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const { data, error } = await supabase.from('scoring_matrices').insert({}).select('*')
  console.log('Empty insert:', error?.details || error?.message)
}
test()
