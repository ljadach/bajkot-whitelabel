export enum ConfigType {
  SYSTEM = 'SYSTEM',
}

export enum ConfigKey {
  DEBUG_DB_LOGGING = 'DEBUG_DB_LOGGING',
}

export const DEFAULT_CONFIG: Record<
  ConfigKey,
  {
    type: ConfigType;
    value: string;
  }
> = {
  [ConfigKey.DEBUG_DB_LOGGING]: {
    type: ConfigType.SYSTEM,
    value: 'false',
  },
};

export function isConfigKey(value: string): value is ConfigKey {
  return Object.values(ConfigKey).includes(value as ConfigKey);
}
