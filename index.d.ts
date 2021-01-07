/// <reference types="node" />
/// <reference types="react" />
import { Browser, LaunchOptions, Page, Request } from "puppeteer";
import * as U from "url";
import { URL } from "url";
import { ReaderObservableEither } from "fp-ts-rxjs/lib/ReaderObservableEither";
import { ReaderTaskEither } from "fp-ts/ReaderTaskEither";
export declare type Log = {
    readonly _tag: 'Log';
    readonly message: string;
};
export declare type RequestIntercept = {
    readonly _tag: 'RequestIntercept';
    readonly request: Request;
};
export declare type PPEvent = Log | RequestIntercept;
export declare type Config = {
    hookDomain: string;
    tapRequest: (r: Request) => void;
};
export declare function streamPageEvents(page: Page, url: U.URL): ReaderObservableEither<Config, Error, PPEvent>;
export declare function createNewPage(): ReaderTaskEither<Browser, Error, Page>;
export declare function createTmpHTMLURL(html: string): URL;
export declare const createTmpHTMLURL_JSX: (jsx: JSX.Element) => U.URL;
export declare function runWithBrowser<_T>(launchOptions: LaunchOptions, browserReadingTask: ReaderTaskEither<Browser, Error, _T>): import("fp-ts/lib/TaskEither").TaskEither<Error, _T>;
