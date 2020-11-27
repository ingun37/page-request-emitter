import * as P from "path";
import * as os from "os";
import * as puppeteer from "puppeteer";
import { v4 as uuidv4 } from "uuid";
import { Observable, Subscriber } from "rxjs";
import * as fs from "fs";
import * as U from "url";

async function teardown<A>(page: puppeteer.Page, subscriber: Subscriber<A>) {
  page.removeAllListeners();
  await page.close();
  subscriber.complete();
}

export function streamPageEvents<T>(
  browser: puppeteer.Browser,
  domain: string,
  html: string,
  pageMap: (p: puppeteer.Page, r: puppeteer.Request) => Promise<T>
): Observable<T> {
  const tmpHTMLpath = P.resolve(os.tmpdir(), `tmphtml-${uuidv4()}.html`);

  fs.writeFileSync(tmpHTMLpath, html);

  return new Observable((subscriber) => {
    browser.newPage().then(async (page) => {
      await page.setRequestInterception(true);

      page.on("request", async (req) => {
        console.log({requesURL: req.url()})
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
