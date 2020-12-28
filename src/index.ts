import * as P from "path";
import * as os from "os";
import {Browser, Page, Request} from "puppeteer";
import {v4 as uuidv4} from "uuid";
import {Observable} from "rxjs";

import * as fs from "fs";
import * as U from "url";
import * as E from "fp-ts/Either";
import {Either} from "fp-ts/Either";
import {renderToStaticMarkup} from "react-dom/server";


export type Log = {
    readonly _tag: 'Log';
    readonly message: string;
}

export type RequestIntercept = {
    readonly _tag: 'RequestIntercept';
    readonly request: Request;
}

export type PageEvent = Either<Error, [Page, Log | RequestIntercept]>;

export function streamPageEvents(page: Page, url: U.URL, hookDomain: string): Observable<PageEvent> {
    return new Observable<PageEvent>(subscriber => {
        page.setRequestInterception(true).then(() => {
            page.on("request", async (req) => {
                try {
                    if (req.url().startsWith(hookDomain)) {
                        const tup: PageEvent = E.right([page, {_tag: 'RequestIntercept', request: req}]);
                        if (req.method() === "DELETE") {
                            subscriber.complete();
                        } else if (req.method() === "PUT") {
                            subscriber.next(tup);
                            subscriber.complete();
                        } else {
                            subscriber.next(tup);
                            req.respond({status: 200});
                        }
                    } else {
                        req.continue();
                    }
                } catch (error) {
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
                subscriber.next(E.right([page, {_tag: 'Log', message: pageEventObj.text()}]))
            })

            page.goto(url.toString()).then(rsp => {
                if (rsp) {
                    if (rsp.ok()) {
                        console.log("page load success");
                    } else {
                        console.error(url, " responded ", rsp.statusText());
                        subscriber.error(new Error(rsp.statusText()))
                    }
                } else {
                    console.error(url, "responded null");
                    subscriber.error(new Error(url.toString() + " responded null"));
                }
            })
        })
    })
}

export function streamNewPageEvents(browser: Browser, hookDomain: string, html: string): Observable<PageEvent> {
    const urlToHTML = U.pathToFileURL(createTmpHTMLFile(html));
    return new Observable<PageEvent>(subscriber => {
        browser.newPage().then(page => {
            streamPageEvents(page, urlToHTML, hookDomain).subscribe({
                next: subscriber.next.bind(subscriber),
                error: subscriber.error.bind(subscriber),
                complete() {
                    subscriber.complete()
                }
            })
        }).catch(err => {
            subscriber.error(err)
        })
    })
}

export const streamNewPageEventsJSX = (jsx: JSX.Element) => (browser: Browser, hookDomain: string) => streamNewPageEvents(browser, hookDomain, renderToStaticMarkup(jsx));

export function createTmpHTMLFile(html: string): string {
    const tmpHTMLpath = P.resolve(os.tmpdir(), `tmphtml-${uuidv4()}.html`);
    fs.writeFileSync(tmpHTMLpath, html);
    return tmpHTMLpath;
}
