import chalk from 'chalk';
import { createHash } from 'crypto';

type ErrorLevel = 'info' | 'warning' | 'danger' | 'success';

export function md5(data: Buffer) {
  const hash = createHash('md5');
  hash.update(data);
  return hash.digest('hex');
}

export function logger(pkg: string) {
  const colors = {
    danger: chalk.red,
    info: chalk.blue,
    success: chalk.green,
    warning: chalk.yellow
  };
  return (message: string, level: ErrorLevel = 'info') => {
    // tslint:disable-next-line
    console.log(`[${colors[level](pkg)}]`, message);
  };
}
