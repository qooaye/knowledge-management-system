"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionType = exports.CrawlerStatus = exports.CrawlerPlatform = exports.DocumentStatus = void 0;
var DocumentStatus;
(function (DocumentStatus) {
    DocumentStatus["UPLOADING"] = "uploading";
    DocumentStatus["PROCESSING"] = "processing";
    DocumentStatus["COMPLETED"] = "completed";
    DocumentStatus["FAILED"] = "failed";
})(DocumentStatus || (exports.DocumentStatus = DocumentStatus = {}));
var CrawlerPlatform;
(function (CrawlerPlatform) {
    CrawlerPlatform["FACEBOOK"] = "facebook";
    CrawlerPlatform["INSTAGRAM"] = "instagram";
    CrawlerPlatform["THREADS"] = "threads";
    CrawlerPlatform["TWITTER"] = "twitter";
    CrawlerPlatform["MEDIUM"] = "medium";
    CrawlerPlatform["PTT"] = "ptt";
    CrawlerPlatform["MOBILE01"] = "mobile01";
    CrawlerPlatform["DCARD"] = "dcard";
})(CrawlerPlatform || (exports.CrawlerPlatform = CrawlerPlatform = {}));
var CrawlerStatus;
(function (CrawlerStatus) {
    CrawlerStatus["PENDING"] = "pending";
    CrawlerStatus["RUNNING"] = "running";
    CrawlerStatus["COMPLETED"] = "completed";
    CrawlerStatus["FAILED"] = "failed";
    CrawlerStatus["STOPPED"] = "stopped";
})(CrawlerStatus || (exports.CrawlerStatus = CrawlerStatus = {}));
var ConnectionType;
(function (ConnectionType) {
    ConnectionType["RELATED"] = "related";
    ConnectionType["PREREQUISITE"] = "prerequisite";
    ConnectionType["FOLLOWUP"] = "followup";
    ConnectionType["CONTRADICTION"] = "contradiction";
    ConnectionType["EXAMPLE"] = "example";
    ConnectionType["REFERENCE"] = "reference";
})(ConnectionType || (exports.ConnectionType = ConnectionType = {}));
//# sourceMappingURL=index.js.map