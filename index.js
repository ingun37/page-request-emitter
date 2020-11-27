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
async function teardown(page, subscriber) {
    page.removeAllListeners();
    await page.close();
    subscriber.complete();
}
function streamPageEvents(browser, domain, html, pageMap) {
    const tmpHTMLpath = P.resolve(os.tmpdir(), `tmphtml-${uuid_1.v4()}.html`);
    fs.writeFileSync(tmpHTMLpath, html);
    return new rxjs_1.Observable((subscriber) => {
        browser.newPage().then(async (page) => {
            await page.setRequestInterception(true);
            page.on("request", async (req) => {
                if (req.url().startsWith(domain)) {
                    if (req.method() === "DELETE") {
                        teardown(page, subscriber);
                    }
                    else if (req.method() === "PUT") {
                        subscriber.next(await pageMap(page, req));
                        teardown(page, subscriber);
                    }
                    else {
                        subscriber.next(await pageMap(page, req));
                        req.respond({ status: 200 });
                    }
                }
                else {
                    req.continue();
                }
            });
            page.on("console", (message) => {
                console.log({
                    puppeteerMessage: message.text(),
                });
            });
            page.on("error", (error) => {
                console.error({
                    puppeteerError: error,
                });
            });
            page.on("pageerror", (error) => {
                console.error({
                    puppeteerPageError: error,
                });
            });
            const url = U.pathToFileURL(tmpHTMLpath).toString();
            await page.goto(url);
        });
    });
}
exports.streamPageEvents = streamPageEvents;
