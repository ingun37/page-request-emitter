import * as P from "path";
import * as os from "os";
import {Browser, Page, Request} from "puppeteer";
import {v4 as uuidv4} from "uuid";
import {from, Observable, Subscriber} from "rxjs";
import * as O from "rxjs/operators";

import * as fs from "fs";
import * as U from "url";
import {Either} from "fp-ts/Either";
import * as E from "fp-ts/Either";
import * as T from "fp-ts/Tuple";
import * as F from "fp-ts/function";
import {renderToStaticMarkup} from "react-dom/server";


export type PageEvent = Either<Error, [Page, Request]>;

export class PageError extends Error {};
export function streamPageEvents(page: Page, url: U.URL, hookDomain: string): Observable<PageEvent> {
    return new Observable<PageEvent>(subscriber => {
        page.setRequestInterception(true).then(() => {
            page.on("request", async (req) => {
                const tuple: [Page, Request] = [page, req];
                try {
                    if (req.url().startsWith(hookDomain)) {
                        console.log("hooked");
                        if (req.method() === "DELETE") {
                            subscriber.complete();
                        } else if (req.method() === "PUT") {
                            subscriber.next(E.right(tuple));
                            subscriber.complete();
                        } else {
                            subscriber.next(E.right(tuple));
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
                subscriber.next(E.left(new PageError(e.message)));
            });

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
