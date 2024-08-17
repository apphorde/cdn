import createServer from "@cloud-cli/http";
import { join, resolve } from "path";
import { createReadStream, existsSync, statSync } from "fs";

const nameRe = /^(@[a-z]+\/[a-z-]+|@[a-z]+\/[a-z-]+\/[a-z-.0-9]+)+$/;
const workingDir = process.env.DATA_PATH;
const mimeTypes = {
  css: "text/css",
  html: "text/html",
  js: "text/javascript",
  mjs: "text/javascript",
};

createServer(function (request, response) {
  try {
    if (["OPTIONS", "GET"].includes(request.method) === false) {
      return notFound(response);
    }

    const url = new URL(request.url, "http://localhost");
    const pathname = url.pathname.slice(1);

    if (!nameRe.test(pathname)) {
      return notFound(response);
    }

    const [scope, name, file = "latest.mjs"] = pathname.split("/");
    const partialPath = resolve(join('/', scope, name, file));
    const fullPath = join(workingDir, partialPath);
    console.log(partialPath, fullPath);

    if (!existsSync(fullPath) || !statSync(fullPath).isFile()) {
      return notFound(response);
    }

    const extension = fullPath.split(".").pop();
    if (!url.searchParams.has("nocache")) {
      response.setHeader("Cache-Control", "max-age=86400");
    }

    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS, POST");
    response.setHeader("Content-Type", mimeTypes[extension] || "text/plain");

    createReadStream(fullPath).pipe(response);
  } catch (e) {
    console.log(e);
    if (!response.headersSent) {
      response.writeHead(500).end();
    }
  }
});

function notFound(response) {
  response.writeHead(404).end("Not found");
}

function badRequest(response, reason = "") {
  response.writeHead(400).end(reason);
}
