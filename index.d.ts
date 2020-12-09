/// <reference types="node" />
/// <reference types="react" />
import { Browser, Page, Request } from "puppeteer";
import { Observable } from "rxjs";
import * as U from "url";
import { Either } from "fp-ts/Either";
export declare type PageEvent = Either<Error, [Page, Request]>;
export declare class PageError extends Error {
}
export declare function streamPageEvents(page: Page, url: U.URL, hookDomain: string): Observable<PageEvent>;
export declare function streamNewPageEvents(browser: Browser, hookDomain: string, html: string): Observable<PageEvent>;
export declare const streamNewPageEventsJSX: (jsx: JSX.Element) => (browser: Browser, hookDomain: string) => Observable<Either<Error, [Page, Request]>>;
export declare function createTmpHTMLFile(html: string): string;
