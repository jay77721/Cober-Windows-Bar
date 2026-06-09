import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const UTF8_SCRIPT_PATTERN = /\.(?:[cm]?[jt]sx?|css)(?:$|\?)/i;

function enforceUtf8ContentType() {
  function install(server: {
    middlewares: {
      use: (handler: (req: { url?: string }, res: any, next: () => void) => void) => void;
    };
  }) {
    server.middlewares.use((req, res, next) => {
      const url = req.url ?? "";
      if (!UTF8_SCRIPT_PATTERN.test(url)) {
        next();
        return;
      }

      const response = res as {
        end: (...args: any[]) => any;
        getHeader?: (name: string) => unknown;
        setHeader: (name: string, value: string) => void;
      };
      const originalEnd = response.end.bind(response);

      response.end = (...args: any[]) => {
        const contentType = response.getHeader?.("Content-Type");
        if (typeof contentType === "string") {
          if (!/charset=/i.test(contentType)) {
            if (
              contentType.startsWith("text/javascript") ||
              contentType.startsWith("application/javascript") ||
              contentType.startsWith("text/css")
            ) {
              response.setHeader("Content-Type", `${contentType}; charset=utf-8`);
            }
          }
        } else {
          response.setHeader(
            "Content-Type",
            url.includes(".css") ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8",
          );
        }

        return originalEnd(...args);
      };

      next();
    });
  }

  return {
    name: "enforce-utf8-content-type",
    configureServer: install,
    configurePreviewServer: install,
  };
}

export default defineConfig({
  plugins: [react(), enforceUtf8ContentType()],
});
