import { supabaseAdmin } from '../src/config/supabase.js';

const apply = process.argv.includes('--yes');

const main = async () => {
  const { data, error } = await supabaseAdmin.from('payments')
    .select('id, member_id, status, registration_snapshot')
    .not('registration_snapshot', 'is', null)
    .is('membership_id', null)
    .in('status', ['pending', 'cancelled', 'expired', 'failed']);
  if (error) throw error;
  for (const payment of data || []) {
    const memberId = payment.registration_snapshot?.member_id || payment.member_id;
    if (!memberId) continue;
    console.log(`${apply ? 'Deleting' : 'Would delete'} ${memberId} (payment ${payment.id}, ${payment.status})`);
    if (!apply) continue;
    const result = await supabaseAdmin.auth.admin.deleteUser(memberId);
    if (result.error) throw result.error;
  }
  console.log(`${apply ? 'Deleted' : 'Found'} ${(data || []).length} unpaid registration account(s).`);
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
