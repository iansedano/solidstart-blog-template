"use server";

import matter from "gray-matter";
import fs from "fs";
import path from "path";
import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";
import Shiki from "@shikijs/markdown-it";
import MarkdownIt from "markdown-it";
import getProjectRoot from "./getProjectRoot";
import { type } from "arktype";

const ROOT = getProjectRoot();
const CONTENT = path.join(ROOT, "src", "md");
const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

const frontMatterSchema = type({
  title: "string",
  date: "Date",
  description: "string",
  slug: "string",
  "metaTitle?": "string",
  "metaDescription?": "string",
  "keywords?": "string[]",
});

const md = MarkdownIt();

export async function getMarkdownPosts(): Promise<Post[]> {
  const files = fs.readdirSync(CONTENT);

  md.use(
    await Shiki({
      theme: "monokai",
    }),
  );

  return files
    .map((file) => {
      const filePath = path.join(CONTENT, file);
      const markdownFile = matter(fs.readFileSync(filePath, "utf8"));
      const renderMd = (content) => DOMPurify.sanitize(md.render(content, { async: false }));

      const out = frontMatterSchema(markdownFile.data);
      if (out instanceof type.errors) {
        console.error(`${filePath}: ${out.summary}`);
        return undefined;
      } else {
        return {
          ...markdownFile,
          data: {
            ...frontMatterSchema(markdownFile.data),
            description: renderMd(markdownFile.data.description),
            title: renderMd(markdownFile.data.title).replace(/<p>|<\/p>/g, ""), // remove outer <p> tags
          },
          content: renderMd(markdownFile.content),
          fileStem: path.basename(file, path.extname(file)),
        };
      }
    })
    .filter((x) => x !== undefined);
}
