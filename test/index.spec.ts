import pt from "puppeteer";
import {streamPageEvents, createTmpHTMLFile, PageEvent, streamNewPageEvents, streamNewPageEventsJSX, PageError} from "../src";

import {renderToStaticMarkup} from "react-dom/server";
import {RequestData} from "./types";
import {errorTemplate, templateMaker} from "./template";
import {toArray, map} from "rxjs/operators";
import * as E from "fp-ts/Either";
import * as A from "fp-ts/Array";


import * as U from "url";
import {pipe} from "rxjs";
import {identity} from "fp-ts/function";

var browser: pt.Browser | undefined = undefined;
beforeAll(async () => {
    browser = await pt.launch({
        headless: false,
        args: ["--no-sandbox", "--disable-web-security"],
    });
});

afterAll(async () => {
    if (browser) {
        await browser.close();
    }
});


test("test 1", (done) => {
    const hookDomain = "http://test-domain.com"
    const testData: RequestData[] = [
        ["POST", "this is post"],
        ["PUT", "this is put"]
    ];
    streamNewPageEventsJSX(templateMaker(hookDomain)(testData))(browser!, hookDomain).pipe(
        map(E.map(x => x[1].postData())),
        toArray(),
        map(A.sequence(E.either))
    ).subscribe({
        next(output) {
            console.log("outputs", output)
            expect(output).toStrictEqual(E.right(testData.map(x => x[1])))
        },
        complete: done
    });
});


test("test 2", (done) => {
    const testData: RequestData[] = [
        ["POST", "this is post"],
        ["POST", "this is second post"],
        ["DELETE", "this shouldn't matter"]
    ];
    const domain = "http://test-domain.com";
    streamNewPageEventsJSX(templateMaker(domain)(testData))(browser!, domain).pipe(
        map(E.map(x => x[1].postData())),
        toArray(),
        map(A.sequence(E.either))
    ).subscribe({
        next(output) {
            const exp = testData.map(x => x[1]).slice(0, 2);
            expect(output).toStrictEqual(E.right(exp));
        },
        complete: done
    })

});


test("test3", ()=>{
  const domain = "http://aoeu.com";
  const p = streamNewPageEventsJSX(errorTemplate(domain))(browser!, domain).pipe(
      map(E.fold(
          e => {throw e;},
          identity
      ))
  ).toPromise();

  return expect(p).rejects.toThrow("what");
})