import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, reaction, note } = await request.json();

    // Fetch display_name and couple_id in parallel
    const [{ data: profile }, { data: couple }] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('couples')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle(),
    ]);

    const { data: row, error: insertError } = await supabase
      .from('invite_previews')
      .insert({
        sender_id: user.id,
        couple_id: couple?.id ?? null,
        prompt: prompt ?? null,
        reaction: reaction ?? null,
        note: note ?? null,
        sender_name: profile?.display_name ?? null,
      })
      .select('id')
      .maybeSingle();

    if (insertError) {
      console.error('invite_previews insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
    }

    return NextResponse.json({ token: row.id });

  } catch (error) {
    console.error('Invite create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
