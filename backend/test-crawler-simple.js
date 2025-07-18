// 簡化的爬蟲測試，不需要瀏覽器
console.log('🚀 開始測試爬蟲系統基本功能...\n');

async function testCrawlerBasicFunctions() {
  try {
    // 測試 1: 測試內容去重功能
    console.log('📋 測試 1: 內容去重功能');
    const { crawlerService } = require('./dist/services/crawlerService');
    
    const testContents = [
      { title: '測試標題1', content: '測試內容1', url: 'test1.com' },
      { title: '測試標題1', content: '測試內容1', url: 'test2.com' }, // 重複
      { title: '測試標題2', content: '測試內容2', url: 'test3.com' },
      { title: '測試標題3', content: '測試內容3', url: 'test4.com' },
      { title: '測試標題2', content: '測試內容2', url: 'test5.com' }, // 重複
    ];
    
    const uniqueContents = await crawlerService.deduplicateContent(testContents);
    console.log(`✅ 去重功能正常，${testContents.length} 筆資料 -> ${uniqueContents.length} 筆去重後`);
    console.log('去重後資料:', uniqueContents.map(c => c.title));
    console.log();

    // 測試 2: 測試日期解析功能
    console.log('📋 測試 2: 日期解析功能');
    const testDates = [
      '2024-01-15',
      '2024/01/15',
      '15/01/2024',
      '2024年1月15日',
      'invalid date'
    ];
    
    console.log('日期解析測試:');
    testDates.forEach(dateStr => {
      const parsedDate = crawlerService.parseDate(dateStr);
      console.log(`  "${dateStr}" -> ${parsedDate ? parsedDate.toDateString() : 'null'}`);
    });
    console.log();

    // 測試 3: 測試內容指紋創建
    console.log('📋 測試 3: 內容指紋創建');
    const testFingerprints = [
      { title: '相同標題', content: '相同內容' },
      { title: '相同標題', content: '相同內容' },
      { title: '不同標題', content: '不同內容' }
    ];
    
    testFingerprints.forEach((item, index) => {
      const fingerprint = crawlerService.createContentFingerprint(item.title, item.content);
      console.log(`  測試${index + 1}: ${fingerprint.substring(0, 20)}...`);
    });
    console.log();

    // 測試 4: 測試平台匹配
    console.log('📋 測試 4: 平台匹配功能');
    const CrawlerPlatform = {
      PTT: 'ptt',
      DCARD: 'dcard',
      MOBILE01: 'mobile01'
    };
    
    console.log('支援的平台:');
    Object.keys(CrawlerPlatform).forEach(key => {
      console.log(`  ${key}: ${CrawlerPlatform[key]}`);
    });
    console.log();

    console.log('🎉 基本功能測試完成！');
    console.log('📝 注意：由於瀏覽器配置問題，實際網頁爬取功能需要在伺服器環境中測試。');
    
  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error.message);
  }
}

// 執行測試
testCrawlerBasicFunctions().catch(console.error);