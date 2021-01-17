import * as P from "path";
import * as os from "os";
import {Browser, launch, LaunchOptions, Page, Request, RespondOptions, Response} from "puppeteer";
import {v4 as uuidv4} from "uuid";
import {Observable} from "rxjs";

import * as fs from "fs";
import * as U from "url";
import {pathToFileURL, URL} from "url";
import * as E from "fp-ts/Either";
import {Either, isRight, right} from "fp-ts/Either";
import {renderToStaticMarkup} from "react-dom/server";
import {ReaderObservableEither} from "fp-ts-rxjs/lib/ReaderObservableEither";
import {bracket, TaskEither, tryCatchK} from "fp-ts/TaskEither";
import {ReaderTaskEither} from "fp-ts/ReaderTaskEither";
import {Option} from "fp-ts/Option";
import {option} from "fp-ts";

export type Log = {
    readonly _tag: 'Log';
    readonly message: string;
}

export type RequestIntercept = {
    readonly _tag: 'RequestIntercept';
    readonly request: Request;
}

export type PPEvent = Log | RequestIntercept;

export type Config = {
    filter: (r: Request) => boolean,
    alterResponse: (r: Request) => Option<TaskEither<Error, RespondOptions>>
    debugResponse: (r: Response) => void
}

export function streamPageEvents(page: Page, url: U.URL): ReaderObservableEither<Config, Error, PPEvent> {
    return (config: Config) => {
        return new Observable<Either<Error, PPEvent>>(subscriber => {
            page.setRequestInterception(true).then(() => {
                page.on("request", async (req) => {
                    try {
                        const customResponse = config.alterResponse(req);
                        if(option.isSome(customResponse)) {
                            customResponse.value().then(eth => {
                                if(isRight(eth)) {
                                    req.respond(eth.right)
                                } else {
                                    console.error("custom response failed", eth.left);
                                    req.respond({
                                        status: 501
                                    })
                                }
                            })
                        } else {
                            if (config.filter(req)) {
                                const requestEvent: RequestIntercept = {_tag: 'RequestIntercept', request: req};
                                if (req.method() === "DELETE") {
                                    subscriber.complete();
                                } else if (req.method() === "PUT") {
                                    subscriber.next(right(requestEvent));
                                    subscriber.complete();
                                } else {
                                    subscriber.next(right(requestEvent));
                                    req.respond({status: 200});
                                }
                            } else {
                                req.continue();
                            }
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
                    subscriber.next(right({_tag: 'Log', message: pageEventObj.text()}))
                })

                page.on("response", (response) => {
                    config.debugResponse(response);
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
}

export function createNewPage(): ReaderTaskEither<Browser, Error, Page> {
    return tryCatchK((browser: Browser) => {
        return browser.newPage();
    }, err => {
        console.error(err);
        return new Error("Creating new page failed");
    });
}

export function createNewIncognitoPage(): ReaderTaskEither<Browser, Error, Page> {
    return tryCatchK((browser: Browser) => {
        return browser.createIncognitoBrowserContext().then(xxx => xxx.newPage())
    }, err => {
        console.error(err);
        return new Error("Creating new page failed");
    });
}

export function createTmpHTMLURL(html: string): URL {
    const tmpHTMLpath = P.resolve(os.tmpdir(), `tmphtml-${uuidv4()}.html`);
    fs.writeFileSync(tmpHTMLpath, html);
    return pathToFileURL(tmpHTMLpath);
}

export const createTmpHTMLURL_JSX = (jsx: JSX.Element) => createTmpHTMLURL(renderToStaticMarkup(jsx));

function launchBrowser(o: LaunchOptions) {
    return launch(o);
}

export function runWithBrowser<_T>(launchOptions: LaunchOptions, browserReadingTask: ReaderTaskEither<Browser, Error, _T>) {
    const tmpUserDataDir = P.resolve(os.tmpdir(), "user-data-dir-" + uuidv4());
    fs.mkdirSync(tmpUserDataDir);
    return bracket(
        tryCatchK(launchBrowser, err => {
            if (err instanceof Error) {
                return err
            } else {
                console.error(err);
                return new Error("Launching browser fail");
            }
        })(launchOptions),
        browserReadingTask,
        (browser) => tryCatchK(() => {
            console.log("Releasing browser ...");
            return browser.close();
        }, err => {
            if (err instanceof Error) {
                return err
            } else {
                console.error(err);
                return new Error("Releasing browser fail");
            }
        })()
    )
}