import pt from "puppeteer";
import { streamPageEvents } from "../src";
import { renderToStaticMarkup } from "react-dom/server";
import { RequestData } from "./types";
import { templateMaker } from "./template";
import { toArray } from "rxjs/operators";

var browser: pt.Browser | undefined = undefined;

beforeAll(async () => {
  browser = await pt.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-web-security"],
  });
});

afterAll(async () => {
  if(browser) {
    await browser.close();
  }
});


test("test 1", (done) => {
  const testData:RequestData[] = [
    ["POST", "this is post"],
    ["PUT", "this is put"]
  ];
  const domain = "http://test-domain.com"
  const html = renderToStaticMarkup(templateMaker(domain)(testData));
  console.log(html)
  if (browser) {
    streamPageEvents(browser, domain, html, async (page, req) => req.postData()).pipe(
      toArray()
    ).subscribe({
      next(output) {
        expect(output).toStrictEqual(testData.map(x=>x[1]))
      },
      complete: done
    })
  } else {
    expect(false).toBeTruthy()
  }
});


test("test 2", (done) => {
  const testData:RequestData[] = [
    ["POST", "this is post"],
    ["POST", "this is second post"],
    ["DELETE", "this shouldn't matter"]
  ];
  const domain = "http://test-domain.com"
  const html = renderToStaticMarkup(templateMaker(domain)(testData));
  console.log(html)
  if (browser) {
    streamPageEvents(browser, domain, html, async (page, req) => req.postData()).pipe(
      toArray()
    ).subscribe({
      next(output) {
        expect(output).toStrictEqual(testData.map(x=>x[1]).slice(0,2))
      },
      complete: done
    })
  } else {
    expect(false).toBeTruthy()
  }
});

