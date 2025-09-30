import dotenv from 'dotenv';

const requiredKeys = [
  'ACTIONSTEP_CLIENT_ID',
  'ACTIONSTEP_CLIENT_SECRET',
  'ACTIONSTEP_BASE_URL',
  'ACTIONSTEP_ACCESS_TOKEN',
  'DATABASE_URL',
  'LLM_API_KEY',
  'LLM_MODEL',
];

export interface AppConfig {
  actionstep: {
    clientId: string;
    clientSecret: string;
    baseUrl: string;
    accessToken: string;
  };
  databaseUrl: string;
  llm: {
    apiKey: string;
    model: string;
  };
  port: number;
  delivery: {
    emailSender?: string;
    teamsWebhookUrl?: string;
  };
  cadence: {
    daily: string | undefined;
    weekly: string | undefined;
    monthly: string | undefined;
  };
}

let cachedConfig: AppConfig | null = null;

function ensureRequired(env: NodeJS.ProcessEnv) {
  const missing = requiredKeys.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

function parsePort(raw: string | undefined): number {
  if (!raw) {
    return 3000;
  }

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid PORT value: ${raw}`);
  }

  return parsed;
}

export const config = {
  load(): AppConfig {
    if (cachedConfig) {
      return cachedConfig;
    }

    dotenv.config();
    ensureRequired(process.env);

    cachedConfig = {
      actionstep: {
        clientId: process.env.ACTIONSTEP_CLIENT_ID!,
        clientSecret: process.env.ACTIONSTEP_CLIENT_SECRET!,
        baseUrl: process.env.ACTIONSTEP_BASE_URL!,
        accessToken: process.env.ACTIONSTEP_ACCESS_TOKEN!,
      },
      databaseUrl: process.env.DATABASE_URL!,
      llm: {
        apiKey: process.env.LLM_API_KEY!,
        model: process.env.LLM_MODEL!,
      },
      port: parsePort(process.env.PORT),
      delivery: {
        emailSender: process.env.EMAIL_SENDER,
        teamsWebhookUrl: process.env.TEAMS_WEBHOOK_URL,
      },
      cadence: {
        daily: process.env.SUMMARY_DAILY_CADENCE,
        weekly: process.env.SUMMARY_WEEKLY_CADENCE,
        monthly: process.env.SUMMARY_MONTHLY_CADENCE,
      },
    };

    return cachedConfig;
  },
};
