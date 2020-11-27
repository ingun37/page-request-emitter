import { Page, Request } from "puppeteer";
import { Observable } from "rxjs";
export declare function streamPageEvents<T>(browser: any, domain: string, html: string, pageMap: (p: Page, r: Request) => Promise<T>): Observable<T>;
