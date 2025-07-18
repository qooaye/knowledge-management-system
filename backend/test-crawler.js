const { crawlerService } = require('./dist/services/crawlerService');

async function testCrawler() {
  console.log('🚀 開始測試爬蟲系統...\n');

  try {
    // 測試 1: 測試爬蟲服務基本功能
    console.log('📋 測試 1: 爬蟲服務初始化');
    console.log('✅ 爬蟲服務已載入\n');

    // 測試 2: 測試 PTT 爬蟲
    console.log('📋 測試 2: PTT 爬蟲功能');
    try {
      const pttResults = await crawlerService.crawlPTT('JavaScript', 2);
      console.log(`✅ PTT 爬蟲成功，獲取 ${pttResults.length} 筆資料`);
      if (pttResults.length > 0) {
        console.log('   第一筆資料:', {
          title: pttResults[0].title.substring(0, 50) + '...',
          url: pttResults[0].url
        });
      }
    } catch (error) {
      console.log('❌ PTT 爬蟲失敗:', error.message);
    }
    console.log();

    // 測試 3: 測試 Dcard 爬蟲  
    console.log('📋 測試 3: Dcard 爬蟲功能');
    try {
      const dcardResults = await crawlerService.crawlDcard('程式設計', 2);
      console.log(`✅ Dcard 爬蟲成功，獲取 ${dcardResults.length} 筆資料`);
      if (dcardResults.length > 0) {
        console.log('   第一筆資料:', {
          title: dcardResults[0].title.substring(0, 50) + '...',
          url: dcardResults[0].url
        });
      }
    } catch (error) {
      console.log('❌ Dcard 爬蟲失敗:', error.message);
    }
    console.log();

    // 測試 4: 測試 Mobile01 爬蟲
    console.log('📋 測試 4: Mobile01 爬蟲功能');
    try {
      const mobile01Results = await crawlerService.crawlMobile01('手機', 2);
      console.log(`✅ Mobile01 爬蟲成功，獲取 ${mobile01Results.length} 筆資料`);
      if (mobile01Results.length > 0) {
        console.log('   第一筆資料:', {
          title: mobile01Results[0].title.substring(0, 50) + '...',
          url: mobile01Results[0].url
        });
      }
    } catch (error) {
      console.log('❌ Mobile01 爬蟲失敗:', error.message);
    }
    console.log();

    // 測試 5: 測試內容去重功能
    console.log('📋 測試 5: 內容去重功能');
    try {
      const testContents = [
        { title: '測試標題1', content: '測試內容1', url: 'test1.com' },
        { title: '測試標題1', content: '測試內容1', url: 'test2.com' }, // 重複
        { title: '測試標題2', content: '測試內容2', url: 'test3.com' }
      ];
      
      const uniqueContents = await crawlerService.deduplicateContent(testContents);
      console.log(`✅ 去重功能正常，${testContents.length} -> ${uniqueContents.length}`);
    } catch (error) {
      console.log('❌ 去重功能失敗:', error.message);
    }
    console.log();

    console.log('🎉 爬蟲系統測試完成！');

  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error);
  } finally {
    // 清理資源
    try {
      await crawlerService.cleanup();
      console.log('🧹 資源清理完成');
    } catch (error) {
      console.log('⚠️ 資源清理失敗:', error.message);
    }
  }
}

// 執行測試
testCrawler().catch(console.error);