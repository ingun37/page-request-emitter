import * as P from "path";
import * as os from "os";
import { Browser, Page, Request } from "puppeteer";
import { v4 as uuidv4 } from "uuid";
import { Observable, Subscriber } from "rxjs";
import * as fs from "fs";
import * as U from "url";

async function teardown<A>(page: Page) {
  page.removeAllListeners();
  await page.close();
}

export function streamPageEvents<T>(
  browser: any,
  domain: string,
  html: string,
  requestMap: (p: Page, r: Request) => Promise<T>,
  onMessage: (m: string) => void,
  onError: (e: Error) => void,
  onPageError: (e: Error) => void
  // pageMap: (p: Page, r: Request | null, message: string | null, error: Error | null, pageError: Error | null) => Promise<T>
): Observable<T> {
  const tmpHTMLpath = P.resolve(os.tmpdir(), `tmphtml-${uuidv4()}.html`);

  fs.writeFileSync(tmpHTMLpath, html);

  return new Observable((subscriber) => {
    (browser as Browser).newPage().then(async (page) => {
      await page.setRequestInterception(true);

      page.on("request", async (req) => {
        try {
          if (req.url().startsWith(domain)) {
            if (req.method() === "DELETE") {
              teardown(page);
              subscriber.complete();
            } else if (req.method() === "PUT") {
              subscriber.next(await requestMap(page, req));
              teardown(page);
              subscriber.complete();
            } else {
              subscriber.next(await requestMap(page, req));
              req.respond({ status: 200 });
            }
          } else {
            req.continue();
          }
        } catch (error) {
          teardown(page);
          subscriber.error(error);
        }
      });

      page.on("console", async (message) => {
        try {
          onMessage(message.text());
        } catch (error) {
          teardown(page);
          subscriber.error(error);
        }
      });

      page.on("error", (e) => {
        try {
          onError(e);
        } catch (e) {
          teardown(page);
          subscriber.error(e);
        }
      });

      page.on("pageerror", (e) => {
        try {
          onPageError(e);
        } catch (e) {
          teardown(page);
          subscriber.error(e);
        }
      });

      const url = U.pathToFileURL(tmpHTMLpath).toString();
      await page.goto(url);
    });
  });
}
