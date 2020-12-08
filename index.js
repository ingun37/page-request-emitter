"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamPageEvents = void 0;
const P = __importStar(require("path"));
const os = __importStar(require("os"));
const uuid_1 = require("uuid");
const rxjs_1 = require("rxjs");
const fs = __importStar(require("fs"));
const U = __importStar(require("url"));
async function teardown(page) {
    page.removeAllListeners();
    await page.close();
}
function streamPageEvents(browser, domain, html, initPage, requestMap, onMessage, onError, onPageError
// pageMap: (p: Page, r: Request | null, message: string | null, error: Error | null, pageError: Error | null) => Promise<T>
) {
    const tmpHTMLpath = P.resolve(os.tmpdir(), `tmphtml-${uuid_1.v4()}.html`);
    fs.writeFileSync(tmpHTMLpath, html);
    return new rxjs_1.Observable((subscriber) => {
        browser.newPage().then(async (page) => {
            await initPage(page);
            await page.setRequestInterception(true);
            page.on("request", async (req) => {
                try {
                    if (req.url().startsWith(domain)) {
                        if (req.method() === "DELETE") {
                            teardown(page);
                            subscriber.complete();
                        }
                        else if (req.method() === "PUT") {
                            subscriber.next(await requestMap(page, req));
                            teardown(page);
                            subscriber.complete();
                        }
                        else {
                            subscriber.next(await requestMap(page, req));
                            req.respond({ status: 200 });
                        }
                    }
                    else {
                        req.continue();
                    }
                }
                catch (error) {
                    teardown(page);
                    subscriber.error(error);
                }
            });
            page.on("console", async (message) => {
                try {
                    onMessage(message.text());
                }
                catch (error) {
                    teardown(page);
                    subscriber.error(error);
                }
            });
            page.on("error", (e) => {
                try {
                    onError(e);
                }
                catch (e) {
                    teardown(page);
                    subscriber.error(e);
                }
            });
            page.on("pageerror", (e) => {
                try {
                    onPageError(e);
                }
                catch (e) {
                    teardown(page);
                    subscriber.error(e);
                }
            });
            const url = U.pathToFileURL(tmpHTMLpath).toString();
            await page.goto(url);
        });
    });
}
exports.streamPageEvents = streamPageEvents;
