/**
 * 格式化文件大小
 * @param bytes 文件大小（字節）
 * @returns 格式化後的文件大小字符串
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 格式化日期
 * @param date 日期字符串或日期對象
 * @param format 格式類型，默認為 'datetime'
 * @returns 格式化後的日期字符串
 */
export const formatDate = (
  date: string | Date,
  format: 'date' | 'datetime' | 'time' | 'relative' = 'datetime'
): string => {
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return '無效日期';
  }
  
  const now = new Date();
  const diff = now.getTime() - dateObj.getTime();
  
  if (format === 'relative') {
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} 天前`;
    } else if (hours > 0) {
      return `${hours} 小時前`;
    } else if (minutes > 0) {
      return `${minutes} 分鐘前`;
    } else {
      return '剛剛';
    }
  }
  
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(2, '0');
  
  switch (format) {
    case 'date':
      return `${year}-${month}-${day}`;
    case 'time':
      return `${hours}:${minutes}:${seconds}`;
    case 'datetime':
    default:
      return `${year}-${month}-${day} ${hours}:${minutes}`;
  }
};

/**
 * 格式化數字
 * @param num 數字
 * @param decimals 小數位數，默認為 0
 * @returns 格式化後的數字字符串
 */
export const formatNumber = (num: number, decimals: number = 0): string => {
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * 格式化百分比
 * @param value 數值 (0-1)
 * @param decimals 小數位數，默認為 1
 * @returns 格式化後的百分比字符串
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return (value * 100).toFixed(decimals) + '%';
};

/**
 * 格式化持續時間
 * @param milliseconds 毫秒數
 * @returns 格式化後的持續時間字符串
 */
export const formatDuration = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} 天 ${hours % 24} 小時`;
  } else if (hours > 0) {
    return `${hours} 小時 ${minutes % 60} 分鐘`;
  } else if (minutes > 0) {
    return `${minutes} 分鐘 ${seconds % 60} 秒`;
  } else {
    return `${seconds} 秒`;
  }
};

/**
 * 格式化文件類型
 * @param mimeType MIME 類型
 * @returns 用戶友好的文件類型字符串
 */
export const formatFileType = (mimeType: string): string => {
  const typeMap: { [key: string]: string } = {
    'text/plain': '純文本',
    'application/pdf': 'PDF 文檔',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word 文檔',
    'text/markdown': 'Markdown',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel 表格',
    'application/vnd.ms-excel': 'Excel 表格',
    'image/jpeg': 'JPEG 圖片',
    'image/png': 'PNG 圖片',
    'image/gif': 'GIF 圖片',
    'image/bmp': 'BMP 圖片',
    'image/tiff': 'TIFF 圖片',
    'image/webp': 'WebP 圖片',
    'image/svg+xml': 'SVG 圖片',
    'text/html': 'HTML 文檔',
    'application/json': 'JSON 文件',
    'text/csv': 'CSV 表格',
    'application/rtf': 'RTF 文檔',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint 演示',
    'application/vnd.ms-powerpoint': 'PowerPoint 演示',
    'application/epub+zip': 'EPUB 電子書',
    'application/zip': 'ZIP 壓縮包',
    'application/x-rar-compressed': 'RAR 壓縮包',
    'application/x-7z-compressed': '7Z 壓縮包',
  };
  
  return typeMap[mimeType] || mimeType;
};

/**
 * 格式化文件擴展名
 * @param filename 文件名
 * @returns 文件擴展名
 */
export const getFileExtension = (filename: string): string => {
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex > 0 ? filename.substring(lastDotIndex + 1).toLowerCase() : '';
};

/**
 * 格式化貨幣
 * @param amount 金額
 * @param currency 貨幣符號，默認為 'CNY'
 * @returns 格式化後的貨幣字符串
 */
export const formatCurrency = (amount: number, currency: string = 'CNY'): string => {
  const formatter = new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return formatter.format(amount);
};

/**
 * 截斷文本
 * @param text 原始文本
 * @param maxLength 最大長度
 * @param suffix 後綴，默認為 '...'
 * @returns 截斷後的文本
 */
export const truncateText = (text: string, maxLength: number, suffix: string = '...'): string => {
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength - suffix.length) + suffix;
};

/**
 * 首字母大寫
 * @param str 字符串
 * @returns 首字母大寫的字符串
 */
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * 駝峰命名轉換為短橫線命名
 * @param str 駝峰命名字符串
 * @returns 短橫線命名字符串
 */
export const camelToKebab = (str: string): string => {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase();
};

/**
 * 短橫線命名轉換為駝峰命名
 * @param str 短橫線命名字符串
 * @returns 駝峰命名字符串
 */
export const kebabToCamel = (str: string): string => {
  return str.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
};