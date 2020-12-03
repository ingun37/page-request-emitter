import pt from "puppeteer";
import { streamPageEvents } from "../src";
import { renderToStaticMarkup } from "react-dom/server";
import { RequestData } from "./types";
import { errorTemplate, templateMaker } from "./template";
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
    streamPageEvents(browser, domain, html, 
      async (page, req) => req.postData(),
      async (mesage) => {console.log({fromPage:mesage});},
      (e) => {throw e},
      (e)=>{throw e}
      ).pipe(
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
    streamPageEvents(browser, domain, html, 
      async (page, req) => req.postData(),
      m => console.log({fromPage:m}),
      e => {throw e;},
      e => {throw e;}
      ).pipe(
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

class PageError extends Error {}

test("test3", ()=>{
  const domain = "http://aoeu.com";
  const html = renderToStaticMarkup(errorTemplate(domain));
  if(browser) {
    const ob = streamPageEvents(browser, domain, html,
      async (page, req):Promise<string> => { throw "hcdtgcch"; },
      m => {throw "aoeuaoeu"},
      e => {throw "onhcno.u";},
      e => {throw new PageError;}
    );
    return expect(ob.toPromise()).rejects.toThrow(PageError);
  } else {
    return expect(false).toBeTruthy();
  }
})