import { environment as production } from './environment.prod';

export const environment = { ...production, apiUrl: '/api' };
