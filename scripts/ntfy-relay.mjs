import http from "node:http";

const targetHost = process.env.NTFY_RELAY_HOST;
const targetPort = Number(process.env.NTFY_RELAY_PORT ?? "2586");
const listenPort = Number(process.env.NTFY_RELAY_LISTEN_PORT ?? "8080");

if (!targetHost || !Number.isInteger(targetPort) || !Number.isInteger(listenPort)) {
  throw new Error("Configura NTFY_RELAY_HOST, NTFY_RELAY_PORT e NTFY_RELAY_LISTEN_PORT.");
}

function requestOptions(request) {
  return {
    host: targetHost,
    port: targetPort,
    method: request.method,
    path: request.url,
    headers: {
      ...request.headers,
      host: `${targetHost}:${targetPort}`
    }
  };
}

const server = http.createServer((request, response) => {
  const upstream = http.request(requestOptions(request), (upstreamResponse) => {
    response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
    upstreamResponse.pipe(response);
  });

  upstream.on("error", (error) => {
    console.error("Errore relay ntfy:", error.message);
    if (!response.headersSent) response.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("ntfy non raggiungibile dal relay");
  });

  request.pipe(upstream);
});

server.on("upgrade", (request, socket, head) => {
  const upstream = http.request(requestOptions(request));

  upstream.on("upgrade", (upstreamResponse, upstreamSocket, upstreamHead) => {
    const statusLine = `HTTP/${upstreamResponse.httpVersion} ${upstreamResponse.statusCode} ${upstreamResponse.statusMessage}\r\n`;
    const headers = Object.entries(upstreamResponse.headers)
      .flatMap(([name, value]) => Array.isArray(value)
        ? value.map((entry) => `${name}: ${entry}\r\n`)
        : value === undefined ? [] : [`${name}: ${value}\r\n`])
      .join("");

    socket.write(`${statusLine}${headers}\r\n`);
    if (head.length) upstreamSocket.write(head);
    if (upstreamHead.length) socket.write(upstreamHead);
    upstreamSocket.pipe(socket).pipe(upstreamSocket);
  });

  upstream.on("response", () => socket.destroy());
  upstream.on("error", (error) => {
    console.error("Errore WebSocket relay ntfy:", error.message);
    socket.destroy();
  });
  upstream.end();
});

server.listen(listenPort, "127.0.0.1", () => {
  console.log(`Relay ntfy in ascolto su 127.0.0.1:${listenPort} verso ${targetHost}:${targetPort}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
