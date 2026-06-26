import { createServerSupabase, TENANT_ID } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createServerSupabase()

  const { data, error } = await supabase
    .from('store_assets')
    .select('slot, url, updated_at')
    .eq('tenant_id', TENANT_ID())

  return NextResponse.json({ tenant_id: TENANT_ID(), rows: data, error: error?.message ?? null })
}
