import React from "react";
import * as A from "fp-ts/Array";
import {RequestData} from "./types";

export const templateMaker = (url: string) => (testData: RequestData[]) => {
    const fetchMaker = ([method, payload]: RequestData) => {
        return `
          await fetch("${url}", {
              method: "${method}",
              body: "${payload}",
          });
          `;
    };
    const script = "(async function () {\n" + A.map(fetchMaker)(testData).join("\n") + "})();"
    return (
        <div>
            <script type="text/javascript" dangerouslySetInnerHTML={{__html: script}}/>
        </div>
    );
};

export const errorTemplate = (url: string) => {
    return (
        <div>
            <script type="text/javascript" dangerouslySetInnerHTML={{
                __html: `
      throw "what";
      `
            }}/>
        </div>
    );
}

export const logTemplate = (url: string, logs: string[]) => {
    const maker = (str: string) => `console.log('${str}');`
    const script = logs.map(maker).join("\n")
    return (
        <div>
            <script type="text/javascript" dangerouslySetInnerHTML={{
                __html: `
    ${script}
    fetch("${url}", { method: "DELETE", });
      `
            }}/>
        </div>
    );
}

export const interceptTemplate = (intercepturl: string, hookurl: string) => {
    return (
        <div>
            <script type="text/javascript" dangerouslySetInnerHTML={{
                __html: `
    fetch("${intercepturl}").then(x => x.text()).then(txt => fetch("${hookurl}", { method: "PUT", body:txt}))
      `
            }}/>
        </div>
    );
}