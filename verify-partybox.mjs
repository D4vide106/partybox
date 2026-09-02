import { supabase } from './src/integrations/supabase/client.ts';

const code = '1234';
console.log('TESTING ROOM CREATION...');

const { data: room, error: rErr } = await supabase
  .from('rooms')
  .insert({
    code,
    host_client_id: 'client_123',
    status: 'lobby',
    current_round: 0,
    game_sequence: ['tapblitz'],
  })
  .select()
  .single();

console.log('CREATED ROOM:', room, 'ERROR:', rErr);

const { data: player, error: pErr } = await supabase.from('players').insert({
  room_id: room.id,
  client_id: 'client_123',
  nickname: 'Davide',
  avatar_emojis: '✨️',
  is_host: true,
  is_connected: true,
});

console.log('CREATED PLAYER', player, 'ERROR:', pErr);

const { data: fetchedRoom } = await supabase.from('rooms').select('*').eq('code', code).maybeSingle();
console.log('FETCHED ROOM:', fetchedRoom);

console.log('ALLP FUNCTIONS WORKED INSTANTLY!');
process.exit(0);
