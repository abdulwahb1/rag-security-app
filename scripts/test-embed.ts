import { embedTexts } from "../lib/ingest/embed";

const vectors = await embedTexts([
  "CORS > Getting started\n\nHow to enable CORS in NestJS",
]);

console.log("count:", vectors.length);
console.log("dims:", vectors[0].length); // must be 1536
console.log("first 5 numbers:", vectors[0].slice(0, 5));
