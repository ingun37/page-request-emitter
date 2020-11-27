import * as P from "path";
import * as os from "os";
import {Browser, Page, Request} from "puppeteer";
import { v4 as uuidv4 } from "uuid";
import { Observable, Subscriber } from "rxjs";
import * as fs from "fs";
import * as U from "url";

async function teardown<A>(page: Page, subscriber: Subscriber<A>) {
  page.removeAllListeners();
  await page.close();
  subscriber.complete();
}

export function streamPageEvents<T>(
  browser: any,
  domain: string,
  html: string,
  pageMap: (p: Page, r: Request) => Promise<T>
): Observable<T> {
  const tmpHTMLpath = P.resolve(os.tmpdir(), `tmphtml-${uuidv4()}.html`);

  fs.writeFileSync(tmpHTMLpath, html);

  return new Observable((subscriber) => {
    (browser as Browser).newPage().then(async (page) => {
      await page.setRequestInterception(true);

      page.on("request", async (req) => {
        if (req.url().startsWith(domain)) {
          if (req.method() === "DELETE") {
            teardown(page, subscriber);
          } else if (req.method() === "PUT") {
            subscriber.next(await pageMap(page, req));
            teardown(page, subscriber);
          } else {
            subscriber.next(await pageMap(page, req));
            req.respond({ status: 200 });
          }
        } else {
          req.continue();
        }
      });

      page.on("console", (message) => {
        console.log({
          puppeteerMessage: message.text(),
        });
      });

      page.on("error", (error) => {
        console.error({
          puppeteerError: error,
        });
      });

      page.on("pageerror", (error) => {
        console.error({
          puppeteerPageError: error,
        });
      });

      const url = U.pathToFileURL(tmpHTMLpath).toString();
      await page.goto(url);
    });
  });
}
