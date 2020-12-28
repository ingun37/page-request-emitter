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
exports.createTmpHTMLFile = exports.streamNewPageEventsJSX = exports.streamNewPageEvents = exports.streamPageEvents = void 0;
const P = __importStar(require("path"));
const os = __importStar(require("os"));
const uuid_1 = require("uuid");
const rxjs_1 = require("rxjs");
const fs = __importStar(require("fs"));
const U = __importStar(require("url"));
const E = __importStar(require("fp-ts/Either"));
const server_1 = require("react-dom/server");
function streamPageEvents(page, url, hookDomain) {
    return new rxjs_1.Observable(subscriber => {
        page.setRequestInterception(true).then(() => {
            page.on("request", async (req) => {
                try {
                    if (req.url().startsWith(hookDomain)) {
                        const tup = E.right([page, { _tag: 'RequestIntercept', request: req }]);
                        if (req.method() === "DELETE") {
                            subscriber.complete();
                        }
                        else if (req.method() === "PUT") {
                            subscriber.next(tup);
                            subscriber.complete();
                        }
                        else {
                            subscriber.next(tup);
                            req.respond({ status: 200 });
                        }
                    }
                    else {
                        req.continue();
                    }
                }
                catch (error) {
                    subscriber.error(error);
                }
            });
            page.on("error", (e) => {
                subscriber.next(E.left(e));
            });
            page.on("pageerror", (e) => {
                console.log("page error", e);
                subscriber.next(E.left(e));
            });
            page.on("console", (pageEventObj) => {
                subscriber.next(E.right([page, { _tag: 'Log', message: pageEventObj.text() }]));
            });
            page.goto(url.toString()).then(rsp => {
                if (rsp) {
                    if (rsp.ok()) {
                        console.log("page load success");
                    }
                    else {
                        console.error(url, " responded ", rsp.statusText());
                        subscriber.error(new Error(rsp.statusText()));
                    }
                }
                else {
                    console.error(url, "responded null");
                    subscriber.error(new Error(url.toString() + " responded null"));
                }
            });
        });
    });
}
exports.streamPageEvents = streamPageEvents;
function streamNewPageEvents(browser, hookDomain, html) {
    const urlToHTML = U.pathToFileURL(createTmpHTMLFile(html));
    return new rxjs_1.Observable(subscriber => {
        browser.newPage().then(page => {
            streamPageEvents(page, urlToHTML, hookDomain).subscribe({
                next: subscriber.next.bind(subscriber),
                error: subscriber.error.bind(subscriber),
                complete() {
                    subscriber.complete();
                }
            });
        }).catch(err => {
            subscriber.error(err);
        });
    });
}
exports.streamNewPageEvents = streamNewPageEvents;
const streamNewPageEventsJSX = (jsx) => (browser, hookDomain) => streamNewPageEvents(browser, hookDomain, server_1.renderToStaticMarkup(jsx));
exports.streamNewPageEventsJSX = streamNewPageEventsJSX;
function createTmpHTMLFile(html) {
    const tmpHTMLpath = P.resolve(os.tmpdir(), `tmphtml-${uuid_1.v4()}.html`);
    fs.writeFileSync(tmpHTMLpath, html);
    return tmpHTMLpath;
}
exports.createTmpHTMLFile = createTmpHTMLFile;
