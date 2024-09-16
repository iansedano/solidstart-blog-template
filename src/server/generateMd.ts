import matter from "gray-matter";
import fs from "fs";
import path from "path";
import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";
import { marked } from "marked";
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

type Post = {
  data: Record<string, any>; // frontMatterSchema
  content: string;
  fileStem: string;
};

export function getMarkdownPosts(): Post[] {
  const files = fs.readdirSync(CONTENT);

  return files
    .map((file) => {
      const filePath = path.join(CONTENT, file);
      const markdownFile = matter(fs.readFileSync(filePath, "utf8"));

      const out = frontMatterSchema(markdownFile.data);
      if (out instanceof type.errors) {
        console.log(out.summary);
        return undefined;
      } else {
        return {
          ...markdownFile,
          data: frontMatterSchema(markdownFile.data),
          content: DOMPurify.sanitize(
            marked.parse(markdownFile.content, { async: false })
          ),
          fileStem: path.basename(file, path.extname(file)),
        };
      }
    })
    .filter((x) => x !== undefined);
}
