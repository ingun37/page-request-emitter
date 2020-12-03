import React from "react";
import * as A from "fp-ts/Array";
import { RequestData } from "./types";

export const templateMaker = (url: string) => (testData: RequestData[]) => {
  const fetchMaker = ([method, payload]: RequestData) => {
    return `
          console.log("fetch", "${method}", "${payload}")
          await fetch("${url}", {
              method: "${method}",
              body: "${payload}",
          });
          `;
  };
  const script = "(async function () {\n" + A.map(fetchMaker)(testData).join("\n") + "})();"
  return (
    <div>
      <script type="text/javascript" dangerouslySetInnerHTML={{ __html: script }}></script>
    </div>
  );
};

export const errorTemplate = (url:string) => {
  return (
    <div>
      <script type="text/javascript" dangerouslySetInnerHTML={{ __html: `
      throw "what";
      ` }}></script>
    </div>
  );
}