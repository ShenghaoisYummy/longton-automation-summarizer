import dotenv from 'dotenv';

const requiredKeys = [
  'ACTIONSTEP_CLIENT_ID',
  'ACTIONSTEP_CLIENT_SECRET',
  'ACTIONSTEP_BASE_URL',
  'DATABASE_URL',
  'LLM_API_KEY',
  'LLM_MODEL',
];

function ensureRequired(env: NodeJS.ProcessEnv) {
  const missing = requiredKeys.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export const config = {
  load() {
    dotenv.config();
    ensureRequired(process.env);
  },
};
