/// <reference types="node" />
/// <reference types="react" />
import { Browser, Page, Request } from "puppeteer";
import { Observable } from "rxjs";
import * as U from "url";
import * as E from "fp-ts/Either";
import { Either } from "fp-ts/Either";
export declare type Log = {
    readonly _tag: 'Log';
    readonly message: string;
};
export declare type RequestIntercept = {
    readonly _tag: 'RequestIntercept';
    readonly request: Request;
};
export declare type PageEvent = Either<Error, [Page, Log | RequestIntercept]>;
export declare function streamPageEvents(page: Page, url: U.URL, hookDomain: string): Observable<PageEvent>;
export declare function streamNewPageEvents(browser: Browser, hookDomain: string, html: string): Observable<PageEvent>;
export declare const streamNewPageEventsJSX: (jsx: JSX.Element) => (browser: Browser, hookDomain: string) => Observable<E.Either<Error, [Page, Log | RequestIntercept]>>;
export declare function createTmpHTMLFile(html: string): string;
