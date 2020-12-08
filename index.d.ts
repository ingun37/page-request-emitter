import { Page, Request } from "puppeteer";
import { Observable } from "rxjs";
export declare function streamPageEvents<T>(browser: any, domain: string, html: string, initPage: (p: Page) => Promise<Page>, requestMap: (p: Page, r: Request) => Promise<T>, onMessage: (m: string) => void, onError: (e: Error) => void, onPageError: (e: Error) => void): Observable<T>;
