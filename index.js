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
exports.runWithBrowser = exports.createTmpHTMLURL_JSX = exports.createTmpHTMLURL = exports.createNewPage = exports.streamPageEvents = void 0;
const P = __importStar(require("path"));
const os = __importStar(require("os"));
const puppeteer_1 = require("puppeteer");
const uuid_1 = require("uuid");
const rxjs_1 = require("rxjs");
const fs = __importStar(require("fs"));
const url_1 = require("url");
const E = __importStar(require("fp-ts/Either"));
const Either_1 = require("fp-ts/Either");
const server_1 = require("react-dom/server");
const TaskEither_1 = require("fp-ts/TaskEither");
function streamPageEvents(page, url) {
    return (config) => {
        return new rxjs_1.Observable(subscriber => {
            page.setRequestInterception(true).then(() => {
                page.on("request", async (req) => {
                    try {
                        if (config.filter(req)) {
                            const requestEvent = { _tag: 'RequestIntercept', request: req };
                            if (req.method() === "DELETE") {
                                subscriber.complete();
                            }
                            else if (req.method() === "PUT") {
                                subscriber.next(Either_1.right(requestEvent));
                                subscriber.complete();
                            }
                            else {
                                subscriber.next(Either_1.right(requestEvent));
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
                    subscriber.next(Either_1.right({ _tag: 'Log', message: pageEventObj.text() }));
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
    };
}
exports.streamPageEvents = streamPageEvents;
function createNewPage() {
    return TaskEither_1.tryCatchK((browser) => {
        return browser.newPage();
    }, err => {
        console.error(err);
        return new Error("Creating new page failed");
    });
}
exports.createNewPage = createNewPage;
function createTmpHTMLURL(html) {
    const tmpHTMLpath = P.resolve(os.tmpdir(), `tmphtml-${uuid_1.v4()}.html`);
    fs.writeFileSync(tmpHTMLpath, html);
    return url_1.pathToFileURL(tmpHTMLpath);
}
exports.createTmpHTMLURL = createTmpHTMLURL;
const createTmpHTMLURL_JSX = (jsx) => createTmpHTMLURL(server_1.renderToStaticMarkup(jsx));
exports.createTmpHTMLURL_JSX = createTmpHTMLURL_JSX;
function launchBrowser(o) {
    return puppeteer_1.launch(o);
}
function runWithBrowser(launchOptions, browserReadingTask) {
    const tmpUserDataDir = P.resolve(os.tmpdir(), "user-data-dir-" + uuid_1.v4());
    fs.mkdirSync(tmpUserDataDir);
    return TaskEither_1.bracket(TaskEither_1.tryCatchK(launchBrowser, err => {
        if (err instanceof Error) {
            return err;
        }
        else {
            console.error(err);
            return new Error("Launching browser fail");
        }
    })(launchOptions), browserReadingTask, (browser) => TaskEither_1.tryCatchK(() => {
        console.log("Releasing browser ...");
        return browser.close();
    }, err => {
        if (err instanceof Error) {
            return err;
        }
        else {
            console.error(err);
            return new Error("Releasing browser fail");
        }
    })());
}
exports.runWithBrowser = runWithBrowser;
