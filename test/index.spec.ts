import pt from "puppeteer";
import {streamNewPageEventsJSX} from "../src";
import {RequestData} from "./types";
import {errorTemplate, logTemplate, templateMaker} from "./template";
import {map, toArray} from "rxjs/operators";
import * as E from "fp-ts/Either";
import * as A from "fp-ts/Array";
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
        map(E.chainW(x => {
            switch (x[1]._tag) {
                case "Log":
                    return E.left("Got Log instead of RequestIntercept: " + x[1].message);
                case "RequestIntercept":
                    return E.right(x[1].request.postData())
            }
        })),
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
        map(E.chainW(x => {
            switch (x[1]._tag) {
                case "RequestIntercept":
                    return E.right(x[1].request.postData());
                case "Log":
                    return E.left("Got Log instead of RequestIntercept: " + x[1].message);
            }
        })),
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


test("test3", () => {
    const domain = "http://aoeu.com";
    const p = streamNewPageEventsJSX(errorTemplate(domain))(browser!, domain).pipe(
        map(E.fold(
            e => {
                console.log(e);
                throw e;
            },
            identity
        ))
    ).toPromise();

    return expect(p).rejects.toThrow("what");
})

test("log test", () => {
    const domain = "http://aoeu.com";
    const logs = ['Life', 'the Universe', 'and Everything']
    return streamNewPageEventsJSX(logTemplate(domain, logs))(browser!, domain).pipe(
        map(E.chainW(([_, xxx]) => {
            switch (xxx._tag) {
                case "Log": return E.right( xxx.message);
                case "RequestIntercept": return E.left("Expected Log but got Request");
            }
        })),
        toArray(),
        map(A.sequence(E.either))
    ).toPromise().then(xxxx => {
        expect(xxxx).toStrictEqual(E.right(logs))
    });
})