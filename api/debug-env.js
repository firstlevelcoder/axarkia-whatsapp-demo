export default async function handler(req, res) {
  const allKeys = Object.keys(process.env).sort();
  const relevant = allKeys.filter(k => /^(WHATSAPP_|META_|TEST_RECIPIENT|VERCEL_)/.test(k));
  const expected = [
    'WHATSAPP_ACCESS_TOKEN',
    'WHATSAPP_PHONE_NUMBER_ID',
    'WHATSAPP_BUSINESS_ACCOUNT_ID',
    'TEST_RECIPIENT_NUMBER',
  ];
  const presence = {};
  for (const k of expected) {
    const v = process.env[k];
    presence[k] = {
      defined: typeof v !== 'undefined',
      type: typeof v,
      length: typeof v === 'string' ? v.length : 0,
      empty: typeof v === 'string' && v.trim().length === 0,
      preview: typeof v === 'string' && v.length > 0
        ? v.slice(0, 4) + '…' + v.slice(-2) + ' (len=' + v.length + ')'
        : null,
    };
  }
  res.status(200).json({
    deployment_id: process.env.VERCEL_DEPLOYMENT_ID || null,
    project: process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || null,
    git_commit_sha: process.env.VERCEL_GIT_COMMIT_SHA || null,
    git_branch: process.env.VERCEL_GIT_COMMIT_REF || null,
    env_var_count_total: allKeys.length,
    env_vars_starting_with_relevant_prefixes: relevant,
    expected_vars_status: presence,
    node_version: process.version,
  });
}
