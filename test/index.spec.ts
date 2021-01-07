import {createNewPage, createTmpHTMLURL_JSX, runWithBrowser, streamPageEvents} from "../src";
import {RequestData} from "./types";
import {errorTemplate, logTemplate, templateMaker} from "./template";
import {map, take, toArray} from "rxjs/operators";
import {left, right} from "fp-ts/Either";
import {pipe} from "fp-ts/function";
import {array, either} from "fp-ts";
import {fromTaskEither, toTaskEither} from "fp-ts-rxjs/lib/ObservableEither";
import {observable, observableEither} from "fp-ts-rxjs";

function common(hookDomain: string, jsx: JSX.Element) {
    const pageinstance = createNewPage();
    const pageurl = createTmpHTMLURL_JSX(jsx);
    return runWithBrowser({
        headless: false,
        args: ["--no-sandbox", "--disable-web-security"],
    }, (browser) => {
        return pipe(
            pageinstance(browser),
            fromTaskEither,
            observableEither.chain(page => streamPageEvents(page, pageurl)({
                hookDomain: hookDomain,
                tapRequest: () => {
                }
            })),
            observable.map(either.chainW(sum => {
                switch (sum._tag) {
                    case "RequestIntercept":
                        return right(sum.request.postData())
                    case "Log":
                        return left(new Error("Got Log instead of RequestIntercept: " + sum.message))
                }
            })),
            toArray(),
            map(array.sequence(either.either)),
            toTaskEither
        )
    })
}

test("test 1", async () => {
    const hookDomain = "http://test-domain.com"
    const testData: RequestData[] = [
        ["POST", "this is post"],
        ["PUT", "this is put"]
    ];
    const jsx = templateMaker(hookDomain)(testData);

    const task = common(hookDomain, jsx);

    const expectation = testData.map(x => x[1]);
    const notExpectation = expectation.map(x => x + "-impaired");
    const promise = task();
    await expect(promise).resolves.toStrictEqual(right(expectation));
    await expect(promise).resolves.not.toStrictEqual(right(notExpectation));
});

test("test 2", async () => {
    const testData: RequestData[] = [
        ["POST", "this is post"],
        ["POST", "this is second post"],
        ["DELETE", "this shouldn't matter"]
    ];
    const domain = "http://test-domain.com";
    const jsx = templateMaker(domain)(testData)
    const task = common(domain, jsx);
    const expectation = testData.slice(0, 2).map(x => x[1]);
    const notExpectation = expectation.map(x => x + "-impaired");
    const promise = task();
    await expect(promise).resolves.toStrictEqual(right(expectation));
    await expect(promise).resolves.not.toStrictEqual(right(notExpectation));
});
test("test3", () => {
    const domain = "http://aoeu.com";
    const jsx = errorTemplate(domain);
    const pageurl = createTmpHTMLURL_JSX(jsx);

    const task = runWithBrowser({
        headless: false,
        args: ["--no-sandbox", "--disable-web-security"],
    }, (browser) => {
        return pipe(
            createNewPage()(browser),
            fromTaskEither,
            observableEither.chain(page => streamPageEvents(page, pageurl)({
                hookDomain: domain,
                tapRequest: () => {
                }
            })),
            take(1),
            toTaskEither
        )
    })
    return expect(task()).resolves.toStrictEqual(left(new Error("what")));
})

test("log test", () => {
    const domain = "http://aoeu.com";
    const logs = ['Life', 'the Universe', 'and Everything']
    const jsx = logTemplate(domain, logs)
    const pageurl = createTmpHTMLURL_JSX(jsx);
    const task = runWithBrowser({
        headless: false,
        args: ["--no-sandbox", "--disable-web-security"],
    }, (browser) => {
        return pipe(
            createNewPage()(browser),
            fromTaskEither,
            observableEither.chain(page => streamPageEvents(page, pageurl)({
                hookDomain: domain,
                tapRequest: () => {
                }
            })),
            observable.map(either.chain(event => {
                switch (event._tag) {
                    case "Log":
                        return right(event.message);
                    case "RequestIntercept":
                        return left(new Error("got request"))
                }
            })),
            toArray(),
            map(array.sequence(either.either)),
            toTaskEither
        )
    })
    return expect(task()).resolves.toStrictEqual(right(logs));
})