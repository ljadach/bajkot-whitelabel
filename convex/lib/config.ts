export enum ConfigType {
  SYSTEM = 'SYSTEM',
}

export enum ConfigKey {
  AUTO_GENERATE_EXERCISES = 'AUTO_GENERATE_EXERCISES',
  DEBUG_DB_LOGGING = 'DEBUG_DB_LOGGING',
}

export const DEFAULT_CONFIG: Record<
  ConfigKey,
  {
    type: ConfigType;
    value: string;
  }
> = {
  [ConfigKey.AUTO_GENERATE_EXERCISES]: {
    type: ConfigType.SYSTEM,
    value: 'false',
  },
  [ConfigKey.DEBUG_DB_LOGGING]: {
    type: ConfigType.SYSTEM,
    value: 'false',
  },
};

export function isConfigKey(value: string): value is ConfigKey {
  return Object.values(ConfigKey).includes(value as ConfigKey);
}
