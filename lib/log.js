import { createLogger, format, transports } from 'winston';

const { combine, timestamp, json, simple } = format;

const log = createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    json()
  ),
  defaultMeta: { service: 'user-service' },
  transports: [
    // 写入所有重要级别为 `error` 或更高的日志到 `error.log`
    // 即，error, fatal，但不包括其他级别
    new transports.File({ filename: 'error.log', level: 'error' }),
    // 写入所有重要级别为 `info` 或更高的日志到 `combined.log`
    // 即，fatal, error, warn, 和 info，但不包括 trace
    new transports.File({ filename: 'combined.log' })
  ]
});

// 如果不在生产环境中，则将日志输出到控制台，格式为：
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
if (process.env.NODE_ENV !== 'production') {
  log.add(new transports.Console({
    format: simple()
  }));
}

export {log};
export default log;
