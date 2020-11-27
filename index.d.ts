import * as puppeteer from "puppeteer";
import { Observable } from "rxjs";
export declare function streamPageEvents<T>(browser: puppeteer.Browser, domain: string, html: string, pageMap: (p: puppeteer.Page, r: puppeteer.Request) => Promise<T>): Observable<T>;
