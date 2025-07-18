module.exports = {
  apps: [
    {
      name: 'knowledge-management-backend',
      script: 'dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      // 日誌配置
      log_file: './logs/app.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // 監控配置
      min_uptime: '10s',
      max_restarts: 10,
      
      // 記憶體配置
      max_memory_restart: '500M',
      
      // 自動重啟
      autorestart: true,
      
      // 監聽文件變化（開發環境）
      watch: false,
      
      // 忽略的文件
      ignore_watch: [
        'node_modules',
        'logs',
        'uploads',
        '.git',
      ],
      
      // 進程管理
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // 環境變數
      env_file: '.env',
      
      // 合併日誌
      merge_logs: true,
      
      // 時間戳
      time: true,
    },
  ],
};